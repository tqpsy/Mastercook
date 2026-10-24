import { useState } from 'react';
import { config } from '../config';
import { collegaNucleo, esci, useAccount } from '../nucleo/account';
import { useNucleo } from '../nucleo/contesto';
import { leggiNuclei } from '../nucleo/registro';
import { riprendiSync, sincronizzaOra, useSync, type StatoSync } from '../nucleo/sync';
import { richiediTokenDrive } from '../piattaforma/google';
import { AccessoGoogle } from './AccessoGoogle';
import { mostraAvviso } from './ui';

const DESCRIZIONE: Record<StatoSync, string> = {
  spento: 'Sincronizzazione non attiva.',
  in_corso: 'Sincronizzo con Google Drive…',
  ok: 'Sincronizzato con Google Drive.',
  pausa: 'Sincronizzazione in pausa.',
  offline: 'Sei offline: sincronizzo appena torna la rete.',
  errore: 'Sincronizzazione non riuscita.',
};

/** Account Google e collegamento del nucleo al proprio Google Drive. */
export function Sincronizzazione() {
  const ctx = useNucleo();
  const sessione = useAccount((s) => s.sessione);
  const sync = useSync();
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const configurato = !!(config.googleClientId && config.supabaseUrl && config.supabaseAnonKey);
  const collegato = !!leggiNuclei().find((n) => n.id === ctx.nucleo.id)?.drive;

  async function collega() {
    setInCorso(true);
    setErrore(null);
    try {
      await richiediTokenDrive(sessione?.user.email);
      await collegaNucleo(ctx);
      sincronizzaOra();
      mostraAvviso('Nucleo collegato al tuo Google Drive');
    } catch (e) {
      const testo = e instanceof Error ? e.message : '';
      setErrore(
        /popup|negato|access_denied/i.test(testo)
          ? 'Serve il permesso di Google per creare i file su Drive: riprova e conferma.'
          : /già collegato/i.test(testo)
            ? 'Questo nucleo è già collegato a un altro account Google.'
            : `Collegamento non riuscito: ${testo || 'riprova'}.`,
      );
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
        {!configurato ? (
          <>
            <p className="testo-tenue piccolo">
              I dati sono salvati solo qui. Per usarli su altri telefoni e condividerli con la famiglia collega il tuo Google Drive: i
              file restano sul tuo Drive, cifrati.
            </p>
            <p className="testo-tenue piccolo">L’accesso con Google sarà attivo appena l’app viene collegata al progetto Google Cloud.</p>
          </>
        ) : !sessione ? (
          <>
            <p className="testo-tenue piccolo">
              Accedi con Google per salvare i dati sul tuo Drive, cifrati, e ritrovarli su tutti i tuoi dispositivi.
            </p>
            <AccessoGoogle />
          </>
        ) : !collegato ? (
          <>
            <p className="testo-tenue piccolo">
              Hai fatto l’accesso come {sessione.user.email}. Collega Drive: Masterfood crea una cartella “Masterfood” con i file del
              nucleo cifrati e vede solo i file che crea lei.
            </p>
            <button type="button" className="bottone" disabled={inCorso} onClick={collega}>
              {inCorso ? 'Collego…' : 'Collega Google Drive'}
            </button>
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
            <p className="testo-tenue piccolo">Account: {sessione.user.email}</p>
            <div className="azioni">
              {sync.stato === 'pausa' ? (
                <button type="button" className="bottone piccolo" onClick={() => riprendiSync().catch(() => mostraAvviso('Permesso non concesso'))}>
                  Riprendi
                </button>
              ) : (
                <button type="button" className="bottone secondario piccolo" disabled={sync.stato === 'in_corso'} onClick={sincronizzaOra}>
                  Sincronizza ora
                </button>
              )}
            </div>
          </>
        )}
        {errore && <p className="esito-errore">{errore}</p>}
        {sessione && (
          <button type="button" className="bottone-testo" onClick={() => esci().then(() => mostraAvviso('Sei uscito: i dati restano su questo dispositivo'))}>
            Esci dall’account
          </button>
        )}
      </div>
    </div>
  );
}
