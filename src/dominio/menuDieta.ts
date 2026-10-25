/**
 * Dalla dieta del dietista al menù settimanale, sul dispositivo e senza AI.
 *
 * Per ogni pasto prescritto si cercano le ricette (di sistema e personali) fatte con gli stessi
 * gruppi di alimenti: "pasta 80 g + zucchine" → Pasta con le zucchine; "merluzzo 150 g + verdura"
 * → Merluzzo in umido + un contorno. Le ricette con alimenti che la dieta non prevede in quel pasto
 * (carne quando c'è il pesce) sono penalizzate, quelle con allergeni o restrizioni del membro escluse.
 * Le grammature della dieta decidono la porzione; quello che nessuna ricetta copre (frutta, pane,
 * yogurt…) resta come voce a parte del menù.
 */
import { ingrediente } from '../rif/ingredienti';
import { GRUPPI_PRINCIPALI, NOME_GRUPPO, descriviVoce, gruppoIngrediente, gruppiVoce, type GruppoAlimentare } from './dieta';
import type { TipoPasto } from './id';
import { normalizza } from './ricerca';
import { valutaRicetta, type ContestoSuggerimenti } from './suggerimenti';
import type { PastoDieta, Portata, Ricetta, VoceDieta } from './tipi';

/** Grammi a porzione sopra i quali un gruppo "fa" il piatto (sotto è un condimento: 15 g di parmigiano). */
const SOGLIA_G: Partial<Record<GruppoAlimentare, number>> = {
  cereali: 30,
  legumi: 30,
  pesce: 40,
  carne_bianca: 40,
  carne_rossa: 40,
  salumi: 20,
  formaggi: 25,
  verdura: 40,
  patate: 80,
};

const PROTEINE = new Set<GruppoAlimentare>(['legumi', 'pesce', 'carne_bianca', 'carne_rossa', 'salumi', 'uova', 'formaggi']);

const PORTATE_PER_PASTO: Record<TipoPasto, Portata[]> = {
  colazione: ['colazione', 'dolce'],
  spuntino: ['colazione'],
  merenda: ['colazione', 'dolce'],
  pranzo: ['primo', 'secondo', 'contorno', 'piatto_unico', 'antipasto'],
  cena: ['primo', 'secondo', 'contorno', 'piatto_unico', 'antipasto'],
};

export interface ProfiloRicetta {
  /** Gruppi principali con i grammi a porzione. */
  gruppi: Map<GruppoAlimentare, number>;
  ingredienti: Set<string>;
}

export function profiloRicetta(ricetta: Ricetta): ProfiloRicetta {
  const gruppi = new Map<GruppoAlimentare, number>();
  const ingredienti = new Set<string>();
  const porzioni = ricetta.porzioni_base || 1;
  for (const riga of ricetta.ingredienti) {
    if (riga.opzionale) continue;
    const ing = ingrediente(riga.ingrediente_id);
    if (!ing) continue;
    ingredienti.add(ing.id);
    if (ing.genitore) ingredienti.add(ing.genitore);
    const gruppo = gruppoIngrediente(ing);
    if (!gruppo || !GRUPPI_PRINCIPALI.has(gruppo)) continue;
    const grammi = ((ing.unita === 'pz' ? (riga.quantita ?? 0) * (ing.peso_pz ?? 60) : (riga.quantita ?? 0)) / porzioni);
    gruppi.set(gruppo, (gruppi.get(gruppo) ?? 0) + grammi);
  }
  for (const [g, grammi] of gruppi) if (grammi < (SOGLIA_G[g] ?? 30)) gruppi.delete(g);
  return { gruppi, ingredienti };
}

export interface PortataProposta {
  ricetta?: Ricetta;
  /** Testo della voce, per le portate senza ricetta. */
  titolo: string;
  /** Porzioni della ricetta per il membro, dalle grammature (1 se la dieta non le indica). */
  porzioni: number;
  /** Le voci della dieta che questa portata copre. */
  voci: VoceDieta[];
  /** Perché questa ricetta: "pasta 80 g e verdura come da dieta". */
  motivo?: string;
}

export interface PastoProposto {
  tipo: TipoPasto;
  portate: PortataProposta[];
  /** Le altre ricette adatte, per il tasto "Cambia". */
  alternative: Ricetta[];
}

export interface OpzioniProposta {
  /** Ricette già scelte nella settimana (per variare) e quante volte. */
  usate: Map<string, number>;
  /** Ricette già nel menù di quel pasto per altri membri: se vanno bene si mangia tutti uguale. */
  giaNelPasto?: ReadonlySet<string>;
}

interface Candidata {
  ricetta: Ricetta;
  profilo: ProfiloRicetta;
  punteggio: number;
  coperti: GruppoAlimentare[];
  voci: VoceDieta[];
}

/**
 * Una ricetta copre una voce se ne ha il gruppo. Per la verdura indicata per nome
 * ("spinaci 200 g") serve proprio quella: i pomodorini del merluzzo in umido non bastano.
 */
function copre(profilo: ProfiloRicetta, voce: VoceDieta): boolean {
  if (!gruppiVoce(voce).some((g) => GRUPPI_PRINCIPALI.has(g) && profilo.gruppi.has(g))) return false;
  if (voce.gruppo === 'verdura' && voce.ingrediente_id) return profilo.ingredienti.has(voce.ingrediente_id);
  return true;
}

function punteggio(
  ricetta: Ricetta,
  profilo: ProfiloRicetta,
  restanti: readonly VoceDieta[],
  prescritti: ReadonlySet<GruppoAlimentare>,
  ctx: ContestoSuggerimenti,
  opzioni: OpzioniProposta,
): Candidata | null {
  const voci = restanti.filter((v) => copre(profilo, v));
  if (!voci.length) return null;
  const coperti = [...profilo.gruppi.keys()].filter((g) => voci.some((v) => gruppiVoce(v).includes(g)));
  let p = 0;
  for (const g of coperti) p += PROTEINE.has(g) || g === 'cereali' ? 1.2 : 0.8;
  for (const g of profilo.gruppi.keys()) {
    if (prescritti.has(g)) continue;
    // Alimenti fuori dieta: una proteina in più è grave, un po' di verdura no.
    p -= PROTEINE.has(g) ? 2 : g === 'cereali' || g === 'patate' ? 1.2 : 0.3;
  }
  for (const v of voci) if (v.ingrediente_id && profilo.ingredienti.has(v.ingrediente_id)) p += 0.6;
  // La dieta nomina il piatto ("pasta e ceci"): vale più di una ricetta che ha solo gli stessi gruppi.
  const titolo = normalizza(ricetta.titolo);
  for (const v of voci) {
    const piatto = normalizza(v.testo.replace(/\d.*$/, ''));
    if (piatto.includes(' ') && titolo.includes(piatto)) p += 0.6;
  }
  const valutata = valutaRicetta(ricetta, ctx);
  if (valutata.sezione === 'escluse') return null;
  p += 0.3 * valutata.copertura;
  if (ricetta.mesi_stagione && !ricetta.mesi_stagione.includes(ctx.mese)) p -= 0.5;
  if (ricetta.origine === 'personale' || ctx.preferite.has(ricetta.id)) p += 0.25;
  if (opzioni.giaNelPasto?.has(ricetta.id)) p += 0.8;
  p -= 0.5 * (opzioni.usate.get(ricetta.id) ?? 0);
  return { ricetta, profilo, punteggio: p, coperti, voci };
}

/** Porzioni per arrivare alla grammatura prescritta del gruppo più importante, tra 0,5 e 2,5. */
function porzioniDaDieta(profilo: ProfiloRicetta, voci: readonly VoceDieta[]): number {
  const ordine: GruppoAlimentare[] = ['cereali', 'pesce', 'carne_bianca', 'carne_rossa', 'legumi', 'uova', 'formaggi', 'salumi', 'patate', 'verdura'];
  for (const g of ordine) {
    const perPorzione = profilo.gruppi.get(g);
    const voce = voci.find((v) => v.quantita_g && gruppiVoce(v).includes(g));
    if (perPorzione && voce?.quantita_g) {
      const n = voce.quantita_g / perPorzione;
      return Math.min(2.5, Math.max(0.5, Math.round(n * 4) / 4));
    }
  }
  return 1;
}

function descriviCoperti(coperti: readonly GruppoAlimentare[], voci: readonly VoceDieta[]): string {
  const parti = coperti.map((g) => {
    const v = voci.find((x) => gruppiVoce(x).includes(g));
    return v?.quantita_g ? `${NOME_GRUPPO[g]} ${v.quantita_g} g` : NOME_GRUPPO[g];
  });
  return `${parti.join(', ')} come da dieta`;
}

/**
 * Propone le portate di un pasto della dieta. `ctx` ha come presenti il solo membro della dieta,
 * così allergie e restrizioni sono le sue.
 */
export function proponiPasto(pasto: PastoDieta, ricette: readonly Ricetta[], ctx: ContestoSuggerimenti, opzioni: OpzioniProposta): PastoProposto {
  const ammesse = new Set(PORTATE_PER_PASTO[pasto.tipo]);
  const prescritti = new Set(pasto.voci.flatMap(gruppiVoce).filter((g) => GRUPPI_PRINCIPALI.has(g)));
  const profili = ricette.filter((r) => ammesse.has(r.portata)).map((r) => ({ r, profilo: profiloRicetta(r) }));

  const scelte: PortataProposta[] = [];
  const tutte: Candidata[] = [];
  let restanti = pasto.voci.filter((v) => gruppiVoce(v).some((g) => GRUPPI_PRINCIPALI.has(g)));
  for (let giro = 0; giro < 3 && restanti.length; giro++) {
    const candidate = profili
      .filter(({ r }) => !scelte.some((s) => s.ricetta?.id === r.id))
      .map(({ r, profilo }) => punteggio(r, profilo, restanti, prescritti, ctx, opzioni))
      .filter((c): c is Candidata => !!c && c.punteggio > 0.4)
      .sort((a, b) => b.punteggio - a.punteggio || a.ricetta.titolo.localeCompare(b.ricetta.titolo));
    if (giro === 0) tutte.push(...candidate);
    const migliore = candidate[0];
    if (!migliore) break;
    scelte.push({
      ricetta: migliore.ricetta,
      titolo: migliore.ricetta.titolo,
      porzioni: porzioniDaDieta(migliore.profilo, migliore.voci),
      voci: migliore.voci,
      motivo: descriviCoperti(migliore.coperti, migliore.voci),
    });
    restanti = restanti.filter((v) => !migliore.voci.includes(v));
  }

  const coperte = new Set(scelte.flatMap((s) => s.voci));
  for (const v of pasto.voci) {
    if (coperte.has(v)) continue;
    scelte.push({ titolo: descriviVoce(v), porzioni: 1, voci: [v] });
  }
  return {
    tipo: pasto.tipo,
    portate: scelte,
    alternative: tutte.filter((c) => !scelte.some((s) => s.ricetta?.id === c.ricetta.id)).slice(0, 6).map((c) => c.ricetta),
  };
}

/** Rifà la porzione e il motivo quando l'utente sceglie un'altra ricetta con "Cambia". */
export function sostituisciRicetta(pasto: PastoDieta, ricetta: Ricetta): PortataProposta {
  const profilo = profiloRicetta(ricetta);
  const voci = pasto.voci.filter((v) => copre(profilo, v));
  const nomi = [...profilo.gruppi.keys()].filter((g) => voci.some((v) => gruppiVoce(v).includes(g)));
  return {
    ricetta,
    titolo: ricetta.titolo,
    porzioni: porzioniDaDieta(profilo, voci),
    voci,
    motivo: nomi.length ? descriviCoperti(nomi, voci) : 'scelta da te',
  };
}

/** La settimana intera, variando le ricette tra un giorno e l'altro. */
export function proponiSettimana(
  giorni: readonly { giorno: number; pasti: PastoDieta[] }[],
  ricette: readonly Ricetta[],
  ctx: ContestoSuggerimenti,
  giaNelMenu: (giorno: number, tipo: TipoPasto) => ReadonlySet<string> = () => new Set(),
): { giorno: number; pasti: PastoProposto[] }[] {
  const usate = new Map<string, number>();
  return giorni.map((g) => ({
    giorno: g.giorno,
    pasti: g.pasti.map((p) => {
      const proposto = proponiPasto(p, ricette, ctx, { usate, giaNelPasto: giaNelMenu(g.giorno, p.tipo) });
      for (const s of proposto.portate) if (s.ricetta) usate.set(s.ricetta.id, (usate.get(s.ricetta.id) ?? 0) + 1);
      return proposto;
    }),
  }));
}
