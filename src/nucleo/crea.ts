import { uuidv7 } from '../dominio/id';
import { apriDocumentoLocale, collezione, inserisciEntita } from '../piattaforma/documento';
import { salvaMembro, type DatiMembro } from './azioni';
import { salvaNucleoLocale, scriviMembroCorrente } from './registro';

/** Versione dello schema del documento: un client con schema più vecchio apre in sola lettura. */
export const VERSIONE_SCHEMA = 1;

/**
 * Crea un nucleo "Solo su questo dispositivo": nessun account né server, i dati restano in
 * IndexedDB. Collegare Google Drive in seguito non cambia gli id, quindi nulla va migrato.
 */
export async function creaNucleoLocale(nome: string, primoMembro: DatiMembro): Promise<string> {
  const nucleoId = uuidv7();
  const membroId = uuidv7();
  const { doc, persistenza } = await apriDocumentoLocale(nucleoId, 'dati');
  const { doc: docStorico, persistenza: persistenzaStorico } = await apriDocumentoLocale(nucleoId, 'storico');
  doc.transact(() => {
    inserisciEntita(collezione(doc, 'meta'), { id: 'nucleo', nome, versione_schema: VERSIONE_SCHEMA }, membroId);
    salvaMembro({ dati: doc, storico: docStorico, membroId }, primoMembro, membroId);
  });
  await Promise.all([persistenza.destroy(), persistenzaStorico.destroy()]);
  salvaNucleoLocale({ id: nucleoId, nome, creato_il: new Date().toISOString(), modalita: 'locale' });
  scriviMembroCorrente(nucleoId, membroId);
  return nucleoId;
}
