/**
 * Configurazione pubblica dell'app. Contiene solo valori fatti per stare nel client
 * (l'ID client OAuth non è un segreto): nessuna password, nessun client secret.
 * Le variabili VITE_GOOGLE_CLIENT_ID e VITE_GOOGLE_API_KEY (es. in .env.local) sostituiscono i valori qui sotto.
 */

/** ID client OAuth "Applicazione web" del progetto Google Cloud di Masterfood. */
const ID_CLIENT_GOOGLE = '482205981080-7p0d3h797nbm2gtb9h3iediib5rcihs3.apps.googleusercontent.com';

/**
 * Chiave API del selettore file di Google (Picker), limitata al sito dell'app e alla sola
 * Picker API: è fatta per stare nel client. Serve solo se Google chiede a un familiare
 * invitato di confermare i file condivisi.
 */
const CHIAVE_API_GOOGLE = 'AIzaSyDZ4P2SQ9bpPLdb2ojAI9VDKUQdQjYQgFg';

export const config = {
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || ID_CLIENT_GOOGLE,
  googleApiKey: import.meta.env.VITE_GOOGLE_API_KEY || CHIAVE_API_GOOGLE,
} as const;

/** Numero del progetto Google Cloud: è la prima parte dell'ID client. */
export const numeroProgettoGoogle = () => config.googleClientId.split('-')[0] ?? '';

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
