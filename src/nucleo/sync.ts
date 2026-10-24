/**
 * Sincronizzazione del nucleo con Google Drive.
 * Ciclo per ciascun documento: se la versione su Drive è cambiata scarica, decifra e unisce
 * (merge CRDT, nessun conflitto); se poi il documento locale ha dati che Drive non ha, cifra
 * e carica negli stessi id. Due dispositivi che caricano insieme convergono al ciclo successivo.
 * Quando: all'apertura, al ritorno in primo piano, al ritorno della rete, 5 s dopo una modifica
 * e ogni 5 minuti ad app aperta.
 */
import { useEffect } from 'react';
import * as Y from 'yjs';
import { create } from 'zustand';
import { aggiornaFile, ErroreDrive, scaricaFile, versioneFile } from '../piattaforma/drive';
import { decifraFile, cifraFile } from '../piattaforma/cifratura';
import { richiediTokenDrive, tokenDriveValido } from '../piattaforma/google';
import { chiaveDelNucleo, emailAccount, useAccount, VERSIONE_CHIAVE } from './account';
import { useNucleo } from './contesto';
import { leggiNuclei } from './registro';

export type StatoSync = 'spento' | 'in_corso' | 'ok' | 'pausa' | 'offline' | 'errore';

interface Sync {
  stato: StatoSync;
  ultima?: string;
  messaggio?: string;
  /** Cambia quando il nucleo viene collegato o si chiede una sincronizzazione subito. */
  richiesta: number;
}

export const useSync = create<Sync>(() => ({ stato: 'spento', richiesta: 0 }));

export const sincronizzaOra = () => useSync.setState((s) => ({ richiesta: s.richiesta + 1 }));

/** Riprende dopo la pausa: va chiamata da un tocco, perché Google può aprire una finestra. */
export async function riprendiSync(): Promise<void> {
  await richiediTokenDrive(emailAccount());
  sincronizzaOra();
}

let tentatoSilenzioso = false;

const uguali = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((x, i) => x === b[i]);

export interface Remoto {
  versione?: string;
  vettore?: Uint8Array;
}

export async function sincronizzaDocumento(doc: Y.Doc, fileId: string, chiave: CryptoKey, remoto: Remoto): Promise<void> {
  const versione = await versioneFile(fileId);
  if (versione !== remoto.versione || !remoto.vettore) {
    const aggiornamento = await decifraFile(chiave, await scaricaFile(fileId));
    Y.applyUpdate(doc, aggiornamento, 'drive');
    remoto.versione = versione;
    remoto.vettore = Y.encodeStateVectorFromUpdate(aggiornamento);
  }
  const locale = Y.encodeStateVector(doc);
  if (!uguali(locale, remoto.vettore)) {
    remoto.versione = await aggiornaFile(fileId, await cifraFile(chiave, VERSIONE_CHIAVE, Y.encodeStateAsUpdate(doc)));
    remoto.vettore = locale;
  }
}

/** Motore montato dentro il nucleo corrente: non disegna nulla. */
export function MotoreSync() {
  const { nucleo, dati, storico } = useNucleo();
  const utente = useAccount((s) => s.sessione?.user.id);
  const richiesta = useSync((s) => s.richiesta);
  const collegato = !!leggiNuclei().find((n) => n.id === nucleo.id)?.drive;

  useEffect(() => {
    if (!collegato || !utente) {
      useSync.setState({ stato: 'spento' });
      return;
    }
    let fermo = false;
    let inCorso = false;
    let ancora = false;
    let attesa: ReturnType<typeof setTimeout> | undefined;
    const remoti: Record<'dati' | 'storico', Remoto> = { dati: {}, storico: {} };

    async function ciclo() {
      if (fermo) return;
      if (inCorso) {
        ancora = true;
        return;
      }
      const file = leggiNuclei().find((n) => n.id === nucleo.id)?.drive;
      if (!file) return;
      if (!navigator.onLine) {
        useSync.setState({ stato: 'offline' });
        return;
      }
      inCorso = true;
      useSync.setState({ stato: 'in_corso' });
      try {
        if (!tokenDriveValido()) {
          // Un solo tentativo silenzioso per sessione: poi si aspetta un tocco su "Riprendi".
          if (tentatoSilenzioso) throw new ErroreDrive(401, 'token');
          tentatoSilenzioso = true;
          await richiediTokenDrive(emailAccount(), true);
        }
        const chiave = await chiaveDelNucleo(nucleo.id);
        await sincronizzaDocumento(dati, file.dati, chiave, remoti.dati);
        await sincronizzaDocumento(storico, file.storico, chiave, remoti.storico);
        useSync.setState({ stato: 'ok', ultima: new Date().toISOString(), messaggio: undefined });
      } catch (e) {
        if (e instanceof ErroreDrive && !e.autorizzazione) {
          useSync.setState({
            stato: 'errore',
            messaggio: e.stato === 403 && /storageQuota/i.test(e.message) ? 'Il tuo Google Drive è pieno.' : `Drive non risponde (${e.message}).`,
          });
        } else if (e instanceof ErroreDrive || (e instanceof Error && /popup|negato|access_denied|token/i.test(e.message))) {
          useSync.setState({ stato: 'pausa', messaggio: 'Serve di nuovo il permesso di Google per Drive.' });
        } else {
          useSync.setState({ stato: 'errore', messaggio: e instanceof Error ? e.message : 'Errore sconosciuto' });
        }
      } finally {
        inCorso = false;
        if (ancora && !fermo) {
          ancora = false;
          void ciclo();
        }
      }
    }

    const dopoModifica = (_u: Uint8Array, origine: unknown) => {
      if (origine === 'drive') return;
      clearTimeout(attesa);
      attesa = setTimeout(ciclo, 5000);
    };
    const visibile = () => document.visibilityState === 'visible' && void ciclo();
    dati.on('update', dopoModifica);
    storico.on('update', dopoModifica);
    document.addEventListener('visibilitychange', visibile);
    window.addEventListener('online', ciclo);
    const periodico = setInterval(ciclo, 5 * 60 * 1000);
    void ciclo();

    return () => {
      fermo = true;
      clearTimeout(attesa);
      clearInterval(periodico);
      dati.off('update', dopoModifica);
      storico.off('update', dopoModifica);
      document.removeEventListener('visibilitychange', visibile);
      window.removeEventListener('online', ciclo);
    };
  }, [collegato, utente, nucleo.id, dati, storico, richiesta]);

  return null;
}
