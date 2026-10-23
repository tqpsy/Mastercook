import type { Movimento, UnitaCanonica } from './tipi';

/**
 * Quantità disponibile = somma dei movimenti, mai negativa (invariante del validatore).
 * I movimenti in un'unità diversa da quella richiesta vengono ignorati: la conversione
 * pezzi ↔ grammi usa peso_medio_pz dei dati di riferimento e avviene a monte.
 */
export function quantitaDisponibile(movimenti: readonly Movimento[], unita: UnitaCanonica): number {
  const somma = movimenti.reduce((totale, m) => (m.unita === unita ? totale + m.delta : totale), 0);
  return Math.max(0, somma);
}

/**
 * Scalatura di una riga di ricetta sui presenti:
 * q = quantità / porzioni_base × Σ fattori (membri presenti + ospiti: adulto 1,0, bambino 0,6).
 */
export function quantitaScalata(quantita: number, porzioniBase: number, fattoriPresenti: readonly number[]): number {
  if (porzioniBase <= 0) throw new Error('porzioni_base deve essere positivo');
  const sommaFattori = fattoriPresenti.reduce((a, b) => a + b, 0);
  return (quantita / porzioniBase) * sommaFattori;
}

export const FATTORE_OSPITE_ADULTO = 1.0;
export const FATTORE_OSPITE_BAMBINO = 0.6;
