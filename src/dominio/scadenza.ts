/**
 * Scadenza effettiva e stato di un articolo d'inventario.
 * Scadenza effettiva = la più vicina tra data stampata e "conservare fino" (avanzi, aperti, scongelati).
 * "Entro" superato = scaduto ed escluso dai suggerimenti; "preferibilmente entro" superato = da controllare.
 */
import type { Reparto } from '../rif/reparti';
import { differenzaGiorni, minData } from './date';
import type { ArticoloInventario, DataLocale, Luogo } from './tipi';

export type StatoScadenza = 'scaduto' | 'controlla' | 'oggi' | 'in_scadenza' | 'ok' | 'senza_data';

export function scadenzaEffettiva(a: Pick<ArticoloInventario, 'data_scadenza' | 'conservare_fino'>): DataLocale | undefined {
  return minData(a.data_scadenza, a.conservare_fino);
}

/** Giorni di preavviso predefiniti (fase 2 li renderà configurabili per nucleo). */
export function sogliaAvviso(luogo: Luogo, reparto: Reparto | undefined, cotto: boolean): number {
  if (luogo === 'freezer') return 14;
  if (cotto) return 2;
  if (reparto === 'carne' || reparto === 'pesce') return 1;
  if (luogo === 'dispensa') return reparto === 'frutta_verdura' || reparto === 'pane_forno' ? 2 : 7;
  if (reparto === 'latticini' || reparto === 'gastronomia' || reparto === 'frutta_verdura') return 2;
  return 3;
}

export function statoScadenza(
  a: Pick<ArticoloInventario, 'data_scadenza' | 'conservare_fino' | 'tipo_scadenza'>,
  oggi: DataLocale,
  soglia: number,
): StatoScadenza {
  const scadenza = scadenzaEffettiva(a);
  if (!scadenza) return 'senza_data';
  const giorni = differenzaGiorni(oggi, scadenza);
  if (giorni < 0) {
    // conservare_fino (cotti, aperti, scongelati) è sempre un limite di sicurezza.
    const oltreConservazione = a.conservare_fino !== undefined && a.conservare_fino < oggi;
    return a.tipo_scadenza === 'preferibilmente' && !oltreConservazione ? 'controlla' : 'scaduto';
  }
  if (giorni === 0) return 'oggi';
  if (giorni <= soglia) return 'in_scadenza';
  return 'ok';
}

/** Peso "usa prima" per i suggerimenti: oggi 3, domani 2, entro soglia 1. */
export function pesoUsaPrima(stato: StatoScadenza, giorni: number | undefined): number {
  if (stato === 'oggi' || stato === 'controlla') return 3;
  if (stato === 'in_scadenza') return giorni === 1 ? 2 : 1;
  return 0;
}
