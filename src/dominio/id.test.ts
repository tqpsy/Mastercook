import { describe, expect, it } from 'vitest';
import { dataLocale, idArticoloListaTesto, idIngrediente, idPiano, settimanaIso, uuidv7 } from './id';

describe('id', () => {
  it('genera UUIDv7 ordinati nel tempo', () => {
    const primo = uuidv7(1_700_000_000_000);
    const secondo = uuidv7(1_700_000_000_001);
    expect(primo).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(primo < secondo).toBe(true);
  });

  it('calcola la settimana ISO, anche a cavallo d’anno', () => {
    expect(settimanaIso('2026-10-27')).toBe('2026-W44');
    expect(settimanaIso('2027-01-01')).toBe('2026-W53');
    expect(settimanaIso('2024-12-30')).toBe('2025-W01');
    expect(idPiano('2026-10-26')).toBe('piano:2026-W44');
  });

  it('usa la data locale di Roma', () => {
    // 23:30 UTC del 31 ottobre = 00:30 del 1º novembre a Roma (ora solare)
    expect(dataLocale(new Date('2026-10-31T23:30:00Z'))).toBe('2026-11-01');
  });

  it('crea slug stabili per ingredienti e righe a testo libero', () => {
    expect(idIngrediente('Caffè macinato')).toBe('ing:caffe_macinato');
    expect(idArticoloListaTesto('  Carta forno! ')).toBe('art:txt:carta_forno');
  });
});
