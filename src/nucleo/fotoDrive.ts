/**
 * Foto di frigo, freezer e dispensa sul Drive di chi ha creato il nucleo, in un solo file cifrato
 * (nucleo-foto.mfd), così chi è invitato le vede anche lui. Per ogni zona vince la versione
 * modificata per ultima. Senza token valido non fa nulla: ci pensa il ciclo successivo.
 */
import { create } from 'zustand';
import { MASSIMO_FOTO, leggiZona, salvaZona, type FotoSalvata } from '../piattaforma/archivioFoto';
import { cifraFile, decifraFile } from '../piattaforma/cifratura';
import { aggiornaFile, scaricaFile, versioneFile } from '../piattaforma/drive';
import { tokenValido } from '../piattaforma/google';
import { assicuraFileFoto, chiaveDelNucleo, VERSIONE_CHIAVE } from './account';
import { leggiNuclei } from './registro';

export const ZONE_FOTO = ['frigo', 'freezer', 'dispensa'] as const;

interface FotoNelFile {
  id: string;
  il: string;
  jpeg: string;
}
interface FileFoto {
  versione: 1;
  zone: Record<string, { aggiornata: string; foto: FotoNelFile[] }>;
}

async function inBase64(blob: Blob): Promise<string> {
  const byte = new Uint8Array(await blob.arrayBuffer());
  let testo = '';
  for (let i = 0; i < byte.length; i += 0x8000) testo += String.fromCharCode(...byte.subarray(i, i + 0x8000));
  return btoa(testo);
}
const daBase64 = (testo: string) => new Blob([Uint8Array.from(atob(testo), (c) => c.charCodeAt(0))], { type: 'image/jpeg' });

/** Cresce quando arrivano foto nuove da Drive: le pagine che le mostrano si ricaricano. */
export const useArrivoFoto = create(() => ({ giro: 0 }));

const versioniNote = new Map<string, { versione: string; contenuto: FileFoto }>();
let coda: Promise<unknown> = Promise.resolve();

/** Unisce le foto locali con quelle su Drive. Restituisce le zone cambiate su questo dispositivo. */
export function sincronizzaFoto(nucleoId: string): Promise<string[]> {
  const giro = coda.then(() => giroFoto(nucleoId));
  coda = giro.catch(() => undefined);
  return giro;
}

async function giroFoto(nucleoId: string): Promise<string[]> {
  const nucleo = leggiNuclei().find((n) => n.id === nucleoId);
  if (!nucleo?.drive || !tokenValido()) return [];
  const locali = Object.fromEntries(await Promise.all(ZONE_FOTO.map(async (z) => [z, await leggiZona(nucleoId, z)] as const)));
  let fileId = nucleo.drive.foto;
  if (!fileId) {
    // Nessuna foto da condividere: il file si crea alla prima foto.
    if (!ZONE_FOTO.some((z) => locali[z]!.foto.length)) return [];
    fileId = await assicuraFileFoto(nucleoId);
  }
  const chiave = await chiaveDelNucleo(leggiNuclei().find((n) => n.id === nucleoId)!);

  const versione = await versioneFile(fileId);
  let remoto = versioniNote.get(fileId);
  if (remoto?.versione !== versione) {
    const testo = new TextDecoder().decode(await decifraFile(chiave, await scaricaFile(fileId)));
    remoto = { versione, contenuto: JSON.parse(testo) as FileFoto };
    versioniNote.set(fileId, remoto);
  }

  const cambiate: string[] = [];
  let daCaricare = false;
  const nuovo: FileFoto = { versione: 1, zone: { ...remoto.contenuto.zone } };
  for (const zona of ZONE_FOTO) {
    const locale = locali[zona]!;
    const suDrive = remoto.contenuto.zone[zona];
    if (suDrive && (!locale.aggiornata || suDrive.aggiornata > locale.aggiornata)) {
      const foto: FotoSalvata[] = suDrive.foto.map((f) => ({ id: f.id, il: f.il, blob: daBase64(f.jpeg) }));
      await salvaZona(nucleoId, zona, foto, suDrive.aggiornata);
      cambiate.push(zona);
    } else if (locale.aggiornata && (!suDrive || locale.aggiornata > suDrive.aggiornata)) {
      const foto = await Promise.all(locale.foto.slice(-MASSIMO_FOTO).map(async (f) => ({ id: f.id, il: f.il, jpeg: await inBase64(f.blob) })));
      nuovo.zone[zona] = { aggiornata: locale.aggiornata, foto };
      daCaricare = true;
    }
  }
  if (daCaricare) {
    const contenuto = await cifraFile(chiave, VERSIONE_CHIAVE, new TextEncoder().encode(JSON.stringify(nuovo)));
    versioniNote.set(fileId, { versione: await aggiornaFile(fileId, contenuto), contenuto: nuovo });
  }
  if (cambiate.length) useArrivoFoto.setState((s) => ({ giro: s.giro + 1 }));
  return cambiate;
}
