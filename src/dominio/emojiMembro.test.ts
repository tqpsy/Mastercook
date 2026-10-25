import { describe, expect, it } from 'vitest';
import { emojiMembro } from './emojiMembro';

const oggi = '2026-10-25';

describe('emojiMembro', () => {
  it('distingue uomo, donna, bambino e bambina dalla data di nascita', () => {
    expect(emojiMembro({ sesso: 'maschio', data_nascita: '1985-03-01', fattore_porzione: 1 }, oggi)).toBe('👨');
    expect(emojiMembro({ sesso: 'femmina', data_nascita: '1987-06-12', fattore_porzione: 1 }, oggi)).toBe('👩');
    expect(emojiMembro({ sesso: 'maschio', data_nascita: '2019-01-10', fattore_porzione: 1 }, oggi)).toBe('👦');
    expect(emojiMembro({ sesso: 'femmina', data_nascita: '2016-11-30', fattore_porzione: 1 }, oggi)).toBe('👧');
  });

  it('a 14 anni compiuti il profilo è adulto', () => {
    expect(emojiMembro({ sesso: 'femmina', data_nascita: '2012-10-25', fattore_porzione: 1 }, oggi)).toBe('👩');
    expect(emojiMembro({ sesso: 'femmina', data_nascita: '2012-10-26', fattore_porzione: 1 }, oggi)).toBe('👧');
  });

  it('senza data di nascita usa la porzione, senza sesso un’emoji neutra', () => {
    expect(emojiMembro({ sesso: 'maschio', fattore_porzione: 0.6 }, oggi)).toBe('👦');
    expect(emojiMembro({ fattore_porzione: 0.6 }, oggi)).toBe('🧒');
    expect(emojiMembro({ fattore_porzione: 1 }, oggi)).toBe('🧑');
  });
});
