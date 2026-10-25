import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { googleConfigurato } from '../config';
import { useAccount } from '../nucleo/account';
import { useNucleo } from '../nucleo/contesto';
import { leggiChiave } from '../piattaforma/chiaviApi';
import { attivaAvvisi, notificheSupportate } from '../piattaforma/notifiche';
import { useStatoAvvisi } from './AvvisiScadenza';
import { BottoneGoogle } from './BottoneGoogle';
import { ChiaveApi } from './ChiaveApi';
import { messaggioErroreGoogle, nucleoSuDrive, salvaSuDrive } from './Sincronizzazione';

const CHIAVE_VISTA = 'masterfood:guida';

/** La guida si mostra una volta, e solo se manca ancora qualcosa (Drive o chiave Gemini). */
export function guidaDaMostrare(nucleoId: string): boolean {
  try {
    if (localStorage.getItem(CHIAVE_VISTA)) return false;
  } catch {
    return false;
  }
  return !nucleoSuDrive(nucleoId) || !leggiChiave('gemini');
}

function segnaVista() {
  try {
    localStorage.setItem(CHIAVE_VISTA, new Date().toISOString());
  } catch {
    // archivio non disponibile: la guida ricomparirà
  }
}

const PASSI = 3;

/** Primo avvio guidato: Google Drive, chiave Gemini, prima foto del frigo. */
export function GuidaIniziale({ onFine }: { onFine: () => void }) {
  const ctx = useNucleo();
  const email = useAccount((s) => s.email);
  const naviga = useNavigate();
  const [passo, setPasso] = useState(0);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [suDrive, setSuDrive] = useState(() => nucleoSuDrive(ctx.nucleo.id));
  const { attivi: avvisi, imposta: setAvvisi } = useStatoAvvisi();

  function chiudi(verso?: string) {
    segnaVista();
    onFine();
    if (verso) naviga(verso);
  }
  const avanti = () => setPasso((p) => p + 1);

  return (
    <div className="guida" role="dialog" aria-modal="true" aria-label="Primi passi">
      <main className="benvenuto">
        <div className="guida-testa">
          <span className="testo-tenue piccolo">
            Passo {passo + 1} di {PASSI}
          </span>
          <button type="button" className="bottone-testo" onClick={() => chiudi()}>
            Salta la guida
          </button>
        </div>
        <div className="guida-punti" aria-hidden="true">
          {Array.from({ length: PASSI }, (_, i) => (
            <span key={i} className={i <= passo ? 'attivo' : ''} />
          ))}
        </div>

        {passo === 0 && (
          <>
            <div className="saluto">
              <h1>☁️ Salva su Google Drive</h1>
              <p className="sottotitolo">
                Accedi con Google: i dati si salvano cifrati sul tuo Drive, non li perdi se cambi telefono e puoi invitare la famiglia.
              </p>
            </div>
            {suDrive ? (
              <p className="esito-ok">✓ Il nucleo è già salvato sul Google Drive.</p>
            ) : googleConfigurato() ? (
              <BottoneGoogle
                testo={inCorso ? 'Salvo su Drive…' : 'Accedi e salva su Drive'}
                disabled={inCorso}
                onClick={async () => {
                  setInCorso(true);
                  setErrore(null);
                  try {
                    await salvaSuDrive(ctx, email);
                    setSuDrive(true);
                  } catch (e) {
                    setErrore(messaggioErroreGoogle(e));
                  } finally {
                    setInCorso(false);
                  }
                }}
              />
            ) : null}
            {errore && <p className="esito-errore">{errore}</p>}
            <button type="button" className={suDrive ? 'bottone pieno' : 'bottone secondario'} onClick={avanti}>
              {suDrive ? 'Avanti' : 'Lo faccio dopo'}
            </button>
          </>
        )}

        {passo === 1 && (
          <>
            <div className="saluto">
              <h1>🔑 La chiave Gemini</h1>
              <p className="sottotitolo">
                Serve a riconoscere i prodotti nelle foto. È gratuita e senza carta: aprila con il link qui sotto, tocca «Create API key»,
                copiala e incollala qui.
              </p>
            </div>
            <ChiaveApi compatta />
            <button type="button" className="bottone pieno" onClick={avanti}>
              Avanti
            </button>
          </>
        )}

        {passo === 2 && (
          <>
            <div className="saluto">
              <h1>📸 Fotografa il frigo</h1>
              <p className="sottotitolo">
                Una foto per ripiano, cassetto e portiera: Masterfood riconosce i prodotti e ti dice cosa usare prima. Poi fai lo stesso con
                freezer e dispensa.
              </p>
            </div>
            {notificheSupportate() && (
              <div className="riquadro">
                <p>
                  <strong>🔔 Avvisi di scadenza</strong>
                </p>
                <p className="testo-tenue piccolo">Una notifica quando qualcosa scade oggi o domani, con una ricetta per usarlo.</p>
                {avvisi ? (
                  <p className="esito-ok">✓ Attivi</p>
                ) : (
                  <button type="button" className="bottone secondario piccolo" onClick={async () => setAvvisi((await attivaAvvisi()) !== 'negati')}>
                    Attiva gli avvisi
                  </button>
                )}
              </div>
            )}
            <div className="azioni colonna">
              <button type="button" className="bottone pieno" onClick={() => chiudi('/aggiungi/foto')}>
                Fotografa il frigo
              </button>
              <button type="button" className="bottone-testo" onClick={() => chiudi()}>
                Inizia senza foto
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
