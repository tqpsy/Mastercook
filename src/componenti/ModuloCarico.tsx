import { useState, type FormEvent } from 'react';
import { descriviData } from '../dominio/date';
import { formattaQuantita } from '../dominio/formato';
import type { Luogo, OrigineArticolo, TipoScadenza, UnitaCanonica } from '../dominio/tipi';
import { useNucleo } from '../nucleo/contesto';
import { aggiungiArticolo, scadenzaStimata } from '../nucleo/azioni';
import { useOggi } from '../nucleo/derivati';
import type { Ingrediente } from '../rif/ingredienti';
import { Chip, PassoQuantita } from './ui';

export const NOMI_LUOGO: Record<Luogo, string> = { frigo: 'Frigo', freezer: 'Freezer', dispensa: 'Dispensa' };

export interface Carico {
  nome: string;
  ingrediente?: Ingrediente;
  prodotto_id?: string;
  unita: UnitaCanonica;
  /** Per i pezzi il numero di pezzi; per peso e volume quanto contiene una confezione. */
  quantita: number;
  /** Quante confezioni uguali (solo peso e volume): 1 se assente. */
  confezioni?: number;
  luogo?: Luogo;
  origine: OrigineArticolo;
}

/** Quantità, luogo e scadenza di un articolo prima di metterlo in casa. */
export function ModuloCarico({ carico, onFatto, onAnnulla }: { carico: Carico; onFatto: (nome: string) => void; onAnnulla: () => void }) {
  const ctx = useNucleo();
  const oggi = useOggi();
  const ing = carico.ingrediente;
  const [quantita, setQuantita] = useState(carico.quantita);
  const aConfezioni = carico.unita !== 'pz';
  const [confezioni, setConfezioni] = useState(aConfezioni ? (carico.confezioni ?? 1) : 1);
  // Carote, patate… si possono contare a pezzi sfusi invece che a confezioni.
  const pesoPezzo = carico.unita === 'g' ? ing?.peso_pz : undefined;
  const [sfusi, setSfusi] = useState(false);
  const [luogo, setLuogo] = useState<Luogo>(carico.luogo ?? ing?.luogo ?? 'dispensa');
  const stimata = scadenzaStimata(ing?.id, luogo);
  const [scadenza, setScadenza] = useState('');
  const [tipo, setTipo] = useState<Exclude<TipoScadenza, 'stimata'>>('entro');
  const [prezzo, setPrezzo] = useState('');
  const passo = carico.unita === 'pz' ? 1 : ing?.formato && ing.formato <= 250 ? ing.formato : 50;

  function salva(e: FormEvent) {
    e.preventDefault();
    if (quantita <= 0 || confezioni <= 0) return;
    const euro = Number(prezzo.replace(',', '.'));
    aggiungiArticolo(ctx, {
      nome: carico.nome,
      ingrediente_id: ing?.id,
      prodotto_id: carico.prodotto_id,
      unita: carico.unita,
      quantita: (sfusi && pesoPezzo ? pesoPezzo : quantita) * confezioni,
      confezione: aConfezioni ? (sfusi && pesoPezzo ? pesoPezzo : quantita) : undefined,
      unisci: true,
      luogo,
      data_scadenza: scadenza || stimata,
      tipo_scadenza: scadenza ? tipo : stimata ? 'stimata' : undefined,
      origine: carico.origine,
      prezzo: euro > 0 ? euro : undefined,
    });
    onFatto(carico.nome);
  }

  return (
    <form className="sezione" onSubmit={salva}>
      {aConfezioni ? (
        <>
          {pesoPezzo && (
            <div className="chips">
              <Chip attivo={!sfusi} onClick={() => (setSfusi(false), setConfezioni(carico.confezioni ?? 1))}>
                In confezione
              </Chip>
              <Chip attivo={sfusi} onClick={() => (setSfusi(true), setConfezioni(Math.max(1, Math.round(quantita / pesoPezzo))))}>
                Sfusi, a pezzi
              </Chip>
            </div>
          )}
          <label className="campo">
            <span>{sfusi ? 'Quanti pezzi' : 'Quante confezioni'}</span>
            <PassoQuantita valore={confezioni} onCambia={(v) => setConfezioni(Math.round(v))} passo={1} etichetta={sfusi ? 'Quanti pezzi' : 'Quante confezioni'} />
            {sfusi && pesoPezzo && <small>Circa {formattaQuantita(pesoPezzo * confezioni, 'g')}</small>}
          </label>
          {!sfusi && (
<label className="campo">
            <span>Ogni confezione ({carico.unita})</span>
            <PassoQuantita valore={quantita} onCambia={setQuantita} passo={passo} etichetta={`Ogni confezione in ${carico.unita}`} />
            {quantita > 0 && confezioni > 0 && (
              <small>
                {confezioni > 1 ? `${confezioni} × ${formattaQuantita(quantita, carico.unita)} = ` : ''}
                {formattaQuantita(quantita * confezioni, carico.unita, ing)}
              </small>
            )}
          </label>
)}
        </>
      ) : (
        <label className="campo">
          <span>Quanti pezzi</span>
          <PassoQuantita valore={quantita} onCambia={setQuantita} passo={passo} etichetta="Quanti pezzi" />
        </label>
      )}
      <fieldset className="campo">
        <legend>Dove lo metti</legend>
        <div className="chips">
          {(Object.keys(NOMI_LUOGO) as Luogo[]).map((l) => (
            <Chip key={l} attivo={luogo === l} onClick={() => setLuogo(l)}>
              {NOMI_LUOGO[l]}
            </Chip>
          ))}
        </div>
      </fieldset>
      <label className="campo">
        <span>Scadenza sulla confezione</span>
        <input type="date" value={scadenza} min={oggi} onChange={(e) => setScadenza(e.target.value)} />
        <small>{scadenza ? '' : stimata ? `Se la lasci vuota la stimiamo: ${descriviData(stimata, oggi)}.` : 'Facoltativa.'}</small>
      </label>
      {scadenza && (
        <div className="chips">
          <Chip attivo={tipo === 'entro'} onClick={() => setTipo('entro')}>
            Da consumare entro
          </Chip>
          <Chip attivo={tipo === 'preferibilmente'} onClick={() => setTipo('preferibilmente')}>
            Preferibilmente entro
          </Chip>
        </div>
      )}
      <label className="campo">
        <span>Prezzo pagato (facoltativo)</span>
        <input inputMode="decimal" value={prezzo} onChange={(e) => setPrezzo(e.target.value)} placeholder="Es. 1,29" />
      </label>
      <div className="azioni">
        <button type="submit" className="bottone" disabled={quantita <= 0 || confezioni <= 0}>
          Metti in {NOMI_LUOGO[luogo].toLowerCase()}
        </button>
        <button type="button" className="bottone secondario" onClick={onAnnulla}>
          Annulla
        </button>
      </div>
    </form>
  );
}
