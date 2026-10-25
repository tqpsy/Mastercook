import { useState } from 'react';
import { googleConfigurato } from '../config';
import { accedi, collegaNucleo, esci, useAccount } from '../nucleo/account';
import { useNucleo } from '../nucleo/contesto';
import { leggiNuclei, rimuoviNucleoLocale } from '../nucleo/registro';
import { useSessione } from '../stato/sessione';
import { riprendiSync, sincronizzaOra, useSync, type StatoSync } from '../nucleo/sync';
import { richiediToken, tokenValido } from '../piattaforma/google';
import { BottoneGoogle } from './BottoneGoogle';
import { InvitaFamiglia } from './InvitaFamiglia';
import { mostraAvviso } from './ui';

const DESCRIZIONE: Record<StatoSync, string> = {
  spento: 'Sincronizzazione non attiva.',
  in_corso: 'Sincronizzo con Google Drive…',
  ok: 'Sincronizzato con Google Drive.',
  pausa: 'Sincronizzazione in pausa.',
  offline: 'Sei offline: sincronizzo appena torna la rete.',
  errore: 'Sincronizzazione non riuscita.',
};

export function messaggioErroreGoogle(e: unknown): string {
  const testo = e instanceof Error ? e.message : '';
  if (/popup_closed|negato|access_denied/i.test(testo)) return 'Accesso annullato: per salvare su Drive serve il permesso di Google.';
  if (/popup_failed/i.test(testo)) return 'Il browser ha bloccato la finestra di Google: consenti i popup per questo sito e riprova.';
  if (/rete|Failed to fetch/i.test(testo)) return 'Non riesco a contattare Google: controlla la connessione.';
  if (/storageQuota/i.test(testo)) return 'Il tuo Google Drive è pieno.';
  return `Non è andata a buon fine${testo ? ` (${testo})` : ''}: riprova.`;
}

/** Account Google e salvataggio del nucleo sul proprio Google Drive: un solo tocco. */
export function Sincronizzazione() {
  const ctx = useNucleo();
  const email = useAccount((s) => s.email);
  const sync = useSync();
  const scegliNucleo = useSessione((x) => x.scegliNucleo);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const collegato = !!leggiNuclei().find((n) => n.id === ctx.nucleo.id)?.drive;

  async function collega() {
    setInCorso(true);
    setErrore(null);
    try {
      if (!email) await accedi();
      else if (!tokenValido()) await richiediToken(email);
      await collegaNucleo(ctx);
      sincronizzaOra();
      mostraAvviso('Fatto: i dati sono salvati anche sul tuo Google Drive');
    } catch (e) {
      setErrore(messaggioErroreGoogle(e));
    } finally {
      setInCorso(false);
    }
  }

  return (
    <div className="sezione">
      <h2>Account e sincronizzazione</h2>
      <div className="riquadro">
        <p>
          <strong>{collegato ? 'Su questo dispositivo + Google Drive' : 'Solo su questo dispositivo'}</strong>
        </p>
        {!googleConfigurato() ? (
          <p className="testo-tenue piccolo">
            I dati sono salvati solo qui. Il salvataggio su Google Drive sarà disponibile a breve.
          </p>
        ) : !collegato ? (
          <>
            <p className="testo-tenue piccolo">
              Salva i dati sul tuo Google Drive: non li perdi e li ritrovi sugli altri telefoni. Sono cifrati, nessuno può leggerli.
            </p>
            <BottoneGoogle testo={inCorso ? 'Salvo su Drive…' : 'Salva su Google Drive'} onClick={collega} disabled={inCorso} />
          </>
        ) : (
          <>
            <p className={sync.stato === 'errore' || sync.stato === 'pausa' ? 'esito-errore' : 'testo-tenue piccolo'}>
              {DESCRIZIONE[sync.stato]}
              {sync.stato === 'ok' && sync.ultima
                ? ` Ultima volta alle ${new Date(sync.ultima).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}.`
                : ''}
              {sync.messaggio ? ` ${sync.messaggio}` : ''}
            </p>
            {email && <p className="testo-tenue piccolo">Account: {email}</p>}
            <div className="azioni">
              {sync.stato === 'pausa' || !email ? (
                <BottoneGoogle
                  testo="Riprendi la sincronizzazione"
                  onClick={() => (email ? riprendiSync() : accedi().then(sincronizzaOra)).catch((e) => setErrore(messaggioErroreGoogle(e)))}
                />
              ) : (
                <button type="button" className="bottone secondario piccolo" disabled={sync.stato === 'in_corso'} onClick={sincronizzaOra}>
                  Sincronizza ora
                </button>
              )}
            </div>
          </>
        )}
        {errore && <p className="esito-errore">{errore}</p>}
        {email && (
          <div className="sezione">
            <p className="testo-tenue piccolo">Esci quando il telefono non è tuo o lo presti: i dati restano al sicuro sul tuo Drive.</p>
            <div className="azioni">
              <button
                type="button"
                className="bottone secondario piccolo"
                onClick={() => {
                  esci();
                  mostraAvviso('Sei uscito: i dati restano su questo dispositivo e su Drive');
                }}
              >
                Esci
              </button>
              {collegato && (
                <button
                  type="button"
                  className="bottone pericolo piccolo"
                  onClick={() => {
                    if (!confirm('Uscire e togliere i dati da questo dispositivo? Restano sul tuo Google Drive e li ritrovi accedendo di nuovo.')) return;
                    esci();
                    for (const n of leggiNuclei().filter((x) => x.drive)) {
                      rimuoviNucleoLocale(n.id);
                      for (const tipo of ['dati', 'storico']) indexedDB.deleteDatabase(`masterfood-${n.id}-${tipo}`);
                    }
                    scegliNucleo(leggiNuclei()[0]?.id ?? null);
                  }}
                >
                  Esci e togli i dati da qui
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      {collegato && email && <InvitaFamiglia />}
    </div>
  );
}
