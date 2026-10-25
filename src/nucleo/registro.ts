/**
 * Registro dei nuclei presenti su questo dispositivo e preferenze locali (nucleo corrente,
 * chi sta usando l'app). Sono preferenze del dispositivo, non dati del nucleo: i dati veri
 * stanno nel documento Yjs in IndexedDB.
 */
export interface NucleoLocale {
  id: string;
  nome: string;
  creato_il: string;
  modalita: 'locale' | 'drive' | 'locale_drive';
  /**
   * File del nucleo su Google Drive, quando è collegato a un account. `chiave` (base64) c'è solo
   * per chi ha creato il nucleo; chi è invitato la tiene protetta in archivioChiavi.
   * `relay`: chi è invitato legge e scrive la copia condivisa su Firebase invece dei file di Drive.
   */
  drive?: { cartella: string; dati: string; storico: string; chiave?: string; foto?: string; proprietario?: boolean; relay?: boolean };
}

const CHIAVE_NUCLEI = 'masterfood:nuclei';
const CHIAVE_CORRENTE = 'masterfood:nucleo-corrente';
const chiaveMembro = (nucleoId: string) => `masterfood:membro:${nucleoId}`;

function leggi<T>(chiave: string, predefinito: T): T {
  try {
    const valore = localStorage.getItem(chiave);
    return valore ? (JSON.parse(valore) as T) : predefinito;
  } catch {
    return predefinito;
  }
}

function scrivi(chiave: string, valore: unknown): void {
  try {
    if (valore === null) localStorage.removeItem(chiave);
    else localStorage.setItem(chiave, JSON.stringify(valore));
  } catch {
    // Archivio non disponibile (navigazione privata): l'app continua per la sessione.
  }
}

export const leggiNuclei = () => leggi<NucleoLocale[]>(CHIAVE_NUCLEI, []);

export function salvaNucleoLocale(nucleo: NucleoLocale): void {
  scrivi(CHIAVE_NUCLEI, [...leggiNuclei().filter((n) => n.id !== nucleo.id), nucleo]);
}

export function rimuoviNucleoLocale(id: string): void {
  scrivi(CHIAVE_NUCLEI, leggiNuclei().filter((n) => n.id !== id));
  scrivi(chiaveMembro(id), null);
  if (leggiNucleoCorrente() === id) scrivi(CHIAVE_CORRENTE, null);
}

export const leggiNucleoCorrente = () => leggi<string | null>(CHIAVE_CORRENTE, null);
export const scriviNucleoCorrente = (id: string | null) => scrivi(CHIAVE_CORRENTE, id);

export const leggiMembroCorrente = (nucleoId: string) => leggi<string | null>(chiaveMembro(nucleoId), null);
export const scriviMembroCorrente = (nucleoId: string, membroId: string) => scrivi(chiaveMembro(nucleoId), membroId);
