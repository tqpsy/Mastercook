import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Chip, Vuoto } from '../../componenti/ui';
import { normalizza } from '../../dominio/ricerca';
import { suggerisci, type Suggerimento } from '../../dominio/suggerimenti';
import type { Portata } from '../../dominio/tipi';
import { useContestoSuggerimenti, useMembri, useRicette } from '../../nucleo/derivati';
import { EMOJI_PORTATA, NOME_PORTATA } from '../../rif/emoji';
import { useSessione } from '../../stato/sessione';

export function CartaRicetta({ s }: { s: Suggerimento }) {
  return (
    <Link className="carta-ricetta" to={`/ricette/${encodeURIComponent(s.ricetta.id)}`}>
      <span className="emoji" aria-hidden="true">
        {EMOJI_PORTATA[s.ricetta.portata]}
      </span>
      <span className="carta-ricetta-testo">
        <h3>{s.ricetta.titolo}</h3>
        <span className="motivi">
          {s.esclusione ?? s.motivi.slice(0, 2).join(' · ')}
        </span>
        {!s.esclusione && (
          <span className="barra-copertura" aria-label={`Hai il ${Math.round(s.copertura * 100)}% degli ingredienti`}>
            <span style={{ width: `${Math.round(s.copertura * 100)}%` }} />
          </span>
        )}
      </span>
      <span className="voce-destra">
        <span>{s.ricetta.minuti} min</span>
        {s.ricetta.origine === 'personale' && <span className="etichetta accento">tua</span>}
      </span>
    </Link>
  );
}

/** Scelta di chi mangia: filtra allergie e scala le porzioni. */
export function SceltaPresenti() {
  const membri = useMembri().filter((m) => m.attivo !== false);
  const { presenti, scegliPresenti } = useSessione();
  if (membri.length < 2) return null;
  const attivi = presenti ?? membri.map((m) => m.id);
  return (
    <div className="sezione">
      <span className="piccolo testo-tenue">Chi mangia</span>
      <div className="chips">
        {membri.map((m) => (
          <Chip
            key={m.id}
            attivo={attivi.includes(m.id)}
            onClick={() => {
              const nuovi = attivi.includes(m.id) ? attivi.filter((id) => id !== m.id) : [...attivi, m.id];
              scegliPresenti(nuovi.length === membri.length ? null : nuovi.length ? nuovi : attivi);
            }}
          >
            {m.nome}
          </Chip>
        ))}
      </div>
    </div>
  );
}

const PORTATE: (Portata | 'tutte')[] = ['tutte', 'primo', 'secondo', 'piatto_unico', 'contorno', 'antipasto', 'dolce'];

export function Ricette() {
  const presenti = useSessione((s) => s.presenti);
  const ctx = useContestoSuggerimenti(presenti ?? undefined);
  const ricette = useRicette();
  const [testo, setTesto] = useState('');
  const [portata, setPortata] = useState<Portata | 'tutte'>('tutte');
  const [mostraAltre, setMostraAltre] = useState(false);
  const [mostraEscluse, setMostraEscluse] = useState(false);

  const filtrate = useMemo(() => {
    const q = normalizza(testo);
    return ricette.filter((r) => (portata === 'tutte' || r.portata === portata) && (!q || normalizza(r.titolo).includes(q)));
  }, [ricette, testo, portata]);
  const sezioni = useMemo(() => suggerisci(filtrate, ctx), [filtrate, ctx]);
  const inventarioVuoto = ctx.disponibilita.quantita.size === 0;

  return (
    <section className="pagina">
      <div className="titolo-pagina">
        <div className="saluto">
          <h1>Ricette</h1>
          <p className="sottotitolo">Cosa cucinare con quello che hai.</p>
        </div>
        <Link className="bottone piccolo secondario" to="/ricette/nuova">
          + Nuova
        </Link>
      </div>

      <SceltaPresenti />

      <label className="campo">
        <span className="nascosto-visivamente">Cerca una ricetta</span>
        <input type="search" value={testo} onChange={(e) => setTesto(e.target.value)} placeholder="Cerca una ricetta" />
      </label>
      <div className="chips" style={{ flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: 4 }}>
        {PORTATE.map((p) => (
          <Chip key={p} attivo={portata === p} onClick={() => setPortata(p)}>
            {p === 'tutte' ? 'Tutte' : NOME_PORTATA[p]}
          </Chip>
        ))}
      </div>

      {inventarioVuoto && (
        <div className="riquadro avviso">
          <p>
            Non c’è ancora niente in casa, quindi i suggerimenti non tengono conto della dispensa.{' '}
            <Link to="/aggiungi">Aggiungi qualche prodotto</Link> per vedere cosa puoi cucinare subito.
          </p>
        </div>
      )}

      {sezioni.pronte.length > 0 && (
        <div className="sezione">
          <h2>Pronte da cucinare</h2>
          <div className="griglia-ricette">
            {sezioni.pronte.map((s) => (
              <CartaRicetta key={s.ricetta.id} s={s} />
            ))}
          </div>
        </div>
      )}
      {sezioni.quasi.length > 0 && (
        <div className="sezione">
          <h2>Ti mancano 1 o 2 cose</h2>
          <div className="griglia-ricette">
            {sezioni.quasi.map((s) => (
              <CartaRicetta key={s.ricetta.id} s={s} />
            ))}
          </div>
        </div>
      )}
      {sezioni.altre.length > 0 && (
        <div className="sezione">
          <h2>Altre idee</h2>
          <div className="griglia-ricette">
            {(mostraAltre ? sezioni.altre : sezioni.altre.slice(0, 6)).map((s) => (
              <CartaRicetta key={s.ricetta.id} s={s} />
            ))}
          </div>
          {sezioni.altre.length > 6 && (
            <button type="button" className="bottone-testo" onClick={() => setMostraAltre((m) => !m)}>
              {mostraAltre ? 'Mostra meno' : `Mostra tutte (${sezioni.altre.length})`}
            </button>
          )}
        </div>
      )}
      {sezioni.escluse.length > 0 && (
        <div className="sezione">
          <button type="button" className="bottone-testo" style={{ alignSelf: 'flex-start' }} onClick={() => setMostraEscluse((m) => !m)}>
            {mostraEscluse ? 'Nascondi' : 'Mostra'} le {sezioni.escluse.length} ricette escluse per allergie o alimentazione
          </button>
          {mostraEscluse && (
            <div className="griglia-ricette">
              {sezioni.escluse.map((s) => (
                <CartaRicetta key={s.ricetta.id} s={s} />
              ))}
            </div>
          )}
        </div>
      )}
      {filtrate.length === 0 && <Vuoto emoji="🔎" titolo="Nessuna ricetta trovata" />}
    </section>
  );
}
