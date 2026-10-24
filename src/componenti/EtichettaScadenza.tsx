import { descriviData } from '../dominio/date';
import type { ArticoloValutato } from '../dominio/disponibilita';

export function EtichettaScadenza({ valutato, oggi }: { valutato: ArticoloValutato; oggi: string }) {
  const { stato, scadenza } = valutato;
  if (!scadenza || stato === 'senza_data') return <span className="etichetta">senza scadenza</span>;
  const quando = descriviData(scadenza, oggi);
  switch (stato) {
    case 'scaduto':
      return <span className="etichetta pericolo">scaduto {quando}</span>;
    case 'controlla':
      return <span className="etichetta attenzione">da controllare</span>;
    case 'oggi':
      return <span className="etichetta pericolo">scade oggi</span>;
    case 'in_scadenza':
      return <span className="etichetta attenzione">scade {quando}</span>;
    default:
      return <span className="etichetta ok">{quando.startsWith('tra') || quando === 'domani' ? quando : `al ${quando}`}</span>;
  }
}
