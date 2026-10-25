/** Dati del menù settimanale e delle diete, ricalcolati a ogni modifica. */
import { useMemo } from 'react';
import { porzioneEffettiva } from '../dominio/fabbisogni';
import { idDieta } from '../dominio/id';
import { giorniSettimana } from '../dominio/menu';
import type { DietaMembro, MembroId, Pasto, Ricetta } from '../dominio/tipi';
import { useMembri, useOggi, useRicette } from './derivati';
import { useCollezione } from './hooks';

export function useDiete(): Map<MembroId, DietaMembro> {
  const diete = useCollezione<DietaMembro>('diete');
  return useMemo(() => new Map(diete.map((d) => [d.membro_id, d])), [diete]);
}

export function useDieta(membroId: MembroId | undefined): DietaMembro | undefined {
  const diete = useCollezione<DietaMembro>('diete');
  return useMemo(() => diete.find((d) => d.id === idDieta(membroId ?? '')), [diete, membroId]);
}

/** I pasti della settimana che inizia `lunedi`, per data. */
export function usePastiSettimana(lunedi: string): Pasto[] {
  const pasti = useCollezione<Pasto & { id: string }>('piani');
  return useMemo(() => {
    const giorni = new Set(giorniSettimana(lunedi));
    return pasti.filter((p) => p.data && giorni.has(p.data));
  }, [pasti, lunedi]);
}

/** Fattore di porzione di ogni membro (adulto 1,0), per le portate senza grammature della dieta. */
export function useFattorePorzione(): (m: MembroId) => number {
  const membri = useMembri();
  const oggi = useOggi();
  return useMemo(() => {
    const fattori = new Map(membri.map((m) => [m.id, porzioneEffettiva(m, oggi)]));
    return (m) => fattori.get(m) ?? 1;
  }, [membri, oggi]);
}

export function useRicettaPerId(): (id: string) => Ricetta | undefined {
  const ricette = useRicette();
  return useMemo(() => {
    const mappa = new Map(ricette.map((r) => [r.id, r]));
    return (id) => mappa.get(id);
  }, [ricette]);
}
