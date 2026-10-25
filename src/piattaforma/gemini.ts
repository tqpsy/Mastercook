/**
 * Riconoscimento dei prodotti in una foto di frigo, freezer o dispensa con Gemini e la chiave dell'utente.
 * Al modello va solo la foto; la risposta (nomi generici e quantità stimate) viene poi collegata
 * agli ingredienti sul dispositivo e confermata dall'utente: la foto non rimuove mai nulla.
 */
import { leggiChiave } from './chiaviApi';

export interface ProdottoVisto {
  nome: string;
  quantita?: string;
}

const MODELLI = ['gemini-2.5-flash', 'gemini-flash-latest'];
const ISTRUZIONI =
  'Elenca gli alimenti visibili in questa foto di un frigorifero, di un freezer o di una dispensa (può essere un solo ripiano, un cassetto o la portiera). ' +
  'Usa nomi generici in italiano (es. "latte", "uova", "zucchine", non le marche) e una stima della quantità visibile. ' +
  'Rispondi solo con JSON: [{"nome": string, "quantita": string}]. Se non vedi alimenti rispondi [].';

export async function riconosciProdotti(canvas: HTMLCanvasElement): Promise<ProdottoVisto[]> {
  const chiave = leggiChiave('gemini');
  if (!chiave) throw new Error('chiave');
  const data = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
  for (const modello of MODELLI) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modello}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': chiave },
      body: JSON.stringify({
        contents: [{ parts: [{ text: ISTRUZIONI }, { inline_data: { mime_type: 'image/jpeg', data } }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
      }),
    });
    if (r.status === 404) continue;
    if (!r.ok) throw new Error(r.status === 400 || r.status === 403 ? 'chiave' : 'rete');
    const risposta = (await r.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const testo = risposta.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
    const elenco = JSON.parse(testo) as unknown;
    return Array.isArray(elenco) ? elenco.filter((x): x is ProdottoVisto => typeof x?.nome === 'string') : [];
  }
  throw new Error('modello');
}
