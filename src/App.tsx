import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { Struttura } from './componenti/Struttura';
import { Aggiungi } from './pagine/Aggiungi';
import { Casa } from './pagine/Casa';
import { Lista } from './pagine/Lista';
import { Oggi } from './pagine/Oggi';
import { Ricette } from './pagine/Ricette';

const router = createBrowserRouter([
  {
    element: <Struttura />,
    children: [
      { index: true, element: <Oggi /> },
      { path: 'casa', element: <Casa /> },
      { path: 'aggiungi', element: <Aggiungi /> },
      { path: 'lista', element: <Lista /> },
      { path: 'ricette', element: <Ricette /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
