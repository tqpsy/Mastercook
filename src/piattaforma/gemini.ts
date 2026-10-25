/**
 * Riconoscimento dei prodotti in una foto di frigo, freezer o dispensa con Gemini e la chiave dell'utente.
 * Al modello va solo la foto; la risposta (nomi generici e quantità stimate) viene poi collegata
 * agli ingredienti sul dispositivo e confermata dall'utente: la foto non rimuove mai nulla.
 */
import { leggiChiave } from './chiaviApi';
import { create } from 'zustand';
import { attesaDaErrore, eQuotaGiornaliera, impostaLimite, limiteDaErrore, MODELLI_GEMINI, modelloEsaurito, quotaEsaurita, registraRichiesta, segnaEsaurita } from './quotaGemini';

export interface ProdottoVisto {
  nome: string;
  quantita?: string;
  /** Solo per il frigo: dove si trova il prodotto (vedi POSIZIONI_FRIGO). */
  posizione?: string;
}

const ISTRUZIONI =
  'Elenca gli alimenti visibili in questa foto di un frigorifero, di un freezer o di una dispensa (può essere un solo ripiano, un cassetto o la portiera). ' +
  'Usa nomi generici in italiano (es. "latte", "uova", "zucchine", non le marche) e una stima della quantità visibile. ' +
  'Rispondi solo con JSON: [{"nome": string, "quantita": string}]. Se non vedi alimenti rispondi [].';
const ISTRUZIONI_FRIGO =
  'Elenca gli alimenti visibili in questa foto di un frigorifero (può essere un solo ripiano, un cassetto o la portiera). ' +
  'Usa nomi generici in italiano (es. "latte", "uova", "petto di pollo", non le marche) e una stima della quantità visibile. ' +
  'Per ognuno indica dove si trova: "ripiano alto", "ripiano centrale", "ripiano basso" (quello più in basso, sopra i cassetti), "cassetto" o "portiera"; ' +
  'se non si capisce usa "non so". Rispondi solo con JSON: [{"nome": string, "quantita": string, "posizione": string}]. Se non vedi alimenti rispondi [].';

type Parte = { text: string } | { inline_data: { mime_type: string; data: string } };

/** Fino a quando si aspetta perché Gemini ha chiesto una pausa (limite al minuto), per mostrarlo. */
export const usePausaGemini = create<{ fino: number | null }>(() => ({ fino: null }));

/** Quante volte si riprova dopo un limite al minuto o un modello sovraccarico, prima di arrendersi. */
const TENTATIVI = 3;

async function pausa(ms: number): Promise<void> {
  usePausaGemini.setState({ fino: Date.now() + ms });
  await new Promise((ok) => setTimeout(ok, ms));
  usePausaGemini.setState({ fino: null });
}

// Una richiesta alla volta: più foto insieme finirebbero subito nel limite al minuto.
let coda: Promise<unknown> = Promise.resolve();
function inCoda<T>(lavoro: () => Promise<T>): Promise<T> {
  const p = coda.then(lavoro, lavoro);
  coda = p.catch(() => undefined);
  return p;
}

/**
 * Una richiesta a Gemini con risposta JSON. Limite al minuto: aspetta quanto chiede Google e riprova.
 * Quota del giorno finita o modello sparito: passa al modello successivo, che ha una quota sua.
 */
const chiediJson = (parti: Parte[]) => inCoda(() => chiediJsonOra(parti));

async function chiediJsonOra(parti: Parte[]): Promise<unknown> {
  const chiave = leggiChiave('gemini');
  if (!chiave) throw new Error('chiave');
  // Google ha già detto che per oggi la prova è finita con tutti i modelli: inutile riprovare fino all'azzeramento.
  if (quotaEsaurita()) throw new Error('quota_giorno');
  let finitaOggi = false;
  let alMinuto = false;
  for (const modello of MODELLI_GEMINI) {
    if (modelloEsaurito(modello)) {
      finitaOggi = true;
      continue;
    }
    for (let tentativo = 1; ; tentativo++) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modello}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': chiave },
        body: JSON.stringify({
          contents: [{ parts: parti }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
        }),
      });
      if (r.status === 404) {
        segnaEsaurita(modello);
        break;
      }
      if (r.status === 429) {
        const corpo = await r.text().catch(() => '');
        if (eQuotaGiornaliera(corpo)) {
          const limite = modello === MODELLI_GEMINI[0] ? limiteDaErrore(corpo) : null;
          if (limite) impostaLimite(limite);
          segnaEsaurita(modello);
          finitaOggi = true;
          break;
        }
        // Limite al minuto (richieste o token): basta aspettare un po'.
        if (tentativo >= TENTATIVI) {
          alMinuto = true;
          break;
        }
        await pausa(attesaDaErrore(corpo));
        continue;
      }
      // Modello sovraccarico: capita spesso col piano gratuito e non consuma la quota.
      if (r.status >= 500) {
        if (tentativo >= TENTATIVI) break;
        await pausa(2000 * tentativo);
        continue;
      }
      if (!r.ok) throw new Error(r.status === 400 || r.status === 403 ? 'chiave' : 'rete');
      registraRichiesta(modello);
      const risposta = (await r.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      return JSON.parse(risposta.candidates?.[0]?.content?.parts?.[0]?.text ?? 'null') as unknown;
    }
  }
  throw new Error(alMinuto ? 'quota' : finitaOggi ? 'quota_giorno' : 'modello');
}

export async function riconosciProdotti(canvas: HTMLCanvasElement, frigo = false): Promise<ProdottoVisto[]> {
  const data = canvas.toDataURL('image/jpeg', 0.8).split(',')[1]!;
  const elenco = await chiediJson([{ text: frigo ? ISTRUZIONI_FRIGO : ISTRUZIONI }, { inline_data: { mime_type: 'image/jpeg', data } }]);
  return Array.isArray(elenco) ? elenco.filter((x): x is ProdottoVisto => typeof x?.nome === 'string') : [];
}

const ISTRUZIONI_DIETA =
  'Questo è un piano alimentare consegnato da un dietista o nutrizionista (foto delle pagine, PDF o testo). ' +
  'Trascrivilo fedelmente in JSON, senza aggiungere, togliere o correggere nulla e senza dare consigli. ' +
  'Schema: {"titolo": string|null, "dietista": string|null, "note": string[], "giorni": [{"giorno": number, "pasti": [{"tipo": "colazione"|"spuntino"|"pranzo"|"merenda"|"cena", ' +
  '"voci": [{"alimento": string, "quantita_g": number|null, "quantita": string|null, "alternative": string[]}]}]}]}. ' +
  'giorno: 1 = lunedì … 7 = domenica. Se il piano non distingue i giorni, ripeti lo stesso schema per tutti e 7 i giorni; ' +
  'se propone più schemi a scelta per lo stesso pasto, usa il primo per lunedì, il secondo per martedì e così via. ' +
  '"spuntino" è quello di metà mattina, "merenda" quello del pomeriggio. ' +
  'alimento: il nome come scritto, in italiano (es. "pasta integrale", "verdura cotta", "merluzzo"). quantita_g: grammi o millilitri se indicati, altrimenti null; ' +
  'quantita: le quantità non in grammi (es. "1 vasetto", "2 fette", "a volontà"). alternative: gli alimenti indicati come alternativa ("pasta o riso" → alimento "pasta", alternative ["riso"]). ' +
  'note: frequenze settimanali e indicazioni generali (es. "pesce almeno 3 volte a settimana"). Se non è un piano alimentare rispondi {"giorni": []}.';

export type DocumentoDieta = { tipo: 'testo'; testo: string } | { tipo: 'immagini'; immagini: HTMLCanvasElement[] } | { tipo: 'pdf'; base64: string };

/** Legge la dieta con la chiave Gemini dell'utente. La risposta va sempre controllata con dietaDaGemini. */
export async function leggiDietaConGemini(documento: DocumentoDieta): Promise<unknown> {
  const parti: Parte[] = [{ text: ISTRUZIONI_DIETA }];
  if (documento.tipo === 'testo') parti.push({ text: documento.testo.slice(0, 30_000) });
  else if (documento.tipo === 'pdf') parti.push({ inline_data: { mime_type: 'application/pdf', data: documento.base64 } });
  else for (const c of documento.immagini) parti.push({ inline_data: { mime_type: 'image/jpeg', data: c.toDataURL('image/jpeg', 0.8).split(',')[1]! } });
  return chiediJson(parti);
}
