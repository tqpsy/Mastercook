/** Icone a tratto (stile Lucide, disegnate a mano per non aggiungere dipendenze). */
import type { SVGProps } from 'react';

function Icona({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {children}
    </svg>
  );
}

type P = SVGProps<SVGSVGElement>;

export const IconaOggi = (p: P) => (
  <Icona {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </Icona>
);
export const IconaCasa = (p: P) => (
  <Icona {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
    <path d="M10 21v-6h4v6" />
  </Icona>
);
export const IconaPiu = (p: P) => (
  <Icona {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icona>
);
export const IconaLista = (p: P) => (
  <Icona {...p}>
    <path d="m3 6 1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17" />
    <path d="M11 6h10M11 12h10M11 18h10" />
  </Icona>
);
export const IconaRicette = (p: P) => (
  <Icona {...p}>
    <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
    <path d="M6 17h12" />
  </Icona>
);
export const IconaImpostazioni = (p: P) => (
  <Icona {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </Icona>
);
export const IconaCerca = (p: P) => (
  <Icona {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </Icona>
);
export const IconaIndietro = (p: P) => (
  <Icona {...p}>
    <path d="m15 18-6-6 6-6" />
  </Icona>
);
export const IconaSpunta = (p: P) => (
  <Icona {...p} strokeWidth={3}>
    <path d="M20 6 9 17l-5-5" />
  </Icona>
);
export const IconaChiudi = (p: P) => (
  <Icona {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Icona>
);
export const IconaCodice = (p: P) => (
  <Icona {...p}>
    <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
    <path d="M7 8v8M10 8v8M13 8v8M17 8v8" />
  </Icona>
);
export const IconaScontrino = (p: P) => (
  <Icona {...p}>
    <path d="M5 3v18l2-1.5L9 21l2-1.5L13 21l2-1.5L17 21l2-1.5V3l-2 1.5L15 3l-2 1.5L11 3 9 4.5 7 3Z" />
    <path d="M9 9h6M9 13h6" />
  </Icona>
);
export const IconaFotocamera = (p: P) => (
  <Icona {...p}>
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3Z" />
    <circle cx="12" cy="13" r="3.5" />
  </Icona>
);
export const IconaMatita = (p: P) => (
  <Icona {...p}>
    <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </Icona>
);
export const IconaCuore = ({ pieno, ...p }: P & { pieno?: boolean }) => (
  <Icona {...p} fill={pieno ? 'currentColor' : 'none'}>
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </Icona>
);
