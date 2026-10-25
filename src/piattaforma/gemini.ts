/**
 * Riconoscimento dei prodotti in una foto di frigo, freezer o dispensa con Gemini e la chiave dell'utente.
 * Al modello va solo la foto; la risposta (nomi generici e quantità stimate) viene poi collegata
 * agli ingredienti sul dispositivo e confermata dall'utente: la foto non rimuove mai nulla.
 */
import { leggiChiave } from './chiaviApi';
import { eQuotaGiornaliera, quotaEsaurita, registraRichiesta, segnaEsaurita } from './quotaGemini';

export interface ProdottoVisto {
  nome: string;
  quantita?: string;
  /** Solo per il frigo: dove si trova il prodotto (vedi POSIZIONI_FRIGO). */
  posizione?: string;
}

const MODELLI = ['gemini-2.5-flash', 'gemini-flash-latest'];
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

/** Una richiesta a Gemini con risposta JSON; prova il modello successivo se uno non esiste più. */
async function chiediJson(parti: Parte[]): Promise<unknown> {
  const chiave = leggiChiave('gemini');
  if (!chiave) throw new Error('chiave');
  // Google ha già detto che per oggi la prova è finita: inutile riprovare fino all'azzeramento.
  if (quotaEsaurita()) throw new Error('quota_giorno');
  for (const modello of MODELLI) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modello}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': chiave },
      body: JSON.stringify({
        contents: [{ parts: parti }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
      }),
    });
    if (r.status === 404) continue;
    if (r.status === 429) {
      if (!eQuotaGiornaliera(await r.text().catch(() => ''))) throw new Error('quota');
      segnaEsaurita();
      throw new Error('quota_giorno');
    }
    if (!r.ok) throw new Error(r.status === 400 || r.status === 403 ? 'chiave' : 'rete');
    registraRichiesta();
    const risposta = (await r.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    return JSON.parse(risposta.candidates?.[0]?.content?.parts?.[0]?.text ?? 'null') as unknown;
  }
  throw new Error('modello');
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
