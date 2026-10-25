/**
 * Ospiti a cena (Thread 4, §6): quanti adulti e bambini e le loro esigenze, senza nomi.
 * Contano nelle porzioni (adulto 1,0, bambino 0,6) e nel filtro di sicurezza delle ricette.
 */
import { FATTORE_OSPITE_ADULTO, FATTORE_OSPITE_BAMBINO } from './quantita';
import type { Presente } from './suggerimenti';
import type { Ospiti } from './tipi';

export const MASSIMO_OSPITI = 30;

export const nessunOspite = (): Ospiti => ({ adulti: 0, bambini: 0, allergie: [], restrizioni: [] });

export const quantiOspiti = (o: Ospiti | null | undefined) => (o ? o.adulti + o.bambini : 0);

export const fattoreOspiti = (o: Ospiti | null | undefined) => (o ? o.adulti * FATTORE_OSPITE_ADULTO + o.bambini * FATTORE_OSPITE_BAMBINO : 0);

/** Gli ospiti come un unico «presente» per i suggerimenti: porzioni sommate, esigenze unite. */
export function presenteOspiti(o: Ospiti | null | undefined): Presente | null {
  if (!quantiOspiti(o)) return null;
  return { nome: 'ospiti', allergie: o!.allergie, restrizioni: o!.restrizioni, sgraditi: [], fattore_porzione: fattoreOspiti(o) };
}

/** «3 ospiti: 2 adulti e 1 bambino». */
export function descriviOspiti(o: Ospiti | null | undefined): string {
  const n = quantiOspiti(o);
  if (!n) return 'Nessun ospite';
  const parti = [o!.adulti && `${o!.adulti} ${o!.adulti === 1 ? 'adulto' : 'adulti'}`, o!.bambini && `${o!.bambini} ${o!.bambini === 1 ? 'bambino' : 'bambini'}`].filter(Boolean);
  return `${n} ${n === 1 ? 'ospite' : 'ospiti'}: ${parti.join(' e ')}`;
}

/** Numeri validi tra 0 e 30 in tutto, prima gli adulti. */
export function normalizzaOspiti(o: Ospiti): Ospiti {
  const adulti = Math.max(0, Math.min(MASSIMO_OSPITI, Math.round(o.adulti) || 0));
  const bambini = Math.max(0, Math.min(MASSIMO_OSPITI - adulti, Math.round(o.bambini) || 0));
  return { ...o, adulti, bambini };
}
