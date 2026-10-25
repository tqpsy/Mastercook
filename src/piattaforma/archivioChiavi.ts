/**
 * Chiavi dei nuclei condivisi da altri, conservate in IndexedDB come CryptoKey non esportabili:
 * il telefono di un invitato le usa per leggere e scrivere, ma l'app non le mostra né le copia
 * (né in chiaro nel browser, né nel suo Drive). Le chiavi dei propri nuclei restano nell'archivio
 * dell'account, perché servono a invitare e a ritrovare i dati su un telefono nuovo.
 */
const DB = 'masterfood-chiavi';
const STORE = 'chiavi';

function apri(): Promise<IDBDatabase> {
  return new Promise((ok, ko) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => ko(r.error);
  });
}

async function operazione<T>(modo: IDBTransactionMode, fai: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await apri();
  try {
    return await new Promise<T>((ok, ko) => {
      const r = fai(db.transaction(STORE, modo).objectStore(STORE));
      r.onsuccess = () => ok(r.result);
      r.onerror = () => ko(r.error);
    });
  } finally {
    db.close();
  }
}

export async function salvaChiaveProtetta(nucleoId: string, grezza: Uint8Array): Promise<CryptoKey> {
  const chiave = await crypto.subtle.importKey('raw', grezza as Uint8Array<ArrayBuffer>, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  await operazione('readwrite', (s) => s.put(chiave, nucleoId));
  return chiave;
}

export const leggiChiaveProtetta = (nucleoId: string) => operazione<CryptoKey | undefined>('readonly', (s) => s.get(nucleoId));

export const eliminaChiaveProtetta = (nucleoId: string) => operazione('readwrite', (s) => s.delete(nucleoId)).then(() => undefined);
