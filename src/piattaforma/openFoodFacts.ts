/**
 * Ricerca di un prodotto per codice a barre su Open Food Facts (API pubblica e gratuita, dati ODbL),
 * chiamata direttamente dal dispositivo con cache locale di 30 giorni.
 */
import type { Allergene } from '../dominio/allergeni';
import { calcolaGenuinita, type GruppoNova, type NutriScore } from '../dominio/genuinita';
import { cercaIngredienti } from '../dominio/ricerca';
import type { UnitaCanonica } from '../dominio/tipi';
import { ALLERGENI_OFF, CATEGORIE_OFF, rischioAdditivi } from '../rif/mappaOff';

export interface ProdottoOff {
  gtin: string;
  nome: string;
  marca?: string;
  formato?: { quantita: number; unita: UnitaCanonica };
  ingrediente_id?: string;
  /** Confidenza del collegamento all'ingrediente (soglie 0,85 / 0,60). */
  confidenza: number;
  allergeni: Allergene[];
  tracce: Allergene[];
  additivi: string[];
  /** Numero di additivi dichiarato da OFF: 0 con lista vuota vuol dire "nessun additivo". */
  numero_additivi?: number;
  biologico?: boolean;
  nova?: GruppoNova;
  nutri_score?: NutriScore;
}

const CAMPI = [
  'product_name_it', 'product_name', 'generic_name_it', 'brands', 'quantity', 'categories_tags', 'allergens_tags', 'traces_tags',
  'additives_tags', 'additives_n', 'nova_group', 'nutriscore_grade', 'labels_tags',
].join(',');
const DURATA_CACHE = 30 * 86_400_000;

export class ErroreOff extends Error {
  constructor(public tipo: 'non_trovato' | 'rete' | 'tempo') {
    super(tipo);
  }
}

/** Cifra di controllo GS1 per EAN-8, UPC-A (12) ed EAN-13. */
export function codiceValido(codice: string): boolean {
  if (!/^\d{8}$|^\d{12,13}$/.test(codice)) return false;
  const cifre = codice.split('').map(Number);
  const controllo = cifre.pop()!;
  const somma = cifre.reverse().reduce((s, c, i) => s + c * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (somma % 10)) % 10 === controllo;
}

/** I codici che iniziano per 2 (prefissi 20–29) sono interni al negozio, spesso a peso variabile. */
export const codiceInterno = (codice: string) => codice.length === 13 && codice.startsWith('2');

export function gtin13(codice: string): string {
  return codice.padStart(13, '0');
}

export function leggiFormato(testo: string | undefined): ProdottoOff['formato'] {
  if (!testo) return undefined;
  const t = testo.toLowerCase().replace(',', '.');
  const multipla = t.match(/(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(kg|g|gr|ml|cl|l)\b/);
  const semplice = t.match(/(\d+(?:\.\d+)?)\s*(kg|g|gr|ml|cl|l)\b/);
  const pezzi = t.match(/(\d+)\s*(pz|pezzi|uova)\b/);
  let quantita: number;
  let unita: string;
  if (multipla) {
    quantita = Number(multipla[1]) * Number(multipla[2]);
    unita = multipla[3]!;
  } else if (semplice) {
    quantita = Number(semplice[1]);
    unita = semplice[2]!;
  } else if (pezzi) {
    return { quantita: Number(pezzi[1]), unita: 'pz' };
  } else return undefined;
  switch (unita) {
    case 'kg':
      return { quantita: quantita * 1000, unita: 'g' };
    case 'l':
      return { quantita: quantita * 1000, unita: 'ml' };
    case 'cl':
      return { quantita: quantita * 10, unita: 'ml' };
    case 'ml':
      return { quantita, unita: 'ml' };
    default:
      return { quantita, unita: 'g' };
  }
}

interface RispostaOff {
  status: number;
  product?: Record<string, unknown>;
}

export function daRispostaOff(gtin: string, p: Record<string, unknown>): ProdottoOff {
  const s = (k: string) => (typeof p[k] === 'string' && p[k] ? (p[k] as string) : undefined);
  const arr = (k: string) => (Array.isArray(p[k]) ? (p[k] as string[]) : []);
  const nome = s('product_name_it') ?? s('product_name') ?? s('generic_name_it') ?? `Prodotto ${gtin}`;
  const categorie = arr('categories_tags');
  let ingrediente_id: string | undefined;
  let confidenza = 0;
  for (let i = categorie.length - 1; i >= 0; i--) {
    const ing = CATEGORIE_OFF[categorie[i]!];
    if (ing) {
      ingrediente_id = `ing:${ing}`;
      confidenza = 0.9;
      break;
    }
  }
  if (!ingrediente_id) {
    const [migliore] = cercaIngredienti(nome, 1);
    if (migliore && migliore.confidenza >= 0.6) {
      ingrediente_id = migliore.ingrediente.id;
      confidenza = Math.min(0.84, migliore.confidenza);
    }
  }
  const allergeni = (k: string) => [...new Set(arr(k).map((t) => ALLERGENI_OFF[t]).filter((a): a is Allergene => !!a))];
  const nova = Number(p.nova_group);
  const ns = s('nutriscore_grade');
  const etichette = arr('labels_tags');
  return {
    gtin,
    nome,
    marca: s('brands')?.split(',')[0]?.trim(),
    formato: leggiFormato(s('quantity')),
    ingrediente_id,
    confidenza,
    allergeni: allergeni('allergens_tags'),
    tracce: allergeni('traces_tags'),
    additivi: arr('additives_tags'),
    numero_additivi: typeof p.additives_n === 'number' ? p.additives_n : undefined,
    biologico: etichette.length ? etichette.some((e) => e === 'en:organic' || e === 'en:eu-organic') : undefined,
    nova: nova >= 1 && nova <= 4 ? (nova as GruppoNova) : undefined,
    nutri_score: ns && 'abcde'.includes(ns) && ns.length === 1 ? (ns as NutriScore) : undefined,
  };
}

export function genuinitaProdotto(p: ProdottoOff) {
  return calcolaGenuinita({
    nutriScore: p.nutri_score,
    rischioAdditivi: rischioAdditivi(p.additivi, p.numero_additivi),
    nova: p.nova,
    biologico: p.biologico,
  });
}

function leggiCache(gtin: string): ProdottoOff | null | undefined {
  try {
    const v = localStorage.getItem(`masterfood:off:${gtin}`);
    if (!v) return undefined;
    const { il, prodotto } = JSON.parse(v) as { il: number; prodotto: ProdottoOff | null };
    return Date.now() - il < DURATA_CACHE ? prodotto : undefined;
  } catch {
    return undefined;
  }
}

function scriviCache(gtin: string, prodotto: ProdottoOff | null) {
  try {
    localStorage.setItem(`masterfood:off:${gtin}`, JSON.stringify({ il: Date.now(), prodotto }));
  } catch {
    // cache piena o non disponibile: si riprova la prossima volta
  }
}

export async function cercaProdotto(codice: string): Promise<ProdottoOff> {
  const gtin = gtin13(codice);
  const inCache = leggiCache(gtin);
  if (inCache) return inCache;
  if (inCache === null) throw new ErroreOff('non_trovato');
  const controllo = new AbortController();
  const timer = setTimeout(() => controllo.abort(), 4000);
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${gtin}?lc=it&fields=${CAMPI}`, { signal: controllo.signal });
    if (r.status === 404) {
      scriviCache(gtin, null);
      throw new ErroreOff('non_trovato');
    }
    if (!r.ok) throw new ErroreOff('rete');
    const dati = (await r.json()) as RispostaOff;
    if (dati.status !== 1 || !dati.product) {
      scriviCache(gtin, null);
      throw new ErroreOff('non_trovato');
    }
    const prodotto = daRispostaOff(gtin, dati.product);
    scriviCache(gtin, prodotto);
    return prodotto;
  } catch (e) {
    if (e instanceof ErroreOff) throw e;
    throw new ErroreOff(controllo.signal.aborted ? 'tempo' : 'rete');
  } finally {
    clearTimeout(timer);
  }
}
