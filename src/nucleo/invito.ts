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
  const nome = (collezione(ctx.dati, 'meta').get('nucleo')?.get('nome') as string | undefined) ?? nucleo.nome;
  const foto = await assicuraFileFoto(nucleo.id);
  await condividi(nucleo.drive.cartella, email, `${nomeChiInvita} ti invita nel nucleo «${nome}» di Masterfood. Apri il link che ti ha mandato.`);
  return linkInvito(
    { n: nucleo.id, nome, da: nomeChiInvita, c: nucleo.drive.cartella, d: nucleo.drive.dati, s: nucleo.drive.storico, k: nucleo.drive.chiave, f: foto },
    location.origin,
    import.meta.env.BASE_URL,
  );
}

const voceDa = (invito: Invito, membroId: string): VoceArchivio => ({
  id: invito.n,
  nome: invito.nome,
  membro_id: membroId,
  cartella: invito.c,
  dati: invito.d,
  storico: invito.s,
  chiave: invito.k,
  foto: invito.f,
});

/**
 * Scarica il nucleo condiviso. Se Google non dà ancora all'app accesso ai file, li fa
 * confermare con il selettore di Google. Serve un token valido.
 */
export async function scaricaNucleoCondiviso(invito: Invito): Promise<void> {
  try {
    await scaricaFile(invito.d);
  } catch (e) {
    if (!(e instanceof ErroreDrive) || (e.stato !== 404 && e.stato !== 403)) throw e;
    const file = [invito.d, invito.s, ...(invito.f ? [invito.f] : [])];
    const confermati = await confermaFile(file, tokenValido()!, `Conferma i file di «${invito.nome}»`);
    if (!confermati.includes(invito.d) || !confermati.includes(invito.s)) throw new Error('file_non_confermati', { cause: e });
  }
  await scaricaNucleo(voceDa(invito, ''));
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
