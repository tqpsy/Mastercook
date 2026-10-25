import '@fontsource-variable/fraunces';
import '@fontsource-variable/figtree';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';
import { applicaTema, useTema } from './stato/tema';

// Prima del primo disegno, così l'app non lampeggia nel tema sbagliato.
applicaTema(useTema.getState().tema);

// Chiede al browser di non cancellare i dati locali quando manca spazio (importante su iOS).
navigator.storage?.persist?.().catch(() => {});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
