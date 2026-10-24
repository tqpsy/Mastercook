/**
 * Google Identity Services: pulsante "Accedi con Google" (ID token per Supabase) e token
 * di accesso a Drive con lo scope drive.file. Il token Drive dura circa un'ora e resta
 * solo in memoria; nessun refresh token, nessun segreto.
 */
import { config, SCOPE_DRIVE } from '../config';

interface RispostaCredenziale {
  credential: string;
}
interface RispostaToken {
  access_token?: string;
  expires_in?: number;
  error?: string;
}
interface ClientToken {
  requestAccessToken(opzioni?: { prompt?: '' | 'consent'; login_hint?: string }): void;
}
interface Gis {
  accounts: {
    id: {
      initialize(o: { client_id: string; callback: (r: RispostaCredenziale) => void; nonce?: string; use_fedcm_for_button?: boolean }): void;
      renderButton(el: HTMLElement, o: Record<string, unknown>): void;
      disableAutoSelect(): void;
    };
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

function esadecimale(byte: ArrayBuffer): string {
  return [...new Uint8Array(byte)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Disegna il pulsante ufficiale Google. Il nonce grezzo va a Supabase, a Google il suo SHA-256,
 * così l'ID token non può essere riusato.
 */
export async function mostraPulsanteGoogle(contenitore: HTMLElement, onToken: (idToken: string, nonce: string) => void): Promise<void> {
  const gis = await caricaGis();
  const nonce = esadecimale(crypto.getRandomValues(new Uint8Array(16)).buffer);
  const nonceHash = esadecimale(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(nonce)));
  gis.accounts.id.initialize({
    client_id: config.googleClientId,
    nonce: nonceHash,
    use_fedcm_for_button: true,
    callback: (r) => onToken(r.credential, nonce),
  });
  contenitore.replaceChildren();
  gis.accounts.id.renderButton(contenitore, { theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', locale: 'it', width: 280 });
}

let tokenDrive: { valore: string; scade: number } | null = null;

export function tokenDriveValido(): string | null {
  return tokenDrive && tokenDrive.scade > Date.now() + 60_000 ? tokenDrive.valore : null;
}

export function dimenticaTokenDrive(): void {
  tokenDrive = null;
}

/**
 * Chiede a Google il token per Drive. La prima volta va chiamata da un tocco dell'utente
 * (apre la finestra di consenso); dopo, con `silenzioso`, di solito si chiude da sola.
 */
export async function richiediTokenDrive(email?: string, silenzioso = false): Promise<string> {
  const gis = await caricaGis();
  return new Promise<string>((ok, ko) => {
    const client = gis.accounts.oauth2.initTokenClient({
      client_id: config.googleClientId,
      scope: SCOPE_DRIVE,
      callback: (r) => {
        if (!r.access_token) return ko(new Error(r.error ?? 'negato'));
        tokenDrive = { valore: r.access_token, scade: Date.now() + (r.expires_in ?? 3600) * 1000 };
        ok(r.access_token);
      },
      error_callback: (e) => ko(new Error(e.type)),
    });
    client.requestAccessToken({ prompt: silenzioso ? '' : undefined, login_hint: email });
  });
}

export async function esciDaGoogle(): Promise<void> {
  const token = tokenDrive?.valore;
  tokenDrive = null;
  const gis = window.google;
  gis?.accounts.id.disableAutoSelect();
  if (token) gis?.accounts.oauth2.revoke(token);
}
