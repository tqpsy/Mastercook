/**
 * Accesso con Google tramite Google Identity Services (modello a token): un solo consenso
 * per identità, file creati dall'app su Drive e area nascosta dell'app. Il token dura circa
 * un'ora e resta solo in memoria: nessun refresh token, nessun server, nessun segreto.
 */
import { config, SCOPE_GOOGLE } from '../config';

interface RispostaToken {
  access_token?: string;
  expires_in?: number;
  error?: string;
}
interface ClientToken {
  requestAccessToken(opzioni?: { prompt?: '' | 'consent' | 'select_account'; login_hint?: string }): void;
}
interface Gis {
  accounts: {
    oauth2: {
      initTokenClient(o: {
        client_id: string;
        scope: string;
        callback: (r: RispostaToken) => void;
        error_callback?: (e: { type: string }) => void;
      }): ClientToken;
      revoke(token: string, fatto?: () => void): void;
    };
  };
}

declare global {
  interface Window {
    google?: Gis;
  }
}

let caricamento: Promise<Gis> | undefined;

export function caricaGis(): Promise<Gis> {
  caricamento ??= new Promise<Gis>((ok, ko) => {
    if (window.google?.accounts) return ok(window.google);
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => (window.google ? ok(window.google) : ko(new Error('gis')));
    s.onerror = () => {
      caricamento = undefined;
      ko(new Error('rete'));
    };
    document.head.appendChild(s);
  });
  return caricamento;
}

let token: { valore: string; scade: number } | null = null;

export function tokenValido(): string | null {
  return token && token.scade > Date.now() + 60_000 ? token.valore : null;
}

/**
 * Chiede a Google il token. Senza `silenzioso` va chiamata da un tocco dell'utente perché
 * apre la finestra di Google; con `silenzioso` e l'email nota di solito si chiude da sola.
 */
export async function richiediToken(email?: string, silenzioso = false): Promise<string> {
  const gis = await caricaGis();
  return new Promise<string>((ok, ko) => {
    const client = gis.accounts.oauth2.initTokenClient({
      client_id: config.googleClientId,
      scope: SCOPE_GOOGLE,
      callback: (r) => {
        if (!r.access_token) return ko(new Error(r.error ?? 'negato'));
        token = { valore: r.access_token, scade: Date.now() + (r.expires_in ?? 3600) * 1000 };
        ok(r.access_token);
      },
      error_callback: (e) => ko(new Error(e.type)),
    });
    client.requestAccessToken({ prompt: silenzioso ? '' : email ? undefined : 'select_account', login_hint: email });
  });
}

/** Email dell'account appena collegato. */
export async function leggiEmail(): Promise<string> {
  const valore = tokenValido();
  if (!valore) throw new Error('token');
  const r = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${valore}` } });
  if (!r.ok) throw new Error('userinfo');
  return ((await r.json()) as { email: string }).email;
}

export function esciDaGoogle(): void {
  const valore = token?.valore;
  token = null;
  if (valore) window.google?.accounts.oauth2.revoke(valore);
}
