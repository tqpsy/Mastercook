/**
 * Quanto resta della prova gratuita giornaliera di Gemini. Google non dice quante richieste restano:
 * le contiamo su questo dispositivo e le azzeriamo quando le azzera Google (mezzanotte del Pacifico,
 * le 9 in Italia). Il limite si legge su AI Studio e si può correggere; un errore di quota giornaliera
 * da Google vale più del conteggio.
 */
import { create } from 'zustand';

/** Richieste gratuite al giorno di gemini-2.5-flash al momento dello sviluppo; cambia nel tempo. */
export const LIMITE_PREDEFINITO = 20;
const CHIAVE = 'masterfood:gemini:quota';
const CHIAVE_LIMITE = 'masterfood:gemini:limite';
const FUSO_GOOGLE = 'America/Los_Angeles';

interface Conteggio {
  /** Giorno di Google (AAAA-MM-GG nel fuso del Pacifico). */
  giorno: string;
  usate: number;
  esaurita: boolean;
}

export function giornoGoogle(adesso: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO_GOOGLE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(adesso);
}

/** Il primo istante del prossimo giorno di Google, cercato ora per ora (vale anche con l'ora legale). */
export function prossimoAzzeramento(adesso: Date): Date {
  const oggi = giornoGoogle(adesso);
  const t = new Date(adesso);
  t.setMinutes(0, 0, 0);
  for (let i = 0; i < 26 && giornoGoogle(t) === oggi; i++) t.setTime(t.getTime() + 3_600_000);
  // Le zone con mezz'ora di differenza non contano qui: il Pacifico cambia giorno sull'ora esatta.
  return t;
}

function leggi<T>(chiave: string, riserva: T): T {
  try {
    const v = localStorage.getItem(chiave);
    return v ? (JSON.parse(v) as T) : riserva;
  } catch {
    return riserva;
  }
}

function scrivi(chiave: string, valore: unknown): void {
  try {
    localStorage.setItem(chiave, JSON.stringify(valore));
  } catch {
    // archivio non disponibile
  }
}

interface StatoQuota extends Conteggio {
  limite: number;
}

function attuale(adesso = new Date()): StatoQuota {
  const salvato = leggi<Conteggio | null>(CHIAVE, null);
  const giorno = giornoGoogle(adesso);
  const conteggio = salvato?.giorno === giorno ? salvato : { giorno, usate: 0, esaurita: false };
  return { ...conteggio, limite: leggi(CHIAVE_LIMITE, LIMITE_PREDEFINITO) };
}

export const useQuotaGemini = create<StatoQuota>(() => attuale());

function aggiorna(modifica: (c: Conteggio) => Conteggio): void {
  const { limite, ...conteggio } = attuale();
  const nuovo = modifica(conteggio);
  scrivi(CHIAVE, nuovo);
  useQuotaGemini.setState({ ...nuovo, limite });
}

/** Rilegge il conteggio: a cavallo della mezzanotte di Google torna a zero. */
export const ricaricaQuota = () => useQuotaGemini.setState(attuale());

export const registraRichiesta = () => aggiorna((c) => ({ ...c, usate: c.usate + 1 }));

export const segnaEsaurita = () => aggiorna((c) => ({ ...c, esaurita: true, usate: Math.max(c.usate, attuale().limite) }));

export function impostaLimite(limite: number): void {
  const valore = Math.max(1, Math.min(10_000, Math.round(limite) || LIMITE_PREDEFINITO));
  scrivi(CHIAVE_LIMITE, valore);
  useQuotaGemini.setState({ ...attuale(), limite: valore });
}

/** Vero se Google ha già detto che per oggi la prova gratuita è finita. */
export const quotaEsaurita = () => attuale().esaurita;

/** «alle 9:00» nell'ora del telefono. */
export function oraAzzeramento(adesso = new Date()): string {
  return prossimoAzzeramento(adesso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Un 429 di Gemini: quota del giorno o del minuto? Google lo scrive nel quotaId
 * (es. GenerateRequestsPerDayPerProjectPerModel-FreeTier).
 */
export function eQuotaGiornaliera(corpo: string): boolean {
  return /PerDay/i.test(corpo);
}
