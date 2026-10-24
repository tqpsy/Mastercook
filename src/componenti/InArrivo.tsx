import type { ReactNode } from 'react';

/** Segnaposto per le schermate ancora da costruire, con ciò che conterranno. */
export function InArrivo({ titolo, children }: { titolo: string; children: ReactNode }) {
  return (
    <section className="pagina">
      <h1>{titolo}</h1>
      <div className="riquadro">
        <span className="etichetta-fase">In costruzione</span>
        {children}
      </div>
    </section>
  );
}
