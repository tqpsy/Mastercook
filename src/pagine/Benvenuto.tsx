import { useState } from 'react';
import { ModuloMembro, membroVuoto } from '../componenti/ModuloMembro';
import { creaNucleoLocale } from '../nucleo/crea';
import { useSessione } from '../stato/sessione';

const PUNTI = [
  { emoji: '🧺', testo: 'Sai sempre cosa c’è in frigo, in freezer e in dispensa, e cosa scade.' },
  { emoji: '📝', testo: 'Una lista della spesa unica per tutta la famiglia, divisa per reparti.' },
  { emoji: '🍝', testo: 'Ricette con quello che hai già, sempre sicure per le allergie di chi mangia.' },
  { emoji: '🔒', testo: 'I tuoi dati restano sul telefono. Potrai condividerli col tuo Google Drive.' },
];

export function Benvenuto() {
  const [passo, setPasso] = useState<'intro' | 'nucleo'>('intro');
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
        <p className="testo-tenue piccolo">
          Nessuna registrazione necessaria per provarla: si parte su questo dispositivo, l’accesso con Google si aggiunge quando vuoi.
        </p>
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
