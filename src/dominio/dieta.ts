/**
 * Dieta consegnata dal dietista: lettura del testo (dopo l'OCR o incollato), pulizia della
 * risposta di Gemini e collegamento di ogni alimento agli ingredienti e ai gruppi alimentari.
 *
 * Masterfood non giudica né modifica la dieta: la legge, la fa confermare all'utente
 * e la usa per scegliere le ricette del menù settimanale (vedi menuDieta.ts).
 */
import { ingrediente, type Ingrediente } from '../rif/ingredienti';
import type { TipoPasto } from './id';
import { cercaIngredienti, normalizza } from './ricerca';
import type { GiornoDieta, PastoDieta, VoceDieta } from './tipi';

export const PASTI_DIETA: TipoPasto[] = ['colazione', 'spuntino', 'pranzo', 'merenda', 'cena'];

export const NOME_PASTO: Record<TipoPasto, string> = {
  colazione: 'Colazione',
  spuntino: 'Spuntino',
  pranzo: 'Pranzo',
  merenda: 'Merenda',
  cena: 'Cena',
};

/** Lunedì = 1 … domenica = 7, come nella settimana ISO. */
export const NOMI_GIORNI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

export type GruppoAlimentare =
  | 'cereali'
  | 'pane'
  | 'legumi'
  | 'pesce'
  | 'carne_bianca'
  | 'carne_rossa'
  | 'salumi'
  | 'uova'
  | 'formaggi'
  | 'latte_yogurt'
  | 'verdura'
  | 'patate'
  | 'frutta'
  | 'frutta_secca'
  | 'condimenti'
  | 'dolci';

/** L'ordine conta: "fiocchi di latte" è formaggio, "fette biscottate" è pane, "frutta secca" non è frutta. */
const PAROLE_GRUPPO: [RegExp, GruppoAlimentare][] = [
  [/\b(formagg|mozzarell|ricott|parmigian|grana|pecorin|stracchin|fiocchi di latte|primo sale|feta|scamorz|caciott|emmental|crescenza|robiola|provol)/, 'formaggi'],
  [/\b(frutta secca|frutta a guscio|noci|mandorl|nocciol|pistacch|anacardi|semi oleosi)/, 'frutta_secca'],
  [/\b(pane|fette biscottate|cracker|gallett|grissin|frisell|piadin|focacci|pancarre)/, 'pane'],
  [/\b(prosciutt|bresaola|speck|salum|affettat|salame|mortadell)/, 'salumi'],
  [/\b(legum|ceci|fagiol|lenticch|piselli|fave|lupin|cicerchi|soia|edamame)/, 'legumi'],
  [/\b(pesce|merluzz|salmon|orat|branzin|spigol|tonno|sgombr|alic|acciug|nasello|platess|sogliol|gamber|calamar|polpo|seppi|cozze|vongol|trot|baccal|pesce spada|molluschi|crostacei)/, 'pesce'],
  [/\b(pollo|tacchin|carne bianca|coniglio)/, 'carne_bianca'],
  [/\b(manzo|vitell|maiale|carne rossa|bistecc|hamburger|macinat|agnello|lonza|fesa|carne)/, 'carne_rossa'],
  [/\b(uov|uovo|frittat|omelette|album)/, 'uova'],
  [/\b(latte|yogurt|yoghurt|kefir|skyr)/, 'latte_yogurt'],
  [/\b(pasta|spaghett|penne|fusill|riso|farro|orzo|cous ?cous|quinoa|cereal|gnocch|polenta|grano saraceno|miglio|avena|muesli|corn ?flakes|tagliatell|bulgur)/, 'cereali'],
  [/\b(patat)/, 'patate'],
  [/\b(verdur|ortagg|insalat|contorno|minestron|passato di verdur|zucchin|spinac|bietol|brocc|cavol|melanzan|peperon|pomodor|carot|finocch|fagiolin|carciof|rucola|lattug|radicchi|asparag|funghi|zucca|cetriol|sedano|cicori|verza|porri)/, 'verdura'],
  [/\b(frutt|mel[ae]\b|per[ae]\b|banan|arance?|kiwi|fragol|agrumi|mandarin|ciliegi|pesc[ah]e?\b|albicocc|prugn|uva|anguri|melone|frutti di bosco|spremuta)/, 'frutta'],
  [/\b(olio|burro|condiment)/, 'condimenti'],
  [/\b(biscott|marmellat|confettur|miele|cioccolat|zucchero|dolce|dolci|torta|cornett|crostat|gelato)/, 'dolci'],
];

/** Gruppi che decidono quale ricetta si cucina; gli altri (frutta, pane, latte…) restano voci a parte. */
export const GRUPPI_PRINCIPALI: ReadonlySet<GruppoAlimentare> = new Set([
  'cereali',
  'legumi',
  'pesce',
  'carne_bianca',
  'carne_rossa',
  'salumi',
  'uova',
  'formaggi',
  'verdura',
  'patate',
]);

export const NOME_GRUPPO: Record<GruppoAlimentare, string> = {
  cereali: 'cereali',
  pane: 'pane',
  legumi: 'legumi',
  pesce: 'pesce',
  carne_bianca: 'carne bianca',
  carne_rossa: 'carne rossa',
  salumi: 'salumi',
  uova: 'uova',
  formaggi: 'formaggi',
  latte_yogurt: 'latte e yogurt',
  verdura: 'verdura',
  patate: 'patate',
  frutta: 'frutta',
  frutta_secca: 'frutta secca',
  condimenti: 'condimenti',
  dolci: 'dolci',
};

/** Tutti i gruppi nominati nel testo ("pasta e ceci" → cereali e legumi), nell'ordine di PAROLE_GRUPPO. */
export function gruppiDaTesto(testo: string): GruppoAlimentare[] {
  let t = ` ${normalizza(testo)} `;
  const gruppi: GruppoAlimentare[] = [];
  for (const [re, gruppo] of PAROLE_GRUPPO) {
    if (!re.test(t)) continue;
    if (!gruppi.includes(gruppo)) gruppi.push(gruppo);
    // Tolta la parola riconosciuta, "fiocchi di latte" non conta anche come latte.
    t = t.replace(re, ' ');
  }
  return gruppi;
}

export function gruppoDaTesto(testo: string): GruppoAlimentare | undefined {
  return gruppiDaTesto(testo)[0];
}

const GRUPPO_PER_ID: Record<string, GruppoAlimentare> = {
  'ing:pasta': 'cereali', 'ing:spaghetti': 'cereali', 'ing:penne': 'cereali', 'ing:fusilli': 'cereali', 'ing:pasta_uovo': 'cereali',
  'ing:lasagne': 'cereali', 'ing:gnocchi': 'cereali', 'ing:riso': 'cereali', 'ing:riso_risotti': 'cereali',
  'ing:pane': 'pane', 'ing:pancarre': 'pane',
  'ing:ceci': 'legumi', 'ing:fagioli': 'legumi', 'ing:lenticchie': 'legumi', 'ing:piselli': 'legumi',
  'ing:tonno_scatola': 'pesce',
  'ing:petto_pollo': 'carne_bianca', 'ing:pollo': 'carne_bianca', 'ing:tacchino': 'carne_bianca',
  'ing:carne_macinata': 'carne_rossa', 'ing:manzo': 'carne_rossa', 'ing:maiale': 'carne_rossa', 'ing:salsiccia': 'carne_rossa',
  'ing:prosciutto_cotto': 'salumi', 'ing:prosciutto_crudo': 'salumi', 'ing:pancetta': 'salumi', 'ing:guanciale': 'salumi',
  'ing:latte': 'latte_yogurt', 'ing:yogurt': 'latte_yogurt', 'ing:burro': 'condimenti', 'ing:panna': 'condimenti', 'ing:uova': 'uova',
  'ing:patata': 'patate', 'ing:minestrone_surgelato': 'verdura',
  'ing:mela': 'frutta', 'ing:pera': 'frutta', 'ing:banana': 'frutta', 'ing:arancia': 'frutta', 'ing:kiwi': 'frutta', 'ing:fragole': 'frutta',
  'ing:noci': 'frutta_secca', 'ing:mandorle': 'frutta_secca',
  'ing:olio_evo': 'condimenti',
  'ing:biscotti': 'dolci', 'ing:marmellata': 'dolci', 'ing:miele': 'dolci', 'ing:zucchero': 'dolci', 'ing:savoiardi': 'dolci',
};

/** Aromi e insaporitori: compaiono nelle ricette ma non fanno "la verdura" del pasto. */
const AROMI = new Set(['ing:aglio', 'ing:basilico', 'ing:prezzemolo', 'ing:rosmarino', 'ing:limone', 'ing:peperoncino', 'ing:origano']);

export function gruppoIngrediente(ing: Ingrediente | undefined): GruppoAlimentare | undefined {
  if (!ing) return undefined;
  const diretto = GRUPPO_PER_ID[ing.id];
  if (diretto) return diretto;
  if (AROMI.has(ing.id)) return undefined;
  if (ing.dieta) return ing.dieta;
  if (ing.reparto === 'pesce') return 'pesce';
  if (ing.reparto === 'gastronomia' && ing.classi.includes('latticini')) return 'formaggi';
  if (ing.reparto === 'frutta_verdura') return 'verdura';
  return undefined;
}

/** Collega l'alimento a un ingrediente e a un gruppo, sul dispositivo. */
export function arricchisciVoce(voce: VoceDieta): VoceDieta {
  const migliore = cercaIngredienti(voce.testo, 1)[0];
  const ing = migliore && migliore.confidenza >= 0.75 ? migliore.ingrediente : undefined;
  // Il testo vince sull'ingrediente: "pane integrale" è pane anche se l'ingrediente trovato fosse un altro.
  const gruppo = gruppoDaTesto(voce.testo) ?? gruppoIngrediente(ing);
  const alternative = (voce.alternative ?? []).map((a) => a.trim()).filter(Boolean);
  const pulita: VoceDieta = { testo: voce.testo.trim() };
  if (voce.quantita_g && voce.quantita_g > 0) pulita.quantita_g = Math.round(voce.quantita_g);
  if (voce.quantita?.trim()) pulita.quantita = voce.quantita.trim();
  if (alternative.length) pulita.alternative = alternative;
  if (ing) pulita.ingrediente_id = ing.id;
  if (gruppo) pulita.gruppo = gruppo;
  return pulita;
}

/** Gruppi di una voce, alternative comprese ("pasta o riso" → cereali; "pesce o legumi" → entrambi). */
export function gruppiVoce(voce: VoceDieta): GruppoAlimentare[] {
  const gruppi = new Set<GruppoAlimentare>();
  if (voce.gruppo) gruppi.add(voce.gruppo);
  for (const g of gruppiDaTesto(voce.testo)) gruppi.add(g);
  for (const a of voce.alternative ?? []) {
    const g = gruppoDaTesto(a) ?? gruppoIngrediente(ingrediente(cercaIngredienti(a, 1)[0]?.ingrediente.id));
    if (g) gruppi.add(g);
  }
  return [...gruppi];
}

/** "200 ml" per latte e bevande, "80 g" per il resto. */
export function quantitaVoce(voce: VoceDieta): string | undefined {
  if (voce.quantita_g) return `${voce.quantita_g} ${ingrediente(voce.ingrediente_id)?.unita === 'ml' ? 'ml' : 'g'}`;
  return voce.quantita;
}

export function descriviVoce(voce: VoceDieta): string {
  const quantita = quantitaVoce(voce);
  const alternative = voce.alternative?.length ? ` (o ${voce.alternative.join(', o ')})` : '';
  return `${voce.testo}${alternative}${quantita ? ` ${quantita}` : ''}`;
}

/** Sette giorni vuoti, lunedì–domenica. */
export function settimanaVuota(): GiornoDieta[] {
  return NOMI_GIORNI.map((_, i) => ({ giorno: i + 1, pasti: [] }));
}

function ordinaPasti(pasti: PastoDieta[]): PastoDieta[] {
  return [...pasti].sort((a, b) => PASTI_DIETA.indexOf(a.tipo) - PASTI_DIETA.indexOf(b.tipo));
}

// ───────── Lettura del testo, senza AI ─────────

const GIORNI_RE: [RegExp, number][] = [
  [/\blunedi\b/, 1],
  [/\bmartedi\b/, 2],
  [/\bmercoledi\b/, 3],
  [/\bgiovedi\b/, 4],
  [/\bvenerdi\b/, 5],
  [/\bsabato\b/, 6],
  [/\bdomenica\b/, 7],
];

const PASTI_RE: [RegExp, TipoPasto | 'spuntino?'][] = [
  [/\b(prima )?colazione\b/, 'colazione'],
  [/\b(merenda|spuntino pomeridiano|spuntino del pomeriggio|meta pomeriggio)\b/, 'merenda'],
  [/\b(spuntino|meta mattina|meta mattinata)\b/, 'spuntino?'],
  [/\bpranzo\b/, 'pranzo'],
  [/\bcena\b/, 'cena'],
];

const QUANTITA = /(\d+(?:[.,]\d+)?)\s*(kg|g|gr|grammi|ml|cl|l|lt|litri)\b\.?|\b(g|gr|ml)\.?\s*(\d+(?:[.,]\d+)?)/i;
const QUANTITA_A_PEZZI = /\b(\d+|un|una|uno|mezz[oa])\s+(vasetto|vasetti|fetta|fette|frutto|frutti|cucchiai[on]?[oi]?|cucchiaino|cucchiaini|tazza|tazzina|bicchiere|porzione|porzioni|pezzo|pezzi|panino|scatoletta|manciata|confezione|uovo|uova)\b/i;

function grammi(numero: string, unita: string): number {
  const n = Number(numero.replace(',', '.'));
  const u = unita.toLowerCase();
  if (u === 'kg' || u === 'l' || u === 'lt' || u === 'litri') return n * 1000;
  if (u === 'cl') return n * 10;
  return n;
}

/** "Pasta integrale 80 g", "g 80 di riso", "1 vasetto di yogurt", "pasta o riso 70 g". */
export function leggiVoce(testo: string): VoceDieta | null {
  let t = testo.replace(/^[\s\-–•·*:.)\]]+|[\s\-–•·*:.,;]+$/g, '').replace(/\s+/g, ' ');
  if (!/[a-zà-ù]{3,}/i.test(t)) return null;
  const voce: VoceDieta = { testo: '' };
  const q = QUANTITA.exec(t);
  if (q) {
    voce.quantita_g = q[1] ? grammi(q[1], q[2]!) : grammi(q[4]!, q[3]!);
    t = (t.slice(0, q.index) + ' ' + t.slice(q.index + q[0].length)).trim();
  } else {
    const p = QUANTITA_A_PEZZI.exec(t);
    if (p) voce.quantita = p[0];
  }
  t = t.replace(/^(di|d'|con)\s+/i, '').replace(/\(\s*\)/g, '').replace(/\s+/g, ' ').replace(/[\s,:;(]+$/, '').trim();
  const [principale, ...alternative] = t.split(/\s+(?:o|oppure|in alternativa(?: a)?|o in alternativa)\s+|\s*\/\s*/i);
  if (!principale || !/[a-zà-ù]{3,}/i.test(principale)) return null;
  voce.testo = principale.charAt(0).toUpperCase() + principale.slice(1);
  if (alternative.length) voce.alternative = alternative.filter((a) => /[a-zà-ù]{3,}/i.test(a));
  return arricchisciVoce(voce);
}

function spezzaVoci(riga: string): string[] {
  return riga.split(/\s*[+;•·]\s*|,\s+(?=[a-zà-ù\d])|\s+-\s+|\s+e\s+(?=\d)/i).filter((s) => s.trim());
}

export interface DietaLetta {
  titolo?: string;
  dietista?: string;
  note: string[];
  giorni: GiornoDieta[];
}

/**
 * Riconosce giorni ("Lunedì"), pasti ("Pranzo:") e alimenti con le quantità.
 * Se la dieta non distingue i giorni, lo stesso schema vale per tutta la settimana.
 */
export function leggiDietaDaTesto(testo: string): DietaLetta {
  const giorni = settimanaVuota();
  const note: string[] = [];
  let giornoCorrente: number | null = null;
  let pastoCorrente: TipoPasto | null = null;
  let giorniTrovati = false;
  let dietista: string | undefined;
  const generico: PastoDieta[] = [];

  const pastoDi = (g: number | null, tipo: TipoPasto): PastoDieta => {
    const pasti = g === null ? generico : giorni[g - 1]!.pasti;
    let p = pasti.find((x) => x.tipo === tipo);
    if (!p) {
      p = { tipo, voci: [] };
      pasti.push(p);
    }
    return p;
  };

  for (const grezza of testo.split(/\r?\n/)) {
    let riga = grezza.replace(/\s+/g, ' ').trim();
    if (!riga) continue;
    const n = ` ${normalizza(riga)} `;
    if (/\b(dott|dr|dietist|nutrizionist|biolog)/.test(n) && !dietista && !QUANTITA.test(riga)) {
      dietista = riga;
      continue;
    }
    if (/^(note?|n\.? ?b\.?|consigli|indicazioni|avvertenze)\b/i.test(riga)) {
      note.push(riga.replace(/^(note?|n\.? ?b\.?)[\s:.]*/i, ''));
      pastoCorrente = null;
      continue;
    }
    for (const [re, g] of GIORNI_RE) {
      if (re.test(n)) {
        giornoCorrente = g;
        giorniTrovati = true;
        pastoCorrente = null;
        riga = riga.replace(/\b(luned[iì]|marted[iì]|mercoled[iì]|gioved[iì]|venerd[iì]|sabato|domenica)\b/i, '');
        break;
      }
    }
    for (const [re, tipo] of PASTI_RE) {
      const m = re.exec(` ${normalizza(riga)} `);
      if (m) {
        pastoCorrente = tipo === 'spuntino?' ? (pastoCorrente && PASTI_DIETA.indexOf(pastoCorrente) >= 2 ? 'merenda' : 'spuntino') : tipo;
        riga = riga.replace(/^[^:]*?\b(prima colazione|colazione|spuntino[^:]*?|met[aà] mattin[ao]|pranzo|merenda|met[aà] pomeriggio|cena)\b\s*[:\-–]?/i, '');
        break;
      }
    }
    riga = riga.trim();
    if (!riga) continue;
    if (!pastoCorrente) {
      if (/[a-zà-ù]{3,}/i.test(riga)) note.push(riga);
      continue;
    }
    const pasto = pastoDi(giornoCorrente, pastoCorrente);
    for (const parte of spezzaVoci(riga)) {
      const voce = leggiVoce(parte);
      if (voce) pasto.voci.push(voce);
    }
  }

  // Schema unico (o voci prima del primo giorno): vale per i giorni che non ne hanno uno proprio.
  if (generico.length) {
    for (const g of giorni) {
      if (giorniTrovati && g.pasti.length) continue;
      g.pasti = generico.map((p) => ({ ...p, voci: p.voci.map((v) => ({ ...v })) }));
    }
  }
  for (const g of giorni) g.pasti = ordinaPasti(g.pasti.filter((p) => p.voci.length));
  const [titolo, ...altre] = note;
  return { titolo: titolo && titolo.length <= 60 ? titolo : undefined, dietista, note: titolo && titolo.length <= 60 ? altre : note, giorni };
}

// ───────── Risposta di Gemini ─────────

const TIPI_VALIDI = new Set<string>(PASTI_DIETA);

/** Controlla e pulisce il JSON di Gemini: niente di quello che arriva va preso per buono. */
export function dietaDaGemini(grezza: unknown): DietaLetta {
  const r = (grezza ?? {}) as Record<string, unknown>;
  const giorni = settimanaVuota();
  const generico: PastoDieta[] = [];
  const testoValido = (x: unknown) => (typeof x === 'string' && x.trim() ? x.trim().slice(0, 200) : undefined);
  for (const g of Array.isArray(r.giorni) ? r.giorni : []) {
    const giorno = Number((g as { giorno?: unknown })?.giorno);
    const pasti: PastoDieta[] = [];
    for (const p of Array.isArray((g as { pasti?: unknown })?.pasti) ? (g as { pasti: unknown[] }).pasti : []) {
      const tipo = String((p as { tipo?: unknown })?.tipo ?? '').toLowerCase();
      if (!TIPI_VALIDI.has(tipo)) continue;
      const voci: VoceDieta[] = [];
      for (const v of Array.isArray((p as { voci?: unknown })?.voci) ? (p as { voci: unknown[] }).voci : []) {
        const o = (v ?? {}) as Record<string, unknown>;
        const testo = testoValido(o.alimento) ?? testoValido(o.testo);
        if (!testo) continue;
        const g = Number(o.quantita_g);
        voci.push(
          arricchisciVoce({
            testo,
            ...(Number.isFinite(g) && g > 0 && g < 5000 ? { quantita_g: g } : {}),
            ...(testoValido(o.quantita) ? { quantita: testoValido(o.quantita) } : {}),
            alternative: Array.isArray(o.alternative) ? o.alternative.map(testoValido).filter((a): a is string => !!a) : [],
          }),
        );
      }
      if (voci.length) {
        const esistente = pasti.find((x) => x.tipo === tipo);
        if (esistente) esistente.voci.push(...voci);
        else pasti.push({ tipo: tipo as TipoPasto, voci });
      }
    }
    if (giorno >= 1 && giorno <= 7) giorni[giorno - 1]!.pasti = ordinaPasti(pasti);
    else if (pasti.length) generico.push(...pasti);
  }
  if (generico.length) for (const g of giorni) if (!g.pasti.length) g.pasti = ordinaPasti(generico.map((p) => ({ ...p, voci: [...p.voci] })));
  return {
    titolo: testoValido(r.titolo),
    dietista: testoValido(r.dietista),
    note: (Array.isArray(r.note) ? r.note : []).map(testoValido).filter((n): n is string => !!n).slice(0, 20),
    giorni,
  };
}

export function contaVoci(giorni: readonly GiornoDieta[]): number {
  return giorni.reduce((s, g) => s + g.pasti.reduce((t, p) => t + p.voci.length, 0), 0);
}
