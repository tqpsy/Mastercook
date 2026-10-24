/** Foto correnti di frigo e dispensa (una per tipo, sovrascritta a ogni scatto), in IndexedDB. */
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
  blob: Blob;
  il: string;
}

export async function salvaFoto(chiave: string, blob: Blob): Promise<void> {
  const db = await apri();
  await new Promise<void>((ok, ko) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ blob, il: new Date().toISOString() } satisfies FotoSalvata, chiave);
    tx.oncomplete = () => ok();
    tx.onerror = () => ko(tx.error);
  });
  db.close();
}

export async function leggiFoto(chiave: string): Promise<FotoSalvata | undefined> {
  const db = await apri();
  const valore = await new Promise<FotoSalvata | undefined>((ok, ko) => {
    const r = db.transaction(STORE).objectStore(STORE).get(chiave);
    r.onsuccess = () => ok(r.result as FotoSalvata | undefined);
    r.onerror = () => ko(r.error);
  });
  db.close();
  return valore;
}
