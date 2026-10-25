import { useEffect, useState } from 'react';
import { leggiChiave } from '../piattaforma/chiaviApi';
import { usePausaGemini } from '../piattaforma/gemini';
import { impostaLimite, MODELLI_GEMINI, modelloInUso, NOMI_MODELLI, oraAzzeramento, ricaricaQuota, useQuotaGemini } from '../piattaforma/quotaGemini';

/** Il messaggio per chi ha finito la prova gratuita del giorno. */
export const messaggioQuotaFinita = () =>
  `Prova gratuita di Gemini terminata per oggi. Si riattiva alle ${oraAzzeramento()}.`;

/**
 * Quanto si è usato oggi della prova gratuita di Gemini, con la barra che si riempie.
 * `modificabile`: permette di correggere il limite leggendolo su AI Studio.
 */
export function QuotaGemini({ modificabile = false }: { modificabile?: boolean }) {
  const stato = useQuotaGemini();
  const { limite, esaurita } = stato;
  const inUso = modelloInUso(stato);
  const ultimo = inUso.numero === MODELLI_GEMINI.length;
  const pausaFino = usePausaGemini((p) => p.fino);
  const [adesso, setAdesso] = useState(() => Date.now());
  const [modifica, setModifica] = useState(false);
  // A cavallo della mezzanotte di Google il conteggio torna a zero anche con la pagina aperta.
  useEffect(() => {
    ricaricaQuota();
    const t = setInterval(ricaricaQuota, 60_000);
    return () => clearInterval(t);
  }, []);
  // Il conto alla rovescia della pausa chiesta da Google.
  useEffect(() => {
    if (!pausaFino) return;
    const t = setInterval(() => setAdesso(Date.now()), 1000);
    return () => clearInterval(t);
  }, [pausaFino]);
  if (!leggiChiave('gemini')) return null;
  // La barra è del modello in uso: piena, si passa al successivo.
  const quota = esaurita ? 1 : Math.min(1, inUso.usate / inUso.limite);
  const percentuale = Math.round(quota * 100);
  return (
    <div className="riquadro quota-gemini">
      <div className="quota-gemini-testa">
        <span>
          Gemini oggi · modello {inUso.numero} di {MODELLI_GEMINI.length}
        </span>
        <strong>{esaurita ? 'Terminata' : `${percentuale}% usato`}</strong>
      </div>
      <div
        className={`progresso${quota >= 1 ? ' pieno' : quota >= 0.75 ? ' quasi' : ''}`}
        role="meter"
        aria-label={`Analisi usate oggi con il modello ${inUso.numero} di ${MODELLI_GEMINI.length}`}
        aria-valuemin={0}
        aria-valuemax={inUso.limite}
        aria-valuenow={Math.min(inUso.usate, inUso.limite)}
        aria-valuetext={`${percentuale}%, ${Math.min(inUso.usate, inUso.limite)} di ${inUso.limite}`}
      >
        <span style={{ width: `${percentuale}%` }} />
      </div>
      {pausaFino && (
        <p className="piccolo" role="status">
          Gemini chiede una breve pausa (limite al minuto): riprendo da solo tra {Math.min(60, Math.max(1, Math.ceil((pausaFino - adesso) / 1000)))} s.
        </p>
      )}
      <p className="testo-tenue piccolo">
        {esaurita
          ? `Finite le analisi gratuite di tutti i modelli. `
          : `${NOMI_MODELLI[inUso.modello] ?? inUso.modello}: ${Math.min(inUso.usate, inUso.limite)} di circa ${inUso.limite} analisi. ${
              ultimo ? 'È l’ultimo modello disponibile. ' : `Poi passo da solo al modello ${inUso.numero + 1}. `
            }`}
        Si azzera tutto alle {oraAzzeramento()}.
        {modificabile && !modifica && inUso.numero === 1 && (
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
