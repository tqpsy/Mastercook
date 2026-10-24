/**
 * Chiavi API personali dell'utente (BYOK): Masterfood non ha costi propri, le funzioni
 * avanzate usano l'account dell'utente e le chiamate partono dal dispositivo verso il fornitore.
 * In modalità locale la chiave resta solo su questo dispositivo; con l'account verrà salvata
 * cifrata nel file personale masterfood-utente.mfd sul suo Drive.
 */
export type Fornitore = 'gemini' | 'vision';

const chiave = (f: Fornitore) => `masterfood:chiave:${f}`;

export function leggiChiave(f: Fornitore): string {
  try {
    return localStorage.getItem(chiave(f)) ?? '';
  } catch {
    return '';
  }
}

export function scriviChiave(f: Fornitore, valore: string): void {
  try {
    if (valore) localStorage.setItem(chiave(f), valore);
    else localStorage.removeItem(chiave(f));
  } catch {
    // archivio non disponibile
  }
}
