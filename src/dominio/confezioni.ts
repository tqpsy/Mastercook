import type { ArticoloInventario } from './tipi';

/** Sotto questo scarto una confezione si conta ancora intera (2,02 l = 2 bottiglie da 1 l). */
const TOLLERANZA = 0.05;

/**
 * Quanto contiene una confezione dell'articolo, nella sua unità. I pezzi e le porzioni valgono 1;
 * per gli articoli caricati prima delle confezioni vale il primo carico (o tutto quello che c'è).
 */
export function misuraConfezione(articolo: Pick<ArticoloInventario, 'confezione' | 'unita' | 'movimenti'>, quantita: number): number {
  if (articolo.confezione && articolo.confezione > 0) return articolo.confezione;
  if (articolo.unita === 'pz') return 1;
  const primo = articolo.movimenti?.find((m) => m.motivo === 'carico' && m.unita === articolo.unita && m.delta > 0);
  return primo?.delta ?? (quantita > 0 ? quantita : 1);
}

/** Quante confezioni ci sono: una iniziata conta come una. */
export function numeroConfezioni(quantita: number, misura: number): number {
  if (quantita <= 0 || misura <= 0) return 0;
  return Math.max(1, Math.ceil(quantita / misura - TOLLERANZA));
}

/** Quantità dopo aver tolto una confezione: se ce n'è una iniziata, si toglie quella. */
export function quantitaConUnaInMeno(quantita: number, misura: number): number {
  return Math.max(0, (numeroConfezioni(quantita, misura) - 1) * misura);
}

/** Vero se una delle confezioni è iniziata (ne resta meno del totale delle confezioni intere). */
export function confezioneIniziata(quantita: number, misura: number): boolean {
  return quantita > 0 && quantita < numeroConfezioni(quantita, misura) * misura * (1 - TOLLERANZA);
}
