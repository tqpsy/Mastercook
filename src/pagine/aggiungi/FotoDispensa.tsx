import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { leggiZona, MASSIMO_FOTO, salvaZona, type FotoSalvata, type Visto } from '../../piattaforma/archivioFoto';
import { sincronizzaFoto, useArrivoFoto } from '../../nucleo/fotoDrive';
import { leggiChiave } from '../../piattaforma/chiaviApi';
import { immagineDaFile } from '../../piattaforma/fotocamera';
import { riconosciProdotti, type ProdottoVisto } from '../../piattaforma/gemini';
import { messaggioQuotaFinita, QuotaGemini } from '../../componenti/QuotaGemini';
import { POSIZIONI } from '../../dominio/sistemazioneFrigo';
import { ConsigliFrigo } from '../../componenti/ConsigliFrigo';
import { emojiIngrediente } from '../../rif/emoji';
import { ingrediente } from '../../rif/ingredienti';

type Zona = 'frigo' | 'freezer' | 'dispensa';

const ZONE: { zona: Zona; nome: string; consiglio: string }[] = [
  { zona: 'frigo', nome: 'Frigo', consiglio: 'Una foto per ripiano, una per i cassetti e una per la portiera.' },
  { zona: 'freezer', nome: 'Freezer', consiglio: 'Una foto per cassetto: apri e inquadra dall’alto.' },
  { zona: 'dispensa', nome: 'Dispensa', consiglio: 'Una foto per ripiano o per mobile.' },
];

interface FotoMostrata {
  id: string;
  url: string;
  il: string;
  visti?: Visto[];
  esito?: 'ok' | 'errore';
}

// Foto leggere: finiscono anche sul Drive di chi ha creato il nucleo, per tutta la famiglia.
const versoJpeg = (canvas: HTMLCanvasElement) => new Promise<Blob>((ok) => canvas.toBlob((b) => ok(b!), 'image/jpeg', 0.7));

const MESSAGGI_ERRORE: Record<string, string> = {
  chiave: 'La chiave Gemini non è valida: controllala nelle impostazioni.',
  quota: 'Gemini ha ricevuto troppe richieste in poco tempo: riprova tra un minuto con il pulsante «Analizza».',
};

/** Collega i nomi visti da Gemini agli ingredienti, una volta sola ciascuno. */
function collegaVisti(nomi: ProdottoVisto[]): Visto[] {
  const visti: Visto[] = [];
  for (const v of nomi) {
    const [r] = cercaIngredienti(v.nome, 1);
    if (!r || r.confidenza < 0.6 || visti.some((x) => x.id === r.ingrediente.id)) continue;
    const posizione = POSIZIONI.find((p) => p === v.posizione);
    visti.push({ id: r.ingrediente.id, nome: v.nome, ...(posizione ? { posizione } : {}) });
  }
  return visti;
}

export function FotoDispensa() {
  const ctx = useNucleo();
  const oggi = useOggi();
  const inventario = useInventario();
  const [zona, setZona] = useState<Zona>('frigo');
  const [foto, setFoto] = useState<FotoMostrata[]>([]);
  const [analizzo, setAnalizzo] = useState<Set<string>>(new Set());
  const [esclusi, setEsclusi] = useState<Set<string>>(new Set());
  const [errore, setErrore] = useState<string | null>(null);
  const conChiave = !!leggiChiave('gemini');
  const info = ZONE.find((z) => z.zona === zona)!;
  const giro = useArrivoFoto((s) => s.giro);
  const nucleoId = ctx.nucleo.id;

  /** Allinea le foto con il Drive del nucleo; se ne arrivano di nuove la pagina si ricarica. */
  const condividi = useCallback(() => {
    sincronizzaFoto(nucleoId).catch(() => undefined);
  }, [nucleoId]);

  useEffect(condividi, [condividi]);

  useEffect(() => {
    let annullato = false;
    const creati: string[] = [];
    leggiZona(nucleoId, zona).then(({ foto: elenco }) => {
      if (annullato) return;
      setFoto(
        elenco.map((f) => {
          const url = URL.createObjectURL(f.blob);
          creati.push(url);
          return { id: f.id, url, il: f.il, visti: f.visti, esito: f.esito };
        }),
      );
    });
    return () => {
      annullato = true;
      creati.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [zona, giro, nucleoId]);

  useEffect(() => () => {
    setEsclusi(new Set());
    setErrore(null);
  }, [zona]);

  /** Aggiorna una foto salvata (e quella mostrata) con i campi indicati. */
  async function aggiornaFoto(id: string, campi: Partial<FotoSalvata>) {
    const { foto: elenco } = await leggiZona(nucleoId, zona);
    await salvaZona(
      nucleoId,
      zona,
      elenco.map((f) => (f.id === id ? { ...f, ...campi } : f)),
    );
    setFoto((x) => x.map((f) => (f.id === id ? { ...f, ...campi } : f)));
  }

  /** Fa riconoscere a Gemini i prodotti di una foto e li ricorda insieme alla foto. */
  async function analizza(id: string, immagine: HTMLCanvasElement | Blob) {
    setAnalizzo((x) => new Set(x).add(id));
    try {
      const canvas = immagine instanceof HTMLCanvasElement ? immagine : await immagineDaFile(immagine, 1280);
      const visti = collegaVisti(await riconosciProdotti(canvas, zona === 'frigo'));
      // Quello che è già in casa e si vede nella foto: aggiorna "visto il".
      const adesso = new Date().toISOString();
      for (const a of inventario.filter((x) => visti.some((v) => v.id === x.articolo.ingrediente_id))) modificaArticolo(ctx, a.articolo.id, { visto_il: adesso });
      await aggiornaFoto(id, { visti, esito: 'ok' });
    } catch (e) {
      await aggiornaFoto(id, { esito: 'errore' });
      const codice = (e as Error).message;
      setErrore(codice === 'quota_giorno' ? messaggioQuotaFinita() : MESSAGGI_ERRORE[codice] ?? 'Il riconoscimento di una foto non è riuscito: riprova con il pulsante «Analizza».');
    } finally {
      setAnalizzo((x) => {
        const y = new Set(x);
        y.delete(id);
        return y;
      });
      condividi();
    }
  }

  async function analizzaDiNuovo(tutte: boolean) {
    setErrore(null);
    const { foto: elenco } = await leggiZona(nucleoId, zona);
    // Una alla volta, per non superare i limiti gratuiti di Gemini.
    for (const f of elenco.filter((x) => tutte || x.esito !== 'ok')) await analizza(f.id, f.blob);
  }

  async function aggiungiFoto(file: File) {
    const canvas = await immagineDaFile(file, 1280);
    const blob = await versoJpeg(canvas);
    const nuova = { id: crypto.randomUUID(), blob, il: new Date().toISOString() };
    const elenco = [...(await leggiZona(nucleoId, zona)).foto, nuova].slice(-MASSIMO_FOTO);
    await salvaZona(nucleoId, zona, elenco);
    setFoto((x) => [...x, { id: nuova.id, url: URL.createObjectURL(blob), il: nuova.il }].slice(-MASSIMO_FOTO));
    condividi();
    if (conChiave) await analizza(nuova.id, canvas);
  }

  async function togliFoto(id: string) {
    await salvaZona(
      nucleoId,
      zona,
      (await leggiZona(nucleoId, zona)).foto.filter((f) => f.id !== id),
    );
    setFoto((x) => x.filter((f) => f.id !== id));
    condividi();
  }

  async function ricomincia() {
    if (!confirm(`Togliere tutte le foto di ${info.nome.toLowerCase()} e rifarle da capo?`)) return;
    await salvaZona(nucleoId, zona, []);
    setFoto([]);
    condividi();
  }

  // Tutto quello che si vede nelle foto della zona, una volta sola.
  const vistiZona = useMemo(() => {
    const mappa = new Map<string, Visto>();
    for (const f of foto) for (const v of f.visti ?? []) if (!mappa.has(v.id)) mappa.set(v.id, v);
    return mappa;
  }, [foto]);
  const inCasa = new Set(inventario.map((v) => v.articolo.ingrediente_id));
  const daAggiungere = [...vistiZona.values()].filter((v) => !inCasa.has(v.id) && ingrediente(v.id));
  const analizzate = foto.filter((f) => f.esito === 'ok').length;
  const daRifare = foto.filter((f) => f.esito !== 'ok' && !analizzo.has(f.id)).length;

  async function aggiungiSelezionati() {
    const scelti = daAggiungere.filter((v) => !esclusi.has(v.id));
    for (const v of scelti) {
      const ing = ingrediente(v.id)!;
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
    // Quelli tolti dalla scelta non vengono più proposti per queste foto.
    if (esclusi.size) {
      const { foto: elenco } = await leggiZona(nucleoId, zona);
      const pulite = elenco.map((f) => ({ ...f, visti: f.visti?.filter((v) => !esclusi.has(v.id)) }));
      await salvaZona(nucleoId, zona, pulite);
      setFoto((x) => x.map((f) => ({ ...f, visti: f.visti?.filter((v) => !esclusi.has(v.id)) })));
      setEsclusi(new Set());
      condividi();
    }
    mostraAvviso(`${scelti.length} prodotti aggiunti: controlla quantità e scadenze`);
  }

  const delLuogo = inventario
    .filter((v) => v.articolo.luogo === zona)
    .map((v) => ({ v, visto: vistiZona.has(v.articolo.ingrediente_id ?? '') }))
    // Prima quello che nelle foto non si vede: è il primo candidato a essere finito.
    .sort((a, b) => Number(a.visto) - Number(b.visto));
  const ultima = foto.reduce<string | null>((m, f) => (!m || f.il > m ? f.il : m), null);
  const piena = foto.length >= MASSIMO_FOTO;
  const miniature = foto.map((f) => ({
    id: f.id,
    url: f.url,
    etichetta: analizzo.has(f.id) ? 'analizzo…' : f.esito === 'errore' ? 'da rifare' : f.esito === 'ok' ? `${f.visti?.length ?? 0} ${f.visti?.length === 1 ? 'prodotto' : 'prodotti'}` : undefined,
    avviso: f.esito === 'errore' && !analizzo.has(f.id),
  }));

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
          <MiniatureFoto foto={miniature} descrizione={`foto ${info.nome.toLowerCase()}`} onTogli={togliFoto} />
          {ultima && (
            <p className="testo-tenue piccolo">
              {foto.length} foto · ultima scattata {descriviData(ultima.slice(0, 10), oggi)}
              {conChiave ? ` · ${analizzate} analizzate` : ''}
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
        {conChiave && foto.length > 0 && analizzo.size === 0 && (
          <button type="button" className="bottone secondario" onClick={() => analizzaDiNuovo(daRifare === 0)}>
            {daRifare > 0 ? `Analizza ${daRifare === 1 ? 'la foto mancante' : `le ${daRifare} foto mancanti`}` : 'Analizza di nuovo tutte le foto'}
          </button>
        )}
        {foto.length > 0 && (
          <button type="button" className="bottone secondario" onClick={ricomincia}>
            Rifai tutte le foto
          </button>
        )}
      </div>
      <QuotaGemini />
      {!conChiave && (
        <p className="testo-tenue piccolo">
          Con una chiave Gemini personale (gratuita) Masterfood riconosce i prodotti nelle foto e ti propone di aggiungerli.{' '}
          <Link to="/impostazioni">Aggiungila nelle impostazioni</Link>.
        </p>
      )}
      {analizzo.size > 0 && (
        <p className="testo-tenue">
          Riconosco i prodotti {analizzo.size === 1 ? 'nella foto' : `in ${analizzo.size} foto`}…
        </p>
      )}
      {errore && (
        <div className="riquadro avviso" role="alert">
          <p>{errore}</p>
        </div>
      )}

      {daAggiungere.length > 0 && (
        <div className="sezione">
          <h2>Nelle foto, ma non in casa</h2>
          <p className="testo-tenue piccolo">Togli la spunta a quello che non vuoi aggiungere: non te lo riproporrò per queste foto.</p>
          <ul className="elenco">
            {daAggiungere.map((v) => {
              const ing = ingrediente(v.id)!;
              return (
                <li key={v.id}>
                  <label className="voce">
                    <input
                      type="checkbox"
                      style={{ width: 22, height: 22, accentColor: 'var(--oliva)' }}
                      checked={!esclusi.has(v.id)}
                      onChange={(e) =>
                        setEsclusi((x) => {
                          const y = new Set(x);
                          if (e.target.checked) y.delete(v.id);
                          else y.add(v.id);
                          return y;
                        })
                      }
                    />
                    <span className="emoji" aria-hidden="true">
                      {emojiIngrediente(ing.id)}
                    </span>
                    <span className="voce-testo">
                      <span className="voce-titolo">{ing.nome}</span>
                      <span className="voce-dettaglio">visto: {v.nome} · quantità e scadenza da verificare</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <button type="button" className="bottone" onClick={aggiungiSelezionati}>
            {esclusi.size ? 'Aggiungi i selezionati' : 'Aggiungi tutti'}
          </button>
        </div>
      )}
      {analizzate > 0 && daAggiungere.length === 0 && analizzo.size === 0 && (
        <p className="testo-tenue piccolo">Tutto quello che vedo nelle foto è già nell’inventario.</p>
      )}

      {zona === 'frigo' && (
        <ConsigliFrigo
          prodotti={
            analizzate > 0
              ? foto.flatMap((f) => (f.visti ?? []).map((v) => ({ id: v.id, posizione: POSIZIONI.find((p) => p === v.posizione) })))
              : delLuogo.flatMap(({ v }) => (v.articolo.ingrediente_id ? [{ id: v.articolo.ingrediente_id }] : []))
          }
          dalleFoto={analizzate > 0}
        />
      )}

      {foto.length > 0 && delLuogo.length > 0 && (
        <div className="sezione">
          <h2>{info.nome}: cosa c’è secondo l’inventario</h2>
          <p className="testo-tenue piccolo">
            {analizzate > 0 ? 'In cima quello che nelle foto non vedo: se è finito, segnalo.' : 'Confronta le foto con l’inventario: segna quello che è finito.'}
          </p>
          <ul className="elenco">
            {delLuogo.map(({ v, visto }) => (
              <li key={v.articolo.id} className="voce" style={{ cursor: 'default' }}>
                <span className="emoji" aria-hidden="true">
                  {emojiIngrediente(v.articolo.ingrediente_id)}
                </span>
                <span className="voce-testo">
                  <span className="voce-titolo">{v.articolo.nome}</span>
                  <span className="voce-dettaglio">
                    {unitaArticolo(v)} · <EtichettaScadenza valutato={v} oggi={oggi} />
                    {analizzate > 0 ? (visto ? ' · ✓ visto nelle foto' : ' · non visto nelle foto') : ''}
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
