import { annoNascita, etaDaAnno } from './fabbisogni';
import { dataLocale } from './id';
import type { Membro } from './tipi';

/** Sotto questa età il profilo si mostra come bambino o bambina. */
export const ETA_BAMBINO = 14;

/** Emoji del profilo: uomo, donna, bambino o bambina; neutra se il sesso non è indicato. */
export function emojiMembro(m: Pick<Membro, 'sesso' | 'anno_nascita' | 'data_nascita' | 'fattore_porzione'>, oggi = dataLocale()): string {
  // Senza anno di nascita si capisce dalla porzione: sotto quella di un adulto è un bambino.
  const anno = annoNascita(m);
  const bambino = anno !== undefined ? etaDaAnno(anno, oggi) < ETA_BAMBINO : m.fattore_porzione < 1;
  if (bambino) return m.sesso === 'maschio' ? '👦' : m.sesso === 'femmina' ? '👧' : '🧒';
  return m.sesso === 'maschio' ? '👨' : m.sesso === 'femmina' ? '👩' : '🧑';
}
