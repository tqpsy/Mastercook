/**
 * "Cosa cucino con quello che ho?" — tutto sul dispositivo, anche offline (Thread 3).
 *
 * 1. Filtro rigido di sicurezza: allergeni (dichiarati ∪ ingredienti) e restrizioni dei presenti.
 * 2. Punteggio: copertura 0,55 + usa prima 0,20 + preferenza 0,10 + stagione 0,10 + varietà 0,05.
 * 3. Sezioni: Pronte (nulla da comprare), Ti mancano 1–2 (copertura ≥ 0,6), Altre idee.
 */
import { ingrediente, type ClasseIngrediente } from '../rif/ingredienti';
import { ALLERGENI_UE, allergeniEffettivi, allergeniInConflitto, type Allergene } from './allergeni';
import type { Disponibilita } from './disponibilita';
import { quantitaScalata } from './quantita';
import type { Restrizione, Ricetta, RigaIngrediente } from './tipi';

export interface Presente {
  nome: string;
  allergie: readonly string[];
  restrizioni: readonly Restrizione[];
  sgraditi: readonly string[];
  fattore_porzione: number;
}

export interface ContestoSuggerimenti {
  mese: number;
  disponibilita: Disponibilita;
  presenti: readonly Presente[];
  preferite: ReadonlySet<string>;
  voti: ReadonlyMap<string, number>;
  /** Ricette cucinate negli ultimi 5 giorni. */
  recenti: ReadonlySet<string>;
}

export type Sezione = 'pronte' | 'quasi' | 'altre' | 'escluse';

export interface RigaValutata {
  riga: RigaIngrediente;
  richiesto: number;
  disponibile: number;
  /** min(1, disponibile / richiesto); 1 per la dispensa di base. */
  copertura: number;
  /** Riga senza ingrediente collegato: non conteggiata. */
  nonConteggiata: boolean;
}

export interface Suggerimento {
  ricetta: Ricetta;
  sezione: Sezione;
  punteggio: number;
  copertura: number;
  righe: RigaValutata[];
  mancanti: RigaValutata[];
  allergeni: Allergene[];
  motivi: string[];
  esclusione?: string;
}

const VIETATE: Record<Restrizione, ClasseIngrediente[]> = {
  vegetariano: ['carne', 'pesce'],
  vegano: ['carne', 'pesce', 'latticini', 'uova', 'miele'],
  senza_maiale: ['maiale'],
  senza_alcol: ['alcol'],
};

const NOME_RESTRIZIONE: Record<Restrizione, string> = {
  vegetariano: 'vegetariana',
  vegano: 'vegana',
  senza_maiale: 'senza maiale',
  senza_alcol: 'senza alcol',
};

export function allergeniRicetta(ricetta: Ricetta): Allergene[] {
  return [...allergeniEffettivi(ricetta.allergeni_dichiarati, ricetta.ingredienti.map((r) => ingrediente(r.ingrediente_id)?.allergeni ?? []))];
}

export function valutaRighe(ricetta: Ricetta, sommaFattori: number, disponibilita: Disponibilita): RigaValutata[] {
  return ricetta.ingredienti.map((riga) => {
    const ing = ingrediente(riga.ingrediente_id);
    const richiesto = riga.scalabile && riga.quantita ? quantitaScalata(riga.quantita, ricetta.porzioni_base, [sommaFattori]) : (riga.quantita ?? 0);
    const disponibile = ing ? (disponibilita.quantita.get(ing.id) ?? 0) : 0;
    let copertura: number;
    if (!ing) copertura = 0;
    else if (ing.base) copertura = 1;
    else if (richiesto <= 0) copertura = disponibile > 0 ? 1 : 0;
    else copertura = Math.min(1, disponibile / richiesto);
    return { riga, richiesto, disponibile, copertura, nonConteggiata: !ing };
  });
}

export function valutaRicetta(ricetta: Ricetta, ctx: ContestoSuggerimenti): Suggerimento {
  const allergeni = allergeniRicetta(ricetta);
  const sommaFattori = ctx.presenti.reduce((s, p) => s + p.fattore_porzione, 0) || 1;
  const righe = valutaRighe(ricetta, sommaFattori, ctx.disponibilita);
  const base = { ricetta, righe, allergeni, punteggio: 0, copertura: 0, mancanti: [], motivi: [] };

  // 1. Sicurezza prima di tutto.
  const conflitti = allergeniInConflitto(new Set(allergeni), ctx.presenti.map((p) => p.allergie));
  if (conflitti.length > 0) {
    const chi = ctx.presenti.filter((p) => p.allergie.some((a) => conflitti.includes(a as Allergene))).map((p) => p.nome);
    return { ...base, sezione: 'escluse', esclusione: `Contiene ${conflitti.map((c) => ALLERGENI_UE[c].toLowerCase()).join(', ')} (${chi.join(', ')})` };
  }
  const classi = new Set(ricetta.ingredienti.flatMap((r) => ingrediente(r.ingrediente_id)?.classi ?? []));
  for (const p of ctx.presenti) {
    for (const restrizione of p.restrizioni) {
      if (VIETATE[restrizione].some((c) => classi.has(c))) {
        return { ...base, sezione: 'escluse', esclusione: `Non è ${NOME_RESTRIZIONE[restrizione]} (${p.nome})` };
      }
    }
  }

  // 2. Punteggio.
  const conteggiate = righe.filter((r) => !r.riga.opzionale && !r.nonConteggiata);
  const copertura = conteggiate.length ? conteggiate.reduce((s, r) => s + r.copertura, 0) / conteggiate.length : 0;
  const mancanti = conteggiate.filter((r) => r.copertura < 0.9);

  const motivi: string[] = [];
  let pesoUsaPrima = 0;
  const daUsare: string[] = [];
  for (const r of righe) {
    const peso = r.riga.ingrediente_id ? (ctx.disponibilita.usaPrima.get(r.riga.ingrediente_id) ?? 0) : 0;
    if (peso > 0) {
      pesoUsaPrima += peso;
      daUsare.push(ingrediente(r.riga.ingrediente_id)!.nome.toLowerCase());
    }
  }
  const usaPrima = Math.min(1, pesoUsaPrima / 6);

  let preferenza = 0.5;
  if (ricetta.origine === 'personale' || ctx.preferite.has(ricetta.id)) preferenza = 1;
  else if ((ctx.voti.get(ricetta.id) ?? 0) >= 4) preferenza = 0.8;
  const sgraditi = new Set(ctx.presenti.flatMap((p) => p.sgraditi));
  if (ricetta.ingredienti.some((r) => r.ingrediente_id && sgraditi.has(r.ingrediente_id))) preferenza -= 0.3;

  const stagione = !ricetta.mesi_stagione || ricetta.mesi_stagione.includes(ctx.mese) ? 1 : 0;
  const varieta = ctx.recenti.has(ricetta.id) ? 0 : 1;

  const punteggio = 0.55 * copertura + 0.2 * usaPrima + 0.1 * preferenza + 0.1 * stagione + 0.05 * varieta;

  if (mancanti.length === 0) motivi.push('Hai tutto in casa');
  else motivi.push(`Ti ${mancanti.length === 1 ? 'manca' : 'mancano'}: ${mancanti.map((m) => m.riga.testo.toLowerCase()).join(', ')}`);
  if (daUsare.length) motivi.push(`Usa ${daUsare.join(', ')} prima che scada`);
  if (ricetta.origine === 'personale') motivi.push('Una tua ricetta');
  else if (ctx.preferite.has(ricetta.id)) motivi.push('Tra le preferite');
  if (ricetta.mesi_stagione && stagione) motivi.push('Di stagione');

  let sezione: Sezione = 'altre';
  if (mancanti.length === 0 && conteggiate.length > 0) sezione = 'pronte';
  else if (mancanti.length <= 2 && copertura >= 0.6) sezione = 'quasi';

  return { ...base, sezione, punteggio, copertura, mancanti, motivi };
}

export function suggerisci(ricette: readonly Ricetta[], ctx: ContestoSuggerimenti): Record<Sezione, Suggerimento[]> {
  const sezioni: Record<Sezione, Suggerimento[]> = { pronte: [], quasi: [], altre: [], escluse: [] };
  for (const r of ricette) {
    const s = valutaRicetta(r, ctx);
    sezioni[s.sezione].push(s);
  }
  for (const lista of Object.values(sezioni)) lista.sort((a, b) => b.punteggio - a.punteggio || a.ricetta.titolo.localeCompare(b.ricetta.titolo));
  return sezioni;
}
