import { NavLink } from 'react-router-dom';

const SCHEDE = [
  { a: '/', etichetta: 'Oggi', icona: '☀' },
  { a: '/casa', etichetta: 'Casa', icona: '⌂' },
  { a: '/aggiungi', etichetta: 'Aggiungi', icona: '+', principale: true },
  { a: '/lista', etichetta: 'Lista', icona: '☰' },
  { a: '/ricette', etichetta: 'Ricette', icona: '✎' },
] as const;

export function BarraSchede() {
  return (
    <nav className="barra-schede" aria-label="Sezioni">
      {SCHEDE.map((scheda) => (
        <NavLink
          key={scheda.a}
          to={scheda.a}
          end={scheda.a === '/'}
          className={({ isActive }) =>
            ['scheda', 'principale' in scheda ? 'scheda-principale' : '', isActive ? 'attiva' : ''].join(' ')
          }
        >
          <span className="scheda-icona" aria-hidden="true">
            {scheda.icona}
          </span>
          <span className="scheda-etichetta">{scheda.etichetta}</span>
        </NavLink>
      ))}
    </nav>
  );
}
