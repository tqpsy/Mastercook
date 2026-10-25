import { useMemo, useState } from 'react';
import { nomeCucina } from '../../rif/ricetteBase';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { IconaCuore } from '../../componenti/Icone';
import { TornaIndietro } from '../../componenti/TornaIndietro';
import { Chip, Foglio, PassoQuantita, Vuoto, mostraAvviso } from '../../componenti/ui';
import { ALLERGENI_UE } from '../../dominio/allergeni';
import { formattaQuantita } from '../../dominio/formato';
import { valutaRicetta } from '../../dominio/suggerimenti';
import type { ArticoloInventario } from '../../dominio/tipi';
import { useNucleo } from '../../nucleo/contesto';
import { aggiungiMancanti, eliminaRicetta, hoCucinato, impostaPreferita } from '../../nucleo/azioni';
import { useContestoSuggerimenti, useMembri, useMetaRicette, useRicette } from '../../nucleo/derivati';
import { useCollezione } from '../../nucleo/hooks';
import { regolaConservazione } from '../../rif/conservazione';
import { EMOJI_PORTATA, NOME_PORTATA } from '../../rif/emoji';
import { ingrediente } from '../../rif/ingredienti';
import { useSessione } from '../../stato/sessione';
import { SceltaPresenti } from './Ricette';

const DIFFICOLTA = { 1: 'Facile', 2: 'Media', 3: 'Impegnativa' } as const;

export function DettaglioRicetta() {
  const { id = '' } = useParams();
  const ricettaId = decodeURIComponent(id);
  const ricetta = useRicette().find((r) => r.id === ricettaId);
  const presenti = useSessione((s) => s.presenti);
  const ospiti = useSessione((s) => s.ospiti);
  const membri = useMembri();
  const ctx = useContestoSuggerimenti(presenti ?? undefined, ospiti);
  const nucleo = useNucleo();
  const meta = useMetaRicette().get(ricettaId);
  const articoli = useCollezione<ArticoloInventario>('inventario');
  const naviga = useNavigate();
  const [cucina, setCucina] = useState(false);

  const s = useMemo(() => (ricetta ? valutaRicetta(ricetta, ctx) : null), [ricetta, ctx]);
  if (!ricetta || !s) {
    return (
      <section className="pagina">
        <TornaIndietro a="/ricette" />
        <Vuoto emoji="🍽️" titolo="Ricetta non trovata" />
      </section>
    );
  }

  const persone = ctx.presenti.reduce((t, p) => t + p.fattore_porzione, 0) || 1;
  const idPresenti = presenti ?? membri.filter((m) => m.attivo !== false).map((m) => m.id);
  const preferita = !!meta?.preferita;

  return (
    <section className="pagina">
      <TornaIndietro a="/ricette" testo="Ricette" />
      <div className="sezione">
        <div className="titolo-pagina">
          <h1>
            <span aria-hidden="true">{EMOJI_PORTATA[ricetta.portata]} </span>
            {ricetta.titolo}
          </h1>
          <button
            type="button"
            className="bottone-icona"
            aria-label={preferita ? 'Togli dalle preferite' : 'Aggiungi alle preferite'}
            aria-pressed={preferita}
            style={{ color: preferita ? 'var(--terracotta)' : undefined }}
            onClick={() => impostaPreferita(nucleo, ricetta.id, !preferita)}
          >
            <IconaCuore pieno={preferita} />
          </button>
        </div>
        <div className="azioni">
          <span className="etichetta">{NOME_PORTATA[ricetta.portata]}</span>
          <span className="etichetta">{ricetta.minuti} min</span>
          <span className="etichetta">{DIFFICOLTA[ricetta.difficolta]}</span>
          {ricetta.cucina && ricetta.cucina !== 'italiana' && <span className="etichetta">{nomeCucina(ricetta.cucina)}</span>}
          {ricetta.origine === 'personale' && <span className="etichetta accento">Tua ricetta</span>}
          {s.allergeni.map((a) => (
            <span key={a} className="etichetta attenzione">
              {ALLERGENI_UE[a]}
            </span>
          ))}
        </div>
      </div>

      {s.esclusione && (
        <div className="riquadro" style={{ background: 'var(--rosso-tenue)', borderColor: 'transparent', color: 'var(--rosso)' }}>
          <strong>Non adatta a chi mangia oggi</strong>
          <p>{s.esclusione}.</p>
        </div>
      )}

      <SceltaPresenti />

      <div className="sezione">
        <div className="sezione-testa">
          <h2>Ingredienti</h2>
          <span className="testo-tenue piccolo">per {persone.toLocaleString('it-IT', { maximumFractionDigits: 1 })} {persone === 1 ? 'porzione' : 'porzioni'}</span>
        </div>
        <ul className="elenco ingredienti-ricetta">
          {s.righe.map((r, i) => {
            const ing = ingrediente(r.riga.ingrediente_id);
            const classe = ing?.base ? 'base' : r.copertura >= 0.9 ? 'ok' : 'manca';
            return (
              <li key={i} className={classe}>
                <span className="stato-pallino" aria-hidden="true" />
                <span className="voce-testo">
                  <span>
                    {r.riga.testo}
                    {r.riga.opzionale && <span className="testo-tenue"> (facoltativo)</span>}
                  </span>
                  {classe === 'manca' && !r.nonConteggiata && (
                    <span className="voce-dettaglio">
                      {r.disponibile > 0 ? `In casa ne hai ${formattaQuantita(r.disponibile, ing!.unita, ing)}` : 'Non ce l’hai'}
                    </span>
                  )}
                </span>
                <span className="testo-tenue piccolo">
                  {r.richiesto > 0 && ing && !ing.base ? formattaQuantita(r.richiesto, ing.unita, ing) : ing?.base ? 'q.b.' : ''}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="azioni">
          {s.mancanti.length > 0 && (
            <button
              type="button"
              className="bottone secondario"
              onClick={() => {
                const n = aggiungiMancanti(nucleo, s, idPresenti);
                mostraAvviso(`${n} ${n === 1 ? 'ingrediente aggiunto' : 'ingredienti aggiunti'} alla lista`);
              }}
            >
              Aggiungi i mancanti alla lista
            </button>
          )}
          <button type="button" className="bottone" onClick={() => setCucina(true)}>
            Ho cucinato
          </button>
        </div>
      </div>

      <div className="sezione">
        <h2>Preparazione</h2>
        <ol className="passaggi">
          {ricetta.passaggi.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ol>
        {ricetta.provenienza && <p className="testo-tenue piccolo">Provenienza: {ricetta.provenienza}.</p>}
      </div>

      <div className="azioni">
        {ricetta.origine === 'personale' ? (
          <>
            <Link className="bottone secondario piccolo" to={`/ricette/${encodeURIComponent(ricetta.id)}/modifica`}>
              Modifica
            </Link>
            <button
              type="button"
              className="bottone pericolo piccolo"
              onClick={() => {
                if (!confirm(`Eliminare «${ricetta.titolo}»?`)) return;
                eliminaRicetta(nucleo, ricetta.id);
                naviga('/ricette');
              }}
            >
              Elimina
            </button>
          </>
        ) : (
          <Link className="bottone secondario piccolo" to={`/ricette/nuova?da=${encodeURIComponent(ricetta.id)}`}>
            Personalizza
          </Link>
        )}
      </div>

      {cucina && (
        <FoglioHoCucinato
          onChiudi={() => setCucina(false)}
          onConferma={(porzioniAvanzate, luogoAvanzo, giorniAvanzo) => {
            hoCucinato(nucleo, articoli, { suggerimento: s, porzioniAvanzate, luogoAvanzo, giorniAvanzo });
            setCucina(false);
            mostraAvviso(porzioniAvanzate > 0 ? 'Fatto: ingredienti scalati e avanzo messo in casa' : 'Fatto: ingredienti scalati dalla dispensa');
          }}
          categoria={ricetta.categoria_conservazione}
        />
      )}
    </section>
  );
}

function FoglioHoCucinato({
  onChiudi,
  onConferma,
  categoria,
}: {
  onChiudi: () => void;
  onConferma: (porzioni: number, luogo: 'frigo' | 'freezer', giorni: number) => void;
  categoria?: string;
}) {
  const regola = regolaConservazione(categoria);
  const [porzioni, setPorzioni] = useState(0);
  const [luogo, setLuogo] = useState<'frigo' | 'freezer'>('frigo');
  const [giorni, setGiorni] = useState(regola.consigliati);
  return (
    <Foglio titolo="Ho cucinato" onChiudi={onChiudi}>
      <p>Tolgo dalla dispensa gli ingredienti usati, iniziando da quelli che scadono prima.</p>
      <label className="campo">
        <span>Porzioni avanzate</span>
        <PassoQuantita valore={porzioni} onCambia={setPorzioni} passo={1} etichetta="Porzioni avanzate" />
      </label>
      {porzioni > 0 && (
        <>
          <div className="chips">
            <Chip attivo={luogo === 'frigo'} onClick={() => setLuogo('frigo')}>
              In frigo
            </Chip>
            <Chip attivo={luogo === 'freezer'} onClick={() => setLuogo('freezer')}>
              In freezer
            </Chip>
          </div>
          {luogo === 'frigo' && (
            <fieldset className="campo">
              <legend>Da mangiare entro</legend>
              <div className="chips">
                {Array.from({ length: regola.massimo }, (_, i) => i + 1).map((g) => (
                  <Chip key={g} attivo={giorni === g} onClick={() => setGiorni(g)}>
                    {g === 1 ? 'domani' : `${g} giorni`}
                    {g === regola.consigliati ? ' (consigliato)' : ''}
                  </Chip>
                ))}
              </div>
              <small>
                {regola.nome}: al massimo {regola.massimo} {regola.massimo === 1 ? 'giorno' : 'giorni'} in frigo. Non si può andare oltre per
                sicurezza; se pensi di non mangiarlo in tempo, congelalo.
              </small>
            </fieldset>
          )}
        </>
      )}
      <button type="button" className="bottone pieno" onClick={() => onConferma(porzioni, luogo, giorni)}>
        Conferma
      </button>
    </Foglio>
  );
}
