/**
 * Cosa c'è in casa, per ingrediente generico: base comune di suggerimenti e lista della spesa.
 * Gli articoli scaduti ("entro" superato) non contano; un articolo vale anche per gli
 * ingredienti antenati (gli spaghetti contano come pasta).
 */
import { antenati, ingrediente } from '../rif/ingredienti';
import { differenzaGiorni } from './date';
import { quantitaDisponibile } from './quantita';
import { pesoUsaPrima, scadenzaEffettiva, sogliaAvviso, statoScadenza, type StatoScadenza } from './scadenza';
import type { ArticoloInventario, DataLocale } from './tipi';

export interface ArticoloValutato {
  articolo: ArticoloInventario;
  quantita: number;
  scadenza?: DataLocale;
  stato: StatoScadenza;
  giorni?: number;
}

export function valutaArticolo(articolo: ArticoloInventario, oggi: DataLocale): ArticoloValutato {
  const quantita = quantitaDisponibile(articolo.movimenti ?? [], articolo.unita);
  const scadenza = scadenzaEffettiva(articolo);
  const cotto = articolo.stato_conservazione === 'cotto' || articolo.stato_conservazione === 'avanzato';
  const soglia = sogliaAvviso(articolo.luogo, ingrediente(articolo.ingrediente_id)?.reparto, cotto);
  return {
    articolo,
    quantita,
    scadenza,
    stato: statoScadenza(articolo, oggi, soglia),
    giorni: scadenza ? differenzaGiorni(oggi, scadenza) : undefined,
  };
}

/** Articoli presenti (non eliminati e con quantità > 0), ordinati per scadenza. */
export function articoliPresenti(articoli: readonly ArticoloInventario[], oggi: DataLocale): ArticoloValutato[] {
  return articoli
    .filter((a) => !a.eliminato_il)
    .map((a) => valutaArticolo(a, oggi))
    .filter((v) => v.quantita > 0)
    .sort((x, y) => (x.scadenza ?? '9999').localeCompare(y.scadenza ?? '9999') || x.articolo.nome.localeCompare(y.articolo.nome));
}

export interface Disponibilita {
  /** Quantità per ingrediente, nell'unità dell'ingrediente. */
  quantita: Map<string, number>;
  /** Peso "usa prima" per ingrediente (3 oggi, 2 domani, 1 entro soglia). */
  usaPrima: Map<string, number>;
}

export function calcolaDisponibilita(valutati: readonly ArticoloValutato[]): Disponibilita {
  const quantita = new Map<string, number>();
  const usaPrima = new Map<string, number>();
  for (const v of valutati) {
    const id = v.articolo.ingrediente_id;
    if (!id || v.stato === 'scaduto' || v.quantita <= 0) continue;
    const peso = pesoUsaPrima(v.stato, v.giorni);
    for (const antenato of antenati(id)) {
      quantita.set(antenato, (quantita.get(antenato) ?? 0) + v.quantita);
    }
    if (peso > 0) usaPrima.set(id, Math.max(usaPrima.get(id) ?? 0, peso));
  }
  return { quantita, usaPrima };
}
