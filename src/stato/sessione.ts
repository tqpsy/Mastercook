import { create } from 'zustand';

interface StatoSessione {
  /** Nucleo mostrato in questo momento (selettore in alto). */
  nucleoCorrenteId: string | null;
  scegliNucleo: (id: string | null) => void;
}

export const useSessione = create<StatoSessione>((set) => ({
  nucleoCorrenteId: null,
  scegliNucleo: (id) => set({ nucleoCorrenteId: id }),
}));
