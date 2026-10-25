import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FoglioOspiti } from '../../componenti/Ospiti';
import { Chip, Foglio, Vuoto, mostraAvviso } from '../../componenti/ui';
import { aggiungiGiorni } from '../../dominio/date';
import { NOME_PASTO, NOMI_GIORNI } from '../../dominio/dieta';
import type { TipoPasto } from '../../dominio/id';
import { ORDINE_PASTI, giorniSettimana, lunediDi, porzioniPortata } from '../../dominio/menu';
import { descriviOspiti, presenteOspiti, quantiOspiti } from '../../dominio/ospiti';
import { normalizza } from '../../dominio/ricerca';
import { motivoEsclusione } from '../../dominio/suggerimenti';
import type { Ospiti, Pasto, PortataPianificata } from '../../dominio/tipi';
import { useNucleo } from '../../nucleo/contesto';
import { useMembri, useNomeMembro, useOggi, useRicette } from '../../nucleo/derivati';
import { useDiete, useFattorePorzione, usePastiSettimana, useRicettaPerId } from '../../nucleo/hooksMenu';
import { aggiungiRicettaAlPasto, cambiaRicetta, impostaOspiti, mettiInListaMenu, togliPortata } from '../../nucleo/menu';
import { EMOJI_PORTATA, emojiIngrediente } from '../../rif/emoji';

const FORMATO_GIORNO = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const giornoBreve = (data: string) => FORMATO_GIORNO.format(new Date(`${data}T12:00:00Z`));

const porzioniTesto = (n: number) => (n === 1 ? '1 porzione' : `${String(Math.round(n * 100) / 100).replace('.', ',')} porzioni`);

export function Menu() {
  const ctx = useNucleo();
  const oggi = useOggi();
  const [parametri, setParametri] = useSearchParams();
  const lunedi = lunediDi(parametri.get('settimana') ?? oggi);
  const giorni = giorniSettimana(lunedi);
  const pasti = usePastiSettimana(lunedi);
  const diete = useDiete();
  const membri = useMembri();
  const nome = useNomeMembro();
  const fattore = useFattorePorzione();
  const ricettaPerId = useRicettaPerId();
  const [aperta, setAperta] = useState<{ pasto: Pasto; indice: number } | null>(null);
  const [aggiungiIl, setAggiungiIl] = useState<string | null>(null);
  const [ospitiDi, setOspitiDi] = useState<Pasto | null>(null);

  const perGiorno = useMemo(() => {
    const mappa = new Map<string, Pasto[]>();
    for (const p of pasti) if (p.portate.length) mappa.set(p.data, [...(mappa.get(p.data) ?? []), p]);
    for (const l of mappa.values()) l.sort((a, b) => ORDINE_PASTI.indexOf(a.tipo) - ORDINE_PASTI.indexOf(b.tipo));
    return mappa;
  }, [pasti]);
  const vuota = perGiorno.size === 0;
  const settimanaCorrente = lunedi === lunediDi(oggi);
  const daOggi = pasti.filter((p) => p.data >= oggi);

  const vai = (giorniDelta: number) => setParametri({ settimana: aggiungiGiorni(lunedi, giorniDelta) }, { replace: true });

  return (
    <section className="pagina">
      <div className="titolo-pagina">
        <div className="saluto">
          <h1>Menù</h1>
          <p className="sottotitolo">
            {settimanaCorrente ? 'Questa settimana' : lunedi > oggi ? 'Settimana prossima' : 'Settimana passata'}: {giornoBreve(giorni[0]!)} – {giornoBreve(giorni[6]!)}
          </p>
        </div>
        <div className="azioni" style={{ flexWrap: 'nowrap' }}>
          <button type="button" className="bottone piccolo secondario" onClick={() => vai(-7)} aria-label="Settimana precedente">
            ‹
          </button>
          <button type="button" className="bottone piccolo secondario" onClick={() => vai(7)} aria-label="Settimana successiva">
            ›
          </button>
        </div>
      </div>

      <div className="riquadro evidenza">
        {diete.size ? (
          <>
            <p>
              {[...diete.values()].map((d) => `Dieta di ${nome(d.membro_id)}`).join(' · ')}. Portala in questa settimana per avere le ricette giuste con le
              grammature del dietista.
            </p>
            <div className="azioni">
              <Link className="bottone" to={`/menu/dieta?settimana=${lunedi}`}>
                Porta la dieta nel menù
              </Link>
            </div>
          </>
        ) : (
          <>
            <p>Hai una dieta del dietista? Caricala (foto, PDF o testo): la leggo e preparo il menù con ricette adatte ai pasti e alle grammature.</p>
            <div className="azioni">
              <Link className="bottone" to={`/menu/dieta?settimana=${lunedi}`}>
                Carica la dieta del dietista
              </Link>
            </div>
          </>
        )}
      </div>

      {vuota && (
        <Vuoto emoji="🗓️" titolo="Il menù di questa settimana è vuoto">
          <p className="testo-tenue">Carica la dieta del dietista oppure aggiungi le ricette giorno per giorno.</p>
        </Vuoto>
      )}

      {giorni.map((data, i) => {
        const delGiorno = perGiorno.get(data) ?? [];
        if (vuota && i > 0) return null;
        return (
          <div className="sezione" key={data}>
            <div className="sezione-testa">
              <h2>
                {NOMI_GIORNI[i]} <span className="testo-tenue piccolo">{giornoBreve(data)}</span>
                {data === oggi && <span className="etichetta accento" style={{ marginLeft: 8 }}>oggi</span>}
              </h2>
              <button type="button" className="bottone-testo" onClick={() => setAggiungiIl(data)}>
                + Aggiungi
              </button>
            </div>
            {delGiorno.map((pasto) => (
              <div key={pasto.tipo} className="sezione" style={{ gap: 6 }}>
                <div className="sezione-testa">
                  <span className="piccolo testo-tenue">{NOME_PASTO[pasto.tipo]}</span>
                  {data >= oggi && (
                    <button type="button" className="bottone-testo piccolo" onClick={() => setOspitiDi(pasto)}>
                      {quantiOspiti(pasto.ospiti) ? `👥 ${descriviOspiti(pasto.ospiti)}` : '+ Ospiti'}
                    </button>
                  )}
                </div>
                <ul className="elenco">
                  {pasto.portate.map((portata, indice) => (
                    <li key={`${portata.ricetta_id ?? portata.titolo}-${indice}`}>
                      <RigaPortata
                        portata={portata}
                        dettaglio={dettaglioPortata(portata, nome, fattore, membri.length, pasto.ospiti)}
                        ospiti={pasto.ospiti}
                        onApri={() => setAperta({ pasto, indice })}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {!delGiorno.length && !vuota && <p className="testo-tenue piccolo">Niente in programma.</p>}
          </div>
        );
      })}

      {!vuota && daOggi.length > 0 && (
        <button
          type="button"
          className="bottone pieno"
          onClick={() => {
            const n = mettiInListaMenu(ctx, lunedi, daOggi, ricettaPerId, fattore);
            mostraAvviso(n ? `${n} ingredienti in lista: compri solo quello che manca in casa` : 'Non serve comprare niente');
          }}
        >
          Metti in lista la spesa {settimanaCorrente ? 'da oggi a domenica' : 'della settimana'}
        </button>
      )}

      {aperta && <FoglioPortata pasto={aperta.pasto} indice={aperta.indice} onChiudi={() => setAperta(null)} />}
      {aggiungiIl && <FoglioAggiungi data={aggiungiIl} onChiudi={() => setAggiungiIl(null)} />}
      {ospitiDi && (
        <FoglioOspiti
          titolo={`Ospiti a ${NOME_PASTO[ospitiDi.tipo].toLowerCase()}`}
          iniziale={ospitiDi.ospiti}
          onSalva={(o) => {
            impostaOspiti(ctx, ospitiDi.data, ospitiDi.tipo, o);
            mostraAvviso(o ? `${descriviOspiti(o)}: porzioni e spesa aggiornate` : 'Ospiti tolti');
          }}
          onChiudi={() => setOspitiDi(null)}
        />
      )}
    </section>
  );
}

function dettaglioPortata(
  portata: PortataPianificata,
  nome: (id: string) => string,
  fattore: (m: string) => number,
  quantiMembri: number,
  ospiti?: Ospiti,
): string {
  const parti: string[] = [];
  if (portata.membri.length && (portata.membri.length < quantiMembri || quantiMembri === 1)) parti.push(portata.membri.map(nome).join(', '));
  else parti.push('Tutti');
  const n = quantiOspiti(ospiti);
  if (portata.ricetta_id && n) parti.push(`+ ${n === 1 ? '1 ospite' : `${n} ospiti`}`);
  if (portata.ricetta_id) parti.push(porzioniTesto(porzioniPortata(portata, fattore, ospiti)));
  const note = Object.entries(portata.note_dieta ?? {});
  if (note.length === 1) parti.push(`dieta: ${note[0]![1]}`);
  else if (note.length > 1) parti.push('come da dieta');
  return parti.join(' · ');
}

function RigaPortata({ portata, dettaglio, ospiti, onApri }: { portata: PortataPianificata; dettaglio: string; ospiti?: Ospiti; onApri: () => void }) {
  const ricettaPerId = useRicettaPerId();
  const ricetta = portata.ricetta_id ? ricettaPerId(portata.ricetta_id) : undefined;
  const perOspiti = presenteOspiti(ospiti);
  // Le esigenze degli ospiti valgono per tutto il pasto: si avvisa se una portata non va bene.
  const nonAdatta = ricetta && perOspiti ? motivoEsclusione(ricetta, [perOspiti]) : undefined;
  const emoji = ricetta ? EMOJI_PORTATA[ricetta.portata] : portata.ingrediente_id ? emojiIngrediente(portata.ingrediente_id) : '🍽️';
  return (
    <button type="button" className="voce" onClick={onApri}>
      <span className="emoji" aria-hidden="true">
        {emoji}
      </span>
      <span className="voce-testo">
        <span className="voce-titolo">{portata.titolo}</span>
        <span className="voce-dettaglio">{dettaglio}</span>
        {nonAdatta && (
          <span className="voce-dettaglio" style={{ color: 'var(--rosso)' }}>
            Non adatta agli ospiti: {nonAdatta.replace(/ \(ospiti\)$/, '')}
          </span>
        )}
      </span>
      {portata.dieta_di?.length ? <span className="etichetta ok">dieta</span> : null}
    </button>
  );
}

function FoglioPortata({ pasto, indice, onChiudi }: { pasto: Pasto; indice: number; onChiudi: () => void }) {
  const ctx = useNucleo();
  const nome = useNomeMembro();
  const ricette = useRicette();
  const ricettaPerId = useRicettaPerId();
  const [cambia, setCambia] = useState(false);
  const [testo, setTesto] = useState('');
  const portata = pasto.portate[indice];
  if (!portata) return null;
  const ricetta = portata.ricetta_id ? ricettaPerId(portata.ricetta_id) : undefined;
  const q = normalizza(testo);
  const scelte = ricette
    .filter((r) => r.id !== ricetta?.id && (!ricetta || r.portata === ricetta.portata || q) && (!q || normalizza(r.titolo).includes(q)))
    .slice(0, 12);

  return (
    <Foglio titolo={portata.titolo} onChiudi={onChiudi}>
      <p className="testo-tenue">
        {NOME_PASTO[pasto.tipo]} di {NOMI_GIORNI[(new Date(`${pasto.data}T12:00:00Z`).getUTCDay() + 6) % 7]!.toLowerCase()} {giornoBreve(pasto.data)}
      </p>
      {Object.entries(portata.note_dieta ?? {}).map(([m, nota]) => (
        <p key={m} className="piccolo">
          <strong>Dieta di {nome(m)}:</strong> {nota}
          {portata.porzioni_dieta?.[m] && portata.porzioni_dieta[m] !== 1 ? ` (${porzioniTesto(portata.porzioni_dieta[m])})` : ''}
        </p>
      ))}
      {cambia ? (
        <div className="sezione">
          <label className="campo">
            <span className="nascosto-visivamente">Cerca una ricetta</span>
            <input type="search" value={testo} autoFocus onChange={(e) => setTesto(e.target.value)} placeholder="Cerca un’altra ricetta" />
          </label>
          <ul className="elenco">
            {scelte.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className="voce"
                  onClick={() => {
                    cambiaRicetta(ctx, pasto.data, pasto.tipo, indice, r);
                    mostraAvviso(`Ora c’è ${r.titolo}`);
                    onChiudi();
                  }}
                >
                  <span className="emoji" aria-hidden="true">
                    {EMOJI_PORTATA[r.portata]}
                  </span>
                  <span className="voce-testo">
                    <span className="voce-titolo">{r.titolo}</span>
                    <span className="voce-dettaglio">{r.minuti} min</span>
                  </span>
                </button>
              </li>
            ))}
            {!scelte.length && <li className="voce voce-dettaglio">Nessuna ricetta trovata.</li>}
          </ul>
        </div>
      ) : (
        <div className="azioni colonna">
          {ricetta && (
            <Link className="bottone" to={`/ricette/${encodeURIComponent(ricetta.id)}`}>
              Apri la ricetta
            </Link>
          )}
          {ricetta && (
            <button type="button" className="bottone secondario" onClick={() => setCambia(true)}>
              Cambia ricetta
            </button>
          )}
          <button
            type="button"
            className="bottone secondario"
            onClick={() => {
              togliPortata(ctx, pasto.data, pasto.tipo, indice);
              onChiudi();
            }}
          >
            Togli dal menù
          </button>
        </div>
      )}
    </Foglio>
  );
}

const PASTI_AGGIUNGI: TipoPasto[] = ['pranzo', 'cena', 'colazione', 'spuntino', 'merenda'];

function FoglioAggiungi({ data, onChiudi }: { data: string; onChiudi: () => void }) {
  const ctx = useNucleo();
  const ricette = useRicette();
  const membri = useMembri().filter((m) => m.attivo !== false);
  const [tipo, setTipo] = useState<TipoPasto>(new Date().getHours() >= 15 ? 'cena' : 'pranzo');
  const [chi, setChi] = useState<string[]>(membri.map((m) => m.id));
  const [testo, setTesto] = useState('');
  const q = normalizza(testo);
  const scelte = ricette.filter((r) => !q || normalizza(r.titolo).includes(q)).slice(0, q ? 20 : 8);
  return (
    <Foglio titolo={`Aggiungi a ${NOMI_GIORNI[(new Date(`${data}T12:00:00Z`).getUTCDay() + 6) % 7]!.toLowerCase()}`} onChiudi={onChiudi}>
      <div className="chips scorrevoli">
        {PASTI_AGGIUNGI.map((t) => (
          <Chip key={t} attivo={tipo === t} onClick={() => setTipo(t)}>
            {NOME_PASTO[t]}
          </Chip>
        ))}
      </div>
      {membri.length > 1 && (
        <div className="chips">
          {membri.map((m) => (
            <Chip key={m.id} attivo={chi.includes(m.id)} onClick={() => setChi((c) => (c.includes(m.id) ? (c.length > 1 ? c.filter((x) => x !== m.id) : c) : [...c, m.id]))}>
              {m.nome}
            </Chip>
          ))}
        </div>
      )}
      <label className="campo">
        <span className="nascosto-visivamente">Cerca una ricetta</span>
        <input type="search" value={testo} onChange={(e) => setTesto(e.target.value)} placeholder="Cerca una ricetta" />
      </label>
      <ul className="elenco">
        {scelte.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              className="voce"
              onClick={() => {
                aggiungiRicettaAlPasto(ctx, data, tipo, r, chi);
                mostraAvviso(`${r.titolo} nel menù`);
                onChiudi();
              }}
            >
              <span className="emoji" aria-hidden="true">
                {EMOJI_PORTATA[r.portata]}
              </span>
              <span className="voce-testo">
                <span className="voce-titolo">{r.titolo}</span>
                <span className="voce-dettaglio">{r.minuti} min</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Foglio>
  );
}
