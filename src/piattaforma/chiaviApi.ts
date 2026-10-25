/**
 * Chiavi API personali dell'utente (BYOK): Masterfood non ha costi propri, le funzioni
 * avanzate usano l'account dell'utente e le chiamate partono dal dispositivo verso il fornitore.
 * La chiave resta su questo dispositivo; quella di chi ha creato il nucleo viaggia cifrata con i
 * dati del nucleo, così i familiari invitati usano Gemini senza poterla vedere.
 */
export type Fornitore = 'gemini';

const chiave = (f: Fornitore) => `masterfood:chiave:${f}`;

// Cloud Vision non si usa più (serviva una carta di credito): si toglie la chiave rimasta.
try {
  localStorage.removeItem('masterfood:chiave:vision');
} catch {
  // archivio non disponibile
}

/**
 * Chiave di chi ha creato il nucleo, arrivata con i dati cifrati del nucleo: i familiari la usano
 * senza vederla (l'app non la mostra né la fa copiare). Vive solo in memoria.
 */
let chiaveDelNucleo = '';
const ascoltatori = new Set<() => void>();

export function impostaChiaveDelNucleo(valore: string): void {
  chiaveDelNucleo = valore;
}

/** Chiave da usare: quella di questo dispositivo, altrimenti quella condivisa nel nucleo. */
export function leggiChiave(f: Fornitore): string {
  return chiavePropria(f) || chiaveDelNucleo;
}

/** Solo la chiave salvata su questo dispositivo: è l'unica che l'app mostra. */
export function chiavePropria(f: Fornitore): string {
  try {
    return localStorage.getItem(chiave(f)) ?? '';
  } catch {
    return '';
  }
}

/** Vero se si usa la chiave condivisa da chi ha creato il nucleo. */
export const usaChiaveDelNucleo = (f: Fornitore) => !chiavePropria(f) && !!chiaveDelNucleo;

export function scriviChiave(f: Fornitore, valore: string): void {
  try {
    if (valore) localStorage.setItem(chiave(f), valore);
    else localStorage.removeItem(chiave(f));
  } catch {
    // archivio non disponibile
  }
  for (const a of ascoltatori) a();
}

/** Avvisa quando la chiave di questo dispositivo cambia. */
export function ascoltaChiave(a: () => void): () => void {
  ascoltatori.add(a);
  return () => ascoltatori.delete(a);
}
