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

const PAROLE_VUOTE = new Set(['di', 'del', 'della', 'al', 'alla', 'all', 'allo', 'd', 'in', 'e', 'con', 'per', 'da']);
const parole = (testo: string) => testo.split(' ').filter((p) => p && !PAROLE_VUOTE.has(p));

/**
 * Tutte le parole del nome stanno nella query ("mozzarella bufala camp" contiene "mozzarella di bufala"):
 * 0,85 se la query comincia con il nome, 0,75 altrimenti, più un piccolo vantaggio per i nomi che ne coprono
 * più parole, così la voce precisa vince su quella generica ("mozzarella").
 */
function contenimento(q: string, nome: string): number {
  const pq = parole(q);
  const pn = parole(nome);
  if (pn.length === 0 || !pn.every((p) => pq.includes(p))) return 0;
  return (pq[0] === pn[0] ? 0.85 : 0.75) + 0.05 * (pn.length / pq.length);
}

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
      else if (nome.startsWith(q)) c = 0.85;
      else c = Math.max(contenimento(q, nome), nome.split(' ').some((parola) => parola.startsWith(q)) ? 0.75 : somiglianza(q, nome) * 0.85);
      migliore = Math.max(migliore, c);
    }
    if (migliore >= 0.35) risultati.push({ ingrediente: ing, confidenza: migliore });
  }
  return risultati.sort((a, b) => b.confidenza - a.confidenza || a.ingrediente.nome.localeCompare(b.ingrediente.nome)).slice(0, limite);
}
