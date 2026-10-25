import { useState } from 'react';
import { relayConfigurato } from '../../piattaforma/firebase';
import { emojiMembro } from '../../dominio/emojiMembro';
import { AvvisiScadenza } from '../../componenti/AvvisiScadenza';
import { Link } from 'react-router-dom';
import { Installazione } from '../../componenti/Installazione';
import { Sincronizzazione } from '../../componenti/Sincronizzazione';
import { mostraAvviso } from '../../componenti/ui';
import { ALLERGENI_UE, type Allergene } from '../../dominio/allergeni';
import { collezione, modificaEntita } from '../../piattaforma/documento';
import { useNucleo } from '../../nucleo/contesto';
import { useMembri } from '../../nucleo/derivati';
import { salvaNucleoLocale } from '../../nucleo/registro';
import { useSessione } from '../../stato/sessione';
import { useTema, type Tema } from '../../stato/tema';
import { ChiaveApi } from '../../componenti/ChiaveApi';
import { IMieiDati } from '../../componenti/IMieiDati';
import { cercaAggiornamento, type EsitoAggiornamento } from '../../piattaforma/aggiornamento';

const TEMI: { id: Tema; nome: string }[] = [
  { id: 'auto', nome: 'Automatico' },
  { id: 'chiaro', nome: 'Chiaro' },
  { id: 'scuro', nome: 'Scuro' },
];

function SceltaTema() {
  const { tema, scegliTema } = useTema();
  return (
    <div className="sezione">
      <h2>Tema</h2>
      <div className="sottoschede" role="radiogroup" aria-label="Tema dell’app">
        {TEMI.map((t) => (
          <button key={t.id} type="button" role="radio" aria-checked={tema === t.id} className={tema === t.id ? 'attiva' : ''} onClick={() => scegliTema(t.id)}>
            {t.nome}
          </button>
        ))}
      </div>
      <p className="testo-tenue piccolo">Automatico segue il tema del telefono.</p>
    </div>
  );
}

export function Impostazioni() {
  const nucleo = useNucleo();
  const membri = useMembri();
  const { scegliMembro } = useSessione();
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
                  {emojiMembro(m)}
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
                  {emojiMembro(m)} {m.nome}
                </option>
              ))}
            </select>
            <small>Le modifiche fatte da qui risultano «aggiunte da» questa persona.</small>
          </label>
        )}
      </div>

      <AvvisiScadenza />

      <SceltaTema />

      <Sincronizzazione />
      <ChiaveApi />
      <Installazione />

      <IMieiDati />

      <PrivacyETermini />

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

const PERMESSI = [
  { emoji: '☁️', nome: 'Google Drive', testo: 'solo la cartella «Masterfood» e un’area nascosta dell’app, con i dati cifrati. Gli altri file di Drive restano invisibili all’app.' },
  ...(relayConfigurato()
    ? [{ emoji: '🔐', nome: 'Firebase', testo: 'una copia del nucleo cifrata sul telefono, per far entrare i familiari invitati senza altri passaggi. Nessuno può leggerla senza la chiave del nucleo.' }]
    : []),
  { emoji: '✨', nome: 'Gemini', testo: 'solo se metti la tua chiave: le foto di frigo e dispensa vanno a Google per riconoscere i prodotti.' },
  { emoji: '📷', nome: 'Fotocamera', testo: 'solo mentre inquadri codici, scontrini o il frigo. Gli scontrini si leggono sul telefono.' },
  { emoji: '🔔', nome: 'Notifiche', testo: 'solo se attivi gli avvisi di scadenza, preparati sul telefono.' },
  { emoji: '📦', nome: 'Open Food Facts', testo: 'riceve solo il numero del codice a barre che scansioni.' },
];

function PrivacyETermini() {
  const pagina = `${import.meta.env.BASE_URL}privacy.html`;
  return (
    <div className="sezione">
      <h2>Privacy e termini</h2>
      <p className="testo-tenue piccolo">
        Masterfood non ha un server che legga i tuoi dati: niente pubblicità, niente tracciamento, nessuno vende i tuoi dati. Ecco cosa usa e perché.
      </p>
      <ul className="punti">
        {PERMESSI.map((p) => (
          <li key={p.nome}>
            <span className="emoji" aria-hidden="true">
              {p.emoji}
            </span>
            <span>
              <strong>{p.nome}</strong>: {p.testo}
            </span>
          </li>
        ))}
      </ul>
      <div className="azioni">
        <a className="bottone secondario" href={pagina} target="_blank" rel="noreferrer">
          Informativa sulla privacy
        </a>
        <a className="bottone secondario" href={`${pagina}#termini`} target="_blank" rel="noreferrer">
          Termini d’uso
        </a>
      </div>
      <a className="piccolo" href="https://myaccount.google.com/connections" target="_blank" rel="noreferrer">
        Togli l’accesso di Masterfood al tuo Account Google
      </a>
    </div>
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
