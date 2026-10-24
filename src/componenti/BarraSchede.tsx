import { NavLink } from 'react-router-dom';
import { IconaCasa, IconaLista, IconaOggi, IconaPiu, IconaRicette } from './Icone';

const SCHEDE = [
  { a: '/', etichetta: 'Oggi', Icona: IconaOggi },
  { a: '/casa', etichetta: 'Casa', Icona: IconaCasa },
  { a: '/aggiungi', etichetta: 'Aggiungi', Icona: IconaPiu, principale: true },
  { a: '/lista', etichetta: 'Lista', Icona: IconaLista },
  { a: '/ricette', etichetta: 'Ricette', Icona: IconaRicette },
] as const;

export function BarraSchede() {
  return (
    <nav className="barra-schede" aria-label="Sezioni">
      {SCHEDE.map(({ a, etichetta, Icona, ...resto }) => (
        <NavLink
          key={a}
          to={a}
          end={a === '/'}
          className={({ isActive }) => ['scheda', 'principale' in resto ? 'scheda-principale' : '', isActive ? 'attiva' : ''].join(' ')}
        >
          <span className="scheda-icona">
            <Icona />
          </span>
          <span className="scheda-etichetta">{etichetta}</span>
        </NavLink>
      ))}
    </nav>
  );
}
