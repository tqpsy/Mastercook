/**
 * Consigli per sistemare il frigo secondo le buone pratiche di conservazione (Ministero della
 * Salute, EFSA): crudi in basso e chiusi, cibi pronti sopra, frutta e verdura nei cassetti,
 * in portiera solo bevande e condimenti, fuori dal frigo quello che col freddo si rovina.
 * Le regole girano sul dispositivo; la posizione dei prodotti arriva dalle foto (Gemini), se c'è.
 */
import { ingrediente, type Ingrediente } from '../rif/ingredienti';

export type Posizione = 'ripiano alto' | 'ripiano centrale' | 'ripiano basso' | 'cassetto' | 'portiera';
export const POSIZIONI: Posizione[] = ['ripiano alto', 'ripiano centrale', 'ripiano basso', 'cassetto', 'portiera'];

export interface ProdottoInFrigo {
  /** id dell'ingrediente (`ing:…`) */
  id: string;
  posizione?: Posizione;
}

export interface Consiglio {
  /** Più basso = più importante: prima la sicurezza, poi la qualità. */
  priorita: number;
  titolo: string;
  testo: string;
}

/** Perché alcuni prodotti stanno meglio fuori dal frigo. */
const FUORI_DAL_FRIGO: Record<string, string> = {
  'ing:patata': 'al freddo l’amido diventa zucchero e cambiano sapore',
  'ing:banana': 'la buccia annerisce',
  'ing:pomodoro': 'perdono sapore e diventano farinosi',
  'ing:cipolla': 'con l’umidità ammuffiscono',
  'ing:aglio': 'con l’umidità germoglia',
  'ing:zucca': 'intera si conserva settimane in un posto fresco',
  'ing:pane': 'diventa raffermo prima',
  'ing:miele': 'cristallizza',
  'ing:olio_evo': 'si addensa e intorbidisce',
};

const crudo = (ing: Ingrediente) => ing.reparto === 'carne' || ing.reparto === 'pesce';
const pronto = (ing: Ingrediente) => ing.reparto === 'gastronomia' || ing.reparto === 'latticini';
const vegetale = (ing: Ingrediente) => ing.reparto === 'frutta_verdura' && ing.luogo === 'frigo';

const elenco = (nomi: string[]) => {
  const unici = [...new Set(nomi)];
  return unici.length <= 1 ? (unici[0] ?? '') : `${unici.slice(0, -1).join(', ')} e ${unici.at(-1)}`;
};

/** Al massimo `quanti` consigli, i più importanti per primi. */
export function consigliFrigo(prodotti: ProdottoInFrigo[], quanti = 4): Consiglio[] {
  const voci = prodotti.flatMap((p) => {
    const ing = ingrediente(p.id);
    return ing ? [{ ing, posizione: p.posizione }] : [];
  });
  const consigli: Consiglio[] = [];
  const nomi = (filtro: (v: (typeof voci)[number]) => boolean) => elenco(voci.filter(filtro).map((v) => v.ing.nome.toLowerCase()));

  const crudiFuoriPosto = voci.filter((v) => crudo(v.ing) && v.posizione && v.posizione !== 'ripiano basso');
  const crudiInBasso = voci.some((v) => crudo(v.ing) && (!v.posizione || v.posizione === 'ripiano basso'));
  if (crudiFuoriPosto.length) {
    consigli.push({
      priorita: 1,
      titolo: `Sposta in basso: ${nomi((v) => crudiFuoriPosto.includes(v))}`,
      testo: 'Carne e pesce crudi vanno nel ripiano più basso, in contenitori chiusi: è il punto più freddo e così i liquidi non gocciolano sugli altri cibi.',
    });
  } else if (crudiInBasso) {
    consigli.push({
      priorita: 3,
      titolo: 'Carne e pesce crudi: in basso e chiusi',
      testo: `Tieni ${nomi((v) => crudo(v.ing))} nel ripiano più basso, in contenitori chiusi, e consumali entro un paio di giorni.`,
    });
  }

  if (voci.some((v) => v.ing.reparto === 'carne') && voci.some((v) => v.ing.reparto === 'pesce')) {
    consigli.push({
      priorita: 2,
      titolo: 'Separa la carne dal pesce',
      testo: 'Mettili in contenitori diversi e non a contatto: evita che i batteri passino dall’uno all’altro.',
    });
  }

  const prontiSotto = voci.filter((v) => pronto(v.ing) && v.posizione === 'ripiano basso');
  if (prontiSotto.length && voci.some((v) => crudo(v.ing))) {
    consigli.push({
      priorita: 2,
      titolo: `Sposta in alto: ${nomi((v) => prontiSotto.includes(v))}`,
      testo: 'I cibi pronti (formaggi, salumi, latticini, avanzi) vanno sopra i crudi, mai sotto.',
    });
  }

  const fuori = voci.filter((v) => FUORI_DAL_FRIGO[v.ing.id]);
  if (fuori.length) {
    const motivi = [...new Map(fuori.map((v) => [v.ing.id, `${v.ing.nome.toLowerCase()}: ${FUORI_DAL_FRIGO[v.ing.id]}`])).values()];
    consigli.push({
      priorita: 4,
      titolo: `Meglio fuori dal frigo: ${nomi((v) => fuori.includes(v))}`,
      testo: `Conservali in un posto fresco, asciutto e buio (${motivi.join('; ')}).`,
    });
  }

  if (voci.some((v) => v.ing.id === 'ing:uova' && v.posizione === 'portiera')) {
    consigli.push({
      priorita: 5,
      titolo: 'Uova su un ripiano centrale',
      testo: 'Tienile nella loro confezione su un ripiano: in portiera subiscono gli sbalzi di temperatura a ogni apertura.',
    });
  }

  const vegetaliSuiRipiani = voci.filter((v) => vegetale(v.ing) && v.posizione && v.posizione !== 'cassetto');
  if (vegetaliSuiRipiani.length >= 2) {
    consigli.push({
      priorita: 6,
      titolo: `Nei cassetti: ${nomi((v) => vegetaliSuiRipiani.includes(v))}`,
      testo: 'Frutta e verdura durano di più nei cassetti, dove l’umidità è giusta. Lavale solo prima di usarle.',
    });
  }

  if (new Set(voci.map((v) => v.ing.id)).size >= 30) {
    consigli.push({
      priorita: 7,
      titolo: 'Il frigo è molto pieno',
      testo: 'Se è troppo carico l’aria fredda non circola: lascia spazio tra i prodotti e usa prima quello che scade presto.',
    });
  }

  return consigli.sort((a, b) => a.priorita - b.priorita).slice(0, quanti);
}

/** Le regole di base, da tenere a mente sempre. */
export const REGOLE_FRIGO: { dove: string; cosa: string }[] = [
  { dove: 'Ripiani alti', cosa: 'cibi pronti e cotti, avanzi in contenitori chiusi, latticini, salumi e formaggi' },
  { dove: 'Ripiano centrale', cosa: 'uova nella loro confezione, yogurt, dolci, prodotti aperti' },
  { dove: 'Ripiano basso', cosa: 'carne e pesce crudi, chiusi e separati: è il punto più freddo' },
  { dove: 'Cassetti', cosa: 'frutta e verdura, non lavate' },
  { dove: 'Portiera', cosa: 'bevande, salse e condimenti: è la zona meno fredda' },
  { dove: 'Temperatura', cosa: 'tra 0 e 4 °C nel frigo, −18 °C nel freezer; i cibi caldi si raffreddano prima di metterli dentro (entro 2 ore)' },
];
