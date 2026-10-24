import { useState } from 'react';
import { AccessoGoogle } from '../componenti/AccessoGoogle';
import { ModuloMembro, membroVuoto } from '../componenti/ModuloMembro';
import { config } from '../config';
import { recuperaNuclei, useAccount } from '../nucleo/account';
import { richiediTokenDrive } from '../piattaforma/google';
import { creaNucleoLocale } from '../nucleo/crea';
import { useSessione } from '../stato/sessione';

const PUNTI = [
  { emoji: '🧺', testo: 'Sai sempre cosa c’è in frigo, in freezer e in dispensa, e cosa scade.' },
  { emoji: '📝', testo: 'Una lista della spesa unica per tutta la famiglia, divisa per reparti.' },
  { emoji: '🍝', testo: 'Ricette con quello che hai già, sempre sicure per le allergie di chi mangia.' },
  { emoji: '🔒', testo: 'I tuoi dati restano sul telefono. Potrai condividerli col tuo Google Drive.' },
];

export function Benvenuto() {
  const [passo, setPasso] = useState<'intro' | 'nucleo' | 'accedi'>('intro');
  const sessione = useAccount((s) => s.sessione);
  const [errore, setErrore] = useState<string | null>(null);
  const configurato = !!(config.googleClientId && config.supabaseUrl && config.supabaseAnonKey);
  const [nomeNucleo, setNomeNucleo] = useState('Casa');
  const [inCorso, setInCorso] = useState(false);
  const scegliNucleo = useSessione((s) => s.scegliNucleo);
  const icona = `${import.meta.env.BASE_URL}pwa-192.png`;

  if (passo === 'intro') {
    return (
      <main className="benvenuto">
        <img className="benvenuto-logo" src={icona} alt="" />
        <div className="saluto">
          <h1>Benvenuto in Masterfood</h1>
          <p className="sottotitolo">La spesa, la dispensa e le ricette della tua famiglia, in un posto solo.</p>
        </div>
        <ul className="punti">
          {PUNTI.map((p) => (
            <li key={p.emoji}>
              <span className="emoji" aria-hidden="true">
                {p.emoji}
              </span>
              <span>{p.testo}</span>
            </li>
          ))}
        </ul>
        <button type="button" className="bottone pieno" onClick={() => setPasso('nucleo')}>
          Inizia
        </button>
        {configurato && (
          <button type="button" className="bottone secondario" onClick={() => setPasso('accedi')}>
            Ho già un nucleo su Google Drive
          </button>
        )}
        <p className="testo-tenue piccolo">
          Nessuna registrazione necessaria per provarla: si parte su questo dispositivo, l’accesso con Google si aggiunge quando vuoi.
        </p>
      </main>
    );
  }

  if (passo === 'accedi') {
    return (
      <main className="benvenuto">
        <div className="saluto">
          <h1>Ritrova il tuo nucleo</h1>
          <p className="sottotitolo">Accedi con l’account Google che hai usato per collegare Drive: scarico i dati cifrati su questo dispositivo.</p>
        </div>
        {!sessione ? (
          <AccessoGoogle />
        ) : (
          <>
            <p className="testo-tenue">Accesso come {sessione.user.email}.</p>
            <button
              type="button"
              className="bottone pieno"
              disabled={inCorso}
              onClick={async () => {
                setInCorso(true);
                setErrore(null);
                try {
                  await richiediTokenDrive(sessione.user.email);
                  const id = await recuperaNuclei();
                  if (id) scegliNucleo(id);
                  else setErrore('Non trovo nuclei collegati a Drive per questo account. Puoi crearne uno nuovo.');
                } catch {
                  setErrore('Non sono riuscito a scaricare i dati da Drive. Controlla la connessione e il permesso di Google e riprova.');
                } finally {
                  setInCorso(false);
                }
              }}
            >
              {inCorso ? 'Scarico i dati…' : 'Apri i dati da Google Drive'}
            </button>
          </>
        )}
        {errore && <p className="esito-errore">{errore}</p>}
        <button type="button" className="bottone-testo" onClick={() => setPasso('nucleo')}>
          Crea invece un nuovo nucleo
        </button>
      </main>
    );
  }

  return (
    <main className="benvenuto">
      <ModuloMembro
        iniziale={membroVuoto()}
        etichettaInvio={inCorso ? 'Creo il nucleo…' : 'Crea il nucleo'}
        intestazione={
          <>
            <div className="saluto">
              <h1>Il tuo nucleo</h1>
              <p className="sottotitolo">Un nucleo è la casa che condivide dispensa e spesa. Gli altri membri li aggiungi dopo.</p>
            </div>
            <label className="campo">
              <span>Nome del nucleo</span>
              <input value={nomeNucleo} onChange={(e) => setNomeNucleo(e.target.value)} placeholder="Es. Casa Rossi" required />
            </label>
            <h2>Chi sei</h2>
          </>
        }
        onInvia={async (dati) => {
          if (inCorso) return;
          setInCorso(true);
          const id = await creaNucleoLocale(nomeNucleo.trim() || 'Casa', dati);
          scegliNucleo(id);
        }}
      />
    </main>
  );
}
