import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AvvisoSync } from '../componenti/AvvisoSync';
import { IconaSpunta } from '../componenti/Icone';
import { AvvisoFlottante, Vuoto, mostraAvviso } from '../componenti/ui';
import { formattaQuantita } from '../dominio/formato';
import { vistaLista, vistaSpesa, type RigaVista } from '../dominio/lista';
import type { ArticoloLista } from '../dominio/tipi';
import { useNucleo } from '../nucleo/contesto';
import { rimettiDaComprare, spuntaRiga, svuotaPresi } from '../nucleo/azioni';
import { useAutoreAltrui, useDisponibilita } from '../nucleo/derivati';
import { useCollezione } from '../nucleo/hooks';
import { useSync, useSyncVeloce, type StatoSync } from '../nucleo/sync';
import { emojiIngrediente } from '../rif/emoji';

/** Tiene lo schermo acceso mentre si fa la spesa, dove il browser lo permette. */
function useSchermoAcceso() {
  useEffect(() => {
    let blocco: WakeLockSentinel | null = null;
    let fermo = false;
    const chiedi = async () => {
      if (fermo || document.visibilityState !== 'visible' || !('wakeLock' in navigator)) return;
      try {
        blocco = await navigator.wakeLock.request('screen');
      } catch {
        // Batteria scarica o browser che non lo consente: lo schermo si spegne come sempre.
      }
    };
    void chiedi();
    // Il blocco cade quando l'app va in secondo piano: si richiede al ritorno.
    document.addEventListener('visibilitychange', chiedi);
    return () => {
      fermo = true;
      document.removeEventListener('visibilitychange', chiedi);
      void blocco?.release().catch(() => undefined);
    };
  }, []);
}

function quantita(v: RigaVista): string | undefined {
  if (!v.ingrediente || !v.mancante) return undefined;
  const testo = formattaQuantita(v.mancante, v.ingrediente.unita, v.ingrediente);
  return v.confezioni && v.ingrediente.formato && v.ingrediente.unita !== 'pz'
    ? `${testo} · ${v.confezioni} ${v.confezioni === 1 ? 'confezione' : 'confezioni'}`
    : testo;
}

const STATO: Partial<Record<StatoSync, string>> = {
  in_corso: 'Aggiorno con la famiglia…',
  offline: 'Offline: le spunte restano qui e partono appena torna la rete.',
  errore: 'Drive non risponde: le spunte restano qui, riprovo tra poco.',
  spento: 'Solo su questo telefono: salva su Google Drive per fare la spesa in due.',
};

function StatoFamiglia() {
  const stato = useSync((s) => s.stato);
  const ultima = useSync((s) => s.ultima);
  if (stato === 'pausa') return null;
  const testo =
    stato === 'ok'
      ? `In tempo reale con la famiglia${ultima ? ` · ${new Date(ultima).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}` : ''}`
      : STATO[stato];
  return <p className={`spesa-stato${stato === 'ok' || stato === 'in_corso' ? ' attivo' : ''}`}>{testo}</p>;
}

function Riga({ v, presa, onTocca }: { v: RigaVista; presa: boolean; onTocca: () => void }) {
  const autore = useAutoreAltrui();
  const altri = presa ? autore(v.riga.modificato_da) && `preso da ${autore(v.riga.modificato_da)}` : autore(v.riga.creato_da) && `da ${autore(v.riga.creato_da)}`;
  const dettaglio = [presa ? undefined : quantita(v), altri].filter(Boolean).join(' · ');
  return (
    <li>
      <button
        type="button"
        className={`spesa-riga${presa ? ' presa' : ''}`}
        aria-pressed={presa}
        aria-label={presa ? `${v.riga.testo}: nel carrello, tocca per rimetterlo da prendere` : `${v.riga.testo}: tocca quando è nel carrello`}
        onClick={onTocca}
      >
        <span className={`casella${presa ? ' spuntata' : ''}`} aria-hidden="true">
          {presa && <IconaSpunta />}
        </span>
        <span className="spesa-testo">
          <span className="spesa-nome">{v.riga.testo}</span>
          {dettaglio && <span className="spesa-dettaglio">{dettaglio}</span>}
        </span>
        <span className="spesa-emoji" aria-hidden="true">
          {emojiIngrediente(v.ingrediente?.id, v.reparto)}
        </span>
      </button>
    </li>
  );
}

/**
 * Modalità supermercato: tutto schermo, per reparto, caratteri grandi e un tocco per mettere nel carrello.
 * La spunta carica subito la casa; con Drive collegato le spunte arrivano agli altri in pochi secondi.
 */
export function Spesa() {
  const ctx = useNucleo();
  const naviga = useNavigate();
  const righe = useCollezione<ArticoloLista>('liste');
  const disponibilita = useDisponibilita();
  const spesa = useMemo(() => vistaSpesa(vistaLista(righe, disponibilita)), [righe, disponibilita]);
  // Le spunte fatte qui si annullano per intero (anche l'articolo messo in casa).
  const annulli = useRef(new Map<string, () => void>());
  useSyncVeloce();
  useSchermoAcceso();

  function prendi(v: RigaVista) {
    const annulla = spuntaRiga(ctx, v.riga, v.mancante);
    annulli.current.set(v.riga.id, annulla);
    navigator.vibrate?.(15);
    mostraAvviso(`${v.riga.testo} nel carrello`, () => {
      annulla();
      annulli.current.delete(v.riga.id);
    });
  }

  function rimetti(v: RigaVista) {
    const annulla = annulli.current.get(v.riga.id);
    if (annulla) annulla();
    else rimettiDaComprare(ctx, v.riga.id);
    annulli.current.delete(v.riga.id);
  }

  const finito = spesa.reparti.length === 0;
  const percentuale = spesa.totale ? Math.round((spesa.presi / spesa.totale) * 100) : 0;

  return (
    <div className="modo-spesa">
      <header className="spesa-testa">
        <div className="spesa-riga-testa">
          <h1>Al supermercato</h1>
          <button type="button" className="bottone secondario" onClick={() => naviga('/lista')}>
            Fine
          </button>
        </div>
        {spesa.totale > 0 && (
          <>
            <p className="spesa-conto">
              {finito ? 'Tutto nel carrello' : `${spesa.totale - spesa.presi} da prendere · ${spesa.presi} nel carrello`}
            </p>
            <div className="spesa-avanzamento" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentuale}>
              <span style={{ width: `${percentuale}%` }} />
            </div>
          </>
        )}
        <StatoFamiglia />
      </header>

      <main className="spesa-corpo">
        {spesa.totale === 0 && (
          <Vuoto emoji="🛒" titolo="Niente da comprare">
            <p>Aggiungi le cose nella lista della spesa, poi torna qui.</p>
          </Vuoto>
        )}

        {spesa.reparti.map((r) => (
          <section className="spesa-reparto" key={r.id}>
            <h2>{r.nome}</h2>
            <ul>
              {r.righe.map((v) => (
                <Riga key={v.riga.id} v={v} presa={false} onTocca={() => prendi(v)} />
              ))}
            </ul>
          </section>
        ))}

        {finito && spesa.presi > 0 && (
          <div className="riquadro spesa-fine">
            <p>
              <strong>Hai preso tutto 🎉</strong>
            </p>
            <p className="testo-tenue">Le cose prese sono già in casa, con la scadenza stimata.</p>
            <button
              type="button"
              className="bottone"
              onClick={() => {
                svuotaPresi(ctx, righe);
                naviga('/lista');
              }}
            >
              Togli i presi dalla lista e chiudi
            </button>
          </div>
        )}

        {spesa.carrello.length > 0 && (
          <section className="spesa-reparto carrello">
            <h2>Nel carrello ({spesa.carrello.length})</h2>
            <ul>
              {spesa.carrello.map((v) => (
                <Riga key={v.riga.id} v={v} presa onTocca={() => rimetti(v)} />
              ))}
            </ul>
          </section>
        )}
      </main>
      <AvvisoSync />
      <AvvisoFlottante />
    </div>
  );
}
