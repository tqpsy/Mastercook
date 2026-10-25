/**
 * Ripristino dalla copia dei dati scaricata da Impostazioni → «Scarica i dati (JSON)».
 * Prudente: aggiunge solo quello che manca (o che qui è nel cestino e nel file no), non
 * sovrascrive mai ciò che c'è già su questo dispositivo.
 */
import * as Y from 'yjs';
import { uuidv7 } from '../dominio/id';
import { apriDocumentoLocale, collezione, COLLEZIONI_DATI, COLLEZIONI_STORICO, type CollezioneDati, type CollezioneStorico } from '../piattaforma/documento';
import { salvaNucleoLocale, scriviMembroCorrente } from './registro';

type Contenuto = Record<string, Record<string, Record<string, unknown>>>;

export interface Backup {
  esportato_il?: string;
  dati: Contenuto;
  storico: Contenuto;
}

/** Campi che nel documento sono liste CRDT (le modifiche concorrenti si sommano). */
const CAMPI_LISTA = new Set(['movimenti']);

export function leggiBackup(testo: string): Backup {
  let json: unknown;
  try {
    json = JSON.parse(testo);
  } catch {
    throw new Error('Il file non è una copia di Masterfood (non è un JSON valido).');
  }
  const b = json as Partial<Backup> & { formato?: string };
  if (b?.formato !== 'masterfood-export' || typeof b.dati !== 'object' || !b.dati) {
    throw new Error('Il file non è una copia dei dati di Masterfood.');
  }
  return { esportato_il: b.esportato_il, dati: b.dati, storico: b.storico ?? {} };
}

function nuovaEntita(oggetto: Record<string, unknown>): Y.Map<unknown> {
  const entita = new Y.Map<unknown>();
  for (const [campo, valore] of Object.entries(oggetto)) {
    if (valore === undefined) continue;
    if (CAMPI_LISTA.has(campo) && Array.isArray(valore)) {
      const lista = new Y.Array<unknown>();
      lista.push(valore);
      entita.set(campo, lista);
    } else entita.set(campo, valore);
  }
  return entita;
}

/** Unisce una parte della copia al documento; restituisce quanti elementi ha aggiunto. */
export function importaNelDocumento(doc: Y.Doc, contenuto: Contenuto, nomi: readonly (CollezioneDati | CollezioneStorico)[]): number {
  let aggiunti = 0;
  doc.transact(() => {
    for (const nome of nomi) {
      const elementi = contenuto[nome];
      if (!elementi || typeof elementi !== 'object') continue;
      const coll = collezione(doc, nome);
      for (const [id, oggetto] of Object.entries(elementi)) {
        if (!oggetto || typeof oggetto !== 'object') continue;
        const locale = coll.get(id);
        const daRecuperare = locale?.get('eliminato_il') && !oggetto.eliminato_il;
        if (locale && !daRecuperare) continue;
        coll.set(id, nuovaEntita(oggetto));
        aggiunti++;
      }
    }
  }, 'ripristino');
  return aggiunti;
}

export function ripristinaNelNucleo(ctx: { dati: Y.Doc; storico: Y.Doc }, backup: Backup): number {
  return importaNelDocumento(ctx.dati, backup.dati, COLLEZIONI_DATI) + importaNelDocumento(ctx.storico, backup.storico, COLLEZIONI_STORICO);
}

/** Su un telefono nuovo, senza Google Drive: ricrea il nucleo dalla copia. Restituisce l'id. */
export async function creaNucleoDaBackup(backup: Backup): Promise<string> {
  const nucleoId = uuidv7();
  const { doc, persistenza } = await apriDocumentoLocale(nucleoId, 'dati');
  const { doc: storico, persistenza: persistenzaStorico } = await apriDocumentoLocale(nucleoId, 'storico');
  ripristinaNelNucleo({ dati: doc, storico }, backup);
  const nome = (collezione(doc, 'meta').get('nucleo')?.get('nome') as string | undefined) ?? 'Casa';
  const membri = [...collezione(doc, 'membri').values()].filter((m) => !m.get('eliminato_il'));
  await Promise.all([persistenza.destroy(), persistenzaStorico.destroy()]);
  if (!membri.length) throw new Error('Nella copia non c’è nessun profilo.');
  salvaNucleoLocale({ id: nucleoId, nome, creato_il: new Date().toISOString(), modalita: 'locale' });
  scriviMembroCorrente(nucleoId, membri[0]!.get('id') as string);
  return nucleoId;
}
