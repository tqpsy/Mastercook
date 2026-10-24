/** I 14 reparti della lista della spesa, nell'ordine predefinito di un supermercato. */
export const REPARTI = [
  { id: 'frutta_verdura', nome: 'Frutta e verdura' },
  { id: 'pane_forno', nome: 'Pane e forno' },
  { id: 'gastronomia', nome: 'Salumi e formaggi' },
  { id: 'carne', nome: 'Carne' },
  { id: 'pesce', nome: 'Pesce' },
  { id: 'latticini', nome: 'Latte, latticini e uova' },
  { id: 'pasta_riso', nome: 'Pasta, riso e farine' },
  { id: 'conserve', nome: 'Conserve e legumi' },
  { id: 'condimenti', nome: 'Olio, spezie e condimenti' },
  { id: 'colazione', nome: 'Colazione e dolci' },
  { id: 'surgelati', nome: 'Surgelati' },
  { id: 'bevande', nome: 'Bevande' },
  { id: 'casa', nome: 'Casa e igiene' },
  { id: 'altro', nome: 'Altro' },
] as const;

export type Reparto = (typeof REPARTI)[number]['id'];

export const NOME_REPARTO: Record<Reparto, string> = Object.fromEntries(REPARTI.map((r) => [r.id, r.nome])) as Record<
  Reparto,
  string
>;
