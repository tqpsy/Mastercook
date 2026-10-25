import { describe, expect, it } from 'vitest';
import { RICETTE_SISTEMA_PER_ID } from '../rif/ricette';
import { fabbisognoMenu, lunediDi, porzioniPortata } from './menu';
import type { Pasto } from './tipi';

describe('menu', () => {
  it('lunedì della settimana', () => {
    expect(lunediDi('2026-10-25')).toBe('2026-10-19'); // domenica
    expect(lunediDi('2026-10-26')).toBe('2026-10-26');
    expect(lunediDi('2026-10-29')).toBe('2026-10-26');
  });

  it('porzioni: dieta per chi ce l’ha, fattore per gli altri', () => {
    const portata = { ricetta_id: 'sys:pasta_zucchine', titolo: 'x', membri: ['a', 'b'], porzioni_dieta: { a: 0.75 } };
    expect(porzioniPortata(portata, () => 0.6)).toBe(1.35);
  });

  it('somma gli ingredienti della settimana, senza la dispensa di base', () => {
    const pasti: Pasto[] = [
      { data: '2026-10-26', tipo: 'pranzo', membri_presenti: ['a'], portate: [{ ricetta_id: 'sys:pasta_zucchine', titolo: '', membri: ['a'], porzioni_dieta: { a: 1 } }] },
      { data: '2026-10-27', tipo: 'pranzo', membri_presenti: ['a'], portate: [{ ricetta_id: 'sys:pasta_zucchine', titolo: '', membri: ['a', 'b'] }, { titolo: 'Mela 150 g', membri: ['a'], ingrediente_id: 'ing:mela', quantita_g: 150 }] },
    ];
    const f = fabbisognoMenu(pasti, (id) => RICETTE_SISTEMA_PER_ID.get(id), () => 1);
    expect(f.get('ing:pasta')).toBe(240);
    expect(f.get('ing:zucchina')).toBe(380);
    expect(f.get('ing:mela')).toBe(150);
    expect(f.has('ing:olio_evo')).toBe(false);
  });
});
