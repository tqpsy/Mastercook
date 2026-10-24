import { riprendiSync, useSync } from '../nucleo/sync';
import { mostraAvviso } from './ui';

/** Banner quando la sincronizzazione con Drive aspetta un nuovo permesso di Google. */
export function AvvisoSync() {
  const stato = useSync((s) => s.stato);
  if (stato !== 'pausa') return null;
  return (
    <div className="avviso-pwa" role="status">
      <span>Sincronizzazione con Drive in pausa.</span>
      <button type="button" onClick={() => riprendiSync().catch(() => mostraAvviso('Permesso non concesso'))}>
        Riprendi
      </button>
    </div>
  );
}
