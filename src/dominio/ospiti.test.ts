import { describe, expect, it } from 'vitest';
import { RICETTE_SISTEMA } from '../rif/ricette';
import { porzioniPortata } from './menu';
import { descriviOspiti, fattoreOspiti, normalizzaOspiti, presenteOspiti } from './ospiti';
import { motivoEsclusione } from './suggerimenti';
import type { Ospiti } from './tipi';

const ospiti: Ospiti = { adulti: 2, bambini: 1, allergie: ['latte'], restrizioni: [] };

describe('ospiti', () => {
  it('adulto 1,0 e bambino 0,6, massimo 30 in tutto', () => {
    expect(fattoreOspiti(ospiti)).toBeCloseTo(2.6);
    expect(descriviOspiti(ospiti)).toBe('3 ospiti: 2 adulti e 1 bambino');
    expect(normalizzaOspiti({ ...ospiti, adulti: 25, bambini: 10 })).toMatchObject({ adulti: 25, bambini: 5 });
    expect(presenteOspiti({ ...ospiti, adulti: 0, bambini: 0 })).toBeNull();
  });

  it('si sommano alle porzioni delle portate con ricetta', () => {
    const portata = { ricetta_id: 'r1', titolo: 'Pasta', membri: ['a', 'b'] };
    expect(porzioniPortata(portata, () => 1, ospiti)).toBeCloseTo(4.6);
    expect(porzioniPortata({ titolo: 'Frutta', membri: ['a'] }, () => 1, ospiti)).toBe(1);
  });

  it('una ricetta con latte non va bene se un ospite è intollerante', () => {
    const conLatte = RICETTE_SISTEMA.find((r) => r.ingredienti.some((i) => i.ingrediente_id === 'ing:latte' || !!i.ingrediente_id?.startsWith('ing:parmigiano')));
    expect(conLatte).toBeDefined();
    expect(motivoEsclusione(conLatte!, [presenteOspiti(ospiti)!])).toMatch(/latte/i);
  });
});
