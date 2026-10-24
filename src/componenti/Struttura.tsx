import { Link, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useNucleo } from '../nucleo/contesto';
import { AggiornamentoPwa } from './AggiornamentoPwa';
import { BarraSchede } from './BarraSchede';
import { IconaImpostazioni } from './Icone';
import { AvvisoFlottante } from './ui';

export function Struttura() {
  const { nucleo } = useNucleo();
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <div className="app">
      <header className="intestazione">
        <Link to="/" className="marchio">
          <img src={`${import.meta.env.BASE_URL}pwa-192.png`} alt="" />
          Masterfood
        </Link>
        <span className="nucleo-nome">{nucleo.nome}</span>
        <Link to="/impostazioni" className="bottone-icona" aria-label="Impostazioni">
          <IconaImpostazioni />
        </Link>
      </header>
      <main className="contenuto">
        <Outlet />
      </main>
      <AggiornamentoPwa />
      <AvvisoFlottante />
      <BarraSchede />
    </div>
  );
}
