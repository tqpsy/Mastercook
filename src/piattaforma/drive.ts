/**
 * Accesso ai file del nucleo su Google Drive (API v3, scope drive.file): l'app vede solo
 * i file che ha creato lei o che l'utente le ha aperto col Picker.
 * I file si creano una volta e poi si aggiornano sempre negli stessi id.
 */
import { tokenDriveValido } from './google';

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
  const token = tokenDriveValido();
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
export async function creaFile(nome: string, cartella: string, contenuto: Uint8Array): Promise<{ id: string; version: string }> {
  const confine = `masterfood${crypto.randomUUID()}`;
  const corpo = new Blob([
    `--${confine}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
    JSON.stringify({ name: nome, parents: [cartella], mimeType: TIPO_MFD }),
    `\r\n--${confine}\r\nContent-Type: ${TIPO_MFD}\r\n\r\n`,
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

export async function aggiornaFile(id: string, contenuto: Uint8Array): Promise<string> {
  const r = await chiama(`${UPLOAD}/${id}?uploadType=media&fields=version`, {
    method: 'PATCH',
    headers: { 'Content-Type': TIPO_MFD },
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
