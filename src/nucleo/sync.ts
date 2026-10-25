/**
 * Sincronizzazione del nucleo con Google Drive.
 * Ciclo per ciascun documento: se la versione su Drive è cambiata scarica, decifra e unisce
 * (merge CRDT, nessun conflitto); se poi il documento locale ha dati che Drive non ha, cifra
 * e carica negli stessi id. Due dispositivi che caricano insieme convergono al ciclo successivo.
 * Quando: all'apertura, al ritorno in primo piano, al ritorno della rete, 5 s dopo una modifica
 * e ogni 5 minuti ad app aperta. Dopo i dati si allineano anche le foto di casa (fotoDrive).
 * In modalità supermercato il ritmo si stringe (1 s dopo una spunta, controllo ogni 10 s, foto escluse)
 * così chi fa la spesa in due vede le spunte dell'altro quasi subito.
 */
import { useEffect } from 'react';
import * as Y from 'yjs';
import { create } from 'zustand';
import { aggiornaFile, elencaPermessi, ErroreDrive, scaricaFile, versioneFile } from '../piattaforma/drive';
import { decifraFile, cifraFile } from '../piattaforma/cifratura';
import { VUOTO, type Deposito } from '../piattaforma/deposito';
import { aggiornaMembriRelay, depositoRelay, fileRelay, relayConfigurato } from '../piattaforma/firebase';
import { richiediToken, tokenValido } from '../piattaforma/google';
import { accessoPerso, chiaveDelNucleo, emailAccount, proteggiChiaveSeInvitato, useAccount, VERSIONE_CHIAVE } from './account';
import { useNucleo } from './contesto';
import { sincronizzaFoto } from './fotoDrive';
import { leggiNuclei } from './registro';
import { useSessione } from '../stato/sessione';

export type StatoSync = 'spento' | 'in_corso' | 'ok' | 'pausa' | 'offline' | 'errore';

interface Sync {
  stato: StatoSync;
  ultima?: string;
  messaggio?: string;
  /** Cambia quando il nucleo viene collegato o si chiede una sincronizzazione subito. */
  richiesta: number;
  /** Quante schermate chiedono il ritmo veloce (modalità supermercato). */
  veloce: number;
  /** Copia condivisa su Firebase: 'ok' o il motivo per cui non va; assente se non si usa. */
  relay?: string;
}

export const useSync = create<Sync>(() => ({ stato: 'spento', richiesta: 0, veloce: 0 }));

const RITMO_VELOCE_MS = 10_000;

/** Tiene la sincronizzazione al ritmo veloce finché il componente resta montato. */
export function useSyncVeloce(): void {
  useEffect(() => {
    useSync.setState((s) => ({ veloce: s.veloce + 1, richiesta: s.richiesta + 1 }));
    return () => useSync.setState((s) => ({ veloce: Math.max(0, s.veloce - 1) }));
  }, []);
}

export const sincronizzaOra = () => useSync.setState((s) => ({ richiesta: s.richiesta + 1 }));

/** Riprende dopo la pausa: va chiamata da un tocco, perché Google può aprire una finestra. */
export async function riprendiSync(): Promise<void> {
  await richiediToken(emailAccount());
  sincronizzaOra();
}

let tentatoSilenzioso = false;

const uguali = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((x, i) => x === b[i]);

export interface Remoto {
  versione?: string;
  vettore?: Uint8Array;
}

const DRIVE: Deposito = { versione: (id) => versioneFile(id), scarica: (id) => scaricaFile(id), aggiorna: (id, c) => aggiornaFile(id, c) };

export async function sincronizzaDocumento(doc: Y.Doc, fileId: string, chiave: CryptoKey, remoto: Remoto, deposito: Deposito = DRIVE): Promise<void> {
  const versione = await deposito.versione(fileId);
  if (versione !== remoto.versione || !remoto.vettore) {
    if (versione === VUOTO) {
      // Il file non c'è ancora (copia condivisa appena nata): si carica tutto.
      remoto.vettore = Y.encodeStateVector(new Y.Doc());
    } else {
      const aggiornamento = await decifraFile(chiave, await deposito.scarica(fileId));
      Y.applyUpdate(doc, aggiornamento, 'drive');
      remoto.vettore = Y.encodeStateVectorFromUpdate(aggiornamento);
    }
    remoto.versione = versione;
  }
  const locale = Y.encodeStateVector(doc);
  if (!uguali(locale, remoto.vettore)) {
    remoto.versione = await deposito.aggiorna(fileId, await cifraFile(chiave, VERSIONE_CHIAVE, Y.encodeStateAsUpdate(doc)));
    remoto.vettore = locale;
  }
}

/** Nuclei la cui scheda su Firebase è già stata allineata in questa sessione. */
const schedeRelay = new Set<string>();

/**
 * Per chi ha creato il nucleo: tiene la copia condivisa su Firebase e l'elenco delle email che
 * possono entrare (chi ha già un profilo collegato al suo account Google).
 */
async function assicuraRelay(nucleoId: string, cartella: string, dati: Y.Doc): Promise<void> {
  if (schedeRelay.has(nucleoId)) return;
  const collegati = [...dati.getMap<Y.Map<unknown>>('membri').values()].filter((m) => !m.get('eliminato_il')).map((m) => m.get('utente_id'));
  // Anche chi ha ricevuto un invito prima della copia condivisa e non è ancora entrato.
  const invitati = (await elencaPermessi(cartella).catch(() => [])).filter((p) => p.type === 'user' && p.role !== 'owner').map((p) => p.emailAddress);
  const email = [...collegati, ...invitati].filter((e): e is string => typeof e === 'string' && e.includes('@'));
  await aggiornaMembriRelay(nucleoId, { aggiungi: email });
  schedeRelay.add(nucleoId);
}

/** Motore montato dentro il nucleo corrente: non disegna nulla. */
export function MotoreSync() {
  const { nucleo, dati, storico } = useNucleo();
  const utente = useAccount((s) => s.email);
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
    const remotiRelay: Record<'dati' | 'storico', Remoto> = { dati: {}, storico: {} };
    // Un invitato a cui è stato tolto l'accesso riceve «file non trovato»: due volte di fila per esserne certi.
    let nonTrovato = 0;

    const veloce = () => useSync.getState().veloce > 0;

    async function ciclo(soloDati = false) {
      if (fermo) return;
      if (inCorso) {
        ancora = true;
        return;
      }
      const registrato = leggiNuclei().find((n) => n.id === nucleo.id);
      const file = registrato?.drive;
      if (!registrato || !file) return;
      if (!navigator.onLine) {
        useSync.setState({ stato: 'offline' });
        return;
      }
      inCorso = true;
      useSync.setState({ stato: 'in_corso' });
      try {
        if (!tokenValido()) {
          // Un solo tentativo silenzioso per sessione: poi si aspetta un tocco su "Riprendi".
          if (tentatoSilenzioso) throw new ErroreDrive(401, 'token');
          tentatoSilenzioso = true;
          await richiediToken(emailAccount(), true);
        }
        const chiave = await chiaveDelNucleo(registrato);
        const proprietario = file.proprietario !== false;
        // Chi è entrato dalla copia condivisa usa solo quella; chi ha creato il nucleo tiene allineate entrambe.
        if (!file.relay) {
          await sincronizzaDocumento(dati, file.dati, chiave, remoti.dati);
          await sincronizzaDocumento(storico, file.storico, chiave, remoti.storico);
        }
        const conRelay = relayConfigurato() && (file.relay || proprietario);
        const viaRelay = async () => {
          if (proprietario) await assicuraRelay(nucleo.id, file.cartella, dati);
          await sincronizzaDocumento(dati, fileRelay(nucleo.id, 'dati'), chiave, remotiRelay.dati, depositoRelay);
          await sincronizzaDocumento(storico, fileRelay(nucleo.id, 'storico'), chiave, remotiRelay.storico, depositoRelay);
        };
        // Per chi ha creato il nucleo Drive resta la copia principale: un problema di Firebase non lo ferma.
        if (conRelay) {
          try {
            await viaRelay();
            useSync.setState({ relay: 'ok' });
          } catch (e) {
            useSync.setState({ relay: e instanceof Error ? e.message : 'errore sconosciuto' });
            if (file.relay) throw e;
          }
        }
        nonTrovato = 0;
        // Le foto seguono i dati, ma un loro problema non ferma la sincronizzazione.
        if (!soloDati) {
          if (!file.relay) await sincronizzaFoto(nucleo.id).catch(() => undefined);
          if (conRelay) await sincronizzaFoto(nucleo.id, 'relay').catch(() => undefined);
        }
        await proteggiChiaveSeInvitato(nucleo.id).catch(() => undefined);
        useSync.setState({ stato: 'ok', ultima: new Date().toISOString(), messaggio: undefined });
      } catch (e) {
        if (e instanceof ErroreDrive && e.stato === 404 && registrato.drive?.proprietario === false && ++nonTrovato >= 2) {
          fermo = true;
          await accessoPerso(nucleo.id);
          alert(`Chi ha creato «${registrato.nome}» ti ha tolto l’accesso: i suoi dati sono stati tolti da questo telefono.`);
          useSessione.getState().scegliNucleo(leggiNuclei()[0]?.id ?? null);
          return;
        }
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
      attesa = setTimeout(() => ciclo(veloce()), veloce() ? 1000 : 5000);
    };
    const visibile = () => document.visibilityState === 'visible' && void ciclo(veloce());
    dati.on('update', dopoModifica);
    storico.on('update', dopoModifica);
    document.addEventListener('visibilitychange', visibile);
    const inLinea = () => void ciclo();
    window.addEventListener('online', inLinea);
    const periodico = setInterval(ciclo, 5 * 60 * 1000);
    // Ad app nascosta non serve: al ritorno in primo piano parte comunque un ciclo.
    const rapido = setInterval(() => veloce() && document.visibilityState === 'visible' && void ciclo(true), RITMO_VELOCE_MS);
    void ciclo();

    return () => {
      fermo = true;
      clearTimeout(attesa);
      clearInterval(periodico);
      clearInterval(rapido);
      dati.off('update', dopoModifica);
      storico.off('update', dopoModifica);
      document.removeEventListener('visibilitychange', visibile);
      window.removeEventListener('online', inLinea);
    };
  }, [collegato, utente, nucleo.id, dati, storico, richiesta]);

  return null;
}
