/**
 * Foto correnti di frigo, freezer e dispensa, in IndexedDB: per ogni nucleo e zona un elenco di
 * foto (ripiani, cassetti, portiera…), che si aggiunge o si toglie una alla volta.
 */
const DB = 'masterfood-foto';
const STORE = 'foto';

function apri(): Promise<IDBDatabase> {
  return new Promise((ok, ko) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => ko(r.error);
  });
}

export interface FotoSalvata {
  id: string;
  blob: Blob;
  il: string;
}

/** Al massimo tante foto per zona: bastano per un frigo con cassetti e portiera. */
export const MASSIMO_FOTO = 8;

type Valore = { elenco: FotoSalvata[]; aggiornata?: string } | { blob: Blob; il: string };

export interface Zona {
  foto: FotoSalvata[];
  /** Ultima modifica della zona: tra dispositivi vince la più recente. */
  aggiornata?: string;
}

function comeZona(v: Valore | undefined): Zona | undefined {
  if (!v) return undefined;
  // Prima c'era una sola foto per zona.
  if ('blob' in v) return { foto: [{ id: 'prima', blob: v.blob, il: v.il }], aggiornata: v.il };
  return { foto: v.elenco, aggiornata: v.aggiornata };
}

async function leggi(chiave: string): Promise<Valore | undefined> {
  const db = await apri();
  const valore = await new Promise<Valore | undefined>((ok, ko) => {
    const r = db.transaction(STORE).objectStore(STORE).get(chiave);
    r.onsuccess = () => ok(r.result as Valore | undefined);
    r.onerror = () => ko(r.error);
  });
  db.close();
  return valore;
}

/** Foto di una zona del nucleo (le foto salvate prima, senza nucleo, valgono per tutti). */
export async function leggiZona(nucleoId: string, zona: string): Promise<Zona> {
  return comeZona(await leggi(`foto:${nucleoId}:${zona}`)) ?? comeZona(await leggi(`foto:${zona}`)) ?? { foto: [] };
}

export async function salvaZona(nucleoId: string, zona: string, foto: FotoSalvata[], aggiornata = new Date().toISOString()): Promise<void> {
  const db = await apri();
  await new Promise<void>((ok, ko) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ elenco: foto.slice(-MASSIMO_FOTO), aggiornata } satisfies Valore, `foto:${nucleoId}:${zona}`);
    tx.oncomplete = () => ok();
    tx.onerror = () => ko(tx.error);
  });
  db.close();
}
