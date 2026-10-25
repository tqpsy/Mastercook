import { useEffect, useState } from 'react';
import { leggiChiave } from '../piattaforma/chiaviApi';
import { impostaLimite, oraAzzeramento, ricaricaQuota, useQuotaGemini } from '../piattaforma/quotaGemini';

/** Il messaggio per chi ha finito la prova gratuita del giorno. */
export const messaggioQuotaFinita = () =>
  `Prova gratuita di Gemini terminata per oggi. Si riattiva alle ${oraAzzeramento()}.`;

/**
 * Quanto si è usato oggi della prova gratuita di Gemini, con la barra che si riempie.
 * `modificabile`: permette di correggere il limite leggendolo su AI Studio.
 */
export function QuotaGemini({ modificabile = false }: { modificabile?: boolean }) {
  const { usate, limite, esaurita } = useQuotaGemini();
  const [modifica, setModifica] = useState(false);
  // A cavallo della mezzanotte di Google il conteggio torna a zero anche con la pagina aperta.
  useEffect(() => {
    ricaricaQuota();
    const t = setInterval(ricaricaQuota, 60_000);
    return () => clearInterval(t);
  }, []);
  if (!leggiChiave('gemini')) return null;
  const rimaste = esaurita ? 0 : Math.max(0, limite - usate);
  const quota = Math.min(1, esaurita ? 1 : usate / limite);
  return (
    <div className="riquadro quota-gemini">
      <div className="quota-gemini-testa">
        <span>Prova gratuita di Gemini oggi</span>
        <strong>{rimaste === 0 ? 'Terminata' : `${rimaste === 1 ? 'resta 1 analisi' : `restano ${rimaste} analisi`}`}</strong>
      </div>
      <div
        className={`progresso${quota >= 1 ? ' pieno' : quota >= 0.75 ? ' quasi' : ''}`}
        role="meter"
        aria-label="Analisi Gemini usate oggi"
        aria-valuemin={0}
        aria-valuemax={limite}
        aria-valuenow={Math.min(usate, limite)}
        aria-valuetext={`${Math.min(usate, limite)} di ${limite}`}
      >
        <span style={{ width: `${Math.round(quota * 100)}%` }} />
      </div>
      <p className="testo-tenue piccolo">
        {Math.min(usate, limite)} di circa {limite} usate su questo telefono · si azzera alle {oraAzzeramento()}.
        {modificabile && !modifica && (
          <>
            {' '}
            <button type="button" className="link" onClick={() => setModifica(true)}>
              Cambia limite
            </button>
          </>
        )}
      </p>
      {modifica && (
        <form
          className="azioni"
          style={{ alignItems: 'flex-end' }}
          onSubmit={(e) => {
            e.preventDefault();
            impostaLimite(Number(new FormData(e.currentTarget).get('limite')));
            setModifica(false);
          }}
        >
          <label className="campo" style={{ flex: 1 }}>
            <span>Richieste al giorno (RPD)</span>
            <input name="limite" type="number" inputMode="numeric" min={1} defaultValue={limite} />
            <small>
              Il numero esatto per il tuo account è su{' '}
              <a href="https://aistudio.google.com/rate-limit" target="_blank" rel="noreferrer">
                AI Studio → Limiti di frequenza
              </a>
              , alla riga di Gemini 2.5 Flash.
            </small>
          </label>
          <button type="submit" className="bottone secondario piccolo">
            Salva
          </button>
        </form>
      )}
    </div>
  );
}
