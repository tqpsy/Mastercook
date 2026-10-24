/**
 * Account Google + Supabase e collegamento del nucleo al Google Drive dell'amministratore.
 * Supabase custodisce solo l'appartenenza e la chiave del nucleo (in Vault);
 * i dati viaggiano cifrati sul dispositivo e stanno su Drive come file .mfd.
 */
import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { esportaChiave, generaChiaveNucleo, importaChiave } from '../piattaforma/cifratura';
import { applicaDocumentoCifrato, apriDocumentoLocale, collezione, esportaDocumentoCifrato } from '../piattaforma/documento';
import { creaCartella, creaFile, scaricaFile } from '../piattaforma/drive';
import { esciDaGoogle } from '../piattaforma/google';
import { supabase } from '../piattaforma/supabase';
import type { ContestoNucleo } from './contesto';
import { leggiNuclei, salvaNucleoLocale, scriviMembroCorrente, type NucleoLocale } from './registro';

/** Versione della chiave del nucleo: cambierà solo con la rotazione all'uscita di un membro. */
export const VERSIONE_CHIAVE = 1;

interface StatoAccount {
  sessione: Session | null;
  pronto: boolean;
}

export const useAccount = create<StatoAccount>(() => ({ sessione: null, pronto: false }));

const client = supabase();
if (client) {
  client.auth.getSession().then(({ data }) => useAccount.setState({ sessione: data.session, pronto: true }));
  client.auth.onAuthStateChange((_evento, sessione) => useAccount.setState({ sessione, pronto: true }));
} else {
  useAccount.setState({ pronto: true });
}

export const emailAccount = () => useAccount.getState().sessione?.user.email;

function base64(byte: Uint8Array): string {
  return btoa(String.fromCharCode(...byte));
}
function daBase64(testo: string): Uint8Array {
  return Uint8Array.from(atob(testo), (c) => c.charCodeAt(0));
}

function richiediClient() {
  if (!client) throw new Error('configurazione');
  return client;
}

export async function accedi(idToken: string, nonce: string): Promise<void> {
  const sb = richiediClient();
  const { error } = await sb.auth.signInWithIdToken({ provider: 'google', token: idToken, nonce });
  if (error) throw error;
  const reg = await sb.rpc('registra_utente');
  if (reg.error) throw reg.error;
}

export async function esci(): Promise<void> {
  await esciDaGoogle();
  await client?.auth.signOut();
  chiavi.clear();
}

const chiavi = new Map<string, CryptoKey>();

export async function chiaveDelNucleo(nucleoId: string): Promise<CryptoKey> {
  const nota = chiavi.get(nucleoId);
  if (nota) return nota;
  const { data, error } = await richiediClient().rpc('chiave_nucleo', { p_nucleo: nucleoId });
  if (error || typeof data !== 'string') throw error ?? new Error('chiave');
  const chiave = await importaChiave(daBase64(data));
  chiavi.set(nucleoId, chiave);
  return chiave;
}

/**
 * Porta su Drive un nucleo nato sul dispositivo: crea la chiave, la affida a Vault,
 * crea la cartella e i due file cifrati e annota gli id. Serve un token Drive valido.
 */
export async function collegaNucleo(ctx: ContestoNucleo): Promise<NucleoLocale> {
  const sb = richiediClient();
  const nucleo = leggiNuclei().find((n) => n.id === ctx.nucleo.id) ?? ctx.nucleo;
  if (nucleo.drive) return nucleo;

  const nuova = await generaChiaveNucleo();
  const { error } = await sb.rpc('collega_nucleo', { p_id: nucleo.id, p_membro_id: ctx.membroId, p_chiave: base64(await esportaChiave(nuova)) });
  if (error) throw error;
  // Se il nucleo era già collegato (secondo tentativo), vale la chiave custodita da Vault.
  chiavi.delete(nucleo.id);
  const chiave = await chiaveDelNucleo(nucleo.id);

  const nome = (collezione(ctx.dati, 'meta').get('nucleo')?.get('nome') as string | undefined) ?? nucleo.nome;
  const cartella = await creaCartella(`Masterfood - ${nome}`);
  const dati = await creaFile('nucleo-dati.mfd', cartella, await esportaDocumentoCifrato(ctx.dati, chiave, VERSIONE_CHIAVE));
  const storico = await creaFile('nucleo-storico.mfd', cartella, await esportaDocumentoCifrato(ctx.storico, chiave, VERSIONE_CHIAVE));
  const aggiornamento = await sb
    .from('nuclei')
    .update({ drive_folder_id: cartella, drive_file_ids: { dati: dati.id, storico: storico.id } })
    .eq('id', nucleo.id);
  if (aggiornamento.error) throw aggiornamento.error;

  const collegato: NucleoLocale = { ...nucleo, nome, modalita: 'locale_drive', drive: { cartella, dati: dati.id, storico: storico.id } };
  salvaNucleoLocale(collegato);
  return collegato;
}

interface Appartenenza {
  nucleo_id: string;
  membro_id: string;
  nuclei: { drive_folder_id: string | null; drive_file_ids: { dati?: string; storico?: string } } | null;
}

/** Su un nuovo dispositivo: scarica da Drive i nuclei dell'account. Restituisce l'id del primo. */
export async function recuperaNuclei(): Promise<string | null> {
  const sb = richiediClient();
  const uid = useAccount.getState().sessione?.user.id;
  if (!uid) throw new Error('accesso');
  const { data, error } = await sb
    .from('appartenenze')
    .select('nucleo_id, membro_id, nuclei(drive_folder_id, drive_file_ids)')
    .eq('utente_id', uid)
    .in('stato', ['attivo', 'in_attesa_drive'])
    .returns<Appartenenza[]>();
  if (error) throw error;
  let primo: string | null = null;
  for (const a of data ?? []) {
    const file = a.nuclei?.drive_file_ids;
    if (!file?.dati || !file.storico || !a.nuclei?.drive_folder_id) continue;
    const chiave = await chiaveDelNucleo(a.nucleo_id);
    let nome = 'Casa';
    for (const tipo of ['dati', 'storico'] as const) {
      const { doc, persistenza } = await apriDocumentoLocale(a.nucleo_id, tipo);
      await applicaDocumentoCifrato(doc, chiave, await scaricaFile(file[tipo]!));
      if (tipo === 'dati') nome = (collezione(doc, 'meta').get('nucleo')?.get('nome') as string | undefined) ?? nome;
      await persistenza.destroy();
      doc.destroy();
    }
    salvaNucleoLocale({
      id: a.nucleo_id,
      nome,
      creato_il: new Date().toISOString(),
      modalita: 'locale_drive',
      drive: { cartella: a.nuclei.drive_folder_id, dati: file.dati, storico: file.storico },
    });
    scriviMembroCorrente(a.nucleo_id, a.membro_id);
    primo ??= a.nucleo_id;
  }
  return primo;
}
