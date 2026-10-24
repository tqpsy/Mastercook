import { useState } from 'react';
import { aggiungiGiorni, descriviData } from '../dominio/date';
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
import { useNomeMembro, useOggi } from '../nucleo/derivati';
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

export function unitaArticolo(v: ArticoloValutato): string {
  return v.articolo.ricetta_id ? `${v.quantita} ${v.quantita === 1 ? 'porzione' : 'porzioni'}` : formattaQuantita(v.quantita, v.articolo.unita, ingrediente(v.articolo.ingrediente_id));
}

export function FoglioArticolo({ valutato, onChiudi }: { valutato: ArticoloValutato; onChiudi: () => void }) {
  const ctx = useNucleo();
  const nome = useNomeMembro();
  const oggi = useOggi();
  const { articolo, quantita } = valutato;
  const ing = ingrediente(articolo.ingrediente_id);
  const passo = articolo.unita === 'pz' ? 1 : (ing?.peso_pz && ing.peso_pz >= 50 ? ing.peso_pz : 50);
  const [usato, setUsato] = useState(Math.min(quantita, passo));
  const [modo, setModo] = useState<'azioni' | 'butta' | 'modifica'>('azioni');
  const [nuovaQuantita, setNuovaQuantita] = useState(quantita);
  const [scadenza, setScadenza] = useState(articolo.conservare_fino ?? articolo.data_scadenza ?? '');

  const cotto = articolo.stato_conservazione === 'avanzato' || articolo.stato_conservazione === 'cotto';
  const ricetta = articolo.ricetta_id ? RICETTE_SISTEMA_PER_ID.get(articolo.ricetta_id) : undefined;
  // Per gli avanzi la data non può superare il massimo della regola di conservazione.
  const massimo =
    cotto && articolo.data_preparazione
      ? aggiungiGiorni(articolo.data_preparazione, regolaConservazione(ricetta?.categoria_conservazione).massimo)
      : undefined;

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
        <p className="testo-tenue piccolo">
          Aggiunto da {nome(articolo.creato_da)}
          {articolo.data_preparazione ? `, preparato ${descriviData(articolo.data_preparazione, oggi)}` : ''}
          {articolo.tipo_scadenza === 'stimata' ? '. Scadenza stimata: controlla la confezione.' : '.'}
        </p>
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
              <button type="button" className="bottone secondario piccolo" onClick={() => (scongelaArticolo(ctx, articolo), chiudiCon('Scongelato: da consumare entro domani'))}>
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
            correggiQuantita(ctx, articolo, nuovaQuantita);
            if (scadenza) {
              const campo = cotto || articolo.conservare_fino ? 'conservare_fino' : 'data_scadenza';
              const valore = massimo && scadenza > massimo ? massimo : scadenza;
              modificaArticolo(ctx, articolo.id, { [campo]: valore, ...(campo === 'data_scadenza' ? { tipo_scadenza: 'entro' as const } : {}) });
            }
            chiudiCon('Modifiche salvate');
          }}
        >
          <label className="campo">
            <span>Quantità ({articolo.ricetta_id ? 'porzioni' : articolo.unita})</span>
            <PassoQuantita valore={nuovaQuantita} onCambia={setNuovaQuantita} passo={passo} etichetta="Quantità" />
          </label>
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
