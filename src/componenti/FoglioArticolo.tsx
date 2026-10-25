import { useState } from 'react';
import { aggiungiGiorni, descriviData } from '../dominio/date';
import { confezioneIniziata, misuraConfezione, numeroConfezioni } from '../dominio/confezioni';
import type { ArticoloValutato } from '../dominio/disponibilita';
import { formattaQuantita } from '../dominio/formato';
import { useNucleo } from '../nucleo/contesto';
import {
  apriArticolo,
  buttaArticolo,
  congelaArticolo,
  consumaArticolo,
  correggiQuantita,
  eliminaArticolo,
  modificaArticolo,
  ripristinaArticolo,
  scongelaArticolo,
  type MotivoSpreco,
} from '../nucleo/azioni';
import { useAutoreAltrui, useOggi } from '../nucleo/derivati';
import { regolaConservazione } from '../rif/conservazione';
import { ingrediente } from '../rif/ingredienti';
import { RICETTE_SISTEMA_PER_ID } from '../rif/ricette';
import { EtichettaScadenza } from './EtichettaScadenza';
import { Chip, Foglio, PassoQuantita, mostraAvviso } from './ui';

const MOTIVI: { id: MotivoSpreco; nome: string }[] = [
  { id: 'scaduto', nome: 'Scaduto' },
  { id: 'andato_a_male', nome: 'Andato a male' },
  { id: 'avanzato', nome: 'Avanzato troppo' },
  { id: 'non_piaciuto', nome: 'Non è piaciuto' },
  { id: 'altro', nome: 'Altro' },
];

/** Carote, patate… contate a pezzi: ogni "confezione" è un pezzo del peso medio. */
function sfuso(v: ArticoloValutato): boolean {
  const peso = ingrediente(v.articolo.ingrediente_id)?.peso_pz;
  return !!peso && v.articolo.unita === 'g' && misuraConfezione(v.articolo, v.quantita) === peso;
}

/** Formato di una confezione ("1 l"), con quanto resta se una è iniziata; vuoto per pezzi e porzioni. */
export function formatoArticolo(v: ArticoloValutato): string | undefined {
  const { articolo, quantita } = v;
  if (articolo.ricetta_id || articolo.unita === 'pz' || sfuso(v)) return undefined;
  const misura = misuraConfezione(articolo, quantita);
  const formato = formattaQuantita(misura, articolo.unita);
  return confezioneIniziata(quantita, misura) ? `${formato} · restano ${formattaQuantita(quantita, articolo.unita, ingrediente(articolo.ingrediente_id))}` : formato;
}

/** Quantità per esteso: "3 pz", "2 porzioni", "2 × 1 l". */
export function unitaArticolo(v: ArticoloValutato): string {
  const { articolo, quantita } = v;
  if (articolo.ricetta_id) return `${quantita} ${quantita === 1 ? 'porzione' : 'porzioni'}`;
  if (articolo.unita === 'pz') return formattaQuantita(quantita, 'pz');
  const n = numeroConfezioni(quantita, misuraConfezione(articolo, quantita));
  if (sfuso(v)) return `${n} pz (circa ${formattaQuantita(quantita, 'g')})`;
  return n > 1 ? `${n} × ${formatoArticolo(v)}` : formatoArticolo(v)!;
}

export function FoglioArticolo({ valutato, onChiudi }: { valutato: ArticoloValutato; onChiudi: () => void }) {
  const ctx = useNucleo();
  const autore = useAutoreAltrui()(valutato.articolo.creato_da);
  const oggi = useOggi();
  const { articolo, quantita } = valutato;
  const ing = ingrediente(articolo.ingrediente_id);
  const passo = articolo.unita === 'pz' ? 1 : (ing?.peso_pz && ing.peso_pz >= 50 ? ing.peso_pz : 50);
  const [usato, setUsato] = useState(Math.min(quantita, passo));
  const [modo, setModo] = useState<'azioni' | 'butta' | 'modifica'>('azioni');
  const [nuovaQuantita, setNuovaQuantita] = useState(quantita);
  // Prodotti a peso o volume: si modificano le confezioni e quanto contiene ognuna.
  const aConfezioni = !articolo.ricetta_id && articolo.unita !== 'pz';
  const misuraIniziale = misuraConfezione(articolo, quantita);
  const confezioniIniziali = numeroConfezioni(quantita, misuraIniziale);
  const [confezioni, setConfezioni] = useState(confezioniIniziali);
  const [misura, setMisura] = useState(misuraIniziale);
  const [scadenza, setScadenza] = useState(articolo.conservare_fino ?? articolo.data_scadenza ?? '');

  const cotto = articolo.stato_conservazione === 'avanzato' || articolo.stato_conservazione === 'cotto';
  const ricetta = articolo.ricetta_id ? RICETTE_SISTEMA_PER_ID.get(articolo.ricetta_id) : undefined;
  // Per gli avanzi la data non può superare il massimo della regola di conservazione.
  const massimo =
    cotto && articolo.data_preparazione
      ? aggiungiGiorni(articolo.data_preparazione, regolaConservazione(ricetta?.categoria_conservazione).massimo)
      : undefined;

  const nota = [
    autore && `Aggiunto da ${autore}`,
    articolo.data_preparazione && `Preparato ${descriviData(articolo.data_preparazione, oggi)}`,
    articolo.tipo_scadenza === 'stimata' && 'Scadenza stimata: controlla la confezione',
  ]
    .filter(Boolean)
    .join('. ');

  const chiudiCon = (testo: string, annulla?: () => void) => {
    mostraAvviso(testo, annulla);
    onChiudi();
  };

  return (
    <Foglio titolo={articolo.nome} onChiudi={onChiudi}>
      <div className="sezione">
        <div className="azioni">
          <EtichettaScadenza valutato={valutato} oggi={oggi} />
          <span className="etichetta">{unitaArticolo(valutato)}</span>
          {articolo.stato_conservazione !== 'fresco' && <span className="etichetta">{articolo.stato_conservazione}</span>}
        </div>
        {nota && <p className="testo-tenue piccolo">{nota}.</p>}
      </div>

      {modo === 'azioni' && (
        <>
          <div className="sezione">
            <h3>Quanto ne hai usato?</h3>
            <PassoQuantita valore={usato} onCambia={(v) => setUsato(Math.min(v, quantita))} passo={passo} etichetta="Quantità usata" />
            <div className="azioni">
              <button
                type="button"
                className="bottone"
                disabled={usato <= 0}
                onClick={() => {
                  consumaArticolo(ctx, articolo, usato);
                  chiudiCon(`Segnato: ${articolo.nome} usato`);
                }}
              >
                Ho usato
              </button>
              <button
                type="button"
                className="bottone secondario"
                onClick={() => {
                  consumaArticolo(ctx, articolo, quantita);
                  chiudiCon(`${articolo.nome}: finito`);
                }}
              >
                Finito
              </button>
              <button type="button" className="bottone pericolo" onClick={() => setModo('butta')}>
                Buttato
              </button>
            </div>
          </div>

          <details className="altre-azioni">
            <summary>Altre azioni</summary>
            <div className="azioni">
              {articolo.luogo !== 'freezer' && articolo.stato_conservazione === 'fresco' && !cotto && (
                <button type="button" className="bottone secondario piccolo" onClick={() => (apriArticolo(ctx, articolo), chiudiCon('Segnato come aperto'))}>
                  L’ho aperto
                </button>
              )}
              {articolo.luogo !== 'freezer' && articolo.stato_conservazione !== 'scongelato' && (
                <button type="button" className="bottone secondario piccolo" onClick={() => (congelaArticolo(ctx, articolo), chiudiCon('Spostato in freezer'))}>
                  Congela
                </button>
              )}
              {articolo.luogo === 'freezer' && (
                <button
                  type="button"
                  className="bottone secondario piccolo"
                  onClick={() => (scongelaArticolo(ctx, articolo), chiudiCon('Scongelato: da consumare entro domani'))}
                >
                  Scongela
                </button>
              )}
              <button type="button" className="bottone secondario piccolo" onClick={() => setModo('modifica')}>
                Modifica
              </button>
              <button
                type="button"
                className="bottone pericolo piccolo"
                onClick={() => {
                  eliminaArticolo(ctx, articolo.id);
                  chiudiCon(`${articolo.nome} eliminato`, () => ripristinaArticolo(ctx, articolo.id));
                }}
              >
                Elimina
              </button>
            </div>
          </details>
        </>
      )}

      {modo === 'butta' && (
        <div className="sezione">
          <h3>Perché lo butti?</h3>
          <p className="testo-tenue piccolo">Serve alle statistiche sugli sprechi del nucleo.</p>
          <div className="chips">
            {MOTIVI.map((m) => (
              <Chip
                key={m.id}
                attivo={false}
                onClick={() => {
                  buttaArticolo(ctx, articolo, m.id);
                  chiudiCon(`${articolo.nome}: buttato`);
                }}
              >
                {m.nome}
              </Chip>
            ))}
          </div>
          <button type="button" className="bottone-testo" onClick={() => setModo('azioni')}>
            Indietro
          </button>
        </div>
      )}

      {modo === 'modifica' && (
        <form
          className="sezione"
          onSubmit={(e) => {
            e.preventDefault();
            if (!aConfezioni) correggiQuantita(ctx, articolo, nuovaQuantita);
            else if (confezioni !== confezioniIniziali || misura !== misuraIniziale) {
              // Se non cambia nulla resta com'è, anche con una confezione iniziata.
              correggiQuantita(ctx, articolo, confezioni * misura);
              if (misura > 0) modificaArticolo(ctx, articolo.id, { confezione: misura });
            }
            if (scadenza) {
              const campo = cotto || articolo.conservare_fino ? 'conservare_fino' : 'data_scadenza';
              const valore = massimo && scadenza > massimo ? massimo : scadenza;
              modificaArticolo(ctx, articolo.id, { [campo]: valore, ...(campo === 'data_scadenza' ? { tipo_scadenza: 'entro' as const } : {}) });
            }
            chiudiCon('Modifiche salvate');
          }}
        >
          {aConfezioni ? (
            <>
              <label className="campo">
                <span>{sfuso(valutato) ? 'Quanti pezzi' : 'Quante confezioni'}</span>
                <PassoQuantita valore={confezioni} onCambia={(v) => setConfezioni(Math.round(v))} passo={1} etichetta={sfuso(valutato) ? 'Quanti pezzi' : 'Quante confezioni'} />
              </label>
              {!sfuso(valutato) && (
<label className="campo">
                <span>Ogni confezione ({articolo.unita})</span>
                <PassoQuantita valore={misura} onCambia={setMisura} passo={passo} etichetta={`Ogni confezione in ${articolo.unita}`} />
                <small>
                  {confezioni === confezioniIniziali && misura === misuraIniziale
                    ? `Ora: ${unitaArticolo(valutato)}`
                    : `In tutto: ${formattaQuantita(confezioni * misura, articolo.unita)}`}
                </small>
              </label>
)}
            </>
          ) : (
            <label className="campo">
              <span>{articolo.ricetta_id ? 'Quante porzioni' : 'Quanti pezzi'}</span>
              <PassoQuantita valore={nuovaQuantita} onCambia={setNuovaQuantita} passo={passo} etichetta="Quantità" />
            </label>
          )}
          <label className="campo">
            <span>{cotto ? 'Da consumare entro' : 'Scadenza'}</span>
            <input type="date" value={scadenza} max={massimo} onChange={(e) => setScadenza(e.target.value)} />
            {massimo && <small>Per sicurezza non si può andare oltre il {descriviData(massimo, oggi)}.</small>}
          </label>
          <div className="azioni">
            <button type="submit" className="bottone">
              Salva
            </button>
            <button type="button" className="bottone secondario" onClick={() => setModo('azioni')}>
              Annulla
            </button>
          </div>
        </form>
      )}
    </Foglio>
  );
}
