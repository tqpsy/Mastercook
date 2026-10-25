/**
 * OCR di scontrini e fogli della dieta con Tesseract.js e la lingua italiana, sul dispositivo e gratuito (i file
 * del motore si scaricano la prima volta e poi restano in cache). La foto non lascia il telefono.
 */
import { unisciParti } from '../dominio/scontrino';

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

async function conTesseract(immagini: HTMLCanvasElement[], progresso: (p: number) => void): Promise<string[]> {
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
    return testi;
  } finally {
    await worker.terminate();
  }
}

export async function leggiTesto(immagini: HTMLCanvasElement[], progresso: (p: number) => void): Promise<string> {
  return unisciParti(await conTesseract(immagini, progresso));
}

/** Pagine di un documento (la dieta del dietista): una dopo l'altra, senza cercare righe ripetute. */
export async function leggiPagine(immagini: HTMLCanvasElement[], progresso: (p: number) => void): Promise<string> {
  return (await conTesseract(immagini, progresso)).join('\n');
}
