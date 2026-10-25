import { Link } from 'react-router-dom';
import { IconaCodice, IconaFotocamera, IconaMatita, IconaScontrino } from '../../componenti/Icone';

const AZIONI = [
  { a: '/aggiungi/codice', icona: IconaCodice, nome: 'Scansiona il codice a barre', descrizione: 'Il modo più veloce per un prodotto confezionato.' },
  { a: '/aggiungi/scontrino', icona: IconaScontrino, nome: 'Scontrino', descrizione: 'Fotografalo o inquadra il QR code: aggiunge tutta la spesa.' },
  { a: '/aggiungi/mano', icona: IconaMatita, nome: 'Aggiungi a mano', descrizione: 'Cerca un ingrediente e scegli quanto.' },
  { a: '/aggiungi/foto', icona: IconaFotocamera, nome: 'Foto di frigo, freezer e dispensa', descrizione: 'Per ricordarti cosa c’è quando sei al supermercato.' },
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
