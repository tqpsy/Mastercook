import { Link } from 'react-router-dom';
import { IconaIndietro } from './Icone';

export function TornaIndietro({ a, testo = 'Indietro' }: { a: string; testo?: string }) {
  return (
    <Link to={a} className="bottone-testo" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, alignSelf: 'flex-start', textDecoration: 'none' }}>
      <IconaIndietro width={18} height={18} /> {testo}
    </Link>
  );
}
