import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TornaIndietro } from '../../componenti/TornaIndietro';
import { Foglio, SelettoreIngrediente, mostraAvviso } from '../../componenti/ui';
import { formattaEuro, formattaQuantita } from '../../dominio/formato';
import { normalizza } from '../../dominio/ricerca';
import { abbinaRiga, espandi, leggiScontrino, type EsitoAbbinamento } from '../../dominio/scontrino';
import type { ArticoloLista } from '../../dominio/tipi';
import { useNucleo } from '../../nucleo/contesto';
import { caricaScontrino, salvaAlias } from '../../nucleo/azioni';
import { useCollezione } from '../../nucleo/hooks';
import { immagineDaFile } from '../../piattaforma/fotocamera';
import { leggiTesto, motoreDisponibile } from '../../piattaforma/ocr';
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

const NOMI_ESITO: Record<EsitoAbbinamento, string> = { confermato: 'Riconosciuti', da_controllare: 'Da controllare', da_scegliere: 'Non riconosciuti' };

export function Scontrino() {
  const ctx = useNucleo();
  const naviga = useNavigate();
  const lista = useCollezione<ArticoloLista>('liste');
  const impostazioni = useCollezione<{ id: string; mappa?: Record<string, string> }>('impostazioni');
  const alias = useMemo(() => new Map(Object.entries(impostazioni.find((i) => i.id === 'alias')?.mappa ?? {})), [impostazioni]);
  const [foto, setFoto] = useState<File[]>([]);
  const [progresso, setProgresso] = useState<number | null>(null);
  const [righe, setRighe] = useState<RigaRevisione[] | null>(null);
  const [totale, setTotale] = useState<number | undefined>();
  const [negozio, setNegozio] = useState<string | undefined>();
  const [aperta, setAperta] = useState<RigaRevisione | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  async function leggi() {
    setErrore(null);
    setProgresso(0);
    try {
      const immagini = await Promise.all(foto.map((f) => immagineDaFile(f, 2000)));
      const testo = await leggiTesto(immagini, setProgresso);
      const letto = leggiScontrino(testo);
      if (letto.righe.length === 0) {
        setErrore('Non sono riuscito a leggere le righe. Riprova con più luce, tenendo lo scontrino ben disteso, o dividendolo in più foto.');
        setProgresso(null);
        return;
      }
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
    } catch {
      setErrore('La lettura non è riuscita. Se sei offline riprova quando torna la connessione: la prima volta servono i file del lettore.');
    } finally {
      setProgresso(null);
      setFoto([]);
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
          {motoreDisponibile() === 'vision'
            ? 'Lettura con Google Vision e la tua chiave.'
            : 'Lettura sul telefono, gratuita. La foto non viene salvata né inviata a Masterfood.'}
        </p>
      </div>
      <div className="riquadro">
        <p>Distendi lo scontrino su una superficie scura e ben illuminata. Se è lungo, fallo in più foto (massimo 4), dall’alto verso il basso.</p>
        <label className="bottone">
          {foto.length ? 'Aggiungi un’altra parte' : 'Scatta o scegli la foto'}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="nascosto-visivamente"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setFoto((x) => [...x, f].slice(0, 4));
              e.target.value = '';
            }}
          />
        </label>
        {foto.length > 0 && (
          <p className="testo-tenue piccolo">
            {foto.length} {foto.length === 1 ? 'foto pronta' : 'parti pronte'}.
          </p>
        )}
      </div>
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
        <div className="riquadro avviso">
          <p>{errore}</p>
        </div>
      )}
    </section>
  );
}
