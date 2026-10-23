import { useRegisterSW } from 'virtual:pwa-register/react';

/** Avvisa quando è pronta una nuova versione dell'app o quando funziona offline. */
export function AggiornamentoPwa() {
  const {
    offlineReady: [prontaOffline, setProntaOffline],
    needRefresh: [daAggiornare, setDaAggiornare],
    updateServiceWorker,
  } = useRegisterSW();

  if (!prontaOffline && !daAggiornare) return null;

  return (
    <div className="avviso-pwa" role="status">
      <span>{daAggiornare ? 'È disponibile una nuova versione.' : 'Masterfood ora funziona anche offline.'}</span>
      {daAggiornare && (
        <button type="button" onClick={() => updateServiceWorker(true)}>
          Aggiorna
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
