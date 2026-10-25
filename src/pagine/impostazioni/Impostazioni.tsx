import { useState } from 'react';
import { Link } from 'react-router-dom';
import * as Y from 'yjs';
import { Installazione } from '../../componenti/Installazione';
import { Sincronizzazione } from '../../componenti/Sincronizzazione';
import { mostraAvviso } from '../../componenti/ui';
import { ALLERGENI_UE, type Allergene } from '../../dominio/allergeni';
import { collezione, modificaEntita } from '../../piattaforma/documento';
import { useNucleo } from '../../nucleo/contesto';
import { useMembri } from '../../nucleo/derivati';
import { rimuoviNucleoLocale, salvaNucleoLocale } from '../../nucleo/registro';
import { useSessione } from '../../stato/sessione';
import { ChiaveApi } from '../../componenti/ChiaveApi';
import { cercaAggiornamento, type EsitoAggiornamento } from '../../piattaforma/aggiornamento';

function scaricaBackup(nome: string, dati: Y.Doc, storico: Y.Doc) {
  const contenuto = {
    formato: 'masterfood-export',
    versione: 1,
    esportato_il: new Date().toISOString(),
    dati: dati.toJSON(),
    storico: storico.toJSON(),
  };
  const blob = new Blob([JSON.stringify(contenuto, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `masterfood-${nome.toLowerCase().replace(/\W+/g, '-')}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function Impostazioni() {
  const nucleo = useNucleo();
  const membri = useMembri();
  const { scegliMembro, scegliNucleo } = useSessione();
  const [nome, setNome] = useState(nucleo.nucleo.nome);

  return (
    <section className="pagina">
      <h1>Impostazioni</h1>

      <div className="sezione">
        <h2>Nucleo</h2>
        <form
          className="riga-campi"
          style={{ gridTemplateColumns: '1fr auto', alignItems: 'end' }}
          onSubmit={(e) => {
            e.preventDefault();
            const meta = collezione(nucleo.dati, 'meta').get('nucleo');
            if (meta) modificaEntita(meta, { nome: nome.trim() }, nucleo.membroId);
            salvaNucleoLocale({ ...nucleo.nucleo, nome: nome.trim() });
            mostraAvviso('Nome salvato');
          }}
        >
          <label className="campo">
            <span>Nome</span>
            <input value={nome} onChange={(e) => setNome(e.target.value)} required />
          </label>
          <button type="submit" className="bottone secondario" disabled={!nome.trim() || nome.trim() === nucleo.nucleo.nome}>
            Salva
          </button>
        </form>
      </div>

      <div className="sezione">
        <div className="sezione-testa">
          <h2>Membri</h2>
          <Link to="/impostazioni/membri/nuovo">+ Aggiungi</Link>
        </div>
        <ul className="elenco">
          {membri.map((m) => (
            <li key={m.id}>
              <Link className="voce" to={`/impostazioni/membri/${m.id}`}>
                <span className="emoji" aria-hidden="true">
                  {m.fattore_porzione < 1 ? '🧒' : '🧑'}
                </span>
                <span className="voce-testo">
                  <span className="voce-titolo">
                    {m.nome}
                    {m.id === nucleo.membroId ? ' (tu)' : ''}
                  </span>
                  <span className="voce-dettaglio">
                    {m.allergie.length ? `Allergie: ${m.allergie.map((a) => ALLERGENI_UE[a as Allergene] ?? a).join(', ')}` : 'Nessuna allergia indicata'}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="testo-tenue piccolo">
          Puoi aggiungere anche chi non usa l’app, come i bambini: serve per le porzioni e per le allergie.
        </p>
        {membri.length > 1 && (
          <label className="campo">
            <span>Chi sta usando questo telefono</span>
            <select value={nucleo.membroId} onChange={(e) => scegliMembro(nucleo.nucleo.id, e.target.value)}>
              {membri.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
            <small>Le modifiche fatte da qui risultano «aggiunte da» questa persona.</small>
          </label>
        )}
      </div>

      <Sincronizzazione />
      <ChiaveApi />
      <Installazione />

      <div className="sezione">
        <h2>I tuoi dati</h2>
        <p className="testo-tenue piccolo">
          Inventario, lista, ricette e profili restano su questo dispositivo. Puoi scaricarne una copia leggibile in qualsiasi momento.
        </p>
        <div className="azioni">
          <button type="button" className="bottone secondario" onClick={() => scaricaBackup(nucleo.nucleo.nome, nucleo.dati, nucleo.storico)}>
            Scarica i dati (JSON)
          </button>
          <button
            type="button"
            className="bottone pericolo"
            onClick={async () => {
              if (!confirm(`Eliminare «${nucleo.nucleo.nome}» e tutti i suoi dati da questo dispositivo? Non si può annullare.`)) return;
              const id = nucleo.nucleo.id;
              rimuoviNucleoLocale(id);
              scegliNucleo(null);
              for (const tipo of ['dati', 'storico']) indexedDB.deleteDatabase(`masterfood-${id}-${tipo}`);
            }}
          >
            Elimina da questo dispositivo
          </button>
        </div>
      </div>

      <div className="sezione">
        <h2>Informazioni</h2>
        <p className="testo-tenue piccolo">
          Masterfood, versione {__VERSIONE_APP__}. Dati dei prodotti da{' '}
          <a href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer">
            Open Food Facts
          </a>{' '}
          (licenza ODbL). Le regole di conservazione seguono Ministero della Salute, USDA ed EFSA e sono in fase di revisione da parte di un
          dietista: nel dubbio, vale sempre l’etichetta.
        </p>
        <BottoneAggiorna />
      </div>
    </section>
  );
}

const TESTI_ESITO: Record<EsitoAggiornamento, string> = {
  aggiornata: 'Hai già l’ultima versione.',
  in_arrivo: 'Scarico la nuova versione: l’app si riapre da sola…',
  offline: 'Sei offline: riprova quando torna la connessione.',
};

function BottoneAggiorna() {
  const [inCorso, setInCorso] = useState(false);
  const [esito, setEsito] = useState<string | null>(null);
  return (
    <div className="azioni colonna">
      <button
        type="button"
        className="bottone secondario"
        disabled={inCorso}
        onClick={async () => {
          setInCorso(true);
          setEsito(null);
          try {
            setEsito(TESTI_ESITO[await cercaAggiornamento()]);
          } catch {
            setEsito('Non riesco a controllare gli aggiornamenti adesso: riprova tra poco.');
          } finally {
            setInCorso(false);
          }
        }}
      >
        {inCorso ? 'Cerco aggiornamenti…' : 'Aggiorna versione'}
      </button>
      {esito && (
        <p role="status" className="testo-tenue piccolo">
          {esito}
        </p>
      )}
    </div>
  );
}
