/**
 * Fabbisogni indicativi giornalieri dai LARN 2014 (SINU), per età, sesso e condizione.
 * Energia per attività fisica moderata (LAF ~1,6 negli adulti), proteine e ferro come PRI.
 * Servono a proporzioni tra i membri, non a prescrivere una dieta.
 * Se il sesso non è indicato si usa la media tra maschi e femmine della stessa età.
 */
import { differenzaGiorni } from './date';
import type { DataLocale } from './tipi';

export type Sesso = 'maschio' | 'femmina';
export type Condizione = 'gravidanza' | 'allattamento';

export interface Fabbisogno {
  energia_kcal: number;
  proteine_g: number;
  ferro_mg: number;
}

interface Fascia {
  /** Età minima in anni compiuti. */
  da: number;
  maschio: Fabbisogno;
  femmina: Fabbisogno;
}

const f = (energia_kcal: number, proteine_g: number, ferro_mg: number): Fabbisogno => ({ energia_kcal, proteine_g, ferro_mg });

const FASCE: Fascia[] = [
  { da: 1, maschio: f(1000, 14, 8), femmina: f(950, 14, 8) },
  { da: 4, maschio: f(1450, 19, 11), femmina: f(1350, 19, 11) },
  { da: 7, maschio: f(1850, 31, 13), femmina: f(1700, 31, 13) },
  { da: 11, maschio: f(2400, 48, 10), femmina: f(2150, 46, 18) },
  { da: 15, maschio: f(2900, 62, 13), femmina: f(2300, 50, 18) },
  { da: 18, maschio: f(2700, 63, 10), femmina: f(2100, 54, 18) },
  { da: 30, maschio: f(2600, 63, 10), femmina: f(2050, 54, 18) },
  { da: 50, maschio: f(2500, 63, 10), femmina: f(2000, 54, 10) },
  { da: 60, maschio: f(2300, 73, 10), femmina: f(1900, 62, 10) },
  { da: 75, maschio: f(2100, 73, 10), femmina: f(1750, 62, 10) },
];

/** Adulto di riferimento (media 30–59 anni): porzione 1,0. */
const ENERGIA_RIFERIMENTO = 2325;

const SUPPLEMENTO: Record<Condizione, Fabbisogno> = {
  gravidanza: f(350, 23, 9), // ferro: PRI 27 mg in gravidanza
  allattamento: f(500, 21, -7), // ferro: PRI 11 mg in allattamento
};

export function etaInAnni(dataNascita: DataLocale, oggi: DataLocale): number {
  const anni = Number(oggi.slice(0, 4)) - Number(dataNascita.slice(0, 4));
  return oggi.slice(5) < dataNascita.slice(5) ? anni - 1 : anni;
}

/** Gravidanza e allattamento hanno senso solo per le donne in età fertile. */
export function puoAvereCondizione(sesso: Sesso | undefined, eta: number | undefined): boolean {
  return sesso === 'femmina' && (eta === undefined || (eta >= 14 && eta <= 55));
}

export function calcolaFabbisogno(eta: number, sesso?: Sesso, condizione?: Condizione): Fabbisogno {
  const fascia = [...FASCE].reverse().find((x) => eta >= x.da) ?? FASCE[0]!;
  const base = sesso
    ? fascia[sesso]
    : f(
        (fascia.maschio.energia_kcal + fascia.femmina.energia_kcal) / 2,
        (fascia.maschio.proteine_g + fascia.femmina.proteine_g) / 2,
        (fascia.maschio.ferro_mg + fascia.femmina.ferro_mg) / 2,
      );
  const extra = condizione && puoAvereCondizione(sesso, eta) ? SUPPLEMENTO[condizione] : f(0, 0, 0);
  return {
    energia_kcal: Math.round((base.energia_kcal + extra.energia_kcal) / 50) * 50,
    proteine_g: Math.round(base.proteine_g + extra.proteine_g),
    ferro_mg: Math.round(base.ferro_mg + extra.ferro_mg),
  };
}

/** Porzione rispetto all'adulto medio, arrotondata a 0,05 e limitata a 0,3–1,8. */
export function fattoreDaFabbisogno(fabbisogno: Fabbisogno): number {
  const grezzo = fabbisogno.energia_kcal / ENERGIA_RIFERIMENTO;
  return Math.min(1.8, Math.max(0.3, Math.round(grezzo * 20) / 20));
}

interface ProfiloPorzione {
  data_nascita?: DataLocale;
  sesso?: Sesso;
  condizione?: Condizione;
  porzione_automatica?: boolean;
  fattore_porzione?: number;
}

/** Porzione effettiva: calcolata dai fabbisogni se c'è la data di nascita e non è stata scelta a mano. */
export function porzioneEffettiva(m: ProfiloPorzione, oggi: DataLocale): number {
  if (m.porzione_automatica !== false && m.data_nascita && differenzaGiorni(m.data_nascita, oggi) >= 0) {
    return fattoreDaFabbisogno(calcolaFabbisogno(etaInAnni(m.data_nascita, oggi), m.sesso, m.condizione));
  }
  return m.fattore_porzione ?? 1;
}
