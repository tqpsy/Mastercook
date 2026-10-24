import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { EtichettaScadenza } from '../componenti/EtichettaScadenza';
import { FoglioArticolo, unitaArticolo } from '../componenti/FoglioArticolo';
import { Vuoto } from '../componenti/ui';
import type { ArticoloValutato } from '../dominio/disponibilita';
import type { Luogo } from '../dominio/tipi';
import { useInventario, useNomeMembro, useOggi } from '../nucleo/derivati';
import { emojiIngrediente } from '../rif/emoji';

const LUOGHI: { id: Luogo; nome: string; emoji: string }[] = [
  { id: 'frigo', nome: 'Frigo', emoji: '🧊' },
  { id: 'freezer', nome: 'Freezer', emoji: '❄️' },
  { id: 'dispensa', nome: 'Dispensa', emoji: '🫙' },
];

export function ElencoArticoli({ articoli, onApri }: { articoli: ArticoloValutato[]; onApri: (v: ArticoloValutato) => void }) {
  const oggi = useOggi();
  const nome = useNomeMembro();
  return (
    <ul className="elenco">
      {articoli.map((v) => (
        <li key={v.articolo.id}>
          <button type="button" className="voce" onClick={() => onApri(v)}>
            <span className="emoji" aria-hidden="true">
              {v.articolo.ricetta_id ? '🍲' : emojiIngrediente(v.articolo.ingrediente_id)}
            </span>
            <span className="voce-testo">
              <span className="voce-titolo">{v.articolo.nome}</span>
              <span className="voce-dettaglio">
                {unitaArticolo(v)} · {nome(v.articolo.creato_da)}
              </span>
            </span>
            <span className="voce-destra">
              <EtichettaScadenza valutato={v} oggi={oggi} />
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function Casa() {
  const [parametri, setParametri] = useSearchParams();
  const luogo = (parametri.get('luogo') as Luogo | null) ?? 'frigo';
  const inventario = useInventario();
  const [aperto, setAperto] = useState<ArticoloValutato | null>(null);
  const articoli = inventario.filter((v) => v.articolo.luogo === luogo);
  const conteggi = Object.fromEntries(LUOGHI.map((l) => [l.id, inventario.filter((v) => v.articolo.luogo === l.id).length]));
  const daControllare = articoli.filter((v) => v.stato === 'scaduto' || v.stato === 'oggi' || v.stato === 'controlla');
  const resto = articoli.filter((v) => !daControllare.includes(v));

  return (
    <section className="pagina">
      <div className="titolo-pagina">
        <h1>Casa</h1>
        <Link className="bottone piccolo" to={`/aggiungi/mano?luogo=${luogo}`}>
          + Aggiungi
        </Link>
      </div>
      <div className="sottoschede" role="tablist">
        {LUOGHI.map((l) => (
          <button
            key={l.id}
            type="button"
            role="tab"
            aria-selected={luogo === l.id}
            className={luogo === l.id ? 'attiva' : ''}
            onClick={() => setParametri({ luogo: l.id }, { replace: true })}
          >
            {l.nome} {conteggi[l.id] ? <span className="testo-tenue">{conteggi[l.id]}</span> : null}
          </button>
        ))}
      </div>

      {articoli.length === 0 ? (
        <Vuoto emoji={LUOGHI.find((l) => l.id === luogo)!.emoji} titolo={`${LUOGHI.find((l) => l.id === luogo)!.nome} vuoto`}>
          <p>Aggiungi quello che hai: a mano, con il codice a barre o dalla lista della spesa.</p>
          <Link className="bottone secondario" to="/aggiungi">
            Aggiungi prodotti
          </Link>
        </Vuoto>
      ) : (
        <>
          {daControllare.length > 0 && (
            <div className="sezione">
              <h2>Da guardare subito</h2>
              <ElencoArticoli articoli={daControllare} onApri={setAperto} />
            </div>
          )}
          {resto.length > 0 && (
            <div className="sezione">
              {daControllare.length > 0 && <h2>Il resto</h2>}
              <ElencoArticoli articoli={resto} onApri={setAperto} />
            </div>
          )}
        </>
      )}
      {aperto && <FoglioArticolo valutato={aperto} onChiudi={() => setAperto(null)} />}
    </section>
  );
}
