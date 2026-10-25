/**
 * Inviti in famiglia. Chi ha creato il nucleo condivide la cartella del proprio Drive con
 * l'email di un familiare e gli manda un link; i dati restano sul Drive di chi invita.
 * Il link porta, dopo il #, gli id dei file e la chiave del nucleo: la parte dopo il # non
 * arriva a nessun server, e senza la condivisione su Drive il link da solo non apre nulla.
 */
import type { Membro } from '../dominio/tipi';
import { apriDocumentoLocale, collezione, modificaEntita } from '../piattaforma/documento';
import { condividi, ErroreDrive, scaricaFile } from '../piattaforma/drive';
import { tokenValido } from '../piattaforma/google';
import { confermaFile } from '../piattaforma/picker';
import { annotaNellArchivio, assicuraFileFoto, scaricaNucleo, type VoceArchivio } from './account';
import { salvaMembro, type DatiMembro } from './azioni';
import type { ContestoNucleo } from './contesto';
import { leggiNuclei, scriviMembroCorrente } from './registro';

export interface Invito {
  /** Nucleo */
  n: string;
  /** Nome del nucleo */
  nome: string;
  /** Chi invita */
  da: string;
  c: string;
  d: string;
  s: string;
  /** Chiave del nucleo (base64) */
  k: string;
  /** File delle foto */
  f?: string;
}

const base64url = (testo: string) => btoa(String.fromCharCode(...new TextEncoder().encode(testo))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const daBase64url = (testo: string) =>
  new TextDecoder().decode(Uint8Array.from(atob(testo.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)));

export function linkInvito(invito: Invito, origine: string, base: string): string {
  return `${origine}${base}invito#i=${base64url(JSON.stringify(invito))}`;
}

/** Legge l'invito dal # dell'indirizzo; null se non c'è o è rovinato. */
export function leggiInvito(hash: string): Invito | null {
  const valore = new URLSearchParams(hash.replace(/^#/, '')).get('i');
  if (!valore) return null;
  try {
    const invito = JSON.parse(daBase64url(valore)) as Partial<Invito>;
    const campi = ['n', 'nome', 'da', 'c', 'd', 's', 'k'] as const;
    return campi.every((c) => typeof invito[c] === 'string' && invito[c]) ? (invito as Invito) : null;
  } catch {
    return null;
  }
}

/** Condivide la cartella del nucleo con `email` e restituisce il link d'invito. Serve un token. */
export async function invita(ctx: ContestoNucleo, email: string, nomeChiInvita: string): Promise<string> {
  const nucleo = leggiNuclei().find((n) => n.id === ctx.nucleo.id);
  if (!nucleo?.drive) throw new Error('nucleo non collegato');
  // Solo chi ha creato il nucleo ha la chiave da mettere nel link.
  if (!nucleo.drive.chiave || nucleo.drive.proprietario === false) throw new Error('solo_proprietario');
  const nome = (collezione(ctx.dati, 'meta').get('nucleo')?.get('nome') as string | undefined) ?? nucleo.nome;
  const foto = await assicuraFileFoto(nucleo.id);
  await condividi(nucleo.drive.cartella, email, `${nomeChiInvita} ti invita nel nucleo «${nome}» di Masterfood. Apri il link che ti ha mandato.`);
  return linkInvito(
    { n: nucleo.id, nome, da: nomeChiInvita, c: nucleo.drive.cartella, d: nucleo.drive.dati, s: nucleo.drive.storico, k: nucleo.drive.chiave, f: foto },
    location.origin,
    import.meta.env.BASE_URL,
  );
}

/** Voce dell'archivio per chi è invitato: senza chiave, che resta solo protetta sul telefono. */
const voceDa = (invito: Invito, membroId: string): VoceArchivio => ({
  id: invito.n,
  nome: invito.nome,
  membro_id: membroId,
  cartella: invito.c,
  dati: invito.d,
  storico: invito.s,
  foto: invito.f,
});

/**
 * Vero se l'app vede già i file del nucleo. Con drive.file Google chiede a ogni invitato di
 * confermarli una volta sola col selettore; la conferma resta valida per l'account, su ogni telefono.
 */
export async function accessoAiFile(invito: Invito): Promise<boolean> {
  try {
    await scaricaFile(invito.d);
    return true;
  } catch (e) {
    if (e instanceof ErroreDrive && (e.stato === 404 || e.stato === 403)) return false;
    throw e;
  }
}

/** Apre il selettore di Google sui file del nucleo. Va chiamata da un tocco. */
export async function confermaFileInvito(invito: Invito): Promise<void> {
  const file = [invito.d, invito.s, ...(invito.f ? [invito.f] : [])];
  const confermati = await confermaFile(file, tokenValido()!, `Seleziona i ${file.length} file e tocca «Seleziona»`);
  if (!confermati.includes(invito.d) || !confermati.includes(invito.s)) throw new Error('file_non_confermati');
}

/** Scarica il nucleo condiviso, a file già accessibili. Serve un token valido. */
export async function scaricaNucleoCondiviso(invito: Invito): Promise<void> {
  await scaricaNucleo(voceDa(invito, ''), invito.k);
}

/** Membri del nucleo scaricato, per scegliere "chi sei". */
export async function membriDelNucleo(nucleoId: string): Promise<Membro[]> {
  const { doc, persistenza } = await apriDocumentoLocale(nucleoId, 'dati');
  const membri = [...collezione(doc, 'membri').values()].map((m) => m.toJSON() as Membro).filter((m) => !m.eliminato_il && m.attivo !== false);
  await persistenza.destroy();
  doc.destroy();
  return membri;
}

/** Collega l'account al profilo scelto (o a uno nuovo) e annota il nucleo nell'archivio dell'account. */
export async function completaIngresso(invito: Invito, email: string, scelta: { membroId: string } | { nuovo: DatiMembro }): Promise<void> {
  const { doc, persistenza } = await apriDocumentoLocale(invito.n, 'dati');
  const { doc: storico, persistenza: persistenzaStorico } = await apriDocumentoLocale(invito.n, 'storico');
  let membroId: string;
  if ('membroId' in scelta) {
    membroId = scelta.membroId;
    modificaEntita(collezione(doc, 'membri').get(membroId)!, { utente_id: email }, membroId);
  } else {
    membroId = salvaMembro({ dati: doc, storico, membroId: '' }, { ...scelta.nuovo, utente_id: email });
  }
  await Promise.all([persistenza.destroy(), persistenzaStorico.destroy()]);
  doc.destroy();
  storico.destroy();
  scriviMembroCorrente(invito.n, membroId);
  await annotaNellArchivio(voceDa(invito, membroId));
}
