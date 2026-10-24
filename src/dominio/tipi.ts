/**
 * Tipi delle entità del documento del nucleo (modello dati, Thread 2 + aggiunte MVP del Thread 3).
 * Ogni entità è una Y.Map nel documento Yjs: last-writer-wins per campo.
 * I campi derivati (quantità, scadenza effettiva, allergeni ricetta, da comprare…) non si salvano.
 */
import type { Allergene } from './allergeni';
import type { GruppoNova, NutriScore, Voto } from './genuinita';
import type { TipoPasto } from './id';
import type { RicettaBase } from '../rif/ricette';

/** Data locale Europe/Rome, AAAA-MM-GG. */
export type DataLocale = string;
/** Istante ISO 8601 in UTC. */
export type Istante = string;
/** Id del profilo nel documento (ponte: appartenenze.membro_id su Supabase). */
export type MembroId = string;

export interface MetadatiComuni {
  id: string;
  creato_da: MembroId;
  creato_il: Istante;
  modificato_da: MembroId;
  modificato_il: Istante;
  /** Cestino di 30 giorni: l'eliminazione vince sui conflitti. */
  eliminato_il?: Istante;
}

export type UnitaCanonica = 'g' | 'ml' | 'pz';

export type Restrizione = 'vegetariano' | 'vegano' | 'senza_maiale' | 'senza_alcol';

export interface Membro extends MetadatiComuni {
  /** Assente per i profili senza account (bambini, nonni). */
  utente_id?: string;
  gestito_da?: MembroId;
  nome: string;
  data_nascita?: DataLocale;
  allergie: Allergene[];
  intolleranze: string[];
  escludi_tracce: boolean;
  restrizioni: Restrizione[];
  preferenze: { graditi: string[]; sgraditi: string[] };
  /** Adulto 1,0; da 0,3 a 1,8. */
  fattore_porzione: number;
  attivo: boolean;
}

export type FonteProdotto = 'off' | 'crea' | 'manuale';

export interface Prodotto extends MetadatiComuni {
  /** `off:<GTIN13>`, `crea:<codice>` o `loc:<uuid>`. */
  fonte: FonteProdotto;
  gtin?: string;
  nome: string;
  marca?: string;
  formato?: { quantita: number; unita: UnitaCanonica };
  /** Chiave comune tra catalogo, inventario, lista e ricette (`ing:<slug>`). */
  ingrediente_id?: string;
  reparto?: string;
  categoria_conservazione?: string;
  nutrienti_100g?: Record<string, number>;
  fonte_nutrienti?: 'etichetta' | 'crea';
  allergeni: Allergene[];
  tracce: Allergene[];
  additivi: string[];
  biologico?: boolean;
  nova?: GruppoNova;
  nutri_score?: NutriScore;
  genuinita?: { voto: Voto | null; versione: number };
}

export type Luogo = 'frigo' | 'freezer' | 'dispensa';
export type StatoConservazione = 'fresco' | 'aperto' | 'cotto' | 'avanzato' | 'congelato' | 'scongelato';
export type TipoScadenza = 'entro' | 'preferibilmente' | 'stimata';
export type OrigineArticolo = 'barcode' | 'scontrino' | 'foto' | 'manuale' | 'ricetta';

/** Le quantità sono movimenti (+/−), mai valori assoluti: così le modifiche concorrenti si sommano. */
export interface Movimento {
  delta: number;
  unita: UnitaCanonica;
  membro: MembroId;
  il: Istante;
  motivo: 'carico' | 'consumo' | 'spreco' | 'correzione';
}

export interface ArticoloInventario extends MetadatiComuni {
  /** Copia del nome mostrato (prodotto, ingrediente o piatto cotto). */
  nome: string;
  /** Ingrediente generico, copiato dal prodotto per i calcoli di disponibilità. */
  ingrediente_id?: string;
  unita: UnitaCanonica;
  prodotto_id?: string;
  /** Per i cotti e gli avanzi. */
  ricetta_id?: string;
  luogo: Luogo;
  movimenti: Movimento[];
  stato_conservazione: StatoConservazione;
  data_scadenza?: DataLocale;
  tipo_scadenza?: TipoScadenza;
  data_apertura?: DataLocale;
  data_preparazione?: DataLocale;
  /** Mai oltre il limite di sicurezza: riapplicato dal validatore dopo ogni merge. */
  conservare_fino?: DataLocale;
  origine: OrigineArticolo;
  acquisto_id?: string;
  prezzo?: number;
  visto_il?: Istante;
}

export interface RigaIngrediente {
  ingrediente_id?: string;
  /** Testo originale, usato anche per le righe non collegate a `ing:`. */
  testo: string;
  quantita?: number;
  unita?: UnitaCanonica;
  quantita_g?: number;
  scalabile: boolean;
  opzionale: boolean;
  sostituti: string[];
}

export type Portata = 'antipasto' | 'primo' | 'secondo' | 'contorno' | 'piatto_unico' | 'dolce' | 'colazione';

/** Stesso schema per ricette di sistema (`sys:<slug>`) e personali (UUIDv7). */
export type Ricetta = RicettaBase & Partial<MetadatiComuni>;

export type OrigineRigaLista = 'ricetta' | 'scorta' | 'manuale' | 'dieta' | 'ospiti';

export interface ArticoloLista extends MetadatiComuni {
  /** `art:<ingrediente_id>` o `art:txt:<slug>`. */
  ingrediente_id?: string;
  testo: string;
  /** Reparto scelto a mano per le righe a testo libero. */
  reparto?: string;
  /** Quantità nell'unità dell'ingrediente; assente = "ricordami di comprarlo". */
  origini: { tipo: OrigineRigaLista; riferimento?: string; titolo?: string; quantita?: number; membri: MembroId[] }[];
  stato: 'da_comprare' | 'preso' | 'rimosso';
  modo_spunta?: 'manuale' | 'barcode' | 'scontrino';
  presa_g?: number;
  prezzo_stimato?: number;
  prezzo_pagato?: number;
}

export interface PortataPianificata {
  ricetta_id: string;
  /** Copia del titolo: resta leggibile anche se la ricetta viene eliminata. */
  titolo: string;
  membri: MembroId[];
  porzioni_manuali?: number;
}

export interface Pasto {
  data: DataLocale;
  tipo: TipoPasto;
  membri_presenti: MembroId[];
  portate: PortataPianificata[];
}

export type TipoEventoStorico =
  | 'acquisto'
  | 'carico'
  | 'consumo'
  | 'preparazione'
  | 'spreco'
  | 'congelamento'
  | 'correzione';

/** Eventi immutabili del file storico, raccolti già dall'MVP. */
export interface EventoStorico {
  id: string;
  tipo: TipoEventoStorico;
  il: Istante;
  membro: MembroId;
  prodotto_id?: string;
  ingrediente_id?: string;
  reparto?: string;
  quantita_g?: number;
  valore_eur?: number;
  motivo?: string;
}
