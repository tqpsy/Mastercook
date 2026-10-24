import { useMemo, useSyncExternalStore } from 'react';
import { collezione, type CollezioneDati, type CollezioneStorico } from '../piattaforma/documento';
import { useNucleo } from './contesto';

/**
 * Le entità di una collezione del documento, come oggetti semplici.
 * Si aggiorna a ogni modifica, locale o arrivata dalla sincronizzazione.
 * Le entità nel cestino (eliminato_il) sono escluse salvo `includiEliminate`.
 */
export function useCollezione<T extends { id: string; eliminato_il?: string }>(
  nome: CollezioneDati | CollezioneStorico,
  { documento = 'dati', includiEliminate = false }: { documento?: 'dati' | 'storico'; includiEliminate?: boolean } = {},
): T[] {
  const { dati, storico } = useNucleo();
  const doc = documento === 'dati' ? dati : storico;

  const archivio = useMemo(() => {
    const coll = collezione(doc, nome);
    const stato = { versione: 0, letta: -1, valore: [] as T[] };
    return {
      subscribe(avvisa: () => void) {
        const osservatore = () => {
          stato.versione++;
          avvisa();
        };
        coll.observeDeep(osservatore);
        return () => coll.unobserveDeep(osservatore);
      },
      getSnapshot(): T[] {
        if (stato.letta !== stato.versione) {
          const tutte = [...coll.values()].map((e) => e.toJSON() as T);
          stato.valore = includiEliminate ? tutte : tutte.filter((e) => !e.eliminato_il);
          stato.letta = stato.versione;
        }
        return stato.valore;
      },
    };
  }, [doc, nome, includiEliminate]);

  return useSyncExternalStore(archivio.subscribe, archivio.getSnapshot);
}
