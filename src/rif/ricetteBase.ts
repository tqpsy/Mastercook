/**
 * Forma comune delle ricette di sistema e funzione per scriverle in modo compatto.
 * Quantità per le porzioni indicate, nell'unità dell'ingrediente (g, ml o pezzi).
 */
import type { Allergene } from '../dominio/allergeni';
import type { Portata, RigaIngrediente } from '../dominio/tipi';
import { INGREDIENTI_PER_ID } from './ingredienti';

export type Cucina = 'italiana' | 'cinese' | 'giapponese' | 'greca' | 'indiana';

export const CUCINE: { id: Cucina; nome: string; bandiera: string }[] = [
  { id: 'italiana', nome: 'Italiana', bandiera: '🇮🇹' },
  { id: 'cinese', nome: 'Cinese', bandiera: '🇨🇳' },
  { id: 'giapponese', nome: 'Giapponese', bandiera: '🇯🇵' },
  { id: 'greca', nome: 'Greca', bandiera: '🇬🇷' },
  { id: 'indiana', nome: 'Indiana', bandiera: '🇮🇳' },
];

export function nomeCucina(c: Cucina): string {
  const x = CUCINE.find((y) => y.id === c)!;
  return `${x.bandiera} ${x.nome}`;
}

export interface RicettaBase {
  id: string;
  origine: 'sistema' | 'personale';
  titolo: string;
  portata: Portata;
  porzioni_base: number;
  minuti: number;
  difficolta: 1 | 2 | 3;
  ingredienti: RigaIngrediente[];
  passaggi: string[];
  allergeni_dichiarati: Allergene[];
  categoria_conservazione?: string;
  mesi_stagione?: number[];
  derivata_da?: string;
  /** Assente nelle ricette personali che non la indicano. */
  cucina?: Cucina;
  /** Da dove viene il piatto, per esempio «Tradizione romana». */
  provenienza?: string;
}

type Riga = [slug: string, quantita: number, opzioni?: { opzionale?: boolean; testo?: string }];

export interface ExtraRicetta {
  porzioni?: number;
  mesi?: number[];
  allergeni?: Allergene[];
  cucina?: Cucina;
  da?: string;
}

export function r(
  slug: string,
  titolo: string,
  portata: Portata,
  minuti: number,
  difficolta: 1 | 2 | 3,
  categoria: string | undefined,
  righe: Riga[],
  passaggi: string[],
  extra: ExtraRicetta = {},
): RicettaBase {
  return {
    id: `sys:${slug}`,
    origine: 'sistema',
    titolo,
    portata,
    porzioni_base: extra.porzioni ?? 4,
    minuti,
    difficolta,
    categoria_conservazione: categoria,
    mesi_stagione: extra.mesi,
    allergeni_dichiarati: extra.allergeni ?? [],
    cucina: extra.cucina ?? 'italiana',
    provenienza: extra.da,
    passaggi,
    ingredienti: righe.map(([ing, quantita, opzioni]) => {
      const dati = INGREDIENTI_PER_ID.get(`ing:${ing}`);
      if (!dati) throw new Error(`Ingrediente sconosciuto nella ricetta ${slug}: ${ing}`);
      return {
        ingrediente_id: dati.id,
        testo: opzioni?.testo ?? dati.nome,
        quantita,
        unita: dati.unita,
        scalabile: true,
        opzionale: opzioni?.opzionale ?? false,
        sostituti: [],
      };
    }),
  };
}

export const ESTATE = [6, 7, 8, 9];
export const PRIMAVERA_ESTATE = [5, 6, 7, 8, 9];
export const AUTUNNO = [9, 10, 11];
export const INVERNO = [11, 12, 1, 2, 3];
