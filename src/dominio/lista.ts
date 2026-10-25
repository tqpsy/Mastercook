/**
 * Vista della lista della spesa, ricalcolata sul dispositivo.
 * Una riga per ingrediente generico (`art:<ing>`), con le sue origini (ricette, scorte, aggiunte a mano).
 * Da comprare = max(0, Σ origini − disponibile), in confezioni se l'ingrediente ha un formato tipico.
 */
import { ingrediente, type Ingrediente } from '../rif/ingredienti';
import { REPARTI, type Reparto } from '../rif/reparti';
import type { Disponibilita } from './disponibilita';
import type { ArticoloLista } from './tipi';

export interface RigaVista {
  riga: ArticoloLista;
  ingrediente?: Ingrediente;
  reparto: Reparto;
  /** Quantità ancora da comprare, se calcolabile. */
  mancante?: number;
  disponibile: number;
  confezioni?: number;
}

export interface VistaLista {
  daComprare: RigaVista[];
  giaInCasa: RigaVista[];
  presi: RigaVista[];
}

export function vistaLista(righe: readonly ArticoloLista[], disponibilita: Disponibilita): VistaLista {
  const vista: VistaLista = { daComprare: [], giaInCasa: [], presi: [] };
  for (const riga of righe) {
    if (riga.eliminato_il || riga.stato === 'rimosso') continue;
    const ing = ingrediente(riga.ingrediente_id);
    const disponibile = ing ? (disponibilita.quantita.get(ing.id) ?? 0) : 0;
    const base: RigaVista = { riga, ingrediente: ing, reparto: (ing?.reparto ?? riga.reparto ?? 'altro') as Reparto, disponibile };
    if (riga.stato === 'preso') {
      vista.presi.push(base);
      continue;
    }
    const conQuantita = riga.origini.filter((o) => (o.quantita ?? 0) > 0);
    const senzaQuantita = riga.origini.length === 0 || riga.origini.some((o) => !o.quantita);
    if (conQuantita.length === 0) {
      vista.daComprare.push(base);
      continue;
    }
    const richiesto = conQuantita.reduce((s, o) => s + (o.quantita ?? 0), 0);
    const mancante = Math.max(0, richiesto - disponibile);
    const confezioni = ing?.formato && mancante > 0 ? Math.ceil(mancante / ing.formato) : undefined;
    const vistaRiga = { ...base, mancante, confezioni };
    if (mancante <= 0 && !senzaQuantita) vista.giaInCasa.push(vistaRiga);
    else vista.daComprare.push(vistaRiga);
  }
  const ordine = (a: RigaVista, b: RigaVista) => a.riga.testo.localeCompare(b.riga.testo);
  vista.daComprare.sort(ordine);
  vista.giaInCasa.sort(ordine);
  return vista;
}

export interface RepartoSpesa {
  id: Reparto;
  nome: string;
  righe: RigaVista[];
}

export interface Spesa {
  /** Reparti con qualcosa ancora da prendere, nell'ordine del supermercato. */
  reparti: RepartoSpesa[];
  /** Già nel carrello, l'ultimo preso per primo. */
  carrello: RigaVista[];
  totale: number;
  presi: number;
}

/** La lista per la modalità supermercato: solo ciò che manca davvero, per reparto, e il carrello. */
export function vistaSpesa(vista: VistaLista): Spesa {
  const reparti = REPARTI.map((r) => ({ id: r.id, nome: r.nome, righe: vista.daComprare.filter((v) => v.reparto === r.id) })).filter(
    (r) => r.righe.length,
  );
  const carrello = [...vista.presi].sort((a, b) => b.riga.modificato_il.localeCompare(a.riga.modificato_il));
  return { reparti, carrello, totale: vista.daComprare.length + carrello.length, presi: carrello.length };
}
