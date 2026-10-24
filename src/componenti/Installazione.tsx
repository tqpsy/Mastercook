import { useEffect, useState } from 'react';
import { create } from 'zustand';

interface EventoInstallazione extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** L'evento di Chrome/Android va catturato appena arriva, anche prima di aprire le impostazioni. */
export const useInstallazione = create<{ evento: EventoInstallazione | null }>(() => ({ evento: null }));
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    useInstallazione.setState({ evento: e as EventoInstallazione });
  });
  window.addEventListener('appinstalled', () => useInstallazione.setState({ evento: null }));
}

export function eInstallata(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

const eIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function Installazione() {
  const evento = useInstallazione((s) => s.evento);
  const [installata, setInstallata] = useState(eInstallata);
  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)');
    const cambia = () => setInstallata(eInstallata());
    mq.addEventListener('change', cambia);
    return () => mq.removeEventListener('change', cambia);
  }, []);

  if (installata) return null;
  return (
    <div className="sezione">
      <h2>Installa l’app</h2>
      <div className="riquadro">
        {evento ? (
          <>
            <p>Aggiungi Masterfood alla schermata Home: si apre a tutto schermo e funziona anche senza rete.</p>
            <button
              type="button"
              className="bottone"
              onClick={async () => {
                await evento.prompt();
                await evento.userChoice;
                useInstallazione.setState({ evento: null });
              }}
            >
              Installa Masterfood
            </button>
          </>
        ) : eIos() ? (
          <ol className="passaggi">
            <li>Apri questa pagina con Safari.</li>
            <li>Tocca il pulsante Condividi (il quadrato con la freccia in su).</li>
            <li>Scegli «Aggiungi alla schermata Home» e poi «Aggiungi».</li>
          </ol>
        ) : (
          <ol className="passaggi">
            <li>Apri questa pagina con Chrome.</li>
            <li>Tocca il menu ⋮ in alto a destra.</li>
            <li>Scegli «Installa app» oppure «Aggiungi a schermata Home».</li>
          </ol>
        )}
      </div>
    </div>
  );
}
