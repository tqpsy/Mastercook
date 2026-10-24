import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type * as Y from 'yjs';
import { apriDocumentoLocale } from '../piattaforma/documento';
import { useSessione } from '../stato/sessione';
import { leggiMembroCorrente, leggiNuclei, type NucleoLocale } from './registro';

export interface ContestoNucleo {
  nucleo: NucleoLocale;
  dati: Y.Doc;
  storico: Y.Doc;
  /** Profilo di chi sta usando l'app su questo dispositivo: autore di ogni modifica. */
  membroId: string;
}

const Contesto = createContext<ContestoNucleo | null>(null);

export function useNucleo(): ContestoNucleo {
  const valore = useContext(Contesto);
  if (!valore) throw new Error('useNucleo fuori da ProviderNucleo');
  return valore;
}

/** Apre i due documenti del nucleo corrente da IndexedDB e li rende disponibili all'app. */
export function ProviderNucleo({ nucleoId, children, attesa }: { nucleoId: string; children: ReactNode; attesa: ReactNode }) {
  const [valore, setValore] = useState<ContestoNucleo | null>(null);
  const membroScelto = useSessione((s) => s.membroCorrenteId);

  useEffect(() => {
    let annullato = false;
    const nucleo = leggiNuclei().find((n) => n.id === nucleoId);
    if (!nucleo) return;
    const aperture = Promise.all([apriDocumentoLocale(nucleoId, 'dati'), apriDocumentoLocale(nucleoId, 'storico')]);
    aperture.then(([dati, storico]) => {
      if (annullato) return;
      setValore({ nucleo, dati: dati.doc, storico: storico.doc, membroId: leggiMembroCorrente(nucleoId) ?? '' });
    });
    return () => {
      annullato = true;
      setValore(null);
      aperture.then(([dati, storico]) => {
        dati.persistenza.destroy();
        storico.persistenza.destroy();
      });
    };
  }, [nucleoId]);

  if (!valore) return <>{attesa}</>;
  const membroId = membroScelto ?? valore.membroId;
  return <Contesto.Provider value={membroId === valore.membroId ? valore : { ...valore, membroId }}>{children}</Contesto.Provider>;
}
