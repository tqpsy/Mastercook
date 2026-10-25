import { useState } from 'react';
import { consensoGiaDato } from '../piattaforma/google';
import { Foglio } from './ui';

/**
 * Pulsante "Accedi con Google" nello stile indicato da Google (logo a colori su fondo chiaro).
 * La prima volta spiega prima cosa chiederà Google, perché quella schermata spaventa chi non la conosce.
 */
export function BottoneGoogle({ testo, onClick, disabled }: { testo: string; onClick: () => void; disabled?: boolean }) {
  const [spiegazione, setSpiegazione] = useState(false);
  return (
    <>
      <button type="button" className="bottone-google" onClick={() => (consensoGiaDato() ? onClick() : setSpiegazione(true))} disabled={disabled}>
        <LogoGoogle />
        <span>{testo}</span>
      </button>
      {spiegazione && (
        <Foglio titolo="Prima di continuare" onChiudi={() => setSpiegazione(false)}>
          <SpiegazioneGoogle />
          <button
            type="button"
            className="bottone-google"
            onClick={() => {
              setSpiegazione(false);
              onClick();
            }}
          >
            <LogoGoogle />
            <span>Ho capito, continua con Google</span>
          </button>
        </Foglio>
      )}
    </>
  );
}

/** Cosa mostra Google e cosa vuol dire, in parole semplici. */
export function SpiegazioneGoogle() {
  return (
    <div className="spiegazione-google">
      <p>
        Google ti chiederà il permesso per Masterfood. Se compare il nome <strong>«tqpsy.github.io»</strong> va bene: è l’indirizzo dove è
        pubblicata l’app.
      </p>
      <ol>
        <li>
          Spunta <strong>«Seleziona tutto»</strong>, poi tocca <strong>Continua</strong>.
        </li>
        <li>
          Le due caselle riguardano <strong>solo i file creati da Masterfood</strong>: la cartella «Masterfood» e un’area nascosta dell’app.
        </li>
      </ol>
      <ul className="punti">
        <li>
          <span className="emoji" aria-hidden="true">
            🔒
          </span>
          <span>Masterfood non può vedere, aprire né cancellare le tue foto, i tuoi documenti o gli altri file di Drive.</span>
        </li>
        <li>
          <span className="emoji" aria-hidden="true">
            🔐
          </span>
          <span>I dati salvati sono cifrati: nemmeno lo sviluppatore può leggerli.</span>
        </li>
        <li>
          <span className="emoji" aria-hidden="true">
            ↩️
          </span>
          <span>Puoi togliere l’accesso quando vuoi da Account Google → Sicurezza → App di terze parti.</span>
        </li>
      </ul>
    </div>
  );
}

function LogoGoogle() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
