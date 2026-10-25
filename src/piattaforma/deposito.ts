/** Dove sta una copia cifrata dei file del nucleo: Google Drive o la copia condivisa su Firebase. */
export interface Deposito {
  /** Cambia a ogni scrittura; VUOTO se il file non c'è ancora. */
  versione(id: string): Promise<string>;
  scarica(id: string): Promise<Uint8Array>;
  /** Restituisce la nuova versione. */
  aggiorna(id: string, contenuto: Uint8Array): Promise<string>;
}

/** Versione di un file che non esiste ancora: niente da scaricare, si carica e basta. */
export const VUOTO = '';
