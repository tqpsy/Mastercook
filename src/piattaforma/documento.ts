/**
 * Documento CRDT Yjs del nucleo.
 *
 * Due documenti per nucleo, come i due file su Drive:
 * - "dati" (nucleo-dati.mfd): profili, inventario, lista, ricette, piani…
 * - "storico" (nucleo-storico.mfd): eventi immutabili e aggregati mensili.
 * Ogni collezione è una Y.Map di entità, ogni entità una Y.Map (LWW per campo).
 */
import { IndexeddbPersistence } from 'y-indexeddb';
import * as Y from 'yjs';
import type { MembroId, MetadatiComuni } from '../dominio/tipi';
import { cifraFile, decifraFile } from './cifratura';

export const COLLEZIONI_DATI = [
  'meta',
  'impostazioni',
  'membri',
  'prodotti_nucleo',
  'inventario',
  'scorte_minime',
  'ricette',
  'ricette_meta',
  'categorie_ricette',
  'piani',
  'diete',
  'eventi_ospiti',
  'liste',
  'acquisti_in_corso',
  'foto',
] as const;

export const COLLEZIONI_STORICO = ['eventi', 'aggregati'] as const;

export type CollezioneDati = (typeof COLLEZIONI_DATI)[number];
export type CollezioneStorico = (typeof COLLEZIONI_STORICO)[number];
export type TipoDocumento = 'dati' | 'storico';

export type Entita = Y.Map<unknown>;
export type Collezione = Y.Map<Entita>;

export function collezione(doc: Y.Doc, nome: CollezioneDati | CollezioneStorico): Collezione {
  return doc.getMap<Entita>(nome);
}

/**
 * Apre il documento e lo collega alla sua copia in IndexedDB.
 * y-indexeddb usa un database per documento: `masterfood-<idNucleo>-dati` e `-storico`.
 */
export async function apriDocumentoLocale(
  nucleoId: string,
  tipo: TipoDocumento,
): Promise<{ doc: Y.Doc; persistenza: IndexeddbPersistence }> {
  const doc = new Y.Doc();
  const persistenza = new IndexeddbPersistence(`masterfood-${nucleoId}-${tipo}`, doc);
  await persistenza.whenSynced;
  return { doc, persistenza };
}

/** Inserisce una nuova entità con i metadati comuni (autore e istanti). */
export function inserisciEntita<T extends Omit<MetadatiComuni, 'creato_da' | 'creato_il' | 'modificato_da' | 'modificato_il'>>(
  coll: Collezione,
  dati: T,
  autore: MembroId,
  adesso: string = new Date().toISOString(),
): Entita {
  const entita = new Y.Map<unknown>();
  coll.doc!.transact(() => {
    for (const [campo, valore] of Object.entries(dati)) if (valore !== undefined) entita.set(campo, valore);
    entita.set('creato_da', autore);
    entita.set('creato_il', adesso);
    entita.set('modificato_da', autore);
    entita.set('modificato_il', adesso);
    coll.set(dati.id, entita);
  });
  return entita;
}

/** Aggiorna dei campi lasciando traccia dell'autore ("modificato da Maria"). */
export function modificaEntita(entita: Entita, campi: Record<string, unknown>, autore: MembroId, adesso: string = new Date().toISOString()): void {
  entita.doc!.transact(() => {
    for (const [campo, valore] of Object.entries(campi)) {
      if (valore === undefined) entita.delete(campo);
      else entita.set(campo, valore);
    }
    entita.set('modificato_da', autore);
    entita.set('modificato_il', adesso);
  });
}

/** Eliminazione morbida: l'entità resta nel cestino 30 giorni. */
export function eliminaEntita(entita: Entita, autore: MembroId, adesso: string = new Date().toISOString()): void {
  modificaEntita(entita, { eliminato_il: adesso }, autore, adesso);
}

/** Serializza e cifra l'intero documento per caricarlo su Drive. */
export async function esportaDocumentoCifrato(doc: Y.Doc, chiave: CryptoKey, versioneChiave: number): Promise<Uint8Array> {
  return cifraFile(chiave, versioneChiave, Y.encodeStateAsUpdate(doc));
}

/** Decifra un file scaricato da Drive e lo unisce al documento locale (merge CRDT). */
export async function applicaDocumentoCifrato(doc: Y.Doc, chiave: CryptoKey, file: Uint8Array): Promise<void> {
  Y.applyUpdate(doc, await decifraFile(chiave, file), 'drive');
}
