import { create } from 'zustand';
import { leggiNucleoCorrente, scriviMembroCorrente, scriviNucleoCorrente } from '../nucleo/registro';

interface StatoSessione {
  /** Nucleo mostrato in questo momento (selettore in alto). */
  nucleoCorrenteId: string | null;
  /** Chi sta usando l'app su questo dispositivo, se cambiato durante la sessione. */
  membroCorrenteId: string | null;
  scegliNucleo: (id: string | null) => void;
  scegliMembro: (nucleoId: string, membroId: string) => void;
  /** Chi mangia, scelto nella scheda Ricette (null = tutti i membri attivi). */
  presenti: string[] | null;
  scegliPresenti: (presenti: string[] | null) => void;
}

export const useSessione = create<StatoSessione>((set) => ({
  nucleoCorrenteId: leggiNucleoCorrente(),
  membroCorrenteId: null,
  presenti: null,
  scegliPresenti: (presenti) => set({ presenti }),
  scegliNucleo: (id) => {
    scriviNucleoCorrente(id);
    set({ nucleoCorrenteId: id, membroCorrenteId: null, presenti: null });
  },
  scegliMembro: (nucleoId, membroId) => {
    scriviMembroCorrente(nucleoId, membroId);
    set({ membroCorrenteId: membroId });
  },
}));
