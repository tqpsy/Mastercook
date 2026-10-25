/**
 * Controllo manuale degli aggiornamenti dell'app (pulsante in Impostazioni). Chiede al
 * service worker di cercare una versione nuova; se c'è la attiva e ricarica la pagina.
 * I dati stanno in IndexedDB e non vengono toccati.
 */
export type EsitoAggiornamento = 'aggiornata' | 'in_arrivo' | 'offline';

function attendiInstallato(sw: ServiceWorker): Promise<void> {
  return new Promise((ok) => {
    if (sw.state === 'installed' || sw.state === 'activated') return ok();
    sw.addEventListener('statechange', () => (sw.state === 'installed' || sw.state === 'activated') && ok());
  });
}

export async function cercaAggiornamento(): Promise<EsitoAggiornamento> {
  if (!navigator.onLine) return 'offline';
  const registrazione = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
  if (!registrazione) {
    // Senza service worker (es. in sviluppo) basta ricaricare.
    location.reload();
    return 'in_arrivo';
  }
  await registrazione.update();
  if (registrazione.installing) await attendiInstallato(registrazione.installing);
  const nuova = registrazione.waiting;
  if (!nuova) return 'aggiornata';
  navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
  nuova.postMessage({ type: 'SKIP_WAITING' });
  return 'in_arrivo';
}
