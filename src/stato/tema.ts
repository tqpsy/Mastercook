import { create } from 'zustand';

/** Tema scelto in Impostazioni: «auto» segue il telefono. È una preferenza del dispositivo, non del nucleo. */
export type Tema = 'auto' | 'chiaro' | 'scuro';

const CHIAVE = 'masterfood:tema';

function leggiTema(): Tema {
  try {
    const valore = localStorage.getItem(CHIAVE);
    return valore === 'chiaro' || valore === 'scuro' ? valore : 'auto';
  } catch {
    return 'auto';
  }
}

/** Applica il tema alla pagina: il CSS legge data-tema su <html>. */
export function applicaTema(tema: Tema): void {
  if (tema === 'auto') delete document.documentElement.dataset.tema;
  else document.documentElement.dataset.tema = tema;
}

export const useTema = create<{ tema: Tema; scegliTema: (tema: Tema) => void }>((set) => ({
  tema: leggiTema(),
  scegliTema: (tema) => {
    try {
      if (tema === 'auto') localStorage.removeItem(CHIAVE);
      else localStorage.setItem(CHIAVE, tema);
    } catch {
      // Archivio non disponibile: il tema vale solo per questa sessione.
    }
    applicaTema(tema);
    set({ tema });
  },
}));
