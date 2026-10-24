import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { Struttura } from './componenti/Struttura';
import { ProviderNucleo } from './nucleo/contesto';
import { MotoreSync } from './nucleo/sync';
import { leggiNuclei } from './nucleo/registro';
import { Benvenuto } from './pagine/Benvenuto';
import { Casa } from './pagine/Casa';
import { Lista } from './pagine/Lista';
import { Oggi } from './pagine/Oggi';
import { Aggiungi } from './pagine/aggiungi/Aggiungi';
import { AggiungiAMano } from './pagine/aggiungi/AggiungiAMano';
import { FotoDispensa } from './pagine/aggiungi/FotoDispensa';
import { ScansionaCodice } from './pagine/aggiungi/ScansionaCodice';
import { Scontrino } from './pagine/aggiungi/Scontrino';
import { Impostazioni } from './pagine/impostazioni/Impostazioni';
import { Membro } from './pagine/impostazioni/Membro';
import { DettaglioRicetta } from './pagine/ricette/DettaglioRicetta';
import { EditorRicetta } from './pagine/ricette/EditorRicetta';
import { Ricette } from './pagine/ricette/Ricette';
import { useSessione } from './stato/sessione';

const router = createBrowserRouter(
  [
    {
      element: <Struttura />,
      children: [
        { index: true, element: <Oggi /> },
        { path: 'casa', element: <Casa /> },
        { path: 'aggiungi', element: <Aggiungi /> },
        { path: 'aggiungi/mano', element: <AggiungiAMano /> },
        { path: 'aggiungi/codice', element: <ScansionaCodice /> },
        { path: 'aggiungi/scontrino', element: <Scontrino /> },
        { path: 'aggiungi/foto', element: <FotoDispensa /> },
        { path: 'lista', element: <Lista /> },
        { path: 'ricette', element: <Ricette /> },
        { path: 'ricette/nuova', element: <EditorRicetta /> },
        { path: 'ricette/:id', element: <DettaglioRicetta /> },
        { path: 'ricette/:id/modifica', element: <EditorRicetta /> },
        { path: 'impostazioni', element: <Impostazioni /> },
        { path: 'impostazioni/membri/:id', element: <Membro /> },
        { path: '*', element: <Navigate to="/" replace /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' },
);

function Caricamento() {
  return (
    <div className="vuoto" style={{ minHeight: '100dvh', justifyContent: 'center' }}>
      <img src={`${import.meta.env.BASE_URL}pwa-192.png`} alt="" width={72} height={72} style={{ borderRadius: 20 }} />
    </div>
  );
}

export function App() {
  const nucleoId = useSessione((s) => s.nucleoCorrenteId);
  const esistente = nucleoId && leggiNuclei().some((n) => n.id === nucleoId) ? nucleoId : leggiNuclei()[0]?.id;
  if (!esistente) return <Benvenuto />;
  return (
    <ProviderNucleo key={esistente} nucleoId={esistente} attesa={<Caricamento />}>
      <MotoreSync />
      <RouterProvider router={router} />
    </ProviderNucleo>
  );
}
