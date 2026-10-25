import { useEffect, useId, useState, type ReactNode } from 'react';
import { create } from 'zustand';
import { cercaIngredienti } from '../dominio/ricerca';
import { catalogoPerReparto, type Ingrediente } from '../rif/ingredienti';
import { emojiIngrediente, emojiReparto } from '../rif/emoji';
import { NOME_REPARTO, type Reparto } from '../rif/reparti';
import { IconaCerca, IconaChiudi } from './Icone';

// ───────── Foglio (pannello dal basso) ─────────

export function Foglio({ titolo, onChiudi, children }: { titolo: ReactNode; onChiudi: () => void; children: ReactNode }) {
  const id = useId();
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onChiudi();
    document.addEventListener('keydown', esc);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', esc);
      document.body.style.overflow = overflow;
    };
  }, [onChiudi]);
  return (
    <div className="velo" onClick={onChiudi}>
      <div className="foglio" role="dialog" aria-modal="true" aria-labelledby={id} onClick={(e) => e.stopPropagation()}>
        <span className="foglio-maniglia" />
        <div className="foglio-testa">
          <h2 id={id}>{titolo}</h2>
          <button type="button" className="bottone-icona" onClick={onChiudi} aria-label="Chiudi">
            <IconaChiudi />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ───────── Avviso flottante con Annulla ─────────

interface Avviso {
  id: number;
  testo: string;
  annulla?: () => void;
}

export const useAvvisi = create<{ avviso: Avviso | null; mostra: (testo: string, annulla?: () => void) => void; chiudi: () => void }>(
  (set) => ({
    avviso: null,
    mostra: (testo, annulla) => set({ avviso: { id: Date.now(), testo, annulla } }),
    chiudi: () => set({ avviso: null }),
  }),
);

export const mostraAvviso = (testo: string, annulla?: () => void) => useAvvisi.getState().mostra(testo, annulla);

export function AvvisoFlottante() {
  const { avviso, chiudi } = useAvvisi();
  useEffect(() => {
    if (!avviso) return;
    const t = setTimeout(chiudi, avviso.annulla ? 6000 : 3500);
    return () => clearTimeout(t);
  }, [avviso, chiudi]);
  // La regione resta sempre nella pagina: i lettori di schermo annunciano solo i cambi di una regione già presente.
  return (
    <div role="status" aria-live="polite">
      {avviso && (
        <div className="avviso-flottante" key={avviso.id}>
          <span>{avviso.testo}</span>
          {avviso.annulla && (
            <button
              type="button"
              onClick={() => {
                avviso.annulla!();
                chiudi();
              }}
            >
              Annulla
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ───────── Varie ─────────

export function Vuoto({ emoji, titolo, children }: { emoji: string; titolo: string; children?: ReactNode }) {
  return (
    <div className="vuoto">
      <span className="emoji" aria-hidden="true">
        {emoji}
      </span>
      <h3>{titolo}</h3>
      {children}
    </div>
  );
}

export function Chip({ attivo, onClick, children, pericolo }: { attivo: boolean; onClick: () => void; children: ReactNode; pericolo?: boolean }) {
  return (
    <button type="button" className={`chip${pericolo ? ' pericolo' : ''}`} aria-pressed={attivo} onClick={onClick}>
      {children}
    </button>
  );
}

export function PassoQuantita({
  valore,
  onCambia,
  passo,
  min = 0,
  etichetta,
}: {
  valore: number;
  onCambia: (v: number) => void;
  passo: number;
  min?: number;
  etichetta: string;
}) {
  return (
    <div className="passo-quantita">
      <button type="button" aria-label={`Meno ${passo}`} onClick={() => onCambia(Math.max(min, valore - passo))}>
        −
      </button>
      <input
        className="input"
        type="number"
        inputMode="decimal"
        aria-label={etichetta}
        value={Number.isFinite(valore) ? valore : ''}
        min={min}
        onChange={(e) => onCambia(Math.max(min, Number(e.target.value)))}
      />
      <button type="button" aria-label={`Più ${passo}`} onClick={() => onCambia(valore + passo)}>
        +
      </button>
    </div>
  );
}

/** Ricerca di un ingrediente generico per nome o sinonimo. */
export function SelettoreIngrediente({
  onScegli,
  segnaposto = 'Cerca: latte, pasta, zucchine…',
  testoLibero,
  autoFocus,
}: {
  onScegli: (ing: Ingrediente) => void;
  segnaposto?: string;
  /** Se presente, offre di aggiungere il testo così com'è. */
  testoLibero?: (testo: string) => void;
  autoFocus?: boolean;
}) {
  const [testo, setTesto] = useState('');
  const risultati = cercaIngredienti(testo, 8);
  return (
    <div className="sezione">
      <label className="ricerca campo">
        <span className="nascosto-visivamente">Cerca un ingrediente</span>
        <IconaCerca />
        <input
          type="search"
          value={testo}
          placeholder={segnaposto}
          autoFocus={autoFocus}
          autoComplete="off"
          enterKeyHint="search"
          onChange={(e) => setTesto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && risultati[0] && risultati[0].confidenza >= 0.85) {
              onScegli(risultati[0].ingrediente);
              setTesto('');
            }
          }}
        />
      </label>
      {!testo.trim() && <SfogliaCatalogo onScegli={onScegli} />}
      {testo.trim() && (
        <ul className="elenco">
          {risultati.map(({ ingrediente: ing }) => (
            <li key={ing.id}>
              <button
                type="button"
                className="voce"
                onClick={() => {
                  onScegli(ing);
                  setTesto('');
                }}
              >
                <span className="emoji" aria-hidden="true">
                  {emojiIngrediente(ing.id)}
                </span>
                <span className="voce-testo">
                  <span className="voce-titolo">{ing.nome}</span>
                </span>
              </button>
            </li>
          ))}
          {testoLibero && (
            <li>
              <button
                type="button"
                className="voce"
                onClick={() => {
                  testoLibero(testo.trim());
                  setTesto('');
                }}
              >
                <span className="emoji" aria-hidden="true">
                  ✏️
                </span>
                <span className="voce-testo">
                  <span className="voce-titolo">Aggiungi «{testo.trim()}»</span>
                  <span className="voce-dettaglio">come voce libera</span>
                </span>
              </button>
            </li>
          )}
          {!testoLibero && risultati.length === 0 && (
            <li className="voce voce-dettaglio">Nessun ingrediente trovato.</li>
          )}
        </ul>
      )}
    </div>
  );
}

const CATALOGO = catalogoPerReparto();

/** Il catalogo per reparto e sottocategoria, per chi non sa che nome cercare. */
function SfogliaCatalogo({ onScegli }: { onScegli: (ing: Ingrediente) => void }) {
  const [aperto, setAperto] = useState(false);
  const [reparto, setReparto] = useState<Reparto | null>(null);
  if (!aperto) {
    return (
      <button type="button" className="bottone-testo" onClick={() => setAperto(true)}>
        Sfoglia per categoria
      </button>
    );
  }
  const scelto = CATALOGO.find((r) => r.reparto === reparto);
  return (
    <div className="sfoglia">
      <div className="chips scorrevoli" role="group" aria-label="Reparti">
        {CATALOGO.map((r) => (
          <button key={r.reparto} type="button" className="chip" aria-pressed={r.reparto === reparto} onClick={() => setReparto(r.reparto === reparto ? null : r.reparto)}>
            <span aria-hidden="true">{emojiReparto(r.reparto)}</span> {NOME_REPARTO[r.reparto]}
          </button>
        ))}
      </div>
      {scelto?.sottocategorie.map((sotto) => (
        <div key={sotto.nome} className="sfoglia-gruppo">
          <h3>{sotto.nome}</h3>
          <div className="chips">
            {sotto.voci.map((ing) => (
              <button key={ing.id} type="button" className="chip" onClick={() => onScegli(ing)}>
                <span aria-hidden="true">{emojiIngrediente(ing.id)}</span> {ing.nome}
              </button>
            ))}
          </div>
        </div>
      ))}
      <button type="button" className="bottone-testo" onClick={() => (setAperto(false), setReparto(null))}>
        Chiudi le categorie
      </button>
    </div>
  );
}
