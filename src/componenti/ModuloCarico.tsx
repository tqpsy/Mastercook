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
  quantita: number;
  luogo?: Luogo;
  origine: OrigineArticolo;
}

/** Quantità, luogo e scadenza di un articolo prima di metterlo in casa. */
export function ModuloCarico({ carico, onFatto, onAnnulla }: { carico: Carico; onFatto: (nome: string) => void; onAnnulla: () => void }) {
  const ctx = useNucleo();
  const oggi = useOggi();
  const ing = carico.ingrediente;
  const [quantita, setQuantita] = useState(carico.quantita);
  const [luogo, setLuogo] = useState<Luogo>(carico.luogo ?? ing?.luogo ?? 'dispensa');
  const stimata = scadenzaStimata(ing?.id, luogo);
  const [scadenza, setScadenza] = useState('');
  const [tipo, setTipo] = useState<Exclude<TipoScadenza, 'stimata'>>('entro');
  const [prezzo, setPrezzo] = useState('');
  const passo = carico.unita === 'pz' ? 1 : ing?.formato && ing.formato <= 250 ? ing.formato : 50;

  function salva(e: FormEvent) {
    e.preventDefault();
    if (quantita <= 0) return;
    const euro = Number(prezzo.replace(',', '.'));
    aggiungiArticolo(ctx, {
      nome: carico.nome,
      ingrediente_id: ing?.id,
      prodotto_id: carico.prodotto_id,
      unita: carico.unita,
      quantita,
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
      <label className="campo">
        <span>Quantità ({carico.unita === 'pz' ? 'pezzi' : carico.unita})</span>
        <PassoQuantita valore={quantita} onCambia={setQuantita} passo={passo} etichetta="Quantità" />
        {ing && carico.unita !== 'pz' && quantita > 0 && <small>{formattaQuantita(quantita, carico.unita, ing)}</small>}
      </label>
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
        <button type="submit" className="bottone" disabled={quantita <= 0}>
          Metti in {NOMI_LUOGO[luogo].toLowerCase()}
        </button>
        <button type="button" className="bottone secondario" onClick={onAnnulla}>
          Annulla
        </button>
      </div>
    </form>
  );
}
