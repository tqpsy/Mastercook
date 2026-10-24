import { useCallback, useEffect, useRef, useState } from 'react';
import { ModuloCarico } from '../../componenti/ModuloCarico';
import { TornaIndietro } from '../../componenti/TornaIndietro';
import { SelettoreIngrediente, mostraAvviso } from '../../componenti/ui';
import { ALLERGENI_UE } from '../../dominio/allergeni';
import { idProdottoOff } from '../../dominio/id';
import { useNucleo } from '../../nucleo/contesto';
import { collezione, inserisciEntita, modificaEntita } from '../../piattaforma/documento';
import { creaRilevatore, useFotocamera } from '../../piattaforma/fotocamera';
import { codiceInterno, codiceValido, cercaProdotto, ErroreOff, genuinitaProdotto, gtin13, type ProdottoOff } from '../../piattaforma/openFoodFacts';
import { ingrediente } from '../../rif/ingredienti';
import { VERSIONE_GENUINITA } from '../../dominio/genuinita';

type Fase = { tipo: 'scansione' } | { tipo: 'ricerca'; codice: string } | { tipo: 'trovato'; prodotto: ProdottoOff } | { tipo: 'sconosciuto'; codice: string; motivo: string };

const PALLINI = ['', '●', '●●', '●●●', '●●●●', '●●●●●'];

export function VotoGenuinita({ prodotto }: { prodotto: ProdottoOff }) {
  const esito = genuinitaProdotto(prodotto);
  if (!esito.valutabile) return <span className="etichetta">Genuinità: non valutabile</span>;
  const classe = esito.voto >= 4 ? 'ok' : esito.voto === 3 ? '' : esito.voto === 2 ? 'attenzione' : 'pericolo';
  return (
    <span className={`etichetta ${classe}`} title={`Genuinità ${esito.voto} su 5`}>
      Genuinità {PALLINI[esito.voto]} {esito.etichetta}
    </span>
  );
}

/** Salva (o aggiorna) la copia del prodotto nel catalogo del nucleo, con l'ingrediente scelto. */
function salvaProdotto(ctx: ReturnType<typeof useNucleo>, p: ProdottoOff, ingredienteId?: string): string {
  const id = idProdottoOff(gtin13(p.gtin));
  const esito = genuinitaProdotto(p);
  const dati = {
    fonte: 'off',
    gtin: p.gtin,
    nome: p.nome,
    marca: p.marca,
    formato: p.formato,
    ingrediente_id: ingredienteId,
    reparto: ingrediente(ingredienteId)?.reparto,
    allergeni: p.allergeni,
    tracce: p.tracce,
    additivi: p.additivi,
    biologico: p.biologico,
    nova: p.nova,
    nutri_score: p.nutri_score,
    genuinita: { voto: esito.valutabile ? esito.voto : null, versione: VERSIONE_GENUINITA },
  };
  const catalogo = collezione(ctx.dati, 'prodotti_nucleo');
  const esistente = catalogo.get(id);
  if (esistente) modificaEntita(esistente, dati, ctx.membroId);
  else inserisciEntita(catalogo, { id, ...dati }, ctx.membroId);
  return id;
}

export function ScansionaCodice() {
  const ctx = useNucleo();
  const [fase, setFase] = useState<Fase>({ tipo: 'scansione' });
  const [manuale, setManuale] = useState('');
  const [suggerisciManuale, setSuggerisciManuale] = useState(false);
  const [ingredienteScelto, setIngredienteScelto] = useState<string | undefined>();
  const { video, stato } = useFotocamera(fase.tipo === 'scansione');
  const ultimo = useRef<string | null>(null);

  /** Prima il catalogo del nucleo, poi i codici interni del negozio, infine Open Food Facts. */
  const avvia = useCallback(
    (codice: string) => {
      const nelCatalogo = collezione(ctx.dati, 'prodotti_nucleo').get(idProdottoOff(gtin13(codice)))?.toJSON() as
        | (ProdottoOff & { ingrediente_id?: string })
        | undefined;
      if (nelCatalogo) {
        setIngredienteScelto(nelCatalogo.ingrediente_id);
        setFase({ tipo: 'trovato', prodotto: { ...nelCatalogo, gtin: codice, confidenza: 0.98 } });
      } else if (codiceInterno(codice)) {
        setFase({ tipo: 'sconosciuto', codice, motivo: 'È un codice interno del negozio (spesso a peso variabile): scegli tu cos’è.' });
      } else {
        setFase({ tipo: 'ricerca', codice });
      }
    },
    [ctx.dati],
  );

  // Il codice è valido se letto uguale in due fotogrammi di fila e con la cifra di controllo giusta.
  useEffect(() => {
    if (fase.tipo !== 'scansione' || stato !== 'attiva') return;
    let fermo = false;
    const timer = setTimeout(() => setSuggerisciManuale(true), 8000);
    creaRilevatore()
      .then(async (rilevatore) => {
        while (!fermo) {
          const v = video.current;
          if (v && v.readyState >= 2) {
            const trovati = await rilevatore.detect(v).catch(() => []);
            const codice = trovati.map((t) => t.rawValue).find(codiceValido);
            if (codice && codice === ultimo.current) {
              navigator.vibrate?.(40);
              avvia(codice);
              return;
            }
            ultimo.current = codice ?? null;
          }
          await new Promise((r) => setTimeout(r, 150));
        }
      })
      .catch(() => setSuggerisciManuale(true));
    return () => {
      fermo = true;
      clearTimeout(timer);
    };
  }, [fase.tipo, stato, video, avvia]);

  useEffect(() => {
    if (fase.tipo !== 'ricerca') return;
    const { codice } = fase;
    cercaProdotto(codice)
      .then((p) => {
        setIngredienteScelto(p.confidenza >= 0.6 ? p.ingrediente_id : undefined);
        setFase({ tipo: 'trovato', prodotto: p });
      })
      .catch((e: ErroreOff) =>
        setFase({
          tipo: 'sconosciuto',
          codice,
          motivo:
            e.tipo === 'non_trovato'
              ? 'Questo prodotto non è ancora su Open Food Facts.'
              : 'Non riesco a raggiungere Open Food Facts adesso. Puoi aggiungerlo scegliendo l’ingrediente.',
        }),
      );
  }, [fase]);

  const ricomincia = () => {
    ultimo.current = null;
    setIngredienteScelto(undefined);
    setSuggerisciManuale(false);
    setFase({ tipo: 'scansione' });
  };

  return (
    <section className="pagina">
      <TornaIndietro a="/aggiungi" />
      <h1>Scansiona il codice</h1>

      {fase.tipo === 'scansione' && (
        <>
          {stato === 'negata' && (
            <div className="riquadro avviso">
              <p>Masterfood non ha il permesso di usare la fotocamera. Puoi abilitarlo dalle impostazioni del browser, oppure scrivere il codice qui sotto.</p>
            </div>
          )}
          {stato === 'assente' && (
            <div className="riquadro avviso">
              <p>La fotocamera non è disponibile su questo dispositivo. Scrivi il codice qui sotto.</p>
            </div>
          )}
          {stato !== 'negata' && stato !== 'assente' && (
            <div className="anteprima-video">
              <video ref={video} playsInline muted />
              <div className="mirino" />
            </div>
          )}
          <p className="testo-tenue piccolo">Inquadra il codice a barre dentro il riquadro, ben illuminato.</p>
          <form
            className="riga-campi"
            style={{ gridTemplateColumns: '1fr auto', alignItems: 'end' }}
            onSubmit={(e) => {
              e.preventDefault();
              const c = manuale.replace(/\D/g, '');
              if (codiceValido(c)) avvia(c);
              else mostraAvviso('Il codice non sembra corretto: controlla le cifre');
            }}
          >
            <label className="campo">
              <span>{suggerisciManuale ? 'Non si legge? Scrivi le cifre' : 'Oppure scrivi le cifre'}</span>
              <input inputMode="numeric" value={manuale} onChange={(e) => setManuale(e.target.value)} placeholder="8001234567890" />
            </label>
            <button type="submit" className="bottone secondario">
              Cerca
            </button>
          </form>
        </>
      )}

      {fase.tipo === 'ricerca' && <p className="testo-tenue">Cerco il prodotto {fase.codice}…</p>}

      {fase.tipo === 'trovato' && (
        <div className="scheda-card">
          <div className="sezione">
            <h2>{fase.prodotto.nome}</h2>
            <p className="testo-tenue piccolo">
              {[fase.prodotto.marca, fase.prodotto.formato && `${fase.prodotto.formato.quantita} ${fase.prodotto.formato.unita}`].filter(Boolean).join(' · ')}
            </p>
            <div className="azioni">
              <VotoGenuinita prodotto={fase.prodotto} />
              {fase.prodotto.allergeni.map((a) => (
                <span key={a} className="etichetta attenzione">
                  {ALLERGENI_UE[a]}
                </span>
              ))}
              {fase.prodotto.tracce.length > 0 && (
                <span className="etichetta">Può contenere: {fase.prodotto.tracce.map((a) => ALLERGENI_UE[a].toLowerCase()).join(', ')}</span>
              )}
            </div>
          </div>
          <div className="sezione">
            <span className="piccolo">
              <strong>È:</strong> {ingrediente(ingredienteScelto)?.nome ?? 'scegli l’ingrediente'}
              {fase.prodotto.confidenza < 0.85 && ingredienteScelto && <span className="testo-tenue"> (controlla)</span>}
            </span>
            {(!ingredienteScelto || fase.prodotto.confidenza < 0.85) && (
              <SelettoreIngrediente segnaposto="Cambia ingrediente" onScegli={(ing) => setIngredienteScelto(ing.id)} />
            )}
          </div>
          <ModuloCarico
            key={ingredienteScelto}
            carico={(() => {
              const ing = ingrediente(ingredienteScelto);
              const formato = fase.prodotto.formato;
              const unita = ing?.unita ?? formato?.unita ?? 'pz';
              const quantita = formato && formato.unita === unita ? formato.quantita : (ing?.formato ?? 1);
              return {
                nome: fase.prodotto.marca ? `${fase.prodotto.nome} ${fase.prodotto.marca}` : fase.prodotto.nome,
                ingrediente: ing,
                prodotto_id: idProdottoOff(gtin13(fase.prodotto.gtin)),
                unita,
                quantita,
                origine: 'barcode',
              };
            })()}
            onAnnulla={ricomincia}
            onFatto={(nome) => {
              const p = fase.prodotto;
              salvaProdotto(ctx, p, ingredienteScelto);
              mostraAvviso(`${nome} aggiunto. Pronto per il prossimo`);
              ricomincia();
            }}
          />
        </div>
      )}

      {fase.tipo === 'sconosciuto' && (
        <div className="scheda-card">
          <h2>Codice {fase.codice}</h2>
          <p>{fase.motivo}</p>
          {!ingredienteScelto ? (
            <SelettoreIngrediente autoFocus segnaposto="Cos’è? Es. yogurt, pasta…" onScegli={(ing) => setIngredienteScelto(ing.id)} />
          ) : (
            <ModuloCarico
              carico={(() => {
                const ing = ingrediente(ingredienteScelto)!;
                return { nome: ing.nome, ingrediente: ing, unita: ing.unita, quantita: ing.formato ?? 1, origine: 'barcode' };
              })()}
              onAnnulla={ricomincia}
              onFatto={(nome) => {
                mostraAvviso(`${nome} aggiunto`);
                ricomincia();
              }}
            />
          )}
          <button type="button" className="bottone-testo" style={{ alignSelf: 'flex-start' }} onClick={ricomincia}>
            Scansiona un altro codice
          </button>
        </div>
      )}
    </section>
  );
}
