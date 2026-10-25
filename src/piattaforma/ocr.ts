/**
 * OCR di scontrini e fogli della dieta con Tesseract.js e la lingua italiana, sul dispositivo e gratuito (i file
 * del motore si scaricano la prima volta e poi restano in cache). La foto non lascia il telefono.
 */
import workerTesseract from 'tesseract.js/dist/worker.min.js?url';
import { unisciParti } from '../dominio/scontrino';

/**
 * Il worker arriva dal sito stesso (non da un blob): così è controllato dal service worker, e motore
 * e lingua che scarica restano nella cache offline anche sui telefoni che non la estendono ai blob.
 */
const OPZIONI_WORKER = { workerPath: workerTesseract, workerBlobURL: false };

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
    ...OPZIONI_WORKER,
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

const CHIAVE_PRONTO = 'masterfood:ocr-pronto';
let preparazioneAvviata = false;

/**
 * Scarica in anticipo, con calma e una volta sola, il motore e la lingua italiana: così il primo
 * scontrino si legge anche senza rete. Salta se il telefono risparmia dati.
 */
export function preparaOcrOffline(): void {
  if (preparazioneAvviata) return;
  preparazioneAvviata = true;
  try {
    if (localStorage.getItem(CHIAVE_PRONTO)) return;
  } catch {
    return;
  }
  const connessione = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (!navigator.onLine || connessione?.saveData) return;
  const quandoLibero = (f: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(f, { timeout: 30_000 }) : setTimeout(f, 10_000));
  quandoLibero(async () => {
    try {
      const { createWorker } = await import('tesseract.js');
      // Senza rete il motore può non rispondere mai: dopo due minuti si lascia perdere.
      const worker = await Promise.race([
        createWorker('ita', 1, OPZIONI_WORKER),
        new Promise<never>((_, ko) => setTimeout(() => ko(new Error('tempo')), 120_000)),
      ]);
      await worker.terminate();
      localStorage.setItem(CHIAVE_PRONTO, new Date().toISOString());
    } catch {
      // Riproverà alla prossima apertura.
    }
  });
}
