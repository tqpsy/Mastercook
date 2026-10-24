import { InArrivo } from '../componenti/InArrivo';

const AZIONI = [
  { nome: 'Scansiona codice', descrizione: 'Codice a barre, con i dati di Open Food Facts.' },
  { nome: 'Fotografa scontrino', descrizione: 'Lettura sul telefono con Tesseract.js, la foto non viene salvata.' },
  { nome: 'Foto frigo o dispensa', descrizione: 'Riconoscimento automatico con la tua chiave API, facoltativo.' },
  { nome: 'Aggiungi a mano', descrizione: 'Cerca un prodotto o un ingrediente.' },
];

export function Aggiungi() {
  return (
    <InArrivo titolo="Aggiungi">
      <ul className="elenco-azioni">
        {AZIONI.map((a) => (
          <li key={a.nome}>
            <button type="button" disabled>
              <strong>{a.nome}</strong>
              <span>{a.descrizione}</span>
            </button>
          </li>
        ))}
      </ul>
    </InArrivo>
  );
}
