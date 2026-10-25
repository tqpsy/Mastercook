/**
 * Avvisi di scadenza sul telefono. Si preparano nell'app per i prossimi giorni (prodotti che
 * scadono quel giorno o il successivo, con la ricetta che ne usa di più) e il service worker
 * mostra quello del giorno, anche ad app chiusa, senza server.
 */
import { aggiungiGiorni } from './date';
import type { ArticoloValutato } from './disponibilita';
import type { Suggerimento } from './suggerimenti';
import type { DataLocale } from './tipi';

export interface Promemoria {
  /** Giorno in cui mostrarlo. */
  giorno: DataLocale;
  titolo: string;
  testo: string;
  /** Percorso dell'app da aprire toccando l'avviso, senza la base. */
  apri: string;
}

/** Quanti giorni avanti si preparano: l'app di solito si riapre prima. */
export const GIORNI_PROMEMORIA = 7;

function elenco(nomi: string[]): string {
  if (nomi.length <= 3) return nomi.length === 1 ? nomi[0]! : `${nomi.slice(0, -1).join(', ')} e ${nomi.at(-1)}`;
  return `${nomi.slice(0, 3).join(', ')} e altri ${nomi.length - 3}`;
}

/** La ricetta suggerita che usa più ingredienti tra quelli in scadenza (a parità, la migliore). */
export function ricettaPer(ingredienti: ReadonlySet<string>, suggerimenti: readonly Suggerimento[]): Suggerimento | undefined {
  let migliore: Suggerimento | undefined;
  let usati = 0;
  for (const s of suggerimenti) {
    const n = new Set(s.righe.filter((r) => r.disponibile > 0 && r.riga.ingrediente_id && ingredienti.has(r.riga.ingrediente_id)).map((r) => r.riga.ingrediente_id)).size;
    if (n > usati || (n === usati && n > 0 && migliore && s.punteggio > migliore.punteggio)) {
      migliore = s;
      usati = n;
    }
  }
  return usati > 0 ? migliore : undefined;
}

export function preparaPromemoria(
  inventario: readonly ArticoloValutato[],
  suggerimenti: readonly Suggerimento[],
  oggi: DataLocale,
  giorni = GIORNI_PROMEMORIA,
): Promemoria[] {
  const conData = inventario.filter((v) => v.scadenza && v.quantita > 0 && v.articolo.luogo !== 'freezer' && v.scadenza >= oggi);
  const risultato: Promemoria[] = [];
  for (let i = 0; i < giorni; i++) {
    const giorno = aggiungiGiorni(oggi, i);
    const domani = aggiungiGiorni(giorno, 1);
    const inScadenza = conData
      .filter((v) => v.scadenza! <= domani && v.scadenza! >= giorno)
      .sort((a, b) => a.scadenza!.localeCompare(b.scadenza!) || a.articolo.nome.localeCompare(b.articolo.nome));
    if (!inScadenza.length) continue;
    const nomi = [...new Set(inScadenza.map((v) => v.articolo.nome))];
    const tuttiOggi = inScadenza.every((v) => v.scadenza === giorno);
    const quando = tuttiOggi ? 'oggi' : nomi.length === 1 ? 'domani' : 'entro domani';
    const titolo = nomi.length === 1 ? `${nomi[0]} scade ${quando}` : `${nomi.length} prodotti scadono ${quando}`;
    const ingredienti = new Set(inScadenza.map((v) => v.articolo.ingrediente_id).filter((x): x is string => !!x));
    const ricetta = ricettaPer(ingredienti, suggerimenti);
    const piu = nomi.length > 1;
    const testo = ricetta
      ? `${piu ? `${elenco(nomi)}. ` : ''}Idea: ${ricetta.ricetta.titolo}.`
      : piu
        ? `${elenco(nomi)}. Usali presto o mettili in freezer.`
        : 'Usalo presto o mettilo in freezer.';
    risultato.push({ giorno, titolo, testo, apri: ricetta ? `ricette/${encodeURIComponent(ricetta.ricetta.id)}` : 'casa' });
  }
  return risultato;
}
