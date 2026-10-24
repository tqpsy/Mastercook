import { describe, expect, it } from 'vitest';
import { quantitaDisponibile, quantitaScalata } from './quantita';
import type { Movimento } from './tipi';

const mov = (delta: number, unita: Movimento['unita'] = 'g'): Movimento => ({
  delta,
  unita,
  membro: 'm1',
  il: '2026-10-23T10:00:00Z',
  motivo: delta >= 0 ? 'carico' : 'consumo',
});

describe('quantità', () => {
  it('somma i movimenti della stessa unità', () => {
    expect(quantitaDisponibile([mov(500), mov(-200), mov(3, 'pz')], 'g')).toBe(300);
  });

  it('non scende mai sotto zero dopo consumi concorrenti', () => {
    expect(quantitaDisponibile([mov(100), mov(-80), mov(-80)], 'g')).toBe(0);
  });

  it('scala le porzioni sui fattori dei presenti', () => {
    // ricetta per 4 con 320 g di pasta; presenti due adulti e un bambino
    expect(quantitaScalata(320, 4, [1, 1, 0.6])).toBeCloseTo(208);
  });
});
