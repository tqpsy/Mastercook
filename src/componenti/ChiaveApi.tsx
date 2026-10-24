import { useState } from 'react';
import { leggiChiave, scriviChiave, type Fornitore } from '../piattaforma/chiaviApi';
import { mostraAvviso } from './ui';

const FORNITORI: { id: Fornitore; nome: string; uso: string; guida: string }[] = [
  {
    id: 'gemini',
    nome: 'Google Gemini',
    uso: 'riconosce i prodotti nella foto di frigo e dispensa',
    guida: 'https://aistudio.google.com/app/apikey',
  },
  {
    id: 'vision',
    nome: 'Google Cloud Vision',
    uso: 'legge gli scontrini con più precisione',
    guida: 'https://console.cloud.google.com/apis/library/vision.googleapis.com',
  },
];

export function ChiaveApi() {
  const [valori, setValori] = useState(() => Object.fromEntries(FORNITORI.map((f) => [f.id, leggiChiave(f.id)])) as Record<Fornitore, string>);
  return (
    <div className="sezione">
      <h2>Funzioni avanzate</h2>
      <p className="testo-tenue piccolo">
        Masterfood è gratuita. Il riconoscimento delle foto e la lettura avanzata degli scontrini usano una chiave API tua: le
        chiamate partono da questo telefono verso il fornitore, e Masterfood non vede né la chiave né le foto. Senza chiave
        tutto il resto funziona.
      </p>
      {FORNITORI.map((f) => (
        <form
          key={f.id}
          className="riquadro"
          onSubmit={(e) => {
            e.preventDefault();
            scriviChiave(f.id, valori[f.id].trim());
            mostraAvviso(valori[f.id].trim() ? `Chiave ${f.nome} salvata su questo dispositivo` : `Chiave ${f.nome} rimossa`);
          }}
        >
          <label className="campo">
            <span>{f.nome}</span>
            <input
              type="password"
              autoComplete="off"
              value={valori[f.id]}
              placeholder="Incolla la chiave"
              onChange={(e) => setValori((v) => ({ ...v, [f.id]: e.target.value }))}
            />
            <small>
              Serve a: {f.uso}.{' '}
              <a href={f.guida} target="_blank" rel="noreferrer">
                Come ottenerla
              </a>
            </small>
          </label>
          <button type="submit" className="bottone secondario piccolo" style={{ alignSelf: 'flex-start' }}>
            Salva
          </button>
        </form>
      ))}
    </div>
  );
}
