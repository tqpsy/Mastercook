/**
 * Verifica della chiave Gemini con una chiamata minima: l'elenco dei modelli (gratuito, nessun token).
 * Traduce gli errori di Google in messaggi comprensibili.
 */
import type { Fornitore } from './chiaviApi';

export type EsitoVerifica = { ok: true; messaggio: string } | { ok: false; messaggio: string };

interface ErroreGoogle {
  error?: { code?: number; status?: string; message?: string; details?: { reason?: string }[] };
}

export function interpretaErrore(_fornitore: Fornitore, http: number, corpo: ErroreGoogle): string {
  const e = corpo.error ?? {};
  const motivi = (e.details ?? []).map((d) => d.reason ?? '');
  const testo = `${e.message ?? ''} ${motivi.join(' ')}`;
  const api = 'Generative Language API';
  if (motivi.includes('API_KEY_INVALID') || /api key not valid|API key not found/i.test(testo))
    return 'Chiave errata: controlla di averla copiata per intero, senza spazi.';
  if (motivi.includes('SERVICE_DISABLED') || /has not been used|is disabled|not been enabled/i.test(testo))
    return `La chiave è giusta ma la ${api} non è abilitata nel tuo progetto Google Cloud: abilitala e riprova tra qualche minuto.`;
  if (motivi.includes('BILLING_DISABLED') || /billing/i.test(testo))
    return 'Google chiede un account di fatturazione attivo per questo servizio (resta nella quota gratuita): attivalo nel progetto Google Cloud.';
  if (motivi.some((m) => m.startsWith('API_KEY_') && m.endsWith('_BLOCKED')) || /referer|blocked/i.test(testo))
    return 'La chiave è limitata e non può essere usata da questa app: togli o aggiorna le restrizioni nella console Google Cloud.';
  if (http === 429 || e.status === 'RESOURCE_EXHAUSTED') return 'Quota esaurita: hai raggiunto il limite gratuito, riprova più tardi o domani.';
  if (http === 403 || e.status === 'PERMISSION_DENIED') return `Permesso negato: controlla che la chiave possa usare la ${api}.`;
  if (http >= 500) return 'Il servizio di Google non risponde in questo momento: riprova tra poco.';
  return `Verifica non riuscita (errore ${http}${e.message ? `: ${e.message}` : ''}).`;
}

export async function verificaChiave(fornitore: Fornitore, chiave: string): Promise<EsitoVerifica> {
  if (!chiave.trim()) return { ok: false, messaggio: 'Incolla prima la chiave.' };
  if (!navigator.onLine) return { ok: false, messaggio: 'Sei offline: collegati a internet e riprova.' };
  let r: Response;
  try {
    r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1', { headers: { 'x-goog-api-key': chiave.trim() } });
  } catch {
    return { ok: false, messaggio: 'Non riesco a contattare Google: controlla la connessione e riprova.' };
  }
  if (r.ok) return { ok: true, messaggio: 'Chiave valida: funziona.' };
  const corpo = (await r.json().catch(() => ({}))) as ErroreGoogle;
  return { ok: false, messaggio: interpretaErrore(fornitore, r.status, corpo) };
}
