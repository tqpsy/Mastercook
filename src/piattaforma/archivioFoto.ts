/**
 * Foto correnti di frigo, freezer e dispensa, in IndexedDB: per ogni zona un elenco di foto
 * (ripiani, cassetti, portiera…), che si aggiunge o si toglie una alla volta.
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

type Valore = { elenco: FotoSalvata[] } | { blob: Blob; il: string };

function comeElenco(v: Valore | undefined): FotoSalvata[] {
  if (!v) return [];
  // Prima c'era una sola foto per zona.
  if ('blob' in v) return [{ id: 'prima', blob: v.blob, il: v.il }];
  return v.elenco;
}

export async function leggiFotoZona(zona: string): Promise<FotoSalvata[]> {
  const db = await apri();
  const valore = await new Promise<Valore | undefined>((ok, ko) => {
    const r = db.transaction(STORE).objectStore(STORE).get(`foto:${zona}`);
    r.onsuccess = () => ok(r.result as Valore | undefined);
    r.onerror = () => ko(r.error);
  });
  db.close();
  return comeElenco(valore);
}

export async function salvaFotoZona(zona: string, elenco: FotoSalvata[]): Promise<void> {
  const db = await apri();
  await new Promise<void>((ok, ko) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    if (elenco.length) store.put({ elenco: elenco.slice(-MASSIMO_FOTO) } satisfies Valore, `foto:${zona}`);
    else store.delete(`foto:${zona}`);
    tx.oncomplete = () => ok();
    tx.onerror = () => ko(tx.error);
  });
  db.close();
}
