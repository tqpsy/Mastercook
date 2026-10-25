/**
 * Avvisi di scadenza: permesso delle notifiche, sincronizzazione periodica del browser e
 * promemoria salvati in IndexedDB, letti dal service worker (public/avvisi-sw.js).
 */
import type { Promemoria } from '../dominio/avvisiScadenza';

const DB = 'masterfood-avvisi';
const STORE = 'avvisi';
const ETICHETTA = 'masterfood-scadenze';

interface Salvati {
  attivi: boolean;
  elenco: Promemoria[];
  /** Ultimo giorno in cui il service worker ha mostrato un avviso. */
  mostrato?: string;
}

function apri(): Promise<IDBDatabase> {
  return new Promise((ok, ko) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => ko(r.error);
  });
}

async function leggi(): Promise<Salvati | undefined> {
  const db = await apri();
  const v = await new Promise<Salvati | undefined>((ok, ko) => {
    const r = db.transaction(STORE).objectStore(STORE).get('promemoria');
    r.onsuccess = () => ok(r.result as Salvati | undefined);
    r.onerror = () => ko(r.error);
  });
  db.close();
  return v;
}

async function scrivi(campi: Partial<Salvati>): Promise<void> {
  const prima = (await leggi()) ?? { attivi: false, elenco: [] };
  const db = await apri();
  await new Promise<void>((ok, ko) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ ...prima, ...campi } satisfies Salvati, 'promemoria');
    tx.oncomplete = () => ok();
    tx.onerror = () => ko(tx.error);
  });
  db.close();
}

const CHIAVE_ATTIVI = 'masterfood:avvisi';

export function avvisiAttivi(): boolean {
  try {
    return localStorage.getItem(CHIAVE_ATTIVI) === 'si' && 'Notification' in window && Notification.permission === 'granted';
  } catch {
    return false;
  }
}

export function notificheSupportate(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

interface RegistrazioneConSync extends ServiceWorkerRegistration {
  periodicSync?: { register(tag: string, o: { minInterval: number }): Promise<void>; unregister(tag: string): Promise<void> };
}

async function registrazione(): Promise<RegistrazioneConSync | undefined> {
  return 'serviceWorker' in navigator ? ((await navigator.serviceWorker.getRegistration()) as RegistrazioneConSync | undefined) : undefined;
}

/**
 * - 'automatici': il telefono avvisa anche ad app chiusa (Chrome su Android, app installata);
 * - 'solo_aperta': il browser non lo permette, l'avviso arriva aprendo l'app;
 * - 'negati': permesso delle notifiche rifiutato.
 */
export type EsitoAvvisi = 'automatici' | 'solo_aperta' | 'negati';

export async function attivaAvvisi(): Promise<EsitoAvvisi> {
  const permesso = await Notification.requestPermission();
  if (permesso !== 'granted') return 'negati';
  localStorage.setItem(CHIAVE_ATTIVI, 'si');
  await scrivi({ attivi: true });
  return registraSincronizzazione();
}

/** Da richiamare a ogni avvio: la registrazione si perde se il service worker cambia. */
export async function registraSincronizzazione(): Promise<EsitoAvvisi> {
  const reg = await registrazione();
  if (!reg?.periodicSync) return 'solo_aperta';
  try {
    const stato = await navigator.permissions.query({ name: 'periodic-background-sync' as PermissionName });
    if (stato.state !== 'granted') return 'solo_aperta';
    await reg.periodicSync.register(ETICHETTA, { minInterval: 4 * 60 * 60 * 1000 });
    return 'automatici';
  } catch {
    return 'solo_aperta';
  }
}

export async function disattivaAvvisi(): Promise<void> {
  localStorage.removeItem(CHIAVE_ATTIVI);
  await scrivi({ attivi: false });
  await (await registrazione())?.periodicSync?.unregister(ETICHETTA).catch(() => undefined);
}

export async function salvaPromemoria(elenco: Promemoria[]): Promise<void> {
  await scrivi({ elenco });
}

/** Mostra subito un avviso (prova, o avviso del giorno ad app aperta). */
export async function mostraAvvisoOra(p: Pick<Promemoria, 'titolo' | 'testo' | 'apri'>): Promise<void> {
  const reg = await registrazione();
  const opzioni: NotificationOptions = { body: p.testo, icon: `${import.meta.env.BASE_URL}pwa-192.png`, tag: ETICHETTA, data: { apri: p.apri } };
  if (reg) await reg.showNotification(p.titolo, opzioni);
  else new Notification(p.titolo, opzioni);
}

/**
 * Dove il browser non sveglia l'app da sola (iPhone, computer), l'avviso del giorno si mostra
 * alla prima apertura dopo le 8, una volta sola.
 */
export async function avvisoAllApertura(oggi: string, ora: number): Promise<void> {
  if (!avvisiAttivi() || ora < 8) return;
  if ((await registraSincronizzazione()) === 'automatici') return;
  const dati = await leggi();
  if (!dati || dati.mostrato === oggi) return;
  const p = dati.elenco.find((x) => x.giorno === oggi);
  if (!p) return;
  await mostraAvvisoOra(p);
  await scrivi({ mostrato: oggi });
}
