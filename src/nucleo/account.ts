/**
 * Account Google e collegamento del nucleo al Google Drive di chi lo crea. Nessun server:
 * - i dati stanno nella cartella "Masterfood - <nome>", cifrati AES-256-GCM (file .mfd);
 * - la chiave del nucleo e l'elenco dei nuclei stanno nell'archivio dell'account, nell'area
 *   nascosta che Drive riserva all'app (appDataFolder), e in copia su questo dispositivo.
 */
import { create } from 'zustand';
import { cifraFile, esportaChiave, generaChiaveNucleo, importaChiave } from '../piattaforma/cifratura';
import { applicaDocumentoCifrato, apriDocumentoLocale, collezione, esportaDocumentoCifrato } from '../piattaforma/documento';
import { eliminaChiaveProtetta, leggiChiaveProtetta, salvaChiaveProtetta } from '../piattaforma/archivioChiavi';
import { creaCartella, creaFile, eliminaFile, eMio, leggiArchivio, scaricaFile, scriviArchivio } from '../piattaforma/drive';
import { depositoRelay, eliminaRelay, esciDaFirebase, fileRelay, relayConfigurato } from '../piattaforma/firebase';
import { esciDaGoogle, leggiEmail, richiediToken } from '../piattaforma/google';
import type { ContestoNucleo } from './contesto';
import { leggiNuclei, rimuoviNucleoLocale, salvaNucleoLocale, scriviMembroCorrente, type NucleoLocale } from './registro';

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
  esciDaFirebase();
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
  const chiave = nucleo.drive.chiave ? await importaChiave(daBase64(nucleo.drive.chiave)) : await leggiChiaveProtetta(nucleo.id);
  if (!chiave) throw new Error('chiave_assente');
  chiavi.set(nucleo.id, chiave);
  return chiave;
}

/** Vero per chi ha creato il nucleo (la cartella è sul suo Drive). */
export const eProprietario = (nucleoId: string) => leggiNuclei().find((n) => n.id === nucleoId)?.drive?.proprietario !== false;

export interface VoceArchivio {
  id: string;
  nome: string;
  membro_id: string;
  cartella: string;
  dati: string;
  storico: string;
  /** Solo per i nuclei creati da questo account: gli invitati non conservano la chiave nel loro Drive. */
  chiave?: string;
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
    drive: { cartella: voce.cartella, dati: voce.dati, storico: voce.storico, chiave: voce.chiave, foto: voce.foto, proprietario: true },
  };
  salvaNucleoLocale(collegato);
  return collegato;
}

/**
 * Scarica da Drive i due documenti di un nucleo e lo registra su questo dispositivo.
 * Per un nucleo condiviso da altri la chiave si conserva protetta e non in chiaro.
 */
export async function scaricaNucleo(voce: VoceArchivio, chiaveInvito?: string, relay = false): Promise<NucleoLocale> {
  const condiviso = !!chiaveInvito;
  const nucleo: NucleoLocale = {
    id: voce.id,
    nome: voce.nome,
    creato_il: new Date().toISOString(),
    modalita: 'locale_drive',
    drive: {
      cartella: voce.cartella,
      dati: voce.dati,
      storico: voce.storico,
      foto: voce.foto,
      ...(condiviso ? { proprietario: false } : { chiave: voce.chiave }),
      ...(relay ? { relay: true } : {}),
    },
  };
  if (condiviso) chiavi.set(voce.id, await salvaChiaveProtetta(voce.id, daBase64(chiaveInvito)));
  const chiave = await chiaveDelNucleo(nucleo);
  for (const tipo of ['dati', 'storico'] as const) {
    const { doc, persistenza } = await apriDocumentoLocale(voce.id, tipo);
    const file = relay ? await depositoRelay.scarica(fileRelay(voce.id, tipo)) : await scaricaFile(voce[tipo]);
    await applicaDocumentoCifrato(doc, chiave, file);
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
    // Nucleo condiviso da altri: la chiave non è nel Drive di chi è invitato, serve il link d'invito.
    if (!voce.chiave) continue;
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

/** Cancella da questo dispositivo i documenti e il registro di un nucleo. */
export function eliminaNucleoDalDispositivo(id: string): void {
  rimuoviNucleoLocale(id);
  chiavi.delete(id);
  void eliminaChiaveProtetta(id).catch(() => undefined);
  for (const tipo of ['dati', 'storico']) indexedDB.deleteDatabase(`masterfood-${id}-${tipo}`);
}

/**
 * Elimina un nucleo anche da Google Drive. Se la cartella è sul tuo Drive la cancella con tutti
 * i file (anche per gli invitati); se è di un altro, lo toglie solo dal tuo account. Serve un token.
 */
export async function eliminaNucleoDaDrive(id: string): Promise<'cancellato' | 'lasciato'> {
  const nucleo = leggiNuclei().find((n) => n.id === id);
  const archivio = await leggiArchivio<Archivio>();
  const cartella = nucleo?.drive?.cartella ?? archivio?.contenuto.nuclei.find((n) => n.id === id)?.cartella;
  let esito: 'cancellato' | 'lasciato' = 'lasciato';
  if (cartella && (await eMio(cartella).catch(() => false))) {
    await eliminaFile(cartella);
    if (relayConfigurato()) await eliminaRelay(id).catch(() => undefined);
    esito = 'cancellato';
  }
  if (archivio) {
    const nuclei = archivio.contenuto.nuclei.filter((n) => n.id !== id);
    if (nuclei.length) await scriviArchivio({ versione: 1, nuclei } satisfies Archivio, archivio.id);
    else await eliminaFile(archivio.id);
  }
  eliminaNucleoDalDispositivo(id);
  return esito;
}

/**
 * Elimina l'account Masterfood: cartelle dei nuclei creati da te, archivio nascosto con le
 * chiavi, dati su questo dispositivo e accesso a Google. Serve un token.
 */
export async function eliminaAccount(): Promise<void> {
  const archivio = await leggiArchivio<Archivio>();
  const cartelle = new Set([...(archivio?.contenuto.nuclei ?? []).map((n) => n.cartella), ...leggiNuclei().flatMap((n) => (n.drive ? [n.drive.cartella] : []))]);
  for (const cartella of cartelle) if (await eMio(cartella).catch(() => false)) await eliminaFile(cartella);
  if (relayConfigurato()) {
    for (const n of leggiNuclei()) if (n.drive && n.drive.proprietario !== false) await eliminaRelay(n.id).catch(() => undefined);
  }
  if (archivio) await eliminaFile(archivio.id);
  for (const n of leggiNuclei()) eliminaNucleoDalDispositivo(n.id);
  esci();
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith('masterfood:')) localStorage.removeItem(k);
  } catch {
    // archivio non disponibile
  }
}

/**
 * Per gli invitati dalle versioni precedenti: la chiave era in chiaro sul telefono e nel loro Drive.
 * Se la cartella non è di chi usa l'app, la chiave passa nell'archivio protetto e si toglie dal resto.
 * Serve un token; si fa una volta per nucleo.
 */
export async function proteggiChiaveSeInvitato(nucleoId: string): Promise<void> {
  const nucleo = leggiNuclei().find((n) => n.id === nucleoId);
  if (!nucleo?.drive || nucleo.drive.proprietario !== undefined) return;
  const mio = await eMio(nucleo.drive.cartella);
  if (mio || !nucleo.drive.chiave) {
    salvaNucleoLocale({ ...nucleo, drive: { ...nucleo.drive, proprietario: mio } });
    return;
  }
  chiavi.set(nucleo.id, await salvaChiaveProtetta(nucleo.id, daBase64(nucleo.drive.chiave)));
  const { chiave: _tolta, ...resto } = nucleo.drive;
  void _tolta;
  salvaNucleoLocale({ ...nucleo, drive: { ...resto, proprietario: false } });
  const archivio = await leggiArchivio<Archivio>();
  const voce = archivio?.contenuto.nuclei.find((n) => n.id === nucleoId);
  if (voce?.chiave) {
    const { chiave: _vecchia, ...senzaChiave } = voce;
    void _vecchia;
    await annotaNellArchivio(senzaChiave);
  }
}

/** Chi ha creato il nucleo ha tolto l'accesso (o l'ha eliminato): via dati e chiave da qui e dall'account. */
export async function accessoPerso(nucleoId: string): Promise<void> {
  const archivio = await leggiArchivio<Archivio>().catch(() => null);
  if (archivio?.contenuto.nuclei.some((n) => n.id === nucleoId)) {
    await scriviArchivio({ versione: 1, nuclei: archivio.contenuto.nuclei.filter((n) => n.id !== nucleoId) } satisfies Archivio, archivio.id).catch(() => undefined);
  }
  eliminaNucleoDalDispositivo(nucleoId);
}
