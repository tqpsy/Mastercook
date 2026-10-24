import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { EtichettaScadenza } from '../../componenti/EtichettaScadenza';
import { unitaArticolo } from '../../componenti/FoglioArticolo';
import { TornaIndietro } from '../../componenti/TornaIndietro';
import { Chip, mostraAvviso } from '../../componenti/ui';
import { descriviData } from '../../dominio/date';
import { cercaIngredienti } from '../../dominio/ricerca';
import { useNucleo } from '../../nucleo/contesto';
import { aggiungiArticolo, consumaArticolo, modificaArticolo, scadenzaStimata } from '../../nucleo/azioni';
import { useInventario, useOggi } from '../../nucleo/derivati';
import { leggiFoto, salvaFoto } from '../../piattaforma/archivioFoto';
import { leggiChiave } from '../../piattaforma/chiaviApi';
import { immagineDaFile } from '../../piattaforma/fotocamera';
import { riconosciProdotti } from '../../piattaforma/gemini';
import { emojiIngrediente } from '../../rif/emoji';
import type { Ingrediente } from '../../rif/ingredienti';

type Tipo = 'frigo' | 'dispensa';

interface Proposta {
  nome: string;
  ingrediente: Ingrediente;
  scelto: boolean;
}

export function FotoDispensa() {
  const ctx = useNucleo();
  const oggi = useOggi();
  const inventario = useInventario();
  const [tipo, setTipo] = useState<Tipo>('frigo');
  const [url, setUrl] = useState<string | null>(null);
  const [scattata, setScattata] = useState<string | null>(null);
  const [proposte, setProposte] = useState<Proposta[] | null>(null);
  const [inCorso, setInCorso] = useState(false);
  const conChiave = !!leggiChiave('gemini');

  useEffect(() => {
    let annullato = false;
    let creato: string | null = null;
    leggiFoto(`foto:${tipo}`).then((f) => {
      if (annullato || !f) return;
      creato = URL.createObjectURL(f.blob);
      setUrl(creato);
      setScattata(f.il);
    });
    return () => {
      annullato = true;
      if (creato) URL.revokeObjectURL(creato);
      setUrl(null);
      setScattata(null);
      setProposte(null);
    };
  }, [tipo]);

  async function nuovaFoto(file: File) {
    const canvas = await immagineDaFile(file);
    const blob = await new Promise<Blob>((ok) => canvas.toBlob((b) => ok(b!), 'image/jpeg', 0.8));
    await salvaFoto(`foto:${tipo}`, blob);
    setUrl(URL.createObjectURL(blob));
    setScattata(new Date().toISOString());
    if (!conChiave) return;
    setInCorso(true);
    try {
      const visti = await riconosciProdotti(canvas);
      const presenti = new Set(inventario.map((v) => v.articolo.ingrediente_id));
      const nuove: Proposta[] = [];
      for (const v of visti) {
        const [r] = cercaIngredienti(v.nome, 1);
        if (!r || r.confidenza < 0.6 || nuove.some((p) => p.ingrediente.id === r.ingrediente.id)) continue;
        if (presenti.has(r.ingrediente.id)) {
          // Già in casa: aggiorna solo "visto il".
          for (const a of inventario.filter((x) => x.articolo.ingrediente_id === r.ingrediente.id)) modificaArticolo(ctx, a.articolo.id, { visto_il: new Date().toISOString() });
          continue;
        }
        nuove.push({ nome: v.nome, ingrediente: r.ingrediente, scelto: r.confidenza >= 0.85 });
      }
      setProposte(nuove);
    } catch (e) {
      mostraAvviso((e as Error).message === 'chiave' ? 'La chiave Gemini non è valida: controllala nelle impostazioni' : 'Riconoscimento non riuscito, riprova più tardi');
    } finally {
      setInCorso(false);
    }
  }

  const delLuogo = inventario.filter((v) => v.articolo.luogo === tipo);

  return (
    <section className="pagina">
      <TornaIndietro a="/aggiungi" />
      <div className="saluto">
        <h1>Foto di frigo e dispensa</h1>
        <p className="sottotitolo">Una foto aggiornata per tipo: utile quando sei al supermercato.</p>
      </div>
      <div className="chips">
        <Chip attivo={tipo === 'frigo'} onClick={() => setTipo('frigo')}>
          Frigo
        </Chip>
        <Chip attivo={tipo === 'dispensa'} onClick={() => setTipo('dispensa')}>
          Dispensa
        </Chip>
      </div>
      {url && (
        <figure className="sezione" style={{ margin: 0 }}>
          <img src={url} alt={`Foto del ${tipo}`} style={{ width: '100%', borderRadius: 'var(--raggio)' }} />
          {scattata && <figcaption className="testo-tenue piccolo">Scattata {descriviData(scattata.slice(0, 10), oggi)}</figcaption>}
        </figure>
      )}
      <label className="bottone">
        {url ? 'Scatta una nuova foto' : 'Scatta la foto'}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="nascosto-visivamente"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) nuovaFoto(f);
            e.target.value = '';
          }}
        />
      </label>
      {!conChiave && (
        <p className="testo-tenue piccolo">
          Con una chiave Gemini personale Masterfood riconosce i prodotti nella foto e ti propone di aggiungerli.{' '}
          <Link to="/impostazioni">Aggiungila nelle impostazioni</Link>.
        </p>
      )}
      {inCorso && <p className="testo-tenue">Riconosco i prodotti nella foto…</p>}

      {proposte && (
        <div className="sezione">
          <h2>Ho visto anche</h2>
          {proposte.length === 0 ? (
            <p className="testo-tenue">Niente di nuovo rispetto all’inventario.</p>
          ) : (
            <>
              <ul className="elenco">
                {proposte.map((p, i) => (
                  <li key={p.ingrediente.id}>
                    <label className="voce">
                      <input
                        type="checkbox"
                        style={{ width: 22, height: 22, accentColor: 'var(--oliva)' }}
                        checked={p.scelto}
                        onChange={(e) => setProposte((x) => x!.map((q, j) => (j === i ? { ...q, scelto: e.target.checked } : q)))}
                      />
                      <span className="emoji" aria-hidden="true">
                        {emojiIngrediente(p.ingrediente.id)}
                      </span>
                      <span className="voce-testo">
                        <span className="voce-titolo">{p.ingrediente.nome}</span>
                        <span className="voce-dettaglio">visto: {p.nome} · quantità e scadenza da verificare</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="bottone"
                onClick={() => {
                  const scelti = proposte.filter((p) => p.scelto);
                  for (const { ingrediente: ing } of scelti) {
                    aggiungiArticolo(ctx, {
                      nome: ing.nome,
                      ingrediente_id: ing.id,
                      unita: ing.unita,
                      quantita: ing.formato ?? 1,
                      luogo: tipo,
                      data_scadenza: scadenzaStimata(ing.id, tipo),
                      tipo_scadenza: 'stimata',
                      origine: 'foto',
                    });
                  }
                  mostraAvviso(`${scelti.length} prodotti aggiunti: controlla quantità e scadenze`);
                  setProposte(null);
                }}
              >
                Aggiungi i selezionati
              </button>
            </>
          )}
        </div>
      )}

      {url && delLuogo.length > 0 && (
        <div className="sezione">
          <h2>C’è ancora?</h2>
          <p className="testo-tenue piccolo">Confronta la foto con l’inventario: segna quello che è finito.</p>
          <ul className="elenco">
            {delLuogo.map((v) => (
              <li key={v.articolo.id} className="voce" style={{ cursor: 'default' }}>
                <span className="emoji" aria-hidden="true">
                  {emojiIngrediente(v.articolo.ingrediente_id)}
                </span>
                <span className="voce-testo">
                  <span className="voce-titolo">{v.articolo.nome}</span>
                  <span className="voce-dettaglio">
                    {unitaArticolo(v)} · <EtichettaScadenza valutato={v} oggi={oggi} />
                  </span>
                </span>
                <button
                  type="button"
                  className="bottone secondario piccolo"
                  onClick={() => {
                    consumaArticolo(ctx, v.articolo, v.quantita);
                    mostraAvviso(`${v.articolo.nome}: finito`);
                  }}
                >
                  Finito
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
