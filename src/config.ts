/**
 * Configurazione pubblica letta dalle variabili VITE_* (vedi .env.example).
 * Contiene solo valori che possono stare nel client: nessun segreto.
 */
export const config = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '',
  googlePickerApiKey: import.meta.env.VITE_GOOGLE_PICKER_API_KEY ?? '',
  googleAppId: import.meta.env.VITE_GOOGLE_APP_ID ?? '',
} as const;

/** Scope Google: accesso base + drive.file (non sensibile, chiesto in modo incrementale). */
export const SCOPE_ACCESSO = ['openid', 'email', 'profile'] as const;
export const SCOPE_DRIVE = 'https://www.googleapis.com/auth/drive.file';

export function configurazioneMancante(): string[] {
  return Object.entries(config)
    .filter(([, valore]) => !valore)
    .map(([chiave]) => chiave);
}
