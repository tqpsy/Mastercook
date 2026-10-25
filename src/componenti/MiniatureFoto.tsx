import { useState } from 'react';
import { Foglio } from './ui';

export interface Miniatura {
  id: string;
  url: string;
}

/** Griglia di foto con numero, ingrandimento al tocco e × per toglierne una. */
export function MiniatureFoto({ foto, descrizione, onTogli }: { foto: Miniatura[]; descrizione: string; onTogli: (id: string) => void }) {
  const [aperta, setAperta] = useState<number | null>(null);
  if (!foto.length) return null;
  const mostrata = aperta !== null ? foto[aperta] : undefined;
  return (
    <>
      <ul className="griglia-foto">
        {foto.map((f, i) => (
          <li key={f.id}>
            <button type="button" className="apri-foto" onClick={() => setAperta(i)} aria-label={`Ingrandisci ${descrizione} ${i + 1}`}>
              <img src={f.url} alt="" />
            </button>
            <span className="numero-foto" aria-hidden="true">
              {i + 1}
            </span>
            <button type="button" className="togli-foto" onClick={() => onTogli(f.id)} aria-label={`Togli ${descrizione} ${i + 1}`}>
              ×
            </button>
          </li>
        ))}
      </ul>
      {mostrata && (
        <Foglio titolo={`${descrizione[0]!.toUpperCase()}${descrizione.slice(1)} ${aperta! + 1} di ${foto.length}`} onChiudi={() => setAperta(null)}>
          <img src={mostrata.url} alt="" style={{ width: '100%', borderRadius: 'var(--raggio)' }} />
        </Foglio>
      )}
    </>
  );
}
