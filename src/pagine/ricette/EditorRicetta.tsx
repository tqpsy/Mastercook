import { useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { TornaIndietro } from '../../componenti/TornaIndietro';
import { Chip, SelettoreIngrediente, mostraAvviso } from '../../componenti/ui';
import { ALLERGENI_UE, CODICI_ALLERGENI, type Allergene } from '../../dominio/allergeni';
import { allergeniRicetta } from '../../dominio/suggerimenti';
import type { Portata, Ricetta, RigaIngrediente } from '../../dominio/tipi';
import { useNucleo } from '../../nucleo/contesto';
import { salvaRicettaPersonale } from '../../nucleo/azioni';
import { useRicette } from '../../nucleo/derivati';
import { REGOLE_CONSERVAZIONE } from '../../rif/conservazione';
import { NOME_PORTATA } from '../../rif/emoji';
import { ingrediente } from '../../rif/ingredienti';

const PORTATE = Object.keys(NOME_PORTATA) as Portata[];

function vuota(): Omit<Ricetta, 'id' | 'origine'> {
  return {
    titolo: '',
    portata: 'primo',
    porzioni_base: 4,
    minuti: 30,
    difficolta: 1,
    ingredienti: [],
    passaggi: [],
    allergeni_dichiarati: [],
  };
}

export function EditorRicetta() {
  const { id } = useParams();
  const [parametri] = useSearchParams();
  const ricette = useRicette();
  const nucleo = useNucleo();
  const naviga = useNavigate();
  const esistente = id ? ricette.find((r) => r.id === decodeURIComponent(id)) : undefined;
  const origine = parametri.get('da') ? ricette.find((r) => r.id === parametri.get('da')) : undefined;

  const [r, setR] = useState<Omit<Ricetta, 'id' | 'origine'>>(() => {
    const base = esistente ?? origine;
    if (!base) return vuota();
    return {
      titolo: esistente ? base.titolo : `${base.titolo} (a modo mio)`,
      portata: base.portata,
      porzioni_base: base.porzioni_base,
      minuti: base.minuti,
      difficolta: base.difficolta,
      ingredienti: base.ingredienti.map((x) => ({ ...x })),
      passaggi: [...base.passaggi],
      allergeni_dichiarati: [...base.allergeni_dichiarati],
      categoria_conservazione: base.categoria_conservazione,
      mesi_stagione: base.mesi_stagione,
      ...(origine ? { derivata_da: origine.id } : { derivata_da: base.derivata_da }),
    };
  });
  const [passaggi, setPassaggi] = useState(r.passaggi.join('\n'));

  const aggiorna = (campi: Partial<typeof r>) => setR((x) => ({ ...x, ...campi }));
  const aggiornaRiga = (i: number, campi: Partial<RigaIngrediente>) =>
    aggiorna({ ingredienti: r.ingredienti.map((riga, j) => (j === i ? { ...riga, ...campi } : riga)) });

  const calcolati = new Set(allergeniRicetta({ ...r, allergeni_dichiarati: [], id: '', origine: 'personale' }));
  const nonCollegate = r.ingredienti.some((x) => !x.ingrediente_id);
  const valida = r.titolo.trim() && r.ingredienti.length > 0 && r.porzioni_base > 0;

  function salva(e: FormEvent) {
    e.preventDefault();
    if (!valida) return;
    const nuovoId = salvaRicettaPersonale(nucleo, {
      ...r,
      id: esistente?.id,
      titolo: r.titolo.trim(),
      passaggi: passaggi.split('\n').map((p) => p.trim()).filter(Boolean),
    });
    mostraAvviso('Ricetta salvata');
    naviga(`/ricette/${encodeURIComponent(nuovoId)}`, { replace: true });
  }

  return (
    <form className="pagina" onSubmit={salva}>
      <TornaIndietro a={esistente ? `/ricette/${encodeURIComponent(esistente.id)}` : '/ricette'} />
      <h1>{esistente ? 'Modifica ricetta' : 'Nuova ricetta'}</h1>

      <label className="campo">
        <span>Titolo</span>
        <input value={r.titolo} onChange={(e) => aggiorna({ titolo: e.target.value })} placeholder="Es. Pasta della nonna" required />
      </label>
      <div className="riga-campi">
        <label className="campo">
          <span>Portata</span>
          <select value={r.portata} onChange={(e) => aggiorna({ portata: e.target.value as Portata })}>
            {PORTATE.map((p) => (
              <option key={p} value={p}>
                {NOME_PORTATA[p]}
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          <span>Porzioni</span>
          <input type="number" inputMode="numeric" min={1} value={r.porzioni_base} onChange={(e) => aggiorna({ porzioni_base: Math.max(1, Number(e.target.value)) })} />
        </label>
        <label className="campo">
          <span>Minuti</span>
          <input type="number" inputMode="numeric" min={1} value={r.minuti} onChange={(e) => aggiorna({ minuti: Math.max(1, Number(e.target.value)) })} />
        </label>
        <label className="campo">
          <span>Avanzi</span>
          <select value={r.categoria_conservazione ?? ''} onChange={(e) => aggiorna({ categoria_conservazione: e.target.value || undefined })}>
            <option value="">Non so (1 giorno)</option>
            {REGOLE_CONSERVAZIONE.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome} ({c.massimo} gg)
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="sezione">
        <h2>Ingredienti</h2>
        <small className="testo-tenue">Quantità per {r.porzioni_base} porzioni, nell’unità indicata.</small>
        {r.ingredienti.length > 0 && (
          <ul className="elenco">
            {r.ingredienti.map((riga, i) => {
              const ing = ingrediente(riga.ingrediente_id);
              return (
                <li key={i} className="voce" style={{ cursor: 'default', flexWrap: 'wrap' }}>
                  <span className="voce-testo">
                    <span className="voce-titolo">{riga.testo}</span>
                    {!ing && <span className="voce-dettaglio">Non collegato: non conta nei suggerimenti</span>}
                  </span>
                  <input
                    className="input"
                    style={{ width: 90 }}
                    type="number"
                    inputMode="decimal"
                    aria-label={`Quantità di ${riga.testo}`}
                    value={riga.quantita ?? ''}
                    onChange={(e) => aggiornaRiga(i, { quantita: e.target.value ? Number(e.target.value) : undefined })}
                  />
                  <span className="testo-tenue piccolo" style={{ width: 24 }}>
                    {riga.unita ?? ''}
                  </span>
                  <label className="spunta piccolo">
                    <input type="checkbox" checked={riga.opzionale} onChange={(e) => aggiornaRiga(i, { opzionale: e.target.checked })} />
                    facolt.
                  </label>
                  <button type="button" className="bottone-icona" aria-label={`Togli ${riga.testo}`} onClick={() => aggiorna({ ingredienti: r.ingredienti.filter((_, j) => j !== i) })}>
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <SelettoreIngrediente
          segnaposto="Aggiungi un ingrediente"
          onScegli={(ing) =>
            aggiorna({
              ingredienti: [
                ...r.ingredienti,
                { ingrediente_id: ing.id, testo: ing.nome, quantita: ing.unita === 'pz' ? 1 : 100, unita: ing.unita, scalabile: true, opzionale: false, sostituti: [] },
              ],
            })
          }
          testoLibero={(testo) =>
            aggiorna({ ingredienti: [...r.ingredienti, { testo, scalabile: true, opzionale: false, sostituti: [] }] })
          }
        />
      </div>

      <label className="campo">
        <span>Preparazione</span>
        <textarea value={passaggi} onChange={(e) => setPassaggi(e.target.value)} placeholder="Un passaggio per riga" rows={6} />
      </label>

      <fieldset className="campo">
        <legend>Allergeni</legend>
        <small>
          Quelli degli ingredienti collegati sono già segnati e non si possono togliere.
          {nonCollegate ? ' Hai righe non collegate: indica tu gli allergeni che contengono.' : ''}
        </small>
        <div className="chips">
          {CODICI_ALLERGENI.map((a: Allergene) => {
            const fisso = calcolati.has(a);
            const attivo = fisso || r.allergeni_dichiarati.includes(a);
            return (
              <Chip
                key={a}
                pericolo
                attivo={attivo}
                onClick={() =>
                  !fisso &&
                  aggiorna({
                    allergeni_dichiarati: r.allergeni_dichiarati.includes(a) ? r.allergeni_dichiarati.filter((x) => x !== a) : [...r.allergeni_dichiarati, a],
                  })
                }
              >
                {ALLERGENI_UE[a]}
                {fisso ? ' 🔒' : ''}
              </Chip>
            );
          })}
        </div>
      </fieldset>

      <button type="submit" className="bottone pieno" disabled={!valida}>
        Salva ricetta
      </button>
    </form>
  );
}
