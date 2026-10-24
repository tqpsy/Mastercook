import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const OGNI_MEZZ_ORA = 30 * 60 * 1000;

/**
 * Tiene l'app aggiornata senza reinstallarla: cerca nuove versioni all'avvio, ogni mezz'ora
 * e quando l'app torna in primo piano. Se l'app è in uso mostra l'avviso; appena va in
 * secondo piano si aggiorna da sola, così non interrompe chi sta compilando qualcosa.
 * I dati stanno in IndexedDB e non vengono toccati dall'aggiornamento.
 */
export function AggiornamentoPwa() {
  const {
    offlineReady: [prontaOffline, setProntaOffline],
    needRefresh: [daAggiornare, setDaAggiornare],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registrazione) {
      if (!registrazione) return;
      const controlla = () => {
        if (navigator.onLine) registrazione.update().catch(() => {});
      };
      setInterval(controlla, OGNI_MEZZ_ORA);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') controlla();
      });
    },
  });

  useEffect(() => {
    if (!daAggiornare) return;
    const inSecondoPiano = () => {
      if (document.visibilityState === 'hidden') updateServiceWorker(true);
    };
    document.addEventListener('visibilitychange', inSecondoPiano);
    return () => document.removeEventListener('visibilitychange', inSecondoPiano);
  }, [daAggiornare, updateServiceWorker]);

  if (!prontaOffline && !daAggiornare) return null;

  return (
    <div className="avviso-pwa" role="status">
      <span>{daAggiornare ? 'È disponibile una nuova versione.' : 'Masterfood ora funziona anche offline.'}</span>
      {daAggiornare && (
        <button type="button" onClick={() => updateServiceWorker(true)}>
          Aggiorna ora
        </button>
      )}
      <button
        type="button"
        className="secondario"
        onClick={() => {
          setProntaOffline(false);
          setDaAggiornare(false);
        }}
      >
        Chiudi
      </button>
    </div>
  );
}
