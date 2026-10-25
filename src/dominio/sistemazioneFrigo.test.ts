import { describe, expect, it } from 'vitest';
import { consigliFrigo } from './sistemazioneFrigo';

describe('consigliFrigo', () => {
  it('prima la sicurezza: carne cruda in alto e ricotta sotto i crudi', () => {
    const c = consigliFrigo([
      { id: 'ing:petto_pollo', posizione: 'ripiano alto' },
      { id: 'ing:salmone', posizione: 'ripiano basso' },
      { id: 'ing:ricotta', posizione: 'ripiano basso' },
      { id: 'ing:banana', posizione: 'cassetto' },
    ]);
    expect(c[0]!.titolo).toBe('Sposta in basso: petto di pollo');
    expect(c.map((x) => x.titolo)).toContain('Separa la carne dal pesce');
    expect(c.map((x) => x.titolo)).toContain('Sposta in alto: ricotta');
    expect(c.length).toBeLessThanOrEqual(4);
  });

  it('segnala quello che sta meglio fuori dal frigo, con il motivo', () => {
    const [c] = consigliFrigo([{ id: 'ing:patata', posizione: 'cassetto' }, { id: 'ing:banana' }, { id: 'ing:banana' }]);
    expect(c!.titolo).toBe('Meglio fuori dal frigo: patate e banane');
    expect(c!.testo).toContain('annerisce');
  });

  it('senza posizioni dà solo promemoria, e niente se tutto è a posto', () => {
    expect(consigliFrigo([{ id: 'ing:manzo' }])[0]!.titolo).toBe('Carne e pesce crudi: in basso e chiusi');
    expect(consigliFrigo([{ id: 'ing:latte', posizione: 'portiera' }, { id: 'ing:carota', posizione: 'cassetto' }])).toEqual([]);
  });

  it('uova in portiera e verdure sui ripiani', () => {
    const titoli = consigliFrigo([
      { id: 'ing:uova', posizione: 'portiera' },
      { id: 'ing:zucchina', posizione: 'ripiano centrale' },
      { id: 'ing:carota', posizione: 'ripiano alto' },
    ]).map((c) => c.titolo);
    expect(titoli).toEqual(['Uova su un ripiano centrale', 'Nei cassetti: zucchine e carote']);
  });
});
