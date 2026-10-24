/**
 * Regole di conservazione dei cibi cotti e degli avanzi in frigorifero (proposta del modello dati, DA VALIDARE
 * con un dietista). Fonti: Ministero della Salute, USDA FSIS FoodKeeper (ridotto di un giorno), EFSA per il riso.
 * "massimo" è invalicabile: il selettore di data non lo supera e il validatore lo riapplica dopo ogni merge.
 */
export interface RegolaConservazione {
  id: string;
  nome: string;
  consigliati: number;
  massimo: number;
  /** Più alto = più rischioso: i piatti misti seguono la regola più restrittiva. */
  rischio: number;
}

export const REGOLE_CONSERVAZIONE: RegolaConservazione[] = [
  { id: 'pesce_cotto', nome: 'Pesce cotto', consigliati: 1, massimo: 2, rischio: 5 },
  { id: 'riso_cotto', nome: 'Riso cotto', consigliati: 1, massimo: 2, rischio: 5 },
  { id: 'piatti_uova', nome: 'Piatti a base di uova', consigliati: 1, massimo: 2, rischio: 5 },
  { id: 'dolci_crema', nome: 'Dolci con crema', consigliati: 1, massimo: 2, rischio: 5 },
  { id: 'carne_cotta', nome: 'Carne e pollame cotti', consigliati: 2, massimo: 3, rischio: 4 },
  { id: 'ragu', nome: 'Ragù e sughi di carne', consigliati: 2, massimo: 3, rischio: 4 },
  { id: 'legumi_zuppe', nome: 'Legumi, zuppe e minestre', consigliati: 2, massimo: 3, rischio: 3 },
  { id: 'pasta_condita', nome: 'Pasta condita', consigliati: 2, massimo: 3, rischio: 3 },
  { id: 'pizza_torte_salate', nome: 'Pizza e torte salate', consigliati: 2, massimo: 3, rischio: 3 },
  { id: 'verdure_cotte', nome: 'Verdure cotte', consigliati: 2, massimo: 3, rischio: 2 },
  { id: 'dolci_forno', nome: 'Torte da forno senza crema', consigliati: 3, massimo: 4, rischio: 1 },
  { id: 'sugo_pomodoro', nome: 'Sugo di pomodoro', consigliati: 3, massimo: 4, rischio: 1 },
];

/** Categoria senza regola: si applica il limite più prudente. */
export const REGOLA_PRUDENTE: RegolaConservazione = { id: 'sconosciuta', nome: 'Piatto cotto', consigliati: 1, massimo: 1, rischio: 9 };

export const REGOLA_SCONGELATO = { consigliati: 1, massimo: 1 } as const;
/** In freezer i cotti restano sicuri, il limite riguarda la qualità. */
export const REGOLA_FREEZER_COTTI = { consigliati: 60, massimo: 90 } as const;

export function regolaConservazione(id: string | undefined): RegolaConservazione {
  return REGOLE_CONSERVAZIONE.find((r) => r.id === id) ?? REGOLA_PRUDENTE;
}
