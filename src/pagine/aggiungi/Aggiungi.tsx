import { Link } from 'react-router-dom';
import { IconaCodice, IconaFotocamera, IconaMatita, IconaScontrino } from '../../componenti/Icone';

const AZIONI = [
  { a: '/aggiungi/codice', icona: IconaCodice, nome: 'Scansiona il codice a barre', descrizione: 'Il modo più veloce: nome, formato e allergeni arrivano da Open Food Facts.' },
  { a: '/aggiungi/scontrino', icona: IconaScontrino, nome: 'Fotografa lo scontrino', descrizione: 'Letto sul telefono, la foto non viene salvata. Controlli tu le righe prima di aggiungerle.' },
  { a: '/aggiungi/mano', icona: IconaMatita, nome: 'Aggiungi a mano', descrizione: 'Cerca un ingrediente e indica quantità e scadenza.' },
  { a: '/aggiungi/foto', icona: IconaFotocamera, nome: 'Foto di frigo o dispensa', descrizione: 'Tieni una foto aggiornata di cosa c’è; il riconoscimento automatico usa la tua chiave API.' },
];

export function Aggiungi() {
  return (
    <section className="pagina">
      <div className="saluto">
        <h1>Aggiungi</h1>
        <p className="sottotitolo">Cosa hai portato a casa?</p>
      </div>
      <ul className="elenco">
        {AZIONI.map((a) => (
          <li key={a.a}>
            <Link className="voce" to={a.a}>
              <span className="emoji" aria-hidden="true">
                <a.icona width={22} height={22} />
              </span>
              <span className="voce-testo">
                <span className="voce-titolo">{a.nome}</span>
                <span className="voce-dettaglio">{a.descrizione}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
