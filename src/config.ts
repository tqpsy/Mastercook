/**
 * Configurazione pubblica dell'app. Contiene solo valori fatti per stare nel client
 * (l'ID client OAuth non è un segreto): nessuna password, nessun client secret.
 * Una variabile VITE_GOOGLE_CLIENT_ID (es. in .env.local) sostituisce il valore qui sotto.
 */

/** ID client OAuth "Applicazione web" del progetto Google Cloud di Masterfood. */
const ID_CLIENT_GOOGLE = '';

export const config = {
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || ID_CLIENT_GOOGLE,
} as const;

/**
 * Scope Google, tutti non sensibili: identità, file creati dall'app (drive.file)
 * e area nascosta dell'app sul Drive (drive.appdata) per chiave ed elenco dei nuclei.
 */
export const SCOPE_GOOGLE = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.appdata',
].join(' ');

export const googleConfigurato = () => !!config.googleClientId;
