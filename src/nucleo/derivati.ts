/** Dati derivati usati da più schermate, ricalcolati sul dispositivo a ogni modifica. */
import { useMemo } from 'react';
import { aggiungiGiorni } from '../dominio/date';
import { articoliPresenti, calcolaDisponibilita, type ArticoloValutato, type Disponibilita } from '../dominio/disponibilita';
import { dataLocale } from '../dominio/id';
import type { ContestoSuggerimenti, Presente } from '../dominio/suggerimenti';
import type { ArticoloInventario, EventoStorico, Membro, Ricetta } from '../dominio/tipi';
import { RICETTE_SISTEMA } from '../rif/ricette';
import { useNucleo } from './contesto';
import { useCollezione } from './hooks';

export function useOggi(): string {
  return dataLocale();
}

export function useMembri(): Membro[] {
  const membri = useCollezione<Membro>('membri');
  return useMemo(() => [...membri].sort((a, b) => a.creato_il.localeCompare(b.creato_il)), [membri]);
}

export function useMembroCorrente(): Membro | undefined {
  const { membroId } = useNucleo();
  return useMembri().find((m) => m.id === membroId);
}

export function useNomeMembro(): (id: string | undefined) => string {
  const membri = useCollezione<Membro>('membri', { includiEliminate: true });
  return useMemo(() => {
    const nomi = new Map(membri.map((m) => [m.id, m.nome]));
    return (id) => (id ? (nomi.get(id) ?? 'Ex membro') : '');
  }, [membri]);
}

export function useInventario(): ArticoloValutato[] {
  const articoli = useCollezione<ArticoloInventario>('inventario');
  const oggi = useOggi();
  return useMemo(() => articoliPresenti(articoli, oggi), [articoli, oggi]);
}

export function useDisponibilita(): Disponibilita {
  const inventario = useInventario();
  return useMemo(() => calcolaDisponibilita(inventario), [inventario]);
}

interface MetaRicetta {
  id: string;
  ricetta_id: string;
  preferita?: boolean;
  voto?: number;
}

export function useRicette(): Ricetta[] {
  const personali = useCollezione<Ricetta & { id: string }>('ricette');
  return useMemo(() => [...personali.map((r) => ({ ...r, origine: 'personale' as const })), ...RICETTE_SISTEMA], [personali]);
}

export function useMetaRicette(): Map<string, MetaRicetta> {
  const meta = useCollezione<MetaRicetta>('ricette_meta');
  return useMemo(() => new Map(meta.map((m) => [m.ricetta_id, m])), [meta]);
}

export function presenteDa(m: Membro): Presente {
  return {
    nome: m.nome,
    allergie: m.allergie ?? [],
    restrizioni: m.restrizioni ?? [],
    sgraditi: m.preferenze?.sgraditi ?? [],
    fattore_porzione: m.fattore_porzione ?? 1,
  };
}

/** Contesto dei suggerimenti per i membri scelti (di default tutti gli attivi). */
export function useContestoSuggerimenti(membriPresenti?: readonly string[]): ContestoSuggerimenti {
  const membri = useMembri();
  const disponibilita = useDisponibilita();
  const meta = useMetaRicette();
  const eventi = useCollezione<EventoStorico>('eventi', { documento: 'storico' });
  const oggi = useOggi();
  return useMemo(() => {
    const presenti = membri.filter((m) => m.attivo !== false && (!membriPresenti || membriPresenti.includes(m.id))).map(presenteDa);
    const limite = aggiungiGiorni(oggi, -5);
    const recenti = new Set(eventi.filter((e) => e.tipo === 'preparazione' && e.il.slice(0, 10) >= limite && e.motivo).map((e) => e.motivo!));
    return {
      mese: Number(oggi.slice(5, 7)),
      disponibilita,
      presenti,
      preferite: new Set([...meta.values()].filter((m) => m.preferita).map((m) => m.ricetta_id)),
      voti: new Map([...meta.values()].filter((m) => m.voto).map((m) => [m.ricetta_id, m.voto!])),
      recenti,
    };
  }, [membri, membriPresenti, disponibilita, meta, eventi, oggi]);
}
