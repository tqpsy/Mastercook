/**
 * Lettura del testo di uno scontrino italiano (dopo l'OCR) in righe d'acquisto.
 * Gestisce "2 x 1,19", "0,532 kg x 2,19 €/kg", sconti e storni, e ignora totali e pagamenti.
 * Il parsing avviene sul dispositivo: il testo non lascia mai il telefono.
 */
import { cercaIngredienti, normalizza, type Risultato } from './ricerca';

export interface RigaScontrino {
  testo: string;
  quantita: number;
  /** Peso in grammi, per i prodotti a peso. */
  peso_g?: number;
  prezzo: number;
}

export interface ScontrinoLetto {
  righe: RigaScontrino[];
  totale?: number;
  negozio?: string;
}

const PREZZO_FINALE = /(-?\d{1,4}[.,]\d{2})\s*(?:€|eur)?\s*[a-z]?\s*\*?\s*$/i;
const MOLTIPLICATORE = /^(\d{1,3})\s*[x×*]\s*(\d{1,4}[.,]\d{2})/i;
const PESO = /(\d{1,3}[.,]\d{1,3})\s*kg\s*[x×*]\s*(\d{1,4}[.,]\d{2})/i;
const DA_IGNORARE =
  /\b(sub ?totale|totale|contant[ei]|resto|pagamento|pagato|bancomat|carta|credito|debito|iva|imponibile|documento|commerciale|p\.? ?iva|partita|cassa|cassiere|scontrino|operatore|grazie|arrivederci|tel|via|piazza|punti|saldo|fidelity|n\.? ?doc|totale complessivo|di cui|importo|euro|resi|transazione|terminale|aut|autorizzazione|ricevuta|data|ora)\b/i;
const SCONTO = /\b(sconto|sc\.|promo|offerta|storno|annullo|buono)\b/i;
const TOTALE = /\btotale(?: complessivo| euro| eur)?\b[^\d-]*(\d{1,5}[.,]\d{2})/i;

const numero = (s: string) => Number(s.replace(',', '.'));

/** Abbreviazioni tipiche delle casse italiane. */
const ABBREVIAZIONI: Record<string, string> = {
  ps: 'parzialmente scremato', p: '', fr: 'fresco', fresc: 'fresco', mozz: 'mozzarella', pom: 'pomodoro', parm: 'parmigiano',
  prosc: 'prosciutto', pros: 'prosciutto', form: 'formaggio', yog: 'yogurt', yogh: 'yogurt', insal: 'insalata', zucch: 'zucchine',
  pomod: 'pomodori', patat: 'patate', banan: 'banane', bisc: 'biscotti', choc: 'cioccolato', cioc: 'cioccolato', uht: 'latte uht',
  evo: 'olio evo', ext: 'extra', verg: 'vergine', sp: 'spaghetti', spagh: 'spaghetti', pan: 'pane', grat: 'grattugiato',
  ric: 'ricotta', masc: 'mascarpone', pass: 'passata', pel: 'pelati', toma: 'pomodori', sals: 'salsiccia', pet: 'petto', poll: 'pollo',
};

export function espandi(testo: string): string {
  return normalizza(testo)
    .split(' ')
    .map((p) => ABBREVIAZIONI[p] ?? p)
    .filter((p) => p && !/^\d+$/.test(p) && p.length > 1)
    .join(' ');
}

export function leggiScontrino(testo: string): ScontrinoLetto {
  const linee = testo
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const righe: RigaScontrino[] = [];
  let totale: number | undefined;
  let inAttesa: string | undefined;
  const negozio = linee.find((l) => /[a-z]{3,}/i.test(l) && !DA_IGNORARE.test(l) && !PREZZO_FINALE.test(l));

  for (const linea of linee) {
    const t = TOTALE.exec(linea);
    if (t && !/sub ?totale/i.test(linea)) {
      totale = numero(t[1]!);
      inAttesa = undefined;
      continue;
    }
    const molt = MOLTIPLICATORE.exec(linea);
    const peso = PESO.exec(linea);
    if ((molt || peso) && inAttesa) {
      const prezzoFinale = PREZZO_FINALE.exec(linea);
      if (peso) {
        const kg = numero(peso[1]!);
        righe.push({ testo: inAttesa, quantita: 1, peso_g: Math.round(kg * 1000), prezzo: prezzoFinale ? numero(prezzoFinale[1]!) : Math.round(kg * numero(peso[2]!) * 100) / 100 });
      } else {
        const q = Number(molt![1]);
        righe.push({ testo: inAttesa, quantita: q, prezzo: prezzoFinale && linea.trim() !== molt![0].trim() ? numero(prezzoFinale[1]!) : Math.round(q * numero(molt![2]!) * 100) / 100 });
      }
      inAttesa = undefined;
      continue;
    }
    const prezzo = PREZZO_FINALE.exec(linea);
    if (SCONTO.test(linea) && prezzo) {
      // Lo sconto si applica alla riga precedente.
      const ultima = righe.at(-1);
      if (ultima) ultima.prezzo = Math.max(0, Math.round((ultima.prezzo - Math.abs(numero(prezzo[1]!))) * 100) / 100);
      continue;
    }
    if (DA_IGNORARE.test(linea)) {
      inAttesa = undefined;
      continue;
    }
    if (prezzo) {
      const descrizione = linea
        .slice(0, prezzo.index)
        .replace(/\b\d{1,2}([.,]\d{1,2})?\s*%/g, '')
        .replace(/\s[A-Z]\s*$/, '')
        .trim();
      const valore = numero(prezzo[1]!);
      if (valore < 0) {
        const ultima = righe.at(-1);
        if (ultima) ultima.prezzo = Math.max(0, Math.round((ultima.prezzo + valore) * 100) / 100);
      } else if (/[a-z]{2,}/i.test(descrizione)) {
        // "PANE 2 x 1,19 2,38" sulla stessa riga
        const stessa = /^(.*?)\s(\d{1,3})\s*[x×*]\s*\d{1,4}[.,]\d{2}$/i.exec(descrizione);
        if (stessa) righe.push({ testo: stessa[1]!.trim(), quantita: Number(stessa[2]), prezzo: valore });
        else righe.push({ testo: descrizione, quantita: 1, prezzo: valore });
      }
      inAttesa = undefined;
    } else if (/[a-z]{3,}/i.test(linea)) {
      inAttesa = linea;
    }
  }
  return { righe, totale, negozio };
}

export type EsitoAbbinamento = 'confermato' | 'da_controllare' | 'da_scegliere';

export interface Abbinamento {
  migliore?: Risultato;
  esito: EsitoAbbinamento;
}

/** Abbina il testo di una riga a un ingrediente: alias del nucleo, poi ricerca; +0,10 se è in lista. */
export function abbinaRiga(testo: string, alias: ReadonlyMap<string, string>, inLista: ReadonlySet<string>): Abbinamento {
  const espanso = espandi(testo);
  const risultati = cercaIngredienti(espanso, 3, alias);
  const [migliore] = risultati.map((r) => ({ ...r, confidenza: Math.min(0.99, r.confidenza + (inLista.has(r.ingrediente.id) ? 0.1 : 0)) })).sort((a, b) => b.confidenza - a.confidenza);
  if (!migliore) return { esito: 'da_scegliere' };
  const esito = migliore.confidenza >= 0.85 ? 'confermato' : migliore.confidenza >= 0.6 ? 'da_controllare' : 'da_scegliere';
  return { migliore, esito };
}
