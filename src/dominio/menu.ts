/**
 * Menù settimanale: un'entità per pasto nella collezione `piani` (id `2026-10-27:cena`).
 * Le porzioni di una portata sono la somma, per ogni membro, di quelle prescritte dalla sua
 * dieta o, se non ha una dieta, del suo fattore di porzione (adulto 1,0), più gli ospiti del pasto
 * (adulto 1,0, bambino 0,6) sulle portate con una ricetta.
 */
import { ingrediente } from '../rif/ingredienti';
import { aggiungiGiorni } from './date';
import type { TipoPasto } from './id';
import { fattoreOspiti } from './ospiti';
import type { DataLocale, MembroId, Ospiti, Pasto, PortataPianificata, Ricetta } from './tipi';

/** Lunedì della settimana di una data. */
export function lunediDi(data: DataLocale): DataLocale {
  const [a, m, g] = data.split('-').map(Number);
  const giorno = new Date(Date.UTC(a!, m! - 1, g!)).getUTCDay() || 7;
  return aggiungiGiorni(data, 1 - giorno);
}

export function giorniSettimana(lunedi: DataLocale): DataLocale[] {
  return Array.from({ length: 7 }, (_, i) => aggiungiGiorni(lunedi, i));
}

export function porzioniPortata(portata: PortataPianificata, fattore: (m: MembroId) => number, ospiti?: Ospiti): number {
  if (portata.porzioni_manuali) return portata.porzioni_manuali;
  const membri = portata.membri.reduce((s, m) => s + (portata.porzioni_dieta?.[m] ?? fattore(m)), 0);
  return membri + (portata.ricetta_id ? fattoreOspiti(ospiti) : 0);
}

/**
 * Quanto serve di ogni ingrediente per i pasti indicati, nell'unità dell'ingrediente.
 * La dispensa di base (sale, olio…) non si conta; la disponibilità la sottrae la lista.
 */
export function fabbisognoMenu(
  pasti: readonly Pasto[],
  ricettaPerId: (id: string) => Ricetta | undefined,
  fattore: (m: MembroId) => number,
): Map<string, number> {
  const totale = new Map<string, number>();
  const somma = (id: string, q: number) => q > 0 && totale.set(id, (totale.get(id) ?? 0) + q);
  for (const pasto of pasti) {
    for (const portata of pasto.portate) {
      const porzioni = porzioniPortata(portata, fattore, pasto.ospiti);
      if (!porzioni) continue;
      const ricetta = portata.ricetta_id ? ricettaPerId(portata.ricetta_id) : undefined;
      if (ricetta) {
        for (const riga of ricetta.ingredienti) {
          const ing = ingrediente(riga.ingrediente_id);
          if (!ing || ing.base || riga.opzionale || !riga.quantita) continue;
          somma(ing.id, riga.scalabile ? (riga.quantita / (ricetta.porzioni_base || 1)) * porzioni : riga.quantita);
        }
        continue;
      }
      const ing = ingrediente(portata.ingrediente_id);
      if (!ing || ing.base || !portata.quantita_g) continue;
      const perMembro = ing.unita === 'pz' ? (ing.peso_pz ? portata.quantita_g / ing.peso_pz : 0) : portata.quantita_g;
      somma(ing.id, perMembro * portata.membri.length);
    }
  }
  for (const [id, q] of totale) {
    const ing = ingrediente(id)!;
    totale.set(id, ing.unita === 'pz' ? Math.ceil(q) : Math.ceil(q / 10) * 10);
  }
  return totale;
}

export const ORDINE_PASTI: TipoPasto[] = ['colazione', 'spuntino', 'pranzo', 'merenda', 'cena'];
