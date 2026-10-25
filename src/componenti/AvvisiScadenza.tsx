import { useEffect, useMemo, useState } from 'react';
import { create } from 'zustand';
import { preparaPromemoria } from '../dominio/avvisiScadenza';
import { dataLocale } from '../dominio/id';
import { suggerisci } from '../dominio/suggerimenti';
import { useContestoSuggerimenti, useInventario, useRicette } from '../nucleo/derivati';
import {
  attivaAvvisi,
  avvisiAttivi,
  avvisoAllApertura,
  disattivaAvvisi,
  mostraAvvisoOra,
  notificheSupportate,
  registraSincronizzazione,
  salvaPromemoria,
  type EsitoAvvisi,
} from '../piattaforma/notifiche';
import { mostraAvviso } from './ui';

export const useStatoAvvisi = create<{ attivi: boolean; imposta: (attivi: boolean) => void }>((set) => ({
  attivi: avvisiAttivi(),
  imposta: (attivi) => set({ attivi }),
}));

function oraARoma(): number {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
}

/** Tiene aggiornati i promemoria dei prossimi giorni a ogni modifica della casa o delle ricette. */
export function usePromemoriaScadenze() {
  const attivi = useStatoAvvisi((s) => s.attivi);
  const inventario = useInventario();
  const ricette = useRicette();
  const ctx = useContestoSuggerimenti();
  const promemoria = useMemo(() => {
    if (!attivi) return [];
    const s = suggerisci(ricette, ctx);
    return preparaPromemoria(inventario, [...s.pronte, ...s.quasi, ...s.altre], dataLocale());
  }, [attivi, inventario, ricette, ctx]);

  useEffect(() => {
    if (!attivi) return;
    const t = setTimeout(() => {
      void salvaPromemoria(promemoria)
        .then(() => avvisoAllApertura(dataLocale(), oraARoma()))
        .catch(() => undefined);
    }, 1500);
    return () => clearTimeout(t);
  }, [attivi, promemoria]);
}

const SPIEGAZIONE: Record<EsitoAvvisi, string> = {
  automatici: 'Attivi: il telefono ti avvisa una volta al giorno, tra le 8 e le 21, anche ad app chiusa.',
  solo_aperta:
    'Attivi. Questo browser non può svegliare l’app da solo, quindi l’avviso arriva quando apri Masterfood. Su Android, con l’app installata nella schermata Home, arriva anche ad app chiusa.',
  negati: 'Le notifiche sono bloccate: riattivale dalle impostazioni del browser per Masterfood, poi riprova.',
};

export function AvvisiScadenza() {
  const { attivi, imposta } = useStatoAvvisi();
  const [esito, setEsito] = useState<EsitoAvvisi>();
  useEffect(() => {
    if (attivi) void registraSincronizzazione().then(setEsito);
  }, [attivi]);

  if (!notificheSupportate()) return null;
  return (
    <div className="sezione">
      <h2>Avvisi di scadenza</h2>
      <p className="testo-tenue piccolo">
        Una notifica al giorno quando qualcosa scade oggi o domani, con una ricetta per usarlo. Si calcola tutto su questo telefono.
      </p>
      <div className="azioni">
        {attivi ? (
          <>
            <button
              type="button"
              className="bottone secondario piccolo"
              onClick={() =>
                mostraAvvisoOra({ titolo: 'Yogurt scade domani', testo: 'Idea: Torta allo yogurt. (Questo è un avviso di prova.)', apri: 'casa' }).catch(() =>
                  mostraAvviso('Il telefono non permette le notifiche a Masterfood: controlla le impostazioni del browser'),
                )
              }
            >
              Prova un avviso
            </button>
            <button
              type="button"
              className="bottone-testo"
              onClick={async () => {
                await disattivaAvvisi();
                imposta(false);
                setEsito(undefined);
                mostraAvviso('Avvisi di scadenza disattivati');
              }}
            >
              Disattiva
            </button>
          </>
        ) : (
          <button
            type="button"
            className="bottone secondario"
            onClick={async () => {
              const r = await attivaAvvisi();
              setEsito(r);
              imposta(r !== 'negati');
            }}
          >
            Attiva gli avvisi
          </button>
        )}
      </div>
      {esito && <p className={esito === 'negati' ? 'esito-errore' : 'testo-tenue piccolo'}>{SPIEGAZIONE[esito]}</p>}
    </div>
  );
}
