/**
 * Fotocamera posteriore e lettura dei codici a barre e dei QR code.
 * Usa BarcodeDetector nativo dove c'è (Chrome su Android) e la versione WebAssembly
 * di ZXing negli altri browser (Safari su iPhone), caricata solo quando serve.
 */
import { useEffect, useRef, useState } from 'react';

export type StatoFotocamera = 'avvio' | 'attiva' | 'negata' | 'assente';

export function useFotocamera(attiva: boolean) {
  const video = useRef<HTMLVideoElement>(null);
  const [stato, setStato] = useState<StatoFotocamera>(() => ('mediaDevices' in navigator ? 'avvio' : 'assente'));

  useEffect(() => {
    if (!attiva) return;
    let flusso: MediaStream | undefined;
    let annullato = false;
    if (!('mediaDevices' in navigator)) return;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      .then((s) => {
        if (annullato) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        flusso = s;
        if (video.current) {
          video.current.srcObject = s;
          video.current.play().catch(() => {});
        }
        setStato('attiva');
      })
      .catch((e: DOMException) => setStato(e.name === 'NotAllowedError' ? 'negata' : 'assente'));
    return () => {
      annullato = true;
      flusso?.getTracks().forEach((t) => t.stop());
    };
  }, [attiva]);

  return { video, stato };
}

interface Rilevatore {
  detect(sorgente: HTMLVideoElement): Promise<{ rawValue: string }[]>;
}

const FORMATI_PRODOTTO = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];

/** Rilevatore dei codici a barre dei prodotti, o di altri formati (es. ['qr_code'] per gli scontrini). */
export async function creaRilevatore(formati = FORMATI_PRODOTTO): Promise<Rilevatore> {
  const Nativo = (globalThis as { BarcodeDetector?: { new (o: { formats: string[] }): Rilevatore; getSupportedFormats(): Promise<string[]> } })
    .BarcodeDetector;
  if (Nativo) {
    const supportati = await Nativo.getSupportedFormats().catch(() => [] as string[]);
    if (formati.some((f) => supportati.includes(f))) return new Nativo({ formats: formati.filter((f) => supportati.includes(f)) });
  }
  const { BarcodeDetector } = await import('barcode-detector/ponyfill');
  return new BarcodeDetector({ formats: formati as never[] }) as unknown as Rilevatore;
}

/** Scatta un fotogramma dal video, ridimensionato a 1600 px sul lato lungo (JPEG 0,8). */
export function scatta(video: HTMLVideoElement, lato = 1600): HTMLCanvasElement {
  const scala = Math.min(1, lato / Math.max(video.videoWidth, video.videoHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(video.videoWidth * scala);
  canvas.height = Math.round(video.videoHeight * scala);
  canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Legge un file immagine (da <input capture>) in un canvas ridimensionato. */
export async function immagineDaFile(file: File, lato = 1600): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const scala = Math.min(1, lato / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scala);
  canvas.height = Math.round(bitmap.height * scala);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}
