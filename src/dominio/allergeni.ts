/**
 * I 14 allergeni da dichiarare obbligatoriamente nell'UE (Reg. UE 1169/2011, allegato II).
 * Il codice è quello salvato nel documento del nucleo (membri.allergie, ricette, prodotti).
 */
export const ALLERGENI_UE = {
  glutine: 'Cereali contenenti glutine',
  crostacei: 'Crostacei',
  uova: 'Uova',
  pesce: 'Pesce',
  arachidi: 'Arachidi',
  soia: 'Soia',
  latte: 'Latte e derivati',
  frutta_a_guscio: 'Frutta a guscio',
  sedano: 'Sedano',
  senape: 'Senape',
  sesamo: 'Semi di sesamo',
  solfiti: 'Anidride solforosa e solfiti',
  lupini: 'Lupini',
  molluschi: 'Molluschi',
} as const;

export type Allergene = keyof typeof ALLERGENI_UE;

export const CODICI_ALLERGENI = Object.keys(ALLERGENI_UE) as Allergene[];

export function eAllergene(codice: string): codice is Allergene {
  return Object.hasOwn(ALLERGENI_UE, codice);
}

/**
 * Allergeni effettivi di una ricetta = dichiarati ∪ quelli dei suoi ingredienti.
 * I codici sconosciuti (es. da un client più nuovo) vengono ignorati, come da validatore.
 */
export function allergeniEffettivi(dichiarati: Iterable<string>, ingredienti: Iterable<Iterable<string>>): Set<Allergene> {
  const risultato = new Set<Allergene>();
  for (const codice of dichiarati) if (eAllergene(codice)) risultato.add(codice);
  for (const allergeniIngrediente of ingredienti) {
    for (const codice of allergeniIngrediente) if (eAllergene(codice)) risultato.add(codice);
  }
  return risultato;
}

/**
 * Filtro di sicurezza rigido: restituisce gli allergeni della ricetta che qualcuno
 * dei presenti (membri o ospiti) non può mangiare. Vuoto = ricetta ammessa.
 */
export function allergeniInConflitto(allergeniRicetta: Set<Allergene>, allergiePresenti: Iterable<Iterable<string>>): Allergene[] {
  const conflitti = new Set<Allergene>();
  for (const allergie of allergiePresenti) {
    for (const codice of allergie) if (eAllergene(codice) && allergeniRicetta.has(codice)) conflitti.add(codice);
  }
  return [...conflitti];
}
