/**
 * Voto di genuinità da 1 (meno genuino) a 5 (più genuino).
 *
 * Regole decise da Luca il 23/10/2026:
 * - quattro criteri valutati da 1 a 5: nutrizione, additivi, lavorazione, biologico;
 * - voto = media pesata arrotondata (40 / 30 / 20 / 10);
 * - un criterio mancante non conta: i pesi si ridistribuiscono sugli altri;
 * - con meno di 2 criteri noti tra nutrizione, additivi e lavorazione → "Non valutabile";
 * - un additivo a rischio elevato limita il voto a 2.
 * All'utente si mostra solo il voto finale; i criteri servono per "Perché questo voto".
 */

export type NutriScore = 'a' | 'b' | 'c' | 'd' | 'e';
export type RischioAdditivi = 'nessuno' | 'basso' | 'moderato' | 'elevato';
export type GruppoNova = 1 | 2 | 3 | 4;

export interface DatiGenuinita {
  nutriScore?: NutriScore;
  /** Rischio più alto tra gli additivi presenti (da additivi.json, fonti EFSA). */
  rischioAdditivi?: RischioAdditivi;
  nova?: GruppoNova;
  /** true = biologico certificato, false = non biologico, assente = non noto. */
  biologico?: boolean;
}

export type Criterio = 'nutrizione' | 'additivi' | 'lavorazione' | 'biologico';

export const PESI_GENUINITA: Readonly<Record<Criterio, number>> = {
  nutrizione: 40,
  additivi: 30,
  lavorazione: 20,
  biologico: 10,
};

export const ETICHETTE_VOTO = {
  5: 'Ottimo',
  4: 'Buono',
  3: 'Discreto',
  2: 'Scarso',
  1: 'Da limitare',
} as const;

export type Voto = keyof typeof ETICHETTE_VOTO;

export type EsitoGenuinita =
  | { valutabile: true; voto: Voto; etichetta: string; criteri: Partial<Record<Criterio, number>>; limitatoDaAdditivi: boolean }
  | { valutabile: false; etichetta: 'Non valutabile'; criteri: Partial<Record<Criterio, number>> };

/** Incrementato a ogni cambio di regole, salvato nel prodotto come genuinita.versione. */
export const VERSIONE_GENUINITA = 1;

const NUTRI_SCORE: Record<NutriScore, number> = { a: 5, b: 4, c: 3, d: 2, e: 1 };
const ADDITIVI: Record<RischioAdditivi, number> = { nessuno: 5, basso: 4, moderato: 2, elevato: 1 };
const NOVA: Record<GruppoNova, number> = { 1: 5, 2: 4, 3: 3, 4: 1 };

export function criteriGenuinita(dati: DatiGenuinita): Partial<Record<Criterio, number>> {
  const criteri: Partial<Record<Criterio, number>> = {};
  if (dati.nutriScore) criteri.nutrizione = NUTRI_SCORE[dati.nutriScore];
  if (dati.rischioAdditivi) criteri.additivi = ADDITIVI[dati.rischioAdditivi];
  if (dati.nova) criteri.lavorazione = NOVA[dati.nova];
  if (dati.biologico !== undefined) criteri.biologico = dati.biologico ? 5 : 1;
  return criteri;
}

export function calcolaGenuinita(dati: DatiGenuinita): EsitoGenuinita {
  const criteri = criteriGenuinita(dati);
  const principaliNoti = (['nutrizione', 'additivi', 'lavorazione'] as const).filter((c) => criteri[c] !== undefined);
  if (principaliNoti.length < 2) {
    return { valutabile: false, etichetta: 'Non valutabile', criteri };
  }

  // Pesi interi: la media pesata è un razionale esatto, così l'arrotondamento
  // (metà verso l'alto) non dipende da errori di virgola mobile.
  let numeratore = 0;
  let denominatore = 0;
  for (const [criterio, valore] of Object.entries(criteri) as [Criterio, number][]) {
    numeratore += PESI_GENUINITA[criterio] * valore;
    denominatore += PESI_GENUINITA[criterio];
  }
  let voto = Math.floor((2 * numeratore + denominatore) / (2 * denominatore));

  const limitatoDaAdditivi = dati.rischioAdditivi === 'elevato' && voto > 2;
  if (dati.rischioAdditivi === 'elevato') voto = Math.min(voto, 2);
  voto = Math.max(1, Math.min(5, voto));

  return {
    valutabile: true,
    voto: voto as Voto,
    etichetta: ETICHETTE_VOTO[voto as Voto],
    criteri,
    limitatoDaAdditivi,
  };
}
