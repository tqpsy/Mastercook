/**
 * Accesso ai file del nucleo su Google Drive (API v3). Con drive.file l'app vede solo i file
 * che ha creato lei; con drive.appdata ha un'area nascosta, visibile solo a lei, per l'archivio
 * dell'account (chiavi ed elenco dei nuclei).
 * I file si creano una volta e poi si aggiornano sempre negli stessi id.
 */
import { tokenValido } from './google';

const API = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
const TIPO_MFD = 'application/octet-stream';

export class ErroreDrive extends Error {
  constructor(
    readonly stato: number,
    messaggio: string,
  ) {
    super(messaggio);
    this.name = 'ErroreDrive';
  }
  /** Token scaduto o revocato: serve un nuovo consenso. */
  get autorizzazione() {
    return this.stato === 401;
  }
}

async function chiama(url: string, init: RequestInit = {}): Promise<Response> {
  const token = tokenValido();
  if (!token) throw new ErroreDrive(401, 'token');
  const r = await fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } });
  if (!r.ok) {
    const corpo = (await r.json().catch(() => ({}))) as { error?: { message?: string; errors?: { reason?: string }[] } };
    const motivo = corpo.error?.errors?.[0]?.reason ?? corpo.error?.message ?? r.statusText;
    throw new ErroreDrive(r.status, motivo);
  }
  return r;
}

export async function creaCartella(nome: string): Promise<string> {
  const r = await chiama(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: nome, mimeType: 'application/vnd.google-apps.folder' }),
  });
  return ((await r.json()) as { id: string }).id;
}

/** Crea un file con contenuto in un'unica richiesta multipart. */
export async function creaFile(nome: string, cartella: string, contenuto: Uint8Array, tipo = TIPO_MFD): Promise<{ id: string; version: string }> {
  const confine = `masterfood${crypto.randomUUID()}`;
  const corpo = new Blob([
    `--${confine}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
    JSON.stringify({ name: nome, parents: [cartella], mimeType: tipo }),
    `\r\n--${confine}\r\nContent-Type: ${tipo}\r\n\r\n`,
    contenuto as Uint8Array<ArrayBuffer>,
    `\r\n--${confine}--`,
  ]);
  const r = await chiama(`${UPLOAD}?uploadType=multipart&fields=id,version`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${confine}` },
    body: corpo,
  });
  return (await r.json()) as { id: string; version: string };
}

export async function aggiornaFile(id: string, contenuto: Uint8Array, tipo = TIPO_MFD): Promise<string> {
  const r = await chiama(`${UPLOAD}/${id}?uploadType=media&fields=version`, {
    method: 'PATCH',
    headers: { 'Content-Type': tipo },
    body: contenuto as Uint8Array<ArrayBuffer>,
  });
  return ((await r.json()) as { version: string }).version;
}

/** La versione di Drive cresce a ogni modifica: serve a scaricare solo se è cambiato qualcosa. */
export async function versioneFile(id: string): Promise<string> {
  const r = await chiama(`${API}/${id}?fields=version`);
  return ((await r.json()) as { version: string }).version;
}

export async function scaricaFile(id: string): Promise<Uint8Array> {
  const r = await chiama(`${API}/${id}?alt=media`);
  return new Uint8Array(await r.arrayBuffer());
}

const ARCHIVIO = 'masterfood-account.json';

/** Legge l'archivio dell'account dall'area nascosta dell'app; null se non c'è ancora. */
export async function leggiArchivio<T>(): Promise<{ id: string; contenuto: T } | null> {
  const q = encodeURIComponent(`name = '${ARCHIVIO}' and trashed = false`);
  const r = await chiama(`${API}?spaces=appDataFolder&q=${q}&fields=files(id)&pageSize=1`);
  const id = ((await r.json()) as { files: { id: string }[] }).files[0]?.id;
  if (!id) return null;
  const testo = new TextDecoder().decode(await scaricaFile(id));
  return { id, contenuto: JSON.parse(testo) as T };
}

export async function scriviArchivio(contenuto: unknown, id?: string): Promise<string> {
  const byte = new TextEncoder().encode(JSON.stringify(contenuto));
  if (id) {
    await aggiornaFile(id, byte, 'application/json');
    return id;
  }
  return (await creaFile(ARCHIVIO, 'appDataFolder', byte, 'application/json')).id;
}

/**
 * Condivide un file o una cartella creati dall'app con un'altra persona, che potrà anche
 * modificarli. Google le manda un'email con il messaggio indicato.
 */
export async function condividi(id: string, email: string, messaggio: string): Promise<void> {
  const parametri = new URLSearchParams({ sendNotificationEmail: 'true', emailMessage: messaggio, fields: 'id' });
  await chiama(`${API}/${id}/permissions?${parametri}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'user', role: 'writer', emailAddress: email }),
  });
}

/** Elimina per sempre un file o una cartella (con tutto quello che contiene) creati dall'app. */
export async function eliminaFile(id: string): Promise<void> {
  try {
    await chiama(`${API}/${id}`, { method: 'DELETE' });
  } catch (e) {
    // Già eliminato: va bene lo stesso.
    if (!(e instanceof ErroreDrive && e.stato === 404)) throw e;
  }
}

/** Vero se il file è sul Drive di chi usa l'app (e non condiviso da un altro). */
export async function eMio(id: string): Promise<boolean> {
  const r = await chiama(`${API}/${id}?fields=ownedByMe`);
  return ((await r.json()) as { ownedByMe?: boolean }).ownedByMe === true;
}

export interface Permesso {
  id: string;
  emailAddress?: string;
  displayName?: string;
  role: string;
  type: string;
}

/** Chi ha accesso a un file o a una cartella creati dall'app (lo vede chi l'ha creata). */
export async function elencaPermessi(id: string): Promise<Permesso[]> {
  const r = await chiama(`${API}/${id}/permissions?fields=permissions(id,emailAddress,displayName,role,type)`);
  return ((await r.json()) as { permissions?: Permesso[] }).permissions ?? [];
}

/** Toglie l'accesso: la persona non vede più la cartella né i file dentro. */
export async function togliPermesso(id: string, permessoId: string): Promise<void> {
  await chiama(`${API}/${id}/permissions/${permessoId}`, { method: 'DELETE' });
}
