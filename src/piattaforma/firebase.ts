/**
 * Copia condivisa del nucleo su Firebase (Firestore, piano gratuito), così chi è invitato entra
 * con il solo «Accedi con Google», senza confermare i file di Drive.
 * Su Firestore vanno solo file già cifrati sul telefono con la chiave del nucleo: chi ospita
 * il database vede byte illeggibili. Le regole (docs/firestore.rules) fanno leggere e scrivere
 * un nucleo solo alle email che chi l'ha creato ha invitato.
 * Si usano le API REST, senza SDK: l'accesso a Firebase nasce dal token Google che l'app ha già.
 *
 * nuclei/{nucleo}                  { proprietario, membri[] }
 * nuclei/{nucleo}/file/{tipo}      { rev, parti, aggiornato }   tipo = dati | storico | foto
 * nuclei/{nucleo}/file/{tipo}/parti/{i}   { rev, b }            pezzi del file cifrato
 */
import { config } from '../config';
import { VUOTO, type Deposito } from './deposito';
import { ErroreDrive } from './drive';
import { tokenValido } from './google';

export const relayConfigurato = () => !!(config.firebaseApiKey && config.firebaseProjectId);

/** Un documento Firestore si ferma a 1 MiB: i file più grandi si dividono in pezzi. */
const PARTE = 700_000;
/** Una richiesta di scrittura si ferma a 10 MiB (contando il base64). */
const PARTI_PER_COMMIT = 8;

let sessione: { idToken: string; scade: number; email: string; google: string } | null = null;

/** Entra in Firebase con il token Google già ottenuto dall'app; si rinnova con lui. */
async function accesso(): Promise<{ idToken: string; email: string }> {
  const google = tokenValido();
  if (!google) throw new ErroreDrive(401, 'token');
  if (sessione?.google === google && sessione.scade > Date.now() + 60_000) return sessione;
  let r: Response;
  try {
    r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${config.firebaseApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postBody: `access_token=${encodeURIComponent(google)}&providerId=google.com`,
        requestUri: location.origin,
        returnSecureToken: true,
      }),
    });
  } catch {
    throw new ErroreDrive(502, 'firebase_rete');
  }
  // Un Firebase configurato male non va scambiato per «accesso tolto».
  if (!r.ok) throw new ErroreDrive(502, 'firebase_accesso');
  const j = (await r.json()) as { idToken: string; expiresIn: string; email?: string };
  sessione = { idToken: j.idToken, scade: Date.now() + Number(j.expiresIn) * 1000, email: (j.email ?? '').toLowerCase(), google };
  return sessione;
}

export function esciDaFirebase(): void {
  sessione = null;
}

const database = () => `projects/${config.firebaseProjectId}/databases/(default)/documents`;

async function chiama(percorso: string, init: RequestInit = {}): Promise<Response> {
  const { idToken } = await accesso();
  let r: Response;
  try {
    r = await fetch(`https://firestore.googleapis.com/v1/${percorso}`, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
    });
  } catch {
    throw new ErroreDrive(502, 'firebase_rete');
  }
  if (!r.ok) {
    const corpo = (await r.json().catch(() => ({}))) as { error?: { status?: string } };
    if (r.status === 401) sessione = null;
    throw new ErroreDrive(r.status, corpo.error?.status ?? r.statusText);
  }
  return r;
}

type Valore = { stringValue?: string; integerValue?: string; bytesValue?: string; timestampValue?: string; arrayValue?: { values?: Valore[] } };
type Campi = Record<string, Valore>;

const commit = (writes: unknown[]) => chiama(`${database()}:commit`, { method: 'POST', body: JSON.stringify({ writes }) });

function inBase64(byte: Uint8Array): string {
  let testo = '';
  for (let i = 0; i < byte.length; i += 0x8000) testo += String.fromCharCode(...byte.subarray(i, i + 0x8000));
  return btoa(testo);
}
const daBase64 = (testo: string) => Uint8Array.from(atob(testo), (c) => c.charCodeAt(0));

/** Percorso del file di un nucleo su Firestore, usato come id nel Deposito. */
export const fileRelay = (nucleoId: string, tipo: 'dati' | 'storico' | 'foto') => `nuclei/${nucleoId}/file/${tipo}`;

/** Chi ha tolto qualcuno dal nucleo gli nega anche Firestore: per il resto dell'app è «file non trovato». */
function comeDrive(e: unknown): never {
  if (e instanceof ErroreDrive && e.stato === 403 && e.message === 'PERMISSION_DENIED') throw new ErroreDrive(404, 'notFound');
  throw e;
}

async function leggiMeta(id: string): Promise<{ rev: string; parti: number } | null> {
  try {
    const r = await chiama(`${database()}/${id}`);
    const campi = ((await r.json()) as { fields?: Campi }).fields ?? {};
    return { rev: campi.rev?.stringValue ?? VUOTO, parti: Number(campi.parti?.integerValue ?? 0) };
  } catch (e) {
    if (e instanceof ErroreDrive && e.stato === 404) return null;
    return comeDrive(e);
  }
}

export const depositoRelay: Deposito = {
  async versione(id) {
    return (await leggiMeta(id))?.rev ?? VUOTO;
  },

  async scarica(id) {
    // Chi scrive carica prima i pezzi e poi la meta: se i pezzi non sono tutti della stessa revisione, si riprova.
    for (let tentativo = 0; tentativo < 3; tentativo++) {
      const meta = await leggiMeta(id);
      if (!meta) throw new ErroreDrive(404, 'notFound');
      const nomi = Array.from({ length: meta.parti }, (_, i) => `${database()}/${id}/parti/${i}`);
      const r = await chiama(`${database()}:batchGet`, { method: 'POST', body: JSON.stringify({ documents: nomi }) }).catch(comeDrive);
      const risposte = (await r.json()) as { found?: { name: string; fields?: Campi } }[];
      const pezzi = new Map<string, Uint8Array>();
      for (const x of risposte) {
        if (x.found?.fields?.rev?.stringValue === meta.rev) pezzi.set(x.found.name, daBase64(x.found.fields.b?.bytesValue ?? ''));
      }
      if (pezzi.size !== nomi.length) continue;
      const tutti = new Uint8Array(nomi.reduce((t, n) => t + pezzi.get(n)!.length, 0));
      let posizione = 0;
      for (const n of nomi) {
        tutti.set(pezzi.get(n)!, posizione);
        posizione += pezzi.get(n)!.length;
      }
      return tutti;
    }
    throw new ErroreDrive(503, 'firebase_in_scrittura');
  },

  async aggiorna(id, contenuto) {
    const rev = crypto.randomUUID();
    const pezzi: Uint8Array[] = [];
    for (let i = 0; i < contenuto.length || i === 0; i += PARTE) pezzi.push(contenuto.subarray(i, i + PARTE));
    const scritture = pezzi.map((b, i) => ({
      update: { name: `${database()}/${id}/parti/${i}`, fields: { rev: { stringValue: rev }, b: { bytesValue: inBase64(b) } } },
    }));
    for (let i = 0; i < scritture.length; i += PARTI_PER_COMMIT) await commit(scritture.slice(i, i + PARTI_PER_COMMIT)).catch(comeDrive);
    await commit([
      {
        update: {
          name: `${database()}/${id}`,
          fields: { rev: { stringValue: rev }, parti: { integerValue: String(pezzi.length) }, aggiornato: { timestampValue: new Date().toISOString() } },
        },
      },
    ]).catch(comeDrive);
    return rev;
  },
};

/**
 * Per chi ha creato il nucleo: crea (o aggiorna) la scheda del nucleo su Firestore, con le email
 * che possono entrare. Si aggiungono `aggiungi` e si tolgono `togli`; il proprietario resta sempre.
 */
export async function aggiornaMembriRelay(nucleoId: string, cambi: { aggiungi?: string[]; togli?: string[] } = {}): Promise<void> {
  const { email } = await accesso();
  const valori = (elenco: string[]) => elenco.map((e) => ({ stringValue: e.trim().toLowerCase() }));
  const nome = `${database()}/nuclei/${nucleoId}`;
  // Alla prima volta le regole vogliono il solo proprietario tra i membri: gli altri arrivano dopo.
  await commit([
    {
      update: { name: nome, fields: { proprietario: { stringValue: email } } },
      updateMask: { fieldPaths: ['proprietario'] },
      updateTransforms: [{ fieldPath: 'membri', appendMissingElements: { values: valori([email]) } }],
    },
  ]);
  const aggiungi = (cambi.aggiungi ?? []).filter((e) => e.trim().toLowerCase() !== email);
  const togli = (cambi.togli ?? []).filter((e) => e.trim().toLowerCase() !== email);
  const trasformazioni = [
    ...(aggiungi.length ? [{ fieldPath: 'membri', appendMissingElements: { values: valori(aggiungi) } }] : []),
    ...(togli.length ? [{ fieldPath: 'membri', removeAllFromArray: { values: valori(togli) } }] : []),
  ];
  if (trasformazioni.length) await commit(trasformazioni.map((t) => ({ transform: { document: nome, fieldTransforms: [t] } })));
}

/** Per chi ha creato il nucleo: cancella da Firestore la copia condivisa. Non fallisce se non c'è. */
export async function eliminaRelay(nucleoId: string): Promise<void> {
  const cancella = (name: string) => ({ delete: name });
  const scritture: unknown[] = [];
  for (const tipo of ['dati', 'storico', 'foto'] as const) {
    const id = fileRelay(nucleoId, tipo);
    const meta = await leggiMeta(id).catch(() => null);
    for (let i = 0; i < (meta?.parti ?? 0); i++) scritture.push(cancella(`${database()}/${id}/parti/${i}`));
    if (meta) scritture.push(cancella(`${database()}/${id}`));
  }
  // La scheda del nucleo per ultima: le regole dei file la leggono per sapere chi può cancellare.
  for (let i = 0; i < scritture.length; i += 400) await commit(scritture.slice(i, i + 400));
  await commit([cancella(`${database()}/nuclei/${nucleoId}`)]).catch(() => undefined);
}
