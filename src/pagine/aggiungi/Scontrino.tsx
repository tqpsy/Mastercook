import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MiniatureFoto } from '../../componenti/MiniatureFoto';
import { TornaIndietro } from '../../componenti/TornaIndietro';
import { Foglio, SelettoreIngrediente, mostraAvviso } from '../../componenti/ui';
import { formattaEuro, formattaQuantita } from '../../dominio/formato';
import { normalizza } from '../../dominio/ricerca';
import { interpretaQr, type ContenutoQr } from '../../dominio/qrScontrino';
import { abbinaRiga, espandi, leggiScontrino, type EsitoAbbinamento, type ScontrinoLetto } from '../../dominio/scontrino';
import type { ArticoloLista } from '../../dominio/tipi';
import { useNucleo } from '../../nucleo/contesto';
import { caricaScontrino, salvaAlias } from '../../nucleo/azioni';
import { useCollezione } from '../../nucleo/hooks';
import { creaRilevatore, immagineDaFile, useFotocamera } from '../../piattaforma/fotocamera';
import { leggiTesto } from '../../piattaforma/ocr';
import { leggiFormato } from '../../piattaforma/openFoodFacts';
import { emojiIngrediente } from '../../rif/emoji';
import { ingrediente } from '../../rif/ingredienti';

interface RigaRevisione {
  chiave: number;
  testo: string;
  quantita: number;
  peso_g?: number;
  prezzo: number;
  ingrediente_id?: string;
  esito: EsitoAbbinamento;
  includi: boolean;
}

function quantitaCarico(r: RigaRevisione): number {
  const ing = ingrediente(r.ingrediente_id);
  if (!ing) return r.quantita;
  if (r.peso_g && ing.unita === 'g') return r.peso_g;
  const formato = leggiFormato(r.testo);
  const perPezzo = formato && formato.unita === ing.unita ? formato.quantita : ing.formato ?? (ing.unita === 'pz' ? 1 : 500);
  return r.quantita * perPezzo;
}

/** Uno scontrino lungo si fotografa a pezzi, dall'alto verso il basso. */
const MASSIMO_PARTI = 8;

interface Parte {
  id: string;
  file: File;
  url: string;
}

const NOMI_ESITO: Record<EsitoAbbinamento, string> = { confermato: 'Riconosciuti', da_controllare: 'Da controllare', da_scegliere: 'Non riconosciuti' };

export function Scontrino() {
  const ctx = useNucleo();
  const naviga = useNavigate();
  const lista = useCollezione<ArticoloLista>('liste');
  const impostazioni = useCollezione<{ id: string; mappa?: Record<string, string> }>('impostazioni');
  const alias = useMemo(() => new Map(Object.entries(impostazioni.find((i) => i.id === 'alias')?.mappa ?? {})), [impostazioni]);
  const [foto, setFoto] = useState<Parte[]>([]);
  const [qrAperto, setQrAperto] = useState(false);
  const [qr, setQr] = useState<Exclude<ContenutoQr, { tipo: 'righe' }> | null>(null);
  const [progresso, setProgresso] = useState<number | null>(null);
  const [righe, setRighe] = useState<RigaRevisione[] | null>(null);
  const [totale, setTotale] = useState<number | undefined>();
  const [negozio, setNegozio] = useState<string | undefined>();
  const [aperta, setAperta] = useState<RigaRevisione | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  function aggiungiParti(file: File[]) {
    setFoto((x) => [...x, ...file.map((f) => ({ id: crypto.randomUUID(), file: f, url: URL.createObjectURL(f) }))].slice(0, MASSIMO_PARTI));
  }

  function togliParte(id: string) {
    setFoto((x) => {
      const via = x.find((p) => p.id === id);
      if (via) URL.revokeObjectURL(via.url);
      return x.filter((p) => p.id !== id);
    });
  }

  /** Passa alla revisione: le righe lette (da foto o da QR) collegate agli ingredienti. */
  function revisiona(letto: ScontrinoLetto) {
    const inLista = new Set(lista.filter((r) => r.stato === 'da_comprare' && r.ingrediente_id).map((r) => r.ingrediente_id!));
    setRighe(
      letto.righe.map((r, i) => {
        const abbinamento = abbinaRiga(r.testo, alias, inLista);
        return {
          chiave: i,
          ...r,
          ingrediente_id: abbinamento.esito === 'da_scegliere' ? undefined : abbinamento.migliore?.ingrediente.id,
          esito: abbinamento.esito,
          includi: abbinamento.esito !== 'da_scegliere',
        };
      }),
    );
    setTotale(letto.totale);
    setNegozio(letto.negozio);
  }

  function qrLetto(testo: string) {
    setQrAperto(false);
    const contenuto = interpretaQr(testo);
    if (contenuto.tipo === 'righe') revisiona(contenuto.scontrino);
    else setQr(contenuto);
  }

  async function leggi() {
    setErrore(null);
    setProgresso(0);
    try {
      const immagini = await Promise.all(foto.map((f) => immagineDaFile(f.file, 2000)));
      const testo = await leggiTesto(immagini, setProgresso);
      const letto = leggiScontrino(testo);
      if (letto.righe.length === 0) {
        setErrore('Non sono riuscito a leggere le righe. Riprova con più luce, tenendo lo scontrino ben disteso, o dividendolo in più foto.');
        setProgresso(null);
        return;
      }
      revisiona(letto);
    } catch {
      setErrore('La lettura non è riuscita. Se sei offline riprova quando torna la connessione: la prima volta servono i file del lettore.');
    } finally {
      setProgresso(null);
      setFoto((x) => {
        x.forEach((p) => URL.revokeObjectURL(p.url));
        return [];
      });
    }
  }

  const aggiornaRiga = (chiave: number, campi: Partial<RigaRevisione>) => setRighe((rs) => rs!.map((r) => (r.chiave === chiave ? { ...r, ...campi } : r)));

  if (righe) {
    const sommaRighe = Math.round(righe.reduce((s, r) => s + r.prezzo, 0) * 100) / 100;
    const differenza = totale !== undefined ? Math.round((totale - sommaRighe) * 100) / 100 : 0;
    const daCaricare = righe.filter((r) => r.includi && r.ingrediente_id);
    return (
      <section className="pagina">
        <div className="saluto">
          <h1>Controlla lo scontrino</h1>
          <p className="sottotitolo">
            {negozio ? `${negozio} · ` : ''}
            {righe.length} righe{totale !== undefined ? ` · totale ${formattaEuro(totale)}` : ''}
          </p>
        </div>
        {Math.abs(differenza) > 0.05 && (
          <div className="riquadro avviso">
            <p>
              Le righe lette fanno {formattaEuro(sommaRighe)}, il totale è {formattaEuro(totale!)}: manca qualche riga? Puoi aggiungere a mano quello che non vedi.
            </p>
          </div>
        )}
        {(['confermato', 'da_controllare', 'da_scegliere'] as const).map((esito) => {
          const gruppo = righe.filter((r) => r.esito === esito);
          if (!gruppo.length) return null;
          return (
            <div className="sezione" key={esito}>
              <h2 className="reparto-titolo">{NOMI_ESITO[esito]}</h2>
              <ul className="elenco">
                {gruppo.map((r) => {
                  const ing = ingrediente(r.ingrediente_id);
                  return (
                    <li key={r.chiave}>
                      <div className="voce">
                        <input
                          type="checkbox"
                          style={{ width: 22, height: 22, accentColor: 'var(--oliva)', flexShrink: 0 }}
                          checked={r.includi && !!ing}
                          disabled={!ing}
                          aria-label={`Aggiungi ${r.testo}`}
                          onChange={(e) => aggiornaRiga(r.chiave, { includi: e.target.checked })}
                        />
                        <button type="button" className="voce-testo" onClick={() => setAperta(r)} style={{ border: 0, background: 'none', textAlign: 'left', padding: 0, cursor: 'pointer' }}>
                          <span className="voce-titolo">{ing ? `${emojiIngrediente(ing.id)} ${ing.nome}` : 'Scegli cos’è'}</span>
                          <span className="voce-dettaglio">
                            {r.testo}
                            {ing ? ` · ${formattaQuantita(quantitaCarico(r), ing.unita, ing)}` : ''}
                          </span>
                        </button>
                        <span className="voce-destra">{formattaEuro(r.prezzo)}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
        <p className="testo-tenue piccolo">Le righe senza ingrediente (detersivi, buste…) non vengono messe in casa ma contano nella spesa.</p>
        <div className="azioni colonna">
          <button
            type="button"
            className="bottone"
            disabled={daCaricare.length === 0}
            onClick={() => {
              const spuntate = caricaScontrino(
                ctx,
                daCaricare.map((r) => ({ ingrediente_id: r.ingrediente_id!, nome: ingrediente(r.ingrediente_id)!.nome, quantita: quantitaCarico(r), prezzo: r.prezzo })),
                negozio,
                totale,
              );
              mostraAvviso(`${daCaricare.length} prodotti messi in casa${spuntate ? `, ${spuntate} spuntati dalla lista` : ''}`);
              naviga('/casa');
            }}
          >
            Metti in casa {daCaricare.length} prodotti
          </button>
          <button type="button" className="bottone secondario" onClick={() => setRighe(null)}>
            Ricomincia
          </button>
        </div>
        {aperta && (
          <Foglio titolo={aperta.testo} onChiudi={() => setAperta(null)}>
            <p className="testo-tenue">Cos’è questo prodotto? Masterfood lo ricorderà per i prossimi scontrini.</p>
            <SelettoreIngrediente
              autoFocus
              onScegli={(ing) => {
                aggiornaRiga(aperta.chiave, { ingrediente_id: ing.id, includi: true, esito: 'confermato' });
                salvaAlias(ctx, normalizza(espandi(aperta.testo)), ing.id);
                setAperta(null);
              }}
            />
            <button
              type="button"
              className="bottone secondario"
              onClick={() => {
                aggiornaRiga(aperta.chiave, { ingrediente_id: undefined, includi: false, esito: 'da_scegliere' });
                setAperta(null);
              }}
            >
              Non è cibo, ignoralo
            </button>
          </Foglio>
        )}
      </section>
    );
  }

  return (
    <section className="pagina">
      <TornaIndietro a="/aggiungi" />
      <div className="saluto">
        <h1>Fotografa lo scontrino</h1>
        <p className="sottotitolo">
          Lettura sul telefono, gratuita. La foto non viene salvata né inviata a Masterfood.
        </p>
      </div>
      {qrAperto ? (
        <LettoreQr onLetto={qrLetto} onChiudi={() => setQrAperto(false)} />
      ) : (
        <>
          <div className="riquadro">
            <p>
              Distendi lo scontrino su una superficie scura e ben illuminata. Se è lungo, fallo in più foto (fino a {MASSIMO_PARTI}), dall’alto verso il
              basso, lasciando qualche riga in comune tra una foto e l’altra.
            </p>
            <MiniatureFoto foto={foto} descrizione="parte dello scontrino" onTogli={togliParte} />
            {foto.length > 0 && (
              <p className="testo-tenue piccolo">
                {foto.length} {foto.length === 1 ? 'foto pronta' : 'parti pronte'}, in quest’ordine.
              </p>
            )}
            {foto.length < MASSIMO_PARTI && (
              <div className="azioni colonna">
                <label className="bottone">
                  {foto.length ? 'Fotografa la parte successiva' : 'Fotografa lo scontrino'}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="nascosto-visivamente"
                    onChange={(e) => {
                      aggiungiParti([...(e.target.files ?? [])]);
                      e.target.value = '';
                    }}
                  />
                </label>
                <label className="bottone secondario">
                  Scegli dalla galleria o uno screenshot
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="nascosto-visivamente"
                    onChange={(e) => {
                      aggiungiParti([...(e.target.files ?? [])]);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            )}
          </div>
          {foto.length === 0 && (
            <div className="riquadro">
              <p>Lo scontrino ha un QR code? Inquadralo: se contiene i prodotti li leggo subito, se è un link ti porto allo scontrino digitale.</p>
              <button
                type="button"
                className="bottone secondario"
                onClick={() => {
                  setQr(null);
                  setErrore(null);
                  setQrAperto(true);
                }}
              >
                Inquadra il QR code
              </button>
            </div>
          )}
          {qr && <RisultatoQr contenuto={qr} />}
        </>
      )}
      {foto.length > 0 && progresso === null && (
        <button type="button" className="bottone pieno accento" onClick={leggi}>
          Leggi lo scontrino
        </button>
      )}
      {progresso !== null && (
        <div className="sezione">
          <p>Sto leggendo lo scontrino… la prima volta può richiedere qualche secondo in più.</p>
          <div className="progresso">
            <span style={{ width: `${Math.round(progresso * 100)}%` }} />
          </div>
        </div>
      )}
      {errore && (
        <div className="riquadro avviso" role="alert">
          <p>{errore}</p>
        </div>
      )}
    </section>
  );
}

/** Fotocamera sul QR code dello scontrino: si ferma alla prima lettura. */
function LettoreQr({ onLetto, onChiudi }: { onLetto: (testo: string) => void; onChiudi: () => void }) {
  const { video, stato } = useFotocamera(true);
  const [nonSupportato, setNonSupportato] = useState(false);

  useEffect(() => {
    if (stato !== 'attiva') return;
    let fermo = false;
    creaRilevatore(['qr_code'])
      .then(async (rilevatore) => {
        while (!fermo) {
          const v = video.current;
          if (v && v.readyState >= 2) {
            const [trovato] = await rilevatore.detect(v).catch(() => []);
            if (trovato?.rawValue && !fermo) {
              navigator.vibrate?.(40);
              onLetto(trovato.rawValue);
              return;
            }
          }
          await new Promise((r) => setTimeout(r, 200));
        }
      })
      .catch(() => setNonSupportato(true));
    return () => {
      fermo = true;
    };
  }, [stato, video, onLetto]);

  return (
    <div className="riquadro">
      {stato === 'negata' ? (
        <p>Per inquadrare il QR code consenti l’uso della fotocamera nelle impostazioni del browser.</p>
      ) : stato === 'assente' || nonSupportato ? (
        <p>Su questo dispositivo non riesco a leggere i QR code: fotografa lo scontrino.</p>
      ) : (
        <>
          <video ref={video} className="video-qr" muted playsInline aria-label="Inquadratura del QR code" />
          <p className="testo-tenue piccolo">Tieni il QR code al centro, a una spanna dal telefono.</p>
        </>
      )}
      <button type="button" className="bottone secondario" onClick={onChiudi}>
        Annulla
      </button>
    </div>
  );
}

function RisultatoQr({ contenuto }: { contenuto: Exclude<ContenutoQr, { tipo: 'righe' }> }) {
  if (contenuto.tipo === 'link') {
    return (
      <div className="riquadro">
        <p>
          Il QR code porta a una pagina di <strong>{contenuto.sito}</strong>. Masterfood non può leggerla da sola: aprila, fai uno screenshot dello
          scontrino e caricalo qui sopra con «Scegli dalla galleria o uno screenshot».
        </p>
        <a className="bottone" href={contenuto.url} target="_blank" rel="noopener noreferrer">
          Apri la pagina dello scontrino
        </a>
        <p className="testo-tenue piccolo">Se la pagina è solo la verifica dell’Agenzia delle Entrate, non mostra i prodotti: in quel caso fotografa lo scontrino di carta.</p>
      </div>
    );
  }
  return (
    <div className="riquadro avviso">
      <p>Il QR code non contiene i prodotti, solo i dati del documento ({contenuto.testo.slice(0, 60)}). Fotografa lo scontrino per leggere le righe.</p>
    </div>
  );
}
