import type { Ingrediente } from '../rif/ingredienti';
import type { UnitaCanonica } from './tipi';

const numero = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 });

/** Arrotonda a valori "da cucina": 10 g sotto il chilo, 50 g sopra. */
export function arrotonda(quantita: number, unita: UnitaCanonica): number {
  if (unita === 'pz') return Math.max(1, Math.round(quantita));
  if (quantita < 20) return Math.max(1, Math.round(quantita));
  if (quantita < 1000) return Math.round(quantita / 10) * 10;
  return Math.round(quantita / 50) * 50;
}

export function formattaQuantita(quantita: number, unita: UnitaCanonica, ing?: Ingrediente): string {
  if (unita === 'pz') {
    const n = Math.round(quantita * 10) / 10;
    return `${numero.format(n)} pz`;
  }
  const q = arrotonda(quantita, unita);
  const testo = q >= 1000 ? `${numero.format(q / 1000)} ${unita === 'g' ? 'kg' : 'l'}` : `${q} ${unita}`;
  if (ing?.peso_pz && unita === 'g' && q >= ing.peso_pz * 0.75 && ing.peso_pz >= 50) {
    const pezzi = Math.round(q / ing.peso_pz);
    return `${testo} (circa ${pezzi} pz)`;
  }
  return testo;
}

export function formattaEuro(valore: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(valore);
}
