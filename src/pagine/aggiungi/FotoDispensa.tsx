import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { EtichettaScadenza } from '../../componenti/EtichettaScadenza';
import { unitaArticolo } from '../../componenti/FoglioArticolo';
import { MiniatureFoto } from '../../componenti/MiniatureFoto';
import { TornaIndietro } from '../../componenti/TornaIndietro';
import { Chip, mostraAvviso } from '../../componenti/ui';
import { descriviData } from '../../dominio/date';
import { cercaIngredienti } from '../../dominio/ricerca';
import { useNucleo } from '../../nucleo/contesto';
import { aggiungiArticolo, consumaArticolo, modificaArticolo, scadenzaStimata } from '../../nucleo/azioni';
import { useInventario, useOggi } from '../../nucleo/derivati';
import { leggiFotoZona, MASSIMO_FOTO, salvaFotoZona } from '../../piattaforma/archivioFoto';
import { leggiChiave } from '../../piattaforma/chiaviApi';
import { immagineDaFile } from '../../piattaforma/fotocamera';
import { riconosciProdotti } from '../../piattaforma/gemini';
import { emojiIngrediente } from '../../rif/emoji';
import type { Ingrediente } from '../../rif/ingredienti';

type Zona = 'frigo' | 'freezer' | 'dispensa';

const ZONE: { zona: Zona; nome: string; consiglio: string }[] = [
  { zona: 'frigo', nome: 'Frigo', consiglio: 'Una foto per ripiano, una per i cassetti e una per la portiera.' },
  { zona: 'freezer', nome: 'Freezer', consiglio: 'Una foto per cassetto: apri e inquadra dall’alto.' },
  { zona: 'dispensa', nome: 'Dispensa', consiglio: 'Una foto per ripiano o per mobile.' },
];

interface Proposta {
  nome: string;
  ingrediente: Ingrediente;
  scelto: boolean;
}

interface FotoMostrata {
  id: string;
  url: string;
  il: string;
}

const versoJpeg = (canvas: HTMLCanvasElement) => new Promise<Blob>((ok) => canvas.toBlob((b) => ok(b!), 'image/jpeg', 0.8));

export function FotoDispensa() {
  const ctx = useNucleo();
  const oggi = useOggi();
  const inventario = useInventario();
  const [zona, setZona] = useState<Zona>('frigo');
  const [foto, setFoto] = useState<FotoMostrata[]>([]);
  const [proposte, setProposte] = useState<Proposta[] | null>(null);
  const [inCorso, setInCorso] = useState(0);
  const conChiave = !!leggiChiave('gemini');
  const info = ZONE.find((z) => z.zona === zona)!;

  useEffect(() => {
    let annullato = false;
    const creati: string[] = [];
    leggiFotoZona(zona).then((elenco) => {
      if (annullato) return;
      setFoto(
        elenco.map((f) => {
          const url = URL.createObjectURL(f.blob);
          creati.push(url);
          return { id: f.id, url, il: f.il };
        }),
      );
    });
    return () => {
      annullato = true;
      creati.forEach((u) => URL.revokeObjectURL(u));
      setFoto([]);
      setProposte(null);
    };
  }, [zona]);

  async function riconosci(canvas: HTMLCanvasElement) {
    setInCorso((n) => n + 1);
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
      // Le foto di una zona si sommano: ogni prodotto proposto una volta sola.
      setProposte((prima) => [...(prima ?? []), ...nuove.filter((n) => !prima?.some((p) => p.ingrediente.id === n.ingrediente.id))]);
    } catch (e) {
      mostraAvviso((e as Error).message === 'chiave' ? 'La chiave Gemini non è valida: controllala nelle impostazioni' : 'Riconoscimento non riuscito, riprova più tardi');
    } finally {
      setInCorso((n) => n - 1);
    }
  }

  async function aggiungiFoto(file: File) {
    const canvas = await immagineDaFile(file);
    const blob = await versoJpeg(canvas);
    const nuova = { id: crypto.randomUUID(), blob, il: new Date().toISOString() };
    const elenco = [...(await leggiFotoZona(zona)), nuova].slice(-MASSIMO_FOTO);
    await salvaFotoZona(zona, elenco);
    setFoto((x) => [...x, { id: nuova.id, url: URL.createObjectURL(blob), il: nuova.il }].slice(-MASSIMO_FOTO));
    if (conChiave) await riconosci(canvas);
  }

  async function togliFoto(id: string) {
    await salvaFotoZona(
      zona,
      (await leggiFotoZona(zona)).filter((f) => f.id !== id),
    );
    setFoto((x) => x.filter((f) => f.id !== id));
  }

  async function ricomincia() {
    if (!confirm(`Togliere tutte le foto di ${info.nome.toLowerCase()} e rifarle da capo?`)) return;
    await salvaFotoZona(zona, []);
    setFoto([]);
    setProposte(null);
  }

  const delLuogo = inventario.filter((v) => v.articolo.luogo === zona);
  const ultima = foto.reduce<string | null>((m, f) => (!m || f.il > m ? f.il : m), null);
  const piena = foto.length >= MASSIMO_FOTO;

  return (
    <section className="pagina">
      <TornaIndietro a="/aggiungi" />
      <div className="saluto">
        <h1>Foto di frigo, freezer e dispensa</h1>
        <p className="sottotitolo">Tieni le foto aggiornate: utili quando sei al supermercato.</p>
      </div>
      <div className="chips">
        {ZONE.map((z) => (
          <Chip key={z.zona} attivo={zona === z.zona} onClick={() => setZona(z.zona)}>
            {z.nome}
          </Chip>
        ))}
      </div>
      <p className="testo-tenue piccolo">
        {info.consiglio} Fino a {MASSIMO_FOTO} foto.
      </p>
      {foto.length > 0 && (
        <div className="sezione">
          <MiniatureFoto foto={foto} descrizione={`foto ${info.nome.toLowerCase()}`} onTogli={togliFoto} />
          {ultima && (
            <p className="testo-tenue piccolo">
              {foto.length} foto · ultima scattata {descriviData(ultima.slice(0, 10), oggi)}
            </p>
          )}
        </div>
      )}
      <div className="azioni colonna">
        {!piena && (
          <label className="bottone">
            {foto.length ? 'Aggiungi un’altra foto' : 'Scatta la prima foto'}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="nascosto-visivamente"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) aggiungiFoto(f);
                e.target.value = '';
              }}
            />
          </label>
        )}
        {foto.length > 0 && (
          <button type="button" className="bottone secondario" onClick={ricomincia}>
            Rifai tutte le foto
          </button>
        )}
      </div>
      {!conChiave && (
        <p className="testo-tenue piccolo">
          Con una chiave Gemini personale Masterfood riconosce i prodotti nelle foto e ti propone di aggiungerli.{' '}
          <Link to="/impostazioni">Aggiungila nelle impostazioni</Link>.
        </p>
      )}
      {inCorso > 0 && <p className="testo-tenue">Riconosco i prodotti nella foto…</p>}

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
                      luogo: zona,
                      data_scadenza: scadenzaStimata(ing.id, zona),
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

      {foto.length > 0 && delLuogo.length > 0 && (
        <div className="sezione">
          <h2>C’è ancora?</h2>
          <p className="testo-tenue piccolo">Confronta le foto con l’inventario: segna quello che è finito.</p>
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
