import { Link, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { riduciDateDiNascita, svuotaCestinoScaduto } from '../nucleo/azioni';
import { useNucleo } from '../nucleo/contesto';
import { preparaOcrOffline } from '../piattaforma/ocr';
import { AggiornamentoPwa } from './AggiornamentoPwa';
import { usePromemoriaScadenze } from './AvvisiScadenza';
import { AvvisoSync } from './AvvisoSync';
import { BarraSchede } from './BarraSchede';
import { GuidaIniziale, guidaDaMostrare } from './GuidaIniziale';
import { IconaImpostazioni } from './Icone';
import { AvvisoFlottante } from './ui';

export function Struttura() {
  const ctx = useNucleo();
  const { nucleo } = ctx;
  const { pathname } = useLocation();
  usePromemoriaScadenze();
  const [guida, setGuida] = useState(() => guidaDaMostrare(nucleo.id));
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  // Una volta per apertura: via dal cestino ciò che ha più di 30 giorni, solo l'anno di nascita nei profili, e motore degli scontrini pronto anche offline.
  useEffect(() => {
    svuotaCestinoScaduto(ctx);
    riduciDateDiNascita(ctx);
    preparaOcrOffline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nucleo.id]);
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
      <AvvisoSync />
      <AvvisoFlottante />
      <BarraSchede />
      {guida && <GuidaIniziale onFine={() => setGuida(false)} />}
    </div>
  );
}
