import { describe, expect, it } from 'vitest';
import { CODICI_ALLERGENI, allergeniEffettivi, allergeniInConflitto } from './allergeni';

describe('allergeni', () => {
  it('elenca i 14 allergeni UE', () => {
    expect(CODICI_ALLERGENI).toHaveLength(14);
  });

  it('unisce dichiarati e ingredienti ignorando i codici sconosciuti', () => {
    const effettivi = allergeniEffettivi(['glutine'], [['latte', 'uova'], ['codice_futuro']]);
    expect([...effettivi].sort()).toEqual(['glutine', 'latte', 'uova']);
  });

  it('segnala i conflitti con le allergie dei presenti', () => {
    const ricetta = allergeniEffettivi(['glutine', 'latte'], []);
    expect(allergeniInConflitto(ricetta, [['arachidi'], ['latte']])).toEqual(['latte']);
    expect(allergeniInConflitto(ricetta, [['pesce']])).toEqual([]);
  });
});
