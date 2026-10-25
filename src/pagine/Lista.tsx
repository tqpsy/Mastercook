import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconaSpunta } from '../componenti/Icone';
import { Foglio, SelettoreIngrediente, Vuoto, mostraAvviso } from '../componenti/ui';
import { formattaQuantita } from '../dominio/formato';
import { vistaLista, type RigaVista } from '../dominio/lista';
import type { ArticoloLista } from '../dominio/tipi';
import { useNucleo } from '../nucleo/contesto';
import { aggiungiAllaLista, rimettiDaComprare, rimuoviRiga, spuntaRiga, svuotaPresi } from '../nucleo/azioni';
import { useAutoreAltrui, useDisponibilita, useNomeMembro } from '../nucleo/derivati';
import { useCollezione } from '../nucleo/hooks';
import { emojiIngrediente } from '../rif/emoji';
import { REPARTI } from '../rif/reparti';

function quantitaRiga(v: RigaVista): string | undefined {
  if (!v.ingrediente || v.mancante === undefined) return undefined;
  const testo = formattaQuantita(v.mancante, v.ingrediente.unita, v.ingrediente);
  return v.confezioni && v.ingrediente.formato && v.ingrediente.unita !== 'pz'
    ? `${testo} · ${v.confezioni} ${v.confezioni === 1 ? 'confezione' : 'confezioni'}`
    : testo;
}

function origineBreve(riga: ArticoloLista): string {
  const ricette = riga.origini.filter((o) => o.tipo === 'ricetta' && o.titolo).map((o) => o.titolo!);
  if (ricette.length) return `per ${ricette.join(', ')}`;
  return '';
}

function RigaSpesa({ v, onApri }: { v: RigaVista; onApri: () => void }) {
  const ctx = useNucleo();
  const autore = useAutoreAltrui();
  const presa = v.riga.stato === 'preso';
  const dettaglio = [quantitaRiga(v), origineBreve(v.riga) || (autore(v.riga.creato_da) && `da ${autore(v.riga.creato_da)}`)].filter(Boolean).join(' · ');
  return (
    <li className={presa ? 'presa' : ''}>
      <div className="voce">
        <button
          type="button"
          className={`casella${presa ? ' spuntata' : ''}`}
          aria-label={presa ? `Rimetti ${v.riga.testo} da comprare` : `Preso: ${v.riga.testo}`}
          onClick={() => {
            if (presa) {
              rimettiDaComprare(ctx, v.riga.id);
              return;
            }
            const annulla = spuntaRiga(ctx, v.riga, v.mancante);
            mostraAvviso(v.ingrediente ? `${v.riga.testo} preso e messo in casa` : `${v.riga.testo} preso`, annulla);
          }}
        >
          {presa && <IconaSpunta />}
        </button>
        <button type="button" className="voce-testo" onClick={onApri} style={{ border: 0, background: 'none', textAlign: 'left', padding: 0, cursor: 'pointer' }}>
          <span className="voce-titolo">{v.riga.testo}</span>
          {dettaglio && <span className="voce-dettaglio">{dettaglio}</span>}
        </button>
        <span className="emoji" aria-hidden="true" style={{ width: 32, height: 32, fontSize: '1.05rem' }}>
          {emojiIngrediente(v.ingrediente?.id, v.reparto)}
        </span>
      </div>
    </li>
  );
}

export function Lista() {
  const ctx = useNucleo();
  const righe = useCollezione<ArticoloLista>('liste');
  const disponibilita = useDisponibilita();
  const vista = useMemo(() => vistaLista(righe, disponibilita), [righe, disponibilita]);
  const [aperta, setAperta] = useState<RigaVista | null>(null);
  const [mostraInCasa, setMostraInCasa] = useState(false);
  const nome = useNomeMembro();

  const perReparto = REPARTI.map((r) => ({ ...r, righe: vista.daComprare.filter((v) => v.reparto === r.id) })).filter((r) => r.righe.length);

  return (
    <section className="pagina">
      <div className="saluto">
        <h1>Lista della spesa</h1>
        <p className="sottotitolo">
          {vista.daComprare.length === 0 ? 'Niente da comprare.' : `${vista.daComprare.length} ${vista.daComprare.length === 1 ? 'cosa' : 'cose'} da comprare.`}{' '}
          Quando spunti un ingrediente, finisce in casa.
        </p>
      </div>

      {vista.daComprare.length > 0 && (
        <Link to="/spesa" className="bottone">
          🛒 Sono al supermercato
        </Link>
      )}

      <SelettoreIngrediente
        segnaposto="Aggiungi: pane, uova, detersivo…"
        onScegli={(ing) => {
          aggiungiAllaLista(ctx, { ingrediente_id: ing.id, testo: ing.nome }, { tipo: 'manuale', membri: [ctx.membroId] });
          mostraAvviso(`${ing.nome} in lista`);
        }}
        testoLibero={(testo) => {
          aggiungiAllaLista(ctx, { testo }, { tipo: 'manuale', membri: [ctx.membroId] });
          mostraAvviso(`${testo} in lista`);
        }}
      />

      {vista.daComprare.length === 0 && vista.presi.length === 0 && (
        <Vuoto emoji="🛒" titolo="La lista è vuota">
          <p>Aggiungi qui sopra, oppure dalle ricette con «Aggiungi i mancanti alla lista».</p>
        </Vuoto>
      )}

      {perReparto.map((r) => (
        <div className="sezione" key={r.id}>
          <h2 className="reparto-titolo">{r.nome}</h2>
          <ul className="elenco">
            {r.righe.map((v) => (
              <RigaSpesa key={v.riga.id} v={v} onApri={() => setAperta(v)} />
            ))}
          </ul>
        </div>
      ))}

      {vista.giaInCasa.length > 0 && (
        <div className="sezione">
          <div className="sezione-testa">
            <h2 className="reparto-titolo">Già in casa ({vista.giaInCasa.length})</h2>
            <button type="button" className="bottone-testo" onClick={() => setMostraInCasa((m) => !m)}>
              {mostraInCasa ? 'Nascondi' : 'Mostra'}
            </button>
          </div>
          {mostraInCasa && (
            <ul className="elenco">
              {vista.giaInCasa.map((v) => (
                <RigaSpesa key={v.riga.id} v={v} onApri={() => setAperta(v)} />
              ))}
            </ul>
          )}
        </div>
      )}

      {vista.presi.length > 0 && (
        <div className="sezione">
          <div className="sezione-testa">
            <h2 className="reparto-titolo">Presi ({vista.presi.length})</h2>
            <button type="button" className="bottone-testo" onClick={() => svuotaPresi(ctx, righe)}>
              Togli dalla lista
            </button>
          </div>
          <ul className="elenco">
            {vista.presi.map((v) => (
              <RigaSpesa key={v.riga.id} v={v} onApri={() => setAperta(v)} />
            ))}
          </ul>
        </div>
      )}

      {aperta && (
        <Foglio titolo={aperta.riga.testo} onChiudi={() => setAperta(null)}>
          <ul className="elenco">
            {aperta.riga.origini.map((o, i) => (
              <li key={i} className="voce" style={{ cursor: 'default' }}>
                <span className="voce-testo">
                  <span className="voce-titolo">
                    {o.tipo === 'ricetta' ? (o.titolo ?? 'Ricetta') : o.tipo === 'scorta' ? 'Scorta minima' : 'Aggiunto a mano'}
                  </span>
                  <span className="voce-dettaglio">
                    {o.quantita && aperta.ingrediente ? formattaQuantita(o.quantita, aperta.ingrediente.unita, aperta.ingrediente) : 'quantità libera'}
                    {o.membri?.length ? ` · ${o.membri.map(nome).join(', ')}` : ''}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          {aperta.ingrediente && aperta.disponibile > 0 && (
            <p className="testo-tenue">In casa ne hai già {formattaQuantita(aperta.disponibile, aperta.ingrediente.unita, aperta.ingrediente)}.</p>
          )}
          <button
            type="button"
            className="bottone pericolo"
            onClick={() => {
              rimuoviRiga(ctx, aperta.riga.id);
              setAperta(null);
              mostraAvviso(`${aperta.riga.testo} tolto dalla lista`);
            }}
          >
            Togli dalla lista
          </button>
        </Foglio>
      )}
    </section>
  );
}
