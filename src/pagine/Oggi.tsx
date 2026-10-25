import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FoglioArticolo } from '../componenti/FoglioArticolo';
import { useCollezione } from '../nucleo/hooks';
import type { ArticoloValutato } from '../dominio/disponibilita';
import { vistaLista } from '../dominio/lista';
import { suggerisci } from '../dominio/suggerimenti';
import type { ArticoloLista } from '../dominio/tipi';
import { useContestoSuggerimenti, useDisponibilita, useInventario, useMembroCorrente, useOggi, useRicette } from '../nucleo/derivati';
import { NOME_PASTO } from '../dominio/dieta';
import { ORDINE_PASTI, lunediDi } from '../dominio/menu';
import { usePastiSettimana } from '../nucleo/hooksMenu';
import { ElencoArticoli } from './Casa';
import { CartaRicetta } from './ricette/Ricette';

function saluto(): string {
  const ora = new Date().getHours();
  if (ora < 6) return 'Buonanotte';
  if (ora < 13) return 'Buongiorno';
  if (ora < 18) return 'Buon pomeriggio';
  return 'Buonasera';
}

export function Oggi() {
  const membro = useMembroCorrente();
  const inventario = useInventario();
  const disponibilita = useDisponibilita();
  const righe = useCollezione<ArticoloLista>('liste');
  const ctx = useContestoSuggerimenti();
  const ricette = useRicette();
  const [aperto, setAperto] = useState<ArticoloValutato | null>(null);
  const oggi = useOggi();
  const settimana = usePastiSettimana(lunediDi(oggi));
  const menuOggi = settimana
    .filter((p) => p.data === oggi && p.portate.length)
    .sort((a, b) => ORDINE_PASTI.indexOf(a.tipo) - ORDINE_PASTI.indexOf(b.tipo));

  const daUsare = inventario.filter((v) => ['scaduto', 'oggi', 'in_scadenza', 'controlla'].includes(v.stato));
  const avanzi = inventario.filter((v) => v.articolo.ricetta_id && v.articolo.luogo !== 'freezer');
  const daComprare = useMemo(() => vistaLista(righe, disponibilita).daComprare.length, [righe, disponibilita]);
  const idee = useMemo(() => {
    const s = suggerisci(ricette, ctx);
    return [...s.pronte, ...s.quasi].slice(0, 3);
  }, [ricette, ctx]);

  return (
    <section className="pagina">
      <div className="saluto">
        <h1>
          {saluto()}
          {membro ? `, ${membro.nome}` : ''}
        </h1>
        <p className="sottotitolo">
          {new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}
        </p>
      </div>

      <div className="statistiche">
        <Link className="statistica" to="/casa">
          <strong>{inventario.length}</strong>
          <span>in casa</span>
        </Link>
        <Link className="statistica" to="/casa?luogo=frigo">
          <strong style={{ color: daUsare.length ? 'var(--ocra)' : undefined }}>{daUsare.length}</strong>
          <span>da usare presto</span>
        </Link>
        <Link className="statistica" to="/lista">
          <strong>{daComprare}</strong>
          <span>da comprare</span>
        </Link>
      </div>

      {inventario.length === 0 && (
        <div className="riquadro evidenza">
          <h2>Per iniziare</h2>
          <p>Aggiungi quello che hai in frigo e in dispensa: bastano pochi prodotti per ricevere le prime idee per cucinare.</p>
          <div className="azioni">
            <Link className="bottone" to="/aggiungi/mano">
              Aggiungi a mano
            </Link>
            <Link className="bottone secondario" to="/aggiungi/codice">
              Scansiona un codice
            </Link>
          </div>
        </div>
      )}

      <div className="sezione">
        <div className="sezione-testa">
          <h2>Menù di oggi</h2>
          <Link to="/menu">Settimana</Link>
        </div>
        {menuOggi.length ? (
          <ul className="elenco">
            {menuOggi.map((p) => (
              <li key={p.tipo}>
                <Link className="voce" to="/menu">
                  <span className="voce-testo">
                    <span className="voce-dettaglio">{NOME_PASTO[p.tipo]}</span>
                    <span className="voce-titolo">{p.portate.map((x) => x.titolo).join(' · ')}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="testo-tenue piccolo">
            Niente in programma. <Link to="/menu">Prepara il menù</Link> o carica la dieta del dietista.
          </p>
        )}
      </div>

      {avanzi.length > 0 && (
        <div className="sezione">
          <h2>Avanzi da finire</h2>
          <ElencoArticoli articoli={avanzi} onApri={setAperto} />
        </div>
      )}

      {daUsare.length > 0 && (
        <div className="sezione">
          <div className="sezione-testa">
            <h2>Da usare presto</h2>
            <Link to="/casa">Tutto</Link>
          </div>
          <ElencoArticoli articoli={daUsare.filter((v) => !v.articolo.ricetta_id).slice(0, 6)} onApri={setAperto} />
        </div>
      )}

      {idee.length > 0 && (
        <div className="sezione">
          <div className="sezione-testa">
            <h2>Cosa cucino?</h2>
            <Link to="/ricette">Altre ricette</Link>
          </div>
          <div className="griglia-ricette">
            {idee.map((s) => (
              <CartaRicetta key={s.ricetta.id} s={s} />
            ))}
          </div>
        </div>
      )}

      {aperto && <FoglioArticolo valutato={aperto} onChiudi={() => setAperto(null)} />}
    </section>
  );
}
