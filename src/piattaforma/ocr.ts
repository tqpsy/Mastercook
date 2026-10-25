/**
 * OCR degli scontrini.
 * - Predefinito: Tesseract.js con la lingua italiana, sul dispositivo, gratuito (i file del motore
 *   si scaricano la prima volta e poi restano in cache).
 * - Con la chiave Google Cloud Vision dell'utente: endpoint UE, più preciso. La chiamata parte dal
 *   telefono; la foto non passa dai server di Masterfood e non viene salvata.
 */
import { unisciParti } from '../dominio/scontrino';
import { leggiChiave } from './chiaviApi';

/** Scala di grigi e contrasto: aiuta Tesseract con la carta termica. */
function preparaPerOcr(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')!;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const grigio = 0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!;
    const v = Math.max(0, Math.min(255, (grigio - 128) * 1.6 + 140));
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

async function conTesseract(immagini: HTMLCanvasElement[], progresso: (p: number) => void): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  let parte = 0;
  const worker = await createWorker('ita', 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') progresso((parte + m.progress) / immagini.length);
    },
  });
  try {
    const testi: string[] = [];
    for (const img of immagini) {
      const { data } = await worker.recognize(preparaPerOcr(img));
      testi.push(data.text);
      parte++;
    }
    return unisciParti(testi);
  } finally {
    await worker.terminate();
  }
}

async function conVision(immagini: HTMLCanvasElement[], chiave: string, progresso: (p: number) => void): Promise<string> {
  const requests = immagini.map((c) => ({
    image: { content: c.toDataURL('image/jpeg', 0.8).split(',')[1] },
    features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
    imageContext: { languageHints: ['it'] },
  }));
  progresso(0.3);
  const r = await fetch(`https://eu-vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(chiave)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests }),
  });
  if (!r.ok) throw new Error(r.status === 403 || r.status === 400 ? 'chiave' : 'rete');
  const dati = (await r.json()) as { responses: { fullTextAnnotation?: { text: string } }[] };
  progresso(1);
  return unisciParti(dati.responses.map((x) => x.fullTextAnnotation?.text ?? ''));
}

export type MotoreOcr = 'tesseract' | 'vision';

export function motoreDisponibile(): MotoreOcr {
  return leggiChiave('vision') ? 'vision' : 'tesseract';
}

export async function leggiTesto(immagini: HTMLCanvasElement[], progresso: (p: number) => void): Promise<string> {
  const chiave = leggiChiave('vision');
  if (chiave) {
    try {
      return await conVision(immagini, chiave, progresso);
    } catch {
      // Chiave non valida o rete assente: si ripiega sull'OCR del dispositivo.
    }
  }
  return conTesseract(immagini, progresso);
}
