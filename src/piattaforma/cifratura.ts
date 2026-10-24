/**
 * Cifratura lato client dei file del nucleo (AES-256-GCM, Web Crypto).
 *
 * Formato di un file .mfd:
 *   [0..3]   "MFD" + versione del formato (1)
 *   [4..7]   versione della chiave del nucleo (uint32 big-endian)
 *   [8..19]  IV casuale di 12 byte
 *   [20..]   testo cifrato + tag GCM
 * L'intestazione (byte 0..7) è autenticata come dato aggiuntivo: non si può
 * cambiare la versione della chiave senza invalidare il file.
 */

const MAGIA = [0x4d, 0x46, 0x44] as const; // "MFD"
const VERSIONE_FORMATO = 1;
const LUNGHEZZA_INTESTAZIONE = 8;
const LUNGHEZZA_IV = 12;

export class ErroreFileCifrato extends Error {
  override name = 'ErroreFileCifrato';
}

export async function generaChiaveNucleo(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

/** Esporta la chiave grezza (32 byte), da consegnare cifrata tramite Supabase Vault. */
export async function esportaChiave(chiave: CryptoKey): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.exportKey('raw', chiave));
}

export async function importaChiave(grezza: Uint8Array): Promise<CryptoKey> {
  if (grezza.byteLength !== 32) throw new ErroreFileCifrato('La chiave del nucleo deve essere di 256 bit');
  return crypto.subtle.importKey('raw', grezza as Uint8Array<ArrayBuffer>, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

function intestazione(versioneChiave: number): Uint8Array<ArrayBuffer> {
  const byte = new Uint8Array(LUNGHEZZA_INTESTAZIONE);
  byte.set(MAGIA, 0);
  byte[3] = VERSIONE_FORMATO;
  new DataView(byte.buffer).setUint32(4, versioneChiave, false);
  return byte;
}

export async function cifraFile(chiave: CryptoKey, versioneChiave: number, contenuto: Uint8Array): Promise<Uint8Array> {
  const testa = intestazione(versioneChiave);
  const iv = crypto.getRandomValues(new Uint8Array(LUNGHEZZA_IV));
  const cifrato = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: testa }, chiave, contenuto as Uint8Array<ArrayBuffer>),
  );
  const file = new Uint8Array(LUNGHEZZA_INTESTAZIONE + LUNGHEZZA_IV + cifrato.byteLength);
  file.set(testa, 0);
  file.set(iv, LUNGHEZZA_INTESTAZIONE);
  file.set(cifrato, LUNGHEZZA_INTESTAZIONE + LUNGHEZZA_IV);
  return file;
}

/** Legge la versione della chiave senza decifrare, per scegliere quale chiave usare. */
export function versioneChiaveFile(file: Uint8Array): number {
  if (
    file.byteLength < LUNGHEZZA_INTESTAZIONE + LUNGHEZZA_IV ||
    file[0] !== MAGIA[0] ||
    file[1] !== MAGIA[1] ||
    file[2] !== MAGIA[2]
  ) {
    throw new ErroreFileCifrato('Non è un file Masterfood');
  }
  if (file[3] !== VERSIONE_FORMATO) throw new ErroreFileCifrato(`Formato file ${file[3]} non supportato`);
  return new DataView(file.buffer, file.byteOffset).getUint32(4, false);
}

export async function decifraFile(chiave: CryptoKey, file: Uint8Array): Promise<Uint8Array> {
  versioneChiaveFile(file);
  const testa = file.slice(0, LUNGHEZZA_INTESTAZIONE);
  const iv = file.slice(LUNGHEZZA_INTESTAZIONE, LUNGHEZZA_INTESTAZIONE + LUNGHEZZA_IV);
  const cifrato = file.slice(LUNGHEZZA_INTESTAZIONE + LUNGHEZZA_IV);
  try {
    return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: testa }, chiave, cifrato));
  } catch {
    throw new ErroreFileCifrato('Chiave errata o file danneggiato');
  }
}
