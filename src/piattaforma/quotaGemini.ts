/**
 * Quanto resta della prova gratuita giornaliera di Gemini. Google non dice quante richieste restano:
 * le contiamo su questo dispositivo e le azzeriamo quando le azzera Google (mezzanotte del Pacifico,
 * le 9 in Italia). Il limite si legge su AI Studio e si può correggere; un errore di quota giornaliera
 * da Google vale più del conteggio.
 *
 * Google conta le richieste modello per modello: finita la quota del modello principale si passa
 * ai successivi (più leggeri, con limiti gratuiti propri). La prova è finita solo quando lo sono tutti.
 */
import { create } from 'zustand';

/** In ordine di preferenza: prima il più preciso, poi quelli di riserva. Tutti nel piano gratuito. */
export const MODELLI_GEMINI = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash-lite', 'gemini-flash-lite-latest'];
const PRINCIPALE = MODELLI_GEMINI[0]!;

/** Il nome da mostrare per ogni modello. */
export const NOMI_MODELLI: Record<string, string> = {
  'gemini-2.5-flash': 'Flash 2.5',
  'gemini-flash-latest': 'Flash, ultima versione',
  'gemini-2.5-flash-lite': 'Flash-Lite 2.5',
  'gemini-flash-lite-latest': 'Flash-Lite, ultima versione',
};

/** Richieste gratuite al giorno di gemini-2.5-flash al momento dello sviluppo; cambia nel tempo. */
export const LIMITE_PREDEFINITO = 20;
const CHIAVE = 'masterfood:gemini:quota';
const CHIAVE_LIMITE = 'masterfood:gemini:limite';
/** Limiti al giorno dei modelli di riserva, letti dagli errori di Google. */
const CHIAVE_LIMITI = 'masterfood:gemini:limiti';
const FUSO_GOOGLE = 'America/Los_Angeles';

interface Conteggio {
  /** Giorno di Google (AAAA-MM-GG nel fuso del Pacifico). */
  giorno: string;
  /** Richieste riuscite con il modello principale. */
  usate: number;
  /** Vero quando tutti i modelli hanno finito la quota del giorno. */
  esaurita: boolean;
  /** Modelli che oggi non si possono più usare (quota finita o non più disponibili). */
  esauriti?: string[];
  /** Richieste riuscite oggi, modello per modello. */
  usatePer?: Record<string, number>;
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

export interface StatoQuota extends Conteggio {
  /** Limite al giorno del modello principale (si può correggere a mano). */
  limite: number;
  /** Limiti al giorno dei modelli di riserva, quando Google li ha detti. */
  limitiPer: Record<string, number>;
}

function attuale(adesso = new Date()): StatoQuota {
  const salvato = leggi<Conteggio | null>(CHIAVE, null);
  const giorno = giornoGoogle(adesso);
  let conteggio: Conteggio = salvato?.giorno === giorno ? salvato : { giorno, usate: 0, esaurita: false };
  // Le versioni precedenti segnavano finita la prova al primo modello esaurito: lo era solo il principale.
  if (conteggio.esaurita && !conteggio.esauriti) conteggio = { ...conteggio, esaurita: false, esauriti: [PRINCIPALE] };
  return { ...conteggio, limite: leggi(CHIAVE_LIMITE, LIMITE_PREDEFINITO), limitiPer: leggi(CHIAVE_LIMITI, {}) };
}

export const useQuotaGemini = create<StatoQuota>(() => attuale());

function aggiorna(modifica: (c: Conteggio) => Conteggio): void {
  const { limite, limitiPer, ...conteggio } = attuale();
  const nuovo = modifica(conteggio);
  scrivi(CHIAVE, nuovo);
  useQuotaGemini.setState({ ...nuovo, limite, limitiPer });
}

/** Rilegge il conteggio: a cavallo della mezzanotte di Google torna a zero. */
export const ricaricaQuota = () => useQuotaGemini.setState(attuale());

export const registraRichiesta = (modello = PRINCIPALE) =>
  aggiorna((c) => ({
    ...c,
    usate: modello === PRINCIPALE ? c.usate + 1 : c.usate,
    usatePer: { ...c.usatePer, [modello]: (c.usatePer?.[modello] ?? 0) + 1 },
  }));

/** Il modello non si può più usare fino all'azzeramento; finiti tutti, la prova del giorno è finita. */
export function segnaEsaurita(modello = PRINCIPALE): void {
  const limite = attuale().limite;
  aggiorna((c) => {
    const esauriti = [...new Set([...(c.esauriti ?? []), modello])];
    return {
      ...c,
      esauriti,
      esaurita: MODELLI_GEMINI.every((m) => esauriti.includes(m)),
      usate: modello === PRINCIPALE ? Math.max(c.usate, limite) : c.usate,
    };
  });
}

export const modelloEsaurito = (modello: string) => (attuale().esauriti ?? []).includes(modello);

/** Il modello che si userà alla prossima richiesta, con la sua posizione (da 1) e quanto ne resta. */
export function modelloInUso(stato: StatoQuota): { modello: string; numero: number; usate: number; limite: number } {
  const i = Math.max(0, MODELLI_GEMINI.findIndex((m) => !(stato.esauriti ?? []).includes(m)));
  const modello = stato.esaurita ? MODELLI_GEMINI[MODELLI_GEMINI.length - 1]! : MODELLI_GEMINI[i]!;
  const limite = modello === PRINCIPALE ? stato.limite : (stato.limitiPer[modello] ?? LIMITE_PREDEFINITO);
  // Il conteggio del principale c'era già prima del conteggio per modello.
  const usate = modello === PRINCIPALE ? stato.usate : (stato.usatePer?.[modello] ?? 0);
  return { modello, numero: MODELLI_GEMINI.indexOf(modello) + 1, usate, limite };
}

/** Ricorda il limite al giorno di un modello, quando Google lo scrive nell'errore. */
export function impostaLimiteModello(modello: string, limite: number): void {
  if (modello === PRINCIPALE) return impostaLimite(limite);
  const limitiPer = { ...leggi<Record<string, number>>(CHIAVE_LIMITI, {}), [modello]: limite };
  scrivi(CHIAVE_LIMITI, limitiPer);
  useQuotaGemini.setState({ ...attuale(), limitiPer });
}

export function impostaLimite(limite: number): void {
  const valore = Math.max(1, Math.min(10_000, Math.round(limite) || LIMITE_PREDEFINITO));
  scrivi(CHIAVE_LIMITE, valore);
  useQuotaGemini.setState({ ...attuale(), limite: valore });
}

/** Vero se Google ha già detto che per oggi la prova gratuita è finita con tutti i modelli. */
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

/** Il limite giornaliero scritto da Google nell'errore (quotaValue), se c'è. */
export function limiteDaErrore(corpo: string): number | null {
  const n = Number(/"quotaValue"\s*:\s*"?(\d+)/.exec(corpo)?.[1]);
  return n > 0 ? n : null;
}

/** Quanti millisecondi Google chiede di aspettare dopo un limite al minuto (RetryInfo), tra 2 e 60 secondi. */
export function attesaDaErrore(corpo: string): number {
  const s = Number(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/.exec(corpo)?.[1]);
  return Math.round(Math.min(60, Math.max(2, Number.isFinite(s) && s > 0 ? s : 20)) * 1000);
}
