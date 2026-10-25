import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { MiniatureFoto } from '../../componenti/MiniatureFoto';
import { TornaIndietro } from '../../componenti/TornaIndietro';
import { Chip, Foglio, mostraAvviso } from '../../componenti/ui';
import { aggiungiGiorni } from '../../dominio/date';
import {
  NOME_PASTO,
  NOMI_GIORNI,
  PASTI_DIETA,
  arricchisciVoce,
  contaVoci,
  dietaDaGemini,
  leggiDietaDaTesto,
  type DietaLetta,
} from '../../dominio/dieta';
import { dataLocale, idPasto, type TipoPasto } from '../../dominio/id';
import { lunediDi } from '../../dominio/menu';
import { proponiSettimana, sostituisciRicetta, type PastoProposto } from '../../dominio/menuDieta';
import type { GiornoDieta, Pasto, VoceDieta } from '../../dominio/tipi';
import { useNucleo } from '../../nucleo/contesto';
import { useContestoSuggerimenti, useMembri, useOggi, useRicette } from '../../nucleo/derivati';
import { useCollezione } from '../../nucleo/hooks';
import { useDieta } from '../../nucleo/hooksMenu';
import { eliminaDieta, portaNelMenu, salvaDieta } from '../../nucleo/menu';
import { leggiChiave } from '../../piattaforma/chiaviApi';
import { immagineDaFile } from '../../piattaforma/fotocamera';
import { leggiDietaConGemini } from '../../piattaforma/gemini';
import { leggiPagine } from '../../piattaforma/ocr';
import { EMOJI_PORTATA } from '../../rif/emoji';

const MASSIMO_PAGINE = 10;
const MASSIMO_PDF = 15 * 1024 * 1024;

interface Pagina {
  id: string;
  file: File;
  url: string;
}

type Passo = 'carica' | 'controlla' | 'menu';

const ERRORI_GEMINI: Record<string, string> = {
  chiave: 'La chiave Gemini non funziona: controllala in Impostazioni → Funzioni avanzate.',
  quota: 'Per oggi le richieste gratuite di Gemini sono finite: riprova più tardi o domani.',
  modello: 'Gemini non risponde con il modello previsto: riprova più tardi.',
};

function leggiComeBase64(file: File): Promise<string> {
  return new Promise((ok, ko) => {
    const lettore = new FileReader();
    lettore.onload = () => ok(String(lettore.result).split(',')[1] ?? '');
    lettore.onerror = () => ko(lettore.error);
    lettore.readAsDataURL(file);
  });
}

export function CaricaDieta() {
  const ctx = useNucleo();
  const [parametri] = useSearchParams();
  const membri = useMembri().filter((m) => m.attivo !== false);
  const [membroId, setMembroId] = useState(parametri.get('membro') ?? ctx.membroId ?? membri[0]?.id ?? '');

  return (
    <section className="pagina">
      <TornaIndietro a="/menu" testo="Menù" />
      <div className="saluto">
        <h1>Dieta del dietista</h1>
        <p className="sottotitolo">La leggo, la controlli e la porto nel menù con ricette adatte. Non la modifico e non do consigli.</p>
      </div>

      {membri.length > 1 && (
        <div className="sezione">
          <span className="piccolo testo-tenue">Di chi è la dieta?</span>
          <div className="chips">
            {membri.map((m) => (
              <Chip key={m.id} attivo={m.id === membroId} onClick={() => setMembroId(m.id)}>
                {m.nome}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {/* Cambiando membro si riparte dalla sua dieta, se ce l'ha. */}
      <DietaMembro key={membroId} membroId={membroId} nomeMembro={membri.find((m) => m.id === membroId)?.nome} settimana={parametri.get('settimana') ?? undefined} />
    </section>
  );
}

function DietaMembro({ membroId, nomeMembro, settimana }: { membroId: string; nomeMembro?: string; settimana?: string }) {
  const ctx = useNucleo();
  const naviga = useNavigate();
  const salvata = useDieta(membroId);
  const [passo, setPasso] = useState<Passo>(salvata ? 'menu' : 'carica');
  const [bozza, setBozza] = useState<DietaLetta | null>(null);
  const [lettaCon, setLettaCon] = useState<'gemini' | 'telefono'>('telefono');
  const membro = nomeMembro ? { nome: nomeMembro } : undefined;

  return (
    <>
      {passo === 'carica' && (
        <PassoCarica
          haGiaUna={!!salvata}
          onLetta={(d, con) => {
            setBozza(d);
            setLettaCon(con);
            setPasso('controlla');
          }}
          onAnnulla={salvata ? () => setPasso('menu') : undefined}
        />
      )}

      {passo === 'controlla' && bozza && (
        <PassoControlla
          bozza={bozza}
          onCambia={setBozza}
          onSalva={() => {
            const pulita: DietaLetta = {
              ...bozza,
              giorni: bozza.giorni.map((g) => ({
                ...g,
                pasti: g.pasti
                  .map((p) => ({ ...p, voci: p.voci.filter((v) => v.testo.trim()).map((v) => arricchisciVoce(v)) }))
                  .filter((p) => p.voci.length),
              })),
            };
            salvaDieta(ctx, membroId, pulita, lettaCon);
            mostraAvviso(`Dieta di ${membro?.nome ?? 'questo profilo'} salvata`);
            setPasso('menu');
          }}
          onRicomincia={() => setPasso('carica')}
        />
      )}

      {passo === 'menu' && salvata && (
        <PassoMenu
          key={salvata.modificato_il}
          membroId={membroId}
          giorni={salvata.giorni}
          lunediIniziale={settimana}
          onFatto={(lunedi, n) => {
            mostraAvviso(`${n} portate nel menù`);
            naviga(`/menu?settimana=${lunedi}`);
          }}
        />
      )}

      {passo === 'menu' && salvata && (
        <div className="sezione">
          <h2>La dieta salvata</h2>
          <p className="testo-tenue piccolo">
            {salvata.titolo ? `${salvata.titolo} · ` : ''}
            {salvata.dietista ? `${salvata.dietista} · ` : ''}
            {contaVoci(salvata.giorni)} alimenti nella settimana
          </p>
          {salvata.note.length > 0 && (
            <ul className="piccolo" style={{ margin: 0, paddingLeft: 18 }}>
              {salvata.note.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          )}
          <div className="azioni colonna">
            <button
              type="button"
              className="bottone secondario"
              onClick={() => {
                setBozza({ titolo: salvata.titolo, dietista: salvata.dietista, note: salvata.note, giorni: salvata.giorni });
                setLettaCon(salvata.letta_con);
                setPasso('controlla');
              }}
            >
              Correggi la dieta
            </button>
            <button type="button" className="bottone secondario" onClick={() => setPasso('carica')}>
              Carica una nuova dieta
            </button>
            <button
              type="button"
              className="bottone pericolo"
              onClick={() => {
                if (!confirm(`Eliminare la dieta di ${membro?.nome ?? 'questo profilo'}? Dal menù di oggi in poi spariscono anche le portate messe per questa dieta.`)) return;
                eliminaDieta(ctx, membroId, dataLocale());
                mostraAvviso('Dieta eliminata');
                setPasso('carica');
              }}
            >
              Elimina la dieta
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ───────── 1. Carica ─────────

function PassoCarica({ onLetta, onAnnulla, haGiaUna }: { onLetta: (d: DietaLetta, con: 'gemini' | 'telefono') => void; onAnnulla?: () => void; haGiaUna: boolean }) {
  const conChiave = !!leggiChiave('gemini');
  const [pagine, setPagine] = useState<Pagina[]>([]);
  const [pdf, setPdf] = useState<File | null>(null);
  const [testo, setTesto] = useState('');
  const [scriviTesto, setScriviTesto] = useState(false);
  const [progresso, setProgresso] = useState<number | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  function aggiungiFile(file: File[]) {
    setErrore(null);
    const unPdf = file.find((f) => f.type === 'application/pdf');
    if (unPdf) {
      if (unPdf.size > MASSIMO_PDF) {
        setErrore('Il PDF è troppo grande (più di 15 MB): fotografa le pagine o incolla il testo.');
        return;
      }
      setPdf(unPdf);
      setPagine((x) => {
        x.forEach((p) => URL.revokeObjectURL(p.url));
        return [];
      });
      return;
    }
    setPdf(null);
    setPagine((x) => [...x, ...file.filter((f) => f.type.startsWith('image/')).map((f) => ({ id: crypto.randomUUID(), file: f, url: URL.createObjectURL(f) }))].slice(0, MASSIMO_PAGINE));
  }

  async function leggi() {
    setErrore(null);
    setProgresso(0);
    try {
      let letta: DietaLetta;
      let con: 'gemini' | 'telefono' = 'telefono';
      if (testo.trim() && !pagine.length && !pdf) {
        if (conChiave) {
          letta = dietaDaGemini(await leggiDietaConGemini({ tipo: 'testo', testo }));
          con = 'gemini';
        } else letta = leggiDietaDaTesto(testo);
      } else if (pdf) {
        if (!conChiave) {
          setErrore('Per leggere un PDF serve la chiave Gemini gratuita (Impostazioni → Funzioni avanzate). In alternativa apri il PDF, copia il testo e incollalo qui.');
          return;
        }
        letta = dietaDaGemini(await leggiDietaConGemini({ tipo: 'pdf', base64: await leggiComeBase64(pdf) }));
        con = 'gemini';
      } else {
        const immagini = await Promise.all(pagine.map((p) => immagineDaFile(p.file, conChiave ? 1600 : 2000)));
        if (conChiave) {
          setProgresso(0.5);
          letta = dietaDaGemini(await leggiDietaConGemini({ tipo: 'immagini', immagini }));
          con = 'gemini';
        } else letta = leggiDietaDaTesto(await leggiPagine(immagini, setProgresso));
      }
      if (contaVoci(letta.giorni) === 0) {
        setErrore(
          conChiave
            ? 'Non ho trovato pasti con alimenti. È proprio la dieta? Prova con foto più nitide o incolla il testo.'
            : 'Non sono riuscito a leggere i pasti. Prova con più luce e il foglio ben disteso, oppure incolla il testo. Con la chiave Gemini gratuita la lettura è molto più precisa, anche per i PDF.',
        );
        return;
      }
      onLetta(letta, con);
    } catch (e) {
      const codice = e instanceof Error ? e.message : '';
      setErrore(ERRORI_GEMINI[codice] ?? 'La lettura non è riuscita. Controlla la connessione e riprova.');
    } finally {
      setProgresso(null);
    }
  }

  const pronto = pagine.length > 0 || !!pdf || testo.trim().length > 20;
  return (
    <>
      <div className="riquadro">
        <p>
          {conChiave
            ? 'Fotografa i fogli della dieta (anche più pagine), oppure carica il PDF o una foto. La lettura la fa Gemini con la tua chiave gratuita; le foto non vengono salvate.'
            : 'Fotografa i fogli della dieta (anche più pagine) o incolla il testo. La lettura avviene sul telefono e le foto non vengono salvate.'}
        </p>
        <MiniatureFoto
          foto={pagine}
          descrizione="pagina della dieta"
          onTogli={(id) =>
            setPagine((x) => {
              const via = x.find((p) => p.id === id);
              if (via) URL.revokeObjectURL(via.url);
              return x.filter((p) => p.id !== id);
            })
          }
        />
        {pdf && (
          <p className="piccolo">
            📄 {pdf.name}{' '}
            <button type="button" className="bottone-testo" onClick={() => setPdf(null)}>
              Togli
            </button>
          </p>
        )}
        <div className="azioni colonna">
          {pagine.length < MASSIMO_PAGINE && (
            <label className="bottone">
              {pagine.length ? 'Fotografa la pagina successiva' : 'Fotografa la dieta'}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="nascosto-visivamente"
                onChange={(e) => {
                  aggiungiFile([...(e.target.files ?? [])]);
                  e.target.value = '';
                }}
              />
            </label>
          )}
          <label className="bottone secondario">
            {conChiave ? 'Scegli foto o PDF' : 'Scegli foto dalla galleria'}
            <input
              type="file"
              accept={conChiave ? 'image/*,application/pdf' : 'image/*'}
              multiple
              className="nascosto-visivamente"
              onChange={(e) => {
                aggiungiFile([...(e.target.files ?? [])]);
                e.target.value = '';
              }}
            />
          </label>
          {!scriviTesto && (
            <button type="button" className="bottone secondario" onClick={() => setScriviTesto(true)}>
              Incolla il testo
            </button>
          )}
        </div>
        {scriviTesto && (
          <label className="campo">
            <span>Testo della dieta</span>
            <textarea
              rows={8}
              value={testo}
              onChange={(e) => setTesto(e.target.value)}
              placeholder={'Lunedì\nColazione: latte 200 ml, fette biscottate 30 g\nPranzo: pasta integrale 80 g, verdure 200 g\nCena: pesce 150 g, verdura, pane 50 g'}
            />
            <small>Se la dieta è uguale tutti i giorni basta scrivere i pasti una volta.</small>
          </label>
        )}
        {!conChiave && (
          <p className="testo-tenue piccolo">
            Per i PDF e per le diete scritte a mano serve la chiave Gemini gratuita: aggiungila in <Link to="/impostazioni">Impostazioni</Link>.
          </p>
        )}
      </div>

      {progresso === null ? (
        <div className="azioni colonna">
          <button type="button" className="bottone pieno accento" disabled={!pronto} onClick={leggi}>
            Leggi la dieta
          </button>
          {onAnnulla && haGiaUna && (
            <button type="button" className="bottone secondario" onClick={onAnnulla}>
              Tieni la dieta salvata
            </button>
          )}
        </div>
      ) : (
        <div className="sezione">
          <p>Sto leggendo la dieta… può richiedere qualche secondo.</p>
          <div className="progresso">
            <span style={{ width: `${Math.max(5, Math.round(progresso * 100))}%` }} />
          </div>
        </div>
      )}
      {errore && (
        <div className="riquadro avviso">
          <p>{errore}</p>
        </div>
      )}
    </>
  );
}

// ───────── 2. Controlla e correggi ─────────

function PassoControlla({
  bozza,
  onCambia,
  onSalva,
  onRicomincia,
}: {
  bozza: DietaLetta;
  onCambia: (d: DietaLetta) => void;
  onSalva: () => void;
  onRicomincia: () => void;
}) {
  const primoPieno = bozza.giorni.findIndex((g) => g.pasti.length);
  const [giorno, setGiorno] = useState(Math.max(0, primoPieno));
  const corrente = bozza.giorni[giorno]!;

  const aggiornaGiorno = (g: GiornoDieta) => onCambia({ ...bozza, giorni: bozza.giorni.map((x, i) => (i === giorno ? g : x)) });
  const aggiornaVoce = (tipo: TipoPasto, indice: number, voce: VoceDieta | null) =>
    aggiornaGiorno({
      ...corrente,
      pasti: corrente.pasti.map((p) =>
        p.tipo !== tipo ? p : { ...p, voci: voce ? p.voci.map((v, i) => (i === indice ? voce : v)) : p.voci.filter((_, i) => i !== indice) },
      ),
    });
  const aggiungiVoce = (tipo: TipoPasto) => {
    const esiste = corrente.pasti.some((p) => p.tipo === tipo);
    const pasti = esiste
      ? corrente.pasti.map((p) => (p.tipo === tipo ? { ...p, voci: [...p.voci, { testo: '' }] } : p))
      : [...corrente.pasti, { tipo, voci: [{ testo: '' }] }].sort((a, b) => PASTI_DIETA.indexOf(a.tipo) - PASTI_DIETA.indexOf(b.tipo));
    aggiornaGiorno({ ...corrente, pasti });
  };
  const mancanti = PASTI_DIETA.filter((t) => !corrente.pasti.some((p) => p.tipo === t));
  const giorniVuoti = bozza.giorni.filter((g) => !g.pasti.length).length;

  return (
    <>
      <div className="riquadro">
        <p>
          Controlla che sia tutto come sul foglio del dietista e correggi se serve. Ho letto {contaVoci(bozza.giorni)} alimenti
          {giorniVuoti ? `; ${giorniVuoti === 7 ? 'nessun giorno' : `${giorniVuoti} giorni`} senza pasti` : ''}.
        </p>
        <label className="campo">
          <span>Titolo (facoltativo)</span>
          <input value={bozza.titolo ?? ''} onChange={(e) => onCambia({ ...bozza, titolo: e.target.value || undefined })} placeholder="Es. Dieta autunno" />
        </label>
        <label className="campo">
          <span>Dietista (facoltativo)</span>
          <input value={bozza.dietista ?? ''} onChange={(e) => onCambia({ ...bozza, dietista: e.target.value || undefined })} />
        </label>
        {bozza.note.length > 0 && (
          <div className="sezione" style={{ gap: 4 }}>
            <span className="piccolo testo-tenue">Indicazioni del dietista</span>
            <ul className="piccolo" style={{ margin: 0, paddingLeft: 18 }}>
              {bozza.note.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="chips scorrevoli">
        {bozza.giorni.map((g, i) => (
          <Chip key={g.giorno} attivo={i === giorno} onClick={() => setGiorno(i)}>
            {NOMI_GIORNI[i]!.slice(0, 3)}
            {g.pasti.length ? '' : ' ·'}
          </Chip>
        ))}
      </div>

      {corrente.pasti.map((p) => (
        <div className="sezione" key={p.tipo}>
          <h2>{NOME_PASTO[p.tipo]}</h2>
          <ul className="elenco">
            {p.voci.map((v, i) => (
              <li key={i} className="voce" style={{ cursor: 'default', gap: 8 }}>
                <input
                  className="input"
                  style={{ flex: 1, minWidth: 0 }}
                  aria-label="Alimento"
                  value={v.testo}
                  placeholder="Alimento"
                  autoFocus={!v.testo}
                  onChange={(e) => aggiornaVoce(p.tipo, i, { ...v, testo: e.target.value, ingrediente_id: undefined, gruppo: undefined })}
                />
                <input
                  className="input"
                  style={{ width: 72 }}
                  type="number"
                  inputMode="numeric"
                  aria-label="Grammi"
                  placeholder={v.quantita ?? 'g'}
                  value={v.quantita_g ?? ''}
                  onChange={(e) => aggiornaVoce(p.tipo, i, { ...v, quantita_g: e.target.value ? Number(e.target.value) : undefined })}
                />
                <button type="button" className="bottone-icona" aria-label={`Togli ${v.testo}`} onClick={() => aggiornaVoce(p.tipo, i, null)}>
                  ×
                </button>
              </li>
            ))}
          </ul>
          {p.voci.some((v) => v.alternative?.length) && (
            <p className="testo-tenue piccolo">
              In alternativa:{' '}
              {p.voci
                .filter((v) => v.alternative?.length)
                .map((v) => `${v.testo} → ${v.alternative!.join(', ')}`)
                .join('; ')}
            </p>
          )}
          <button type="button" className="bottone-testo" style={{ alignSelf: 'flex-start' }} onClick={() => aggiungiVoce(p.tipo)}>
            + Aggiungi un alimento
          </button>
        </div>
      ))}

      {mancanti.length > 0 && (
        <div className="sezione">
          <span className="piccolo testo-tenue">{corrente.pasti.length ? 'Aggiungi un pasto' : `Nessun pasto per ${NOMI_GIORNI[giorno]!.toLowerCase()}: aggiungine uno`}</span>
          <div className="chips">
            {mancanti.map((t) => (
              <Chip key={t} attivo={false} onClick={() => aggiungiVoce(t)}>
                + {NOME_PASTO[t]}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {corrente.pasti.length > 0 && giorniVuoti > 0 && (
        <button
          type="button"
          className="bottone secondario"
          onClick={() =>
            onCambia({
              ...bozza,
              giorni: bozza.giorni.map((g) => (g.pasti.length ? g : { ...g, pasti: corrente.pasti.map((p) => ({ ...p, voci: p.voci.map((v) => ({ ...v })) })) })),
            })
          }
        >
          Copia {NOMI_GIORNI[giorno]!.toLowerCase()} sui giorni senza pasti
        </button>
      )}

      <div className="azioni colonna">
        <button type="button" className="bottone pieno accento" disabled={contaVoci(bozza.giorni) === 0} onClick={onSalva}>
          Salva la dieta
        </button>
        <button type="button" className="bottone secondario" onClick={onRicomincia}>
          Ricomincia
        </button>
      </div>
    </>
  );
}

// ───────── 3. Porta nel menù ─────────

function PassoMenu({
  membroId,
  giorni,
  lunediIniziale,
  onFatto,
}: {
  membroId: string;
  giorni: GiornoDieta[];
  lunediIniziale?: string;
  onFatto: (lunedi: string, portate: number) => void;
}) {
  const oggi = useOggi();
  const questa = lunediDi(oggi);
  const prossima = aggiungiGiorni(questa, 7);
  const [lunedi, setLunedi] = useState(lunediIniziale && lunediDi(lunediIniziale) >= questa ? lunediDi(lunediIniziale) : questa);
  return (
    <>
      <div className="sezione">
        <span className="piccolo testo-tenue">In quale settimana?</span>
        <div className="chips">
          <Chip attivo={lunedi === questa} onClick={() => setLunedi(questa)}>
            Questa settimana
          </Chip>
          <Chip attivo={lunedi === prossima} onClick={() => setLunedi(prossima)}>
            Settimana prossima
          </Chip>
        </div>
        <p className="testo-tenue piccolo">
          Ho scelto le ricette che usano gli alimenti di ogni pasto, con le porzioni calcolate sulle grammature. Puoi cambiarle prima di confermare; quello che
          non è una ricetta (frutta, pane, yogurt…) resta com’è scritto.
        </p>
      </div>
      <PropostaSettimana key={lunedi} membroId={membroId} giorni={giorni} lunedi={lunedi} onFatto={onFatto} />
    </>
  );
}

/** Le proposte si calcolano una volta per settimana scelta, poi restano le modifiche dell'utente. */
function PropostaSettimana({ membroId, giorni, lunedi, onFatto }: { membroId: string; giorni: GiornoDieta[]; lunedi: string; onFatto: (lunedi: string, portate: number) => void }) {
  const ctx = useNucleo();
  const oggi = useOggi();
  const ricette = useRicette();
  const contesto = useContestoSuggerimenti(useMemo(() => [membroId], [membroId]));
  const pastiSalvati = useCollezione<Pasto & { id: string }>('piani');
  const [cambia, setCambia] = useState<{ giorno: number; tipo: TipoPasto; indice: number } | null>(null);
  const [proposta, setProposta] = useState(() => {
    const perId = new Map(pastiSalvati.map((p) => [p.id, p]));
    // Ricette già nel menù per gli altri: se vanno bene anche per la dieta si mangia tutti uguale.
    const giaNelMenu = (giorno: number, tipo: TipoPasto) =>
      new Set(
        (perId.get(idPasto(aggiungiGiorni(lunedi, giorno - 1), tipo))?.portate ?? [])
          .filter((x) => x.ricetta_id && x.membri.some((m) => m !== membroId))
          .map((x) => x.ricetta_id!),
      );
    return proponiSettimana(giorni, ricette, contesto, giaNelMenu);
  });

  const daOggi = proposta.filter((g) => aggiungiGiorni(lunedi, g.giorno - 1) >= oggi && g.pasti.length);
  const sostituisci = (giorno: number, tipo: TipoPasto, indice: number, nuovo: PastoProposto['portate'][number]) =>
    setProposta((s) =>
      s.map((g) =>
        g.giorno !== giorno ? g : { ...g, pasti: g.pasti.map((p) => (p.tipo !== tipo ? p : { ...p, portate: p.portate.map((x, i) => (i === indice ? nuovo : x)) })) },
      ),
    );
  const inCambio = cambia ? proposta.find((g) => g.giorno === cambia.giorno)?.pasti.find((p) => p.tipo === cambia.tipo) : undefined;
  const pastoDieta = cambia ? giorni.find((g) => g.giorno === cambia.giorno)?.pasti.find((p) => p.tipo === cambia.tipo) : undefined;

  return (
    <>
      {daOggi.map((g) => (
        <div className="sezione" key={g.giorno}>
          <h2>
            {NOMI_GIORNI[g.giorno - 1]}
            {aggiungiGiorni(lunedi, g.giorno - 1) === oggi && <span className="etichetta accento" style={{ marginLeft: 8 }}>oggi</span>}
          </h2>
          {g.pasti.map((p) => (
            <div key={p.tipo} className="sezione" style={{ gap: 6 }}>
              <span className="piccolo testo-tenue">{NOME_PASTO[p.tipo]}</span>
              <ul className="elenco">
                {p.portate.map((x, i) => (
                  <li key={i}>
                    <div className="voce" style={{ cursor: 'default' }}>
                      <span className="emoji" aria-hidden="true">
                        {x.ricetta ? EMOJI_PORTATA[x.ricetta.portata] : '🍽️'}
                      </span>
                      <span className="voce-testo">
                        <span className="voce-titolo">{x.titolo}</span>
                        {x.ricetta && (
                          <span className="voce-dettaglio">
                            {x.motivo}
                            {x.porzioni !== 1 ? ` · ${String(x.porzioni).replace('.', ',')} porzioni` : ''}
                          </span>
                        )}
                      </span>
                      {x.ricetta && (
                        <button type="button" className="bottone piccolo secondario" onClick={() => setCambia({ giorno: g.giorno, tipo: p.tipo, indice: i })}>
                          Cambia
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}
      {daOggi.length === 0 && <p className="testo-tenue">Non restano giorni con pasti in questa settimana: scegli la settimana prossima.</p>}

      <button
        type="button"
        className="bottone pieno accento"
        disabled={daOggi.length === 0}
        onClick={() => onFatto(lunedi, portaNelMenu(ctx, membroId, lunedi, daOggi))}
      >
        Metti nel menù
      </button>

      {cambia && inCambio && pastoDieta && (
        <Foglio titolo="Scegli un’altra ricetta" onChiudi={() => setCambia(null)}>
          <p className="testo-tenue piccolo">Adatte a questo pasto della dieta, dalla più vicina.</p>
          <ul className="elenco">
            {inCambio.alternative.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className="voce"
                  onClick={() => {
                    sostituisci(cambia.giorno, cambia.tipo, cambia.indice, sostituisciRicetta(pastoDieta, r));
                    setCambia(null);
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
            {!inCambio.alternative.length && <li className="voce voce-dettaglio">Non ci sono altre ricette adatte: puoi cambiarla dopo dal menù.</li>}
          </ul>
        </Foglio>
      )}
    </>
  );
}
