/** Aritmetica sulle date locali AAAA-MM-GG (fuso Europe/Rome), senza ore né fusi. */
import type { DataLocale } from './tipi';

function inUtc(data: DataLocale): Date {
  const [a, m, g] = data.split('-').map(Number);
  return new Date(Date.UTC(a!, m! - 1, g!));
}

export function aggiungiGiorni(data: DataLocale, giorni: number): DataLocale {
  const d = inUtc(data);
  d.setUTCDate(d.getUTCDate() + giorni);
  return d.toISOString().slice(0, 10);
}

/** Giorni da `da` ad `a` (positivo se `a` è dopo). */
export function differenzaGiorni(da: DataLocale, a: DataLocale): number {
  return Math.round((inUtc(a).getTime() - inUtc(da).getTime()) / 86_400_000);
}

export function minData(...date: (DataLocale | undefined)[]): DataLocale | undefined {
  return date.filter((d): d is DataLocale => !!d).sort()[0];
}

const FORMATO_BREVE = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** "oggi", "domani", "tra 3 giorni", "ieri", "3 giorni fa", altrimenti "12 nov". */
export function descriviData(data: DataLocale, oggi: DataLocale): string {
  const diff = differenzaGiorni(oggi, data);
  if (diff === 0) return 'oggi';
  if (diff === 1) return 'domani';
  if (diff === -1) return 'ieri';
  if (diff > 1 && diff <= 6) return `tra ${diff} giorni`;
  if (diff < -1 && diff >= -6) return `${-diff} giorni fa`;
  return FORMATO_BREVE.format(inUtc(data));
}
