import { useEffect, useRef, useState } from 'react';
import { accedi } from '../nucleo/account';
import { mostraPulsanteGoogle } from '../piattaforma/google';

/** Pulsante ufficiale "Continua con Google" che apre la sessione Supabase. */
export function AccessoGoogle({ onAccesso }: { onAccesso?: () => void }) {
  const contenitore = useRef<HTMLDivElement>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  useEffect(() => {
    if (!contenitore.current) return;
    mostraPulsanteGoogle(contenitore.current, async (idToken, nonce) => {
      setInCorso(true);
      setErrore(null);
      try {
        await accedi(idToken, nonce);
        onAccesso?.();
      } catch (e) {
        setErrore(
          e instanceof Error && /provider|not enabled|unsupported/i.test(e.message)
            ? 'Accesso con Google non ancora attivo su Supabase: controlla il passo 4 della guida.'
            : 'Accesso non riuscito, riprova.',
        );
      } finally {
        setInCorso(false);
      }
    }).catch(() => setErrore('Non riesco a caricare l’accesso Google: controlla la connessione.'));
  }, [onAccesso]);

  return (
    <div className="accesso-google">
      <div ref={contenitore} />
      {inCorso && <p className="testo-tenue piccolo">Accesso in corso…</p>}
      {errore && <p className="esito-errore">{errore}</p>}
    </div>
  );
}
