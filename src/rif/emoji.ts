import type { Portata } from '../dominio/tipi';
import { ingrediente } from './ingredienti';
import type { Reparto } from './reparti';

const PER_INGREDIENTE: Record<string, string> = {
  'ing:pomodoro': '🍅', 'ing:pomodorini': '🍅', 'ing:patata': '🥔', 'ing:cipolla': '🧅', 'ing:aglio': '🧄', 'ing:carota': '🥕',
  'ing:zucchina': '🥒', 'ing:cetriolo': '🥒', 'ing:melanzana': '🍆', 'ing:peperone': '🫑', 'ing:insalata': '🥬', 'ing:rucola': '🥬',
  'ing:spinaci': '🥬', 'ing:broccoli': '🥦', 'ing:funghi': '🍄', 'ing:limone': '🍋', 'ing:mela': '🍎', 'ing:pera': '🍐',
  'ing:banana': '🍌', 'ing:arancia': '🍊', 'ing:kiwi': '🥝', 'ing:fragole': '🍓', 'ing:basilico': '🌿', 'ing:prezzemolo': '🌿',
  'ing:rosmarino': '🌿', 'ing:pane': '🥖', 'ing:pancarre': '🍞', 'ing:pollo': '🍗', 'ing:petto_pollo': '🍗', 'ing:salsiccia': '🌭',
  'ing:gamberi': '🦐', 'ing:cozze': '🦪', 'ing:latte': '🥛', 'ing:burro': '🧈', 'ing:uova': '🥚', 'ing:riso': '🍚',
  'ing:riso_risotti': '🍚', 'ing:farina': '🌾', 'ing:zucchero': '🍬', 'ing:miele': '🍯', 'ing:caffe': '☕', 'ing:olio_evo': '🫒',
  'ing:olive': '🫒', 'ing:vino_bianco': '🍷', 'ing:vino_rosso': '🍷', 'ing:mozzarella': '🧀', 'ing:parmigiano': '🧀',
  'ing:pecorino': '🧀', 'ing:ricotta': '🧀', 'ing:mascarpone': '🧀', 'ing:biscotti': '🍪', 'ing:savoiardi': '🍪', 'ing:noci': '🌰',
  'ing:mandorle': '🌰', 'ing:ceci': '🫘', 'ing:fagioli': '🫘', 'ing:lenticchie': '🫘', 'ing:zucca': '🎃', 'ing:sale': '🧂',
};

const PER_REPARTO: Record<Reparto, string> = {
  frutta_verdura: '🥬', pane_forno: '🥖', gastronomia: '🧀', carne: '🥩', pesce: '🐟', latticini: '🥛', pasta_riso: '🍝',
  conserve: '🥫', condimenti: '🫙', colazione: '🍪', surgelati: '🧊', bevande: '🧃', casa: '🧽', altro: '🛒',
};

export function emojiIngrediente(id: string | undefined, reparto?: Reparto): string {
  if (id && PER_INGREDIENTE[id]) return PER_INGREDIENTE[id]!;
  return PER_REPARTO[ingrediente(id)?.reparto ?? reparto ?? 'altro'];
}

export const EMOJI_PORTATA: Record<Portata, string> = {
  antipasto: '🥗', primo: '🍝', secondo: '🍽️', contorno: '🥦', piatto_unico: '🥘', dolce: '🍰', colazione: '☕',
};

export const NOME_PORTATA: Record<Portata, string> = {
  antipasto: 'Antipasto', primo: 'Primo', secondo: 'Secondo', contorno: 'Contorno', piatto_unico: 'Piatto unico', dolce: 'Dolce', colazione: 'Colazione',
};
