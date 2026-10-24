/**
 * Verifica di una chiave API con una chiamata minima: per Gemini l'elenco dei modelli
 * (gratuito, nessun token), per Vision un'immagine di 1 pixel (una sola unità, nella quota gratuita).
 * Traduce gli errori di Google in messaggi comprensibili.
 */
import type { Fornitore } from './chiaviApi';

export type EsitoVerifica = { ok: true; messaggio: string } | { ok: false; messaggio: string };

const PIXEL_BIANCO = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

interface ErroreGoogle {
  error?: { code?: number; status?: string; message?: string; details?: { reason?: string }[] };
}

export function interpretaErrore(fornitore: Fornitore, http: number, corpo: ErroreGoogle): string {
  const e = corpo.error ?? {};
  const motivi = (e.details ?? []).map((d) => d.reason ?? '');
  const testo = `${e.message ?? ''} ${motivi.join(' ')}`;
  const api = fornitore === 'gemini' ? 'Generative Language API' : 'Cloud Vision API';
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
    r =
      fornitore === 'gemini'
        ? await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1', { headers: { 'x-goog-api-key': chiave.trim() } })
        : await fetch(`https://eu-vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(chiave.trim())}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requests: [{ image: { content: PIXEL_BIANCO }, features: [{ type: 'TEXT_DETECTION', maxResults: 1 }] }] }),
          });
  } catch {
    return { ok: false, messaggio: 'Non riesco a contattare Google: controlla la connessione e riprova.' };
  }
  if (r.ok) return { ok: true, messaggio: 'Chiave valida: funziona.' };
  const corpo = (await r.json().catch(() => ({}))) as ErroreGoogle;
  return { ok: false, messaggio: interpretaErrore(fornitore, r.status, corpo) };
}
