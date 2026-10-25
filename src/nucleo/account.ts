/**
 * Account Google e collegamento del nucleo al Google Drive di chi lo crea. Nessun server:
 * - i dati stanno nella cartella "Masterfood - <nome>", cifrati AES-256-GCM (file .mfd);
 * - la chiave del nucleo e l'elenco dei nuclei stanno nell'archivio dell'account, nell'area
 *   nascosta che Drive riserva all'app (appDataFolder), e in copia su questo dispositivo.
 */
import { create } from 'zustand';
import { cifraFile, esportaChiave, generaChiaveNucleo, importaChiave } from '../piattaforma/cifratura';
import { applicaDocumentoCifrato, apriDocumentoLocale, collezione, esportaDocumentoCifrato } from '../piattaforma/documento';
import { creaCartella, creaFile, leggiArchivio, scaricaFile, scriviArchivio } from '../piattaforma/drive';
import { esciDaGoogle, leggiEmail, richiediToken } from '../piattaforma/google';
import type { ContestoNucleo } from './contesto';
import { leggiNuclei, salvaNucleoLocale, scriviMembroCorrente, type NucleoLocale } from './registro';

/** Versione della chiave del nucleo: cambierà solo con la rotazione all'uscita di un membro. */
export const VERSIONE_CHIAVE = 1;

const CHIAVE_ACCOUNT = 'masterfood:account';

function leggiEmailSalvata(): string | null {
  try {
    return localStorage.getItem(CHIAVE_ACCOUNT);
  } catch {
    return null;
  }
}

/** Email dell'account Google collegato su questo dispositivo (il token sta solo in memoria). */
export const useAccount = create<{ email: string | null }>(() => ({ email: leggiEmailSalvata() }));

export const emailAccount = () => useAccount.getState().email ?? undefined;

/** Accesso con Google: va chiamato da un tocco, apre la finestra di consenso. */
export async function accedi(): Promise<string> {
  await richiediToken();
  const email = await leggiEmail();
  try {
    localStorage.setItem(CHIAVE_ACCOUNT, email);
  } catch {
    // archivio non disponibile: l'accesso vale per questa sessione
  }
  useAccount.setState({ email });
  return email;
}

export function esci(): void {
  esciDaGoogle();
  try {
    localStorage.removeItem(CHIAVE_ACCOUNT);
  } catch {
    // niente da fare
  }
  useAccount.setState({ email: null });
}

function base64(byte: Uint8Array): string {
  return btoa(String.fromCharCode(...byte));
}
function daBase64(testo: string): Uint8Array {
  return Uint8Array.from(atob(testo), (c) => c.charCodeAt(0));
}

const chiavi = new Map<string, CryptoKey>();

export async function chiaveDelNucleo(nucleo: NucleoLocale): Promise<CryptoKey> {
  const nota = chiavi.get(nucleo.id);
  if (nota) return nota;
  if (!nucleo.drive) throw new Error('nucleo non collegato');
  const chiave = await importaChiave(daBase64(nucleo.drive.chiave));
  chiavi.set(nucleo.id, chiave);
  return chiave;
}

export interface VoceArchivio {
  id: string;
  nome: string;
  membro_id: string;
  cartella: string;
  dati: string;
  storico: string;
  chiave: string;
  /** File cifrato con le foto di frigo, freezer e dispensa. */
  foto?: string;
}
export interface Archivio {
  versione: 1;
  nuclei: VoceArchivio[];
}

/**
 * Porta su Drive un nucleo nato sul dispositivo: crea la chiave, la cartella e i due file
 * cifrati, poi annota tutto nell'archivio dell'account. Serve un token valido.
 */
export async function collegaNucleo(ctx: ContestoNucleo): Promise<NucleoLocale> {
  const nucleo = leggiNuclei().find((n) => n.id === ctx.nucleo.id) ?? ctx.nucleo;
  if (nucleo.drive) return nucleo;

  const archivio = await leggiArchivio<Archivio>();
  const esistente = archivio?.contenuto.nuclei.find((n) => n.id === nucleo.id);
  const nome = (collezione(ctx.dati, 'meta').get('nucleo')?.get('nome') as string | undefined) ?? nucleo.nome;
  let voce: VoceArchivio;
  if (esistente) {
    // Collegato in precedenza da un altro dispositivo dello stesso account.
    voce = esistente;
  } else {
    const chiaveGrezza = base64(await esportaChiave(await generaChiaveNucleo()));
    const chiave = await importaChiave(daBase64(chiaveGrezza));
    const cartella = await creaCartella(`Masterfood - ${nome}`);
    const dati = await creaFile('nucleo-dati.mfd', cartella, await esportaDocumentoCifrato(ctx.dati, chiave, VERSIONE_CHIAVE));
    const storico = await creaFile('nucleo-storico.mfd', cartella, await esportaDocumentoCifrato(ctx.storico, chiave, VERSIONE_CHIAVE));
    voce = { id: nucleo.id, nome, membro_id: ctx.membroId, cartella, dati: dati.id, storico: storico.id, chiave: chiaveGrezza };
    const nuclei = [...(archivio?.contenuto.nuclei ?? []), voce];
    await scriviArchivio({ versione: 1, nuclei } satisfies Archivio, archivio?.id);
  }

  const collegato: NucleoLocale = {
    ...nucleo,
    nome,
    modalita: 'locale_drive',
    drive: { cartella: voce.cartella, dati: voce.dati, storico: voce.storico, chiave: voce.chiave, foto: voce.foto },
  };
  salvaNucleoLocale(collegato);
  return collegato;
}

/** Scarica da Drive i due documenti di un nucleo e lo registra su questo dispositivo. */
export async function scaricaNucleo(voce: VoceArchivio): Promise<NucleoLocale> {
  const nucleo: NucleoLocale = {
    id: voce.id,
    nome: voce.nome,
    creato_il: new Date().toISOString(),
    modalita: 'locale_drive',
    drive: { cartella: voce.cartella, dati: voce.dati, storico: voce.storico, chiave: voce.chiave, foto: voce.foto },
  };
  const chiave = await chiaveDelNucleo(nucleo);
  for (const tipo of ['dati', 'storico'] as const) {
    const { doc, persistenza } = await apriDocumentoLocale(voce.id, tipo);
    await applicaDocumentoCifrato(doc, chiave, await scaricaFile(voce[tipo]));
    if (tipo === 'dati') nucleo.nome = (collezione(doc, 'meta').get('nucleo')?.get('nome') as string | undefined) ?? nucleo.nome;
    await persistenza.destroy();
    doc.destroy();
  }
  salvaNucleoLocale(nucleo);
  return nucleo;
}

/** Annota (o aggiorna) un nucleo nell'archivio dell'account, per ritrovarlo sugli altri dispositivi. */
export async function annotaNellArchivio(voce: VoceArchivio): Promise<void> {
  const archivio = await leggiArchivio<Archivio>();
  const nuclei = [...(archivio?.contenuto.nuclei ?? []).filter((n) => n.id !== voce.id), voce];
  await scriviArchivio({ versione: 1, nuclei } satisfies Archivio, archivio?.id);
}

/** Su un nuovo dispositivo: scarica da Drive i nuclei dell'account. Restituisce l'id del primo. */
export async function recuperaNuclei(): Promise<string | null> {
  const archivio = await leggiArchivio<Archivio>();
  let primo: string | null = null;
  let errore: unknown;
  for (const voce of archivio?.contenuto.nuclei ?? []) {
    try {
      await scaricaNucleo(voce);
    } catch (e) {
      // Un nucleo condiviso da altri può non essere più accessibile: si va avanti con gli altri.
      errore ??= e;
      continue;
    }
    scriviMembroCorrente(voce.id, voce.membro_id);
    primo ??= voce.id;
  }
  if (!primo && errore) throw errore;
  return primo;
}

/**
 * File delle foto del nucleo sul Drive di chi l'ha creato: si crea una volta sola, vuoto, così
 * chi viene invitato riceve accesso anche a quello. Serve un token valido.
 */
export async function assicuraFileFoto(nucleoId: string): Promise<string> {
  const nucleo = leggiNuclei().find((n) => n.id === nucleoId);
  if (!nucleo?.drive) throw new Error('nucleo non collegato');
  if (nucleo.drive.foto) return nucleo.drive.foto;
  const vuoto = await cifraFile(await chiaveDelNucleo(nucleo), VERSIONE_CHIAVE, new TextEncoder().encode('{"versione":1,"zone":{}}'));
  const { id } = await creaFile('nucleo-foto.mfd', nucleo.drive.cartella, vuoto);
  salvaNucleoLocale({ ...nucleo, drive: { ...nucleo.drive, foto: id } });
  const archivio = await leggiArchivio<Archivio>();
  const voce = archivio?.contenuto.nuclei.find((n) => n.id === nucleoId);
  if (voce) await annotaNellArchivio({ ...voce, foto: id });
  return id;
}
