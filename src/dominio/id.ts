/**
 * Identificatori del documento del nucleo.
 *
 * Le entità senza chiave naturale usano UUIDv7 (ordinabili nel tempo).
 * Le entità con chiave naturale usano id deterministici, così due dispositivi
 * offline che creano "la stessa cosa" producono lo stesso id e Yjs le unisce
 * invece di duplicarle.
 */

export function uuidv7(adesso: number = Date.now()): string {
  const byte = new Uint8Array(16);
  crypto.getRandomValues(byte);
  // 48 bit di timestamp in millisecondi, big-endian.
  let ts = adesso;
  for (let i = 5; i >= 0; i--) {
    byte[i] = ts % 256;
    ts = Math.floor(ts / 256);
  }
  byte[6] = (byte[6]! & 0x0f) | 0x70; // versione 7
  byte[8] = (byte[8]! & 0x3f) | 0x80; // variante RFC 9562
  const hex = [...byte].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Slug per ingredienti e ricette: minuscole, senza accenti, parole unite da "_". */
export function slug(testo: string): string {
  return testo
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const DATA_LOCALE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Data locale (fuso Europe/Rome) nel formato AAAA-MM-GG. */
export function dataLocale(istante: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(istante);
}

/** Settimana ISO 8601 di una data locale AAAA-MM-GG, es. "2026-W44". */
export function settimanaIso(data: string): string {
  const parti = DATA_LOCALE.exec(data);
  if (!parti) throw new Error(`Data non valida: ${data}`);
  const giorno = new Date(Date.UTC(Number(parti[1]), Number(parti[2]) - 1, Number(parti[3])));
  const giornoSettimana = giorno.getUTCDay() || 7; // lunedì = 1 … domenica = 7
  // Il giovedì della stessa settimana decide l'anno ISO.
  giorno.setUTCDate(giorno.getUTCDate() + 4 - giornoSettimana);
  const anno = giorno.getUTCFullYear();
  const inizioAnno = Date.UTC(anno, 0, 1);
  const numero = Math.ceil(((giorno.getTime() - inizioAnno) / 86_400_000 + 1) / 7);
  return `${anno}-W${String(numero).padStart(2, '0')}`;
}

export type TipoPasto = 'colazione' | 'pranzo' | 'merenda' | 'cena';

export const idPiano = (data: string) => `piano:${settimanaIso(data)}`;
export const idPasto = (data: string, tipo: TipoPasto) => `${data}:${tipo}`;
export const ID_LISTA_CORRENTE = 'lista:corrente';
/** Riga della lista per ingrediente generico (`ing:latte` → `art:ing:latte`) o testo libero. */
export const idArticoloLista = (ingredienteId: string) => `art:${ingredienteId}`;
export const idArticoloListaTesto = (testo: string) => `art:txt:${slug(testo)}`;
export const idAggregatoMese = (anno: number, mese: number) => `agg:${anno}-${String(mese).padStart(2, '0')}`;
export const idRicettaMeta = (ricettaId: string) => `meta:${ricettaId}`;
export const idFoto = (tipo: 'frigo' | 'dispensa') => `foto:${tipo}`;
export const idIngrediente = (nome: string) => `ing:${slug(nome)}`;
export const idRicettaSistema = (nome: string) => `sys:${slug(nome)}`;
export const idProdottoOff = (gtin13: string) => `off:${gtin13}`;
