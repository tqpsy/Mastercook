/**
 * Contenuto del QR code di uno scontrino. Di solito è un link (verifica del documento
 * commerciale o scontrino digitale del negozio) che l'app non può leggere da sola: lo apre
 * l'utente. Se invece il QR contiene il testo dello scontrino, le righe si leggono subito.
 */
import { leggiScontrino, type ScontrinoLetto } from './scontrino';

export type ContenutoQr =
  | { tipo: 'righe'; scontrino: ScontrinoLetto }
  | { tipo: 'link'; url: string; sito: string }
  | { tipo: 'altro'; testo: string };

export function interpretaQr(grezzo: string): ContenutoQr {
  const testo = grezzo.trim();
  if (/^https?:\/\//i.test(testo)) {
    try {
      const url = new URL(testo);
      return { tipo: 'link', url: url.href, sito: url.hostname.replace(/^www\./, '') };
    } catch {
      // non è un link valido: lo tratto come testo
    }
  }
  const scontrino = leggiScontrino(testo.replace(/\r\n?/g, '\n'));
  if (scontrino.righe.length > 0) return { tipo: 'righe', scontrino };
  return { tipo: 'altro', testo };
}
