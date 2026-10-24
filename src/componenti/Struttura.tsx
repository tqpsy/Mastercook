import { Outlet } from 'react-router-dom';
import { AggiornamentoPwa } from './AggiornamentoPwa';
import { AvvisoConfigurazione } from './AvvisoConfigurazione';
import { BarraSchede } from './BarraSchede';

export function Struttura() {
  return (
    <div className="app">
      <header className="intestazione">
        <span className="marchio">Masterfood</span>
      </header>
      <main className="contenuto">
        <AvvisoConfigurazione />
        <Outlet />
      </main>
      <AggiornamentoPwa />
      <BarraSchede />
    </div>
  );
}
