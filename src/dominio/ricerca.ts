/**
 * Ricerca degli ingredienti per nome: normalizzazione (minuscole, senza accenti né unità),
 * corrispondenza esatta sui sinonimi, poi prefisso, poi somiglianza per trigrammi.
 * La confidenza segue le soglie uniche del Thread 3: ≥ 0,85 confermato, 0,60–0,85 da controllare.
 */
import { INGREDIENTI, type Ingrediente } from '../rif/ingredienti';

export function normalizza(testo: string): string {
  return testo
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\d+([.,]\d+)?\s*(kg|g|gr|ml|l|lt|cl|pz|x)\b/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function trigrammi(testo: string): Set<string> {
  const t = `  ${testo} `;
  const insieme = new Set<string>();
  for (let i = 0; i < t.length - 2; i++) insieme.add(t.slice(i, i + 3));
  return insieme;
}

export function somiglianza(a: string, b: string): number {
  const ta = trigrammi(a);
  const tb = trigrammi(b);
  let comuni = 0;
  for (const t of ta) if (tb.has(t)) comuni++;
  return (2 * comuni) / (ta.size + tb.size || 1);
}

export interface Risultato {
  ingrediente: Ingrediente;
  confidenza: number;
}

const NOMI = INGREDIENTI.map((ing) => ({ ing, nomi: [ing.nome, ...ing.sinonimi].map(normalizza) }));

export function cercaIngredienti(query: string, limite = 8, alias: ReadonlyMap<string, string> = new Map()): Risultato[] {
  const q = normalizza(query);
  if (!q) return [];
  const risultati: Risultato[] = [];
  const daAlias = alias.get(q);
  for (const { ing, nomi } of NOMI) {
    let migliore = 0;
    if (daAlias === ing.id) migliore = 0.98;
    for (const nome of nomi) {
      let c: number;
      if (nome === q) c = 0.95;
      else if (nome.startsWith(q) || q.startsWith(nome + ' ')) c = 0.85;
      else if (nome.split(' ').some((parola) => parola.startsWith(q)) || q.split(' ').includes(nome)) c = 0.75;
      else c = somiglianza(q, nome) * 0.85;
      migliore = Math.max(migliore, c);
    }
    if (migliore >= 0.35) risultati.push({ ingrediente: ing, confidenza: migliore });
  }
  return risultati.sort((a, b) => b.confidenza - a.confidenza || a.ingrediente.nome.localeCompare(b.ingrediente.nome)).slice(0, limite);
}
