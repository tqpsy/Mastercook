import { useState } from 'react';
import { InArrivo } from '../componenti/InArrivo';
import type { Luogo } from '../dominio/tipi';

const LUOGHI: { id: Luogo; nome: string }[] = [
  { id: 'frigo', nome: 'Frigo' },
  { id: 'freezer', nome: 'Freezer' },
  { id: 'dispensa', nome: 'Dispensa' },
];

export function Casa() {
  const [luogo, setLuogo] = useState<Luogo>('frigo');
  return (
    <InArrivo titolo="Casa">
      <div className="sottoschede" role="tablist">
        {LUOGHI.map((l) => (
          <button
            key={l.id}
            type="button"
            role="tab"
            aria-selected={luogo === l.id}
            className={luogo === l.id ? 'attiva' : ''}
            onClick={() => setLuogo(l.id)}
          >
            {l.nome}
          </button>
        ))}
      </div>
      <p>L'inventario di {LUOGHI.find((l) => l.id === luogo)!.nome.toLowerCase()} con quantità, scadenze e chi ha aggiunto cosa.</p>
    </InArrivo>
  );
}
