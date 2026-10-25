import { describe, expect, it } from 'vitest';
import { INGREDIENTI_PER_ID } from './ingredienti';
import { RICETTE_SISTEMA } from './ricette';
import { CUCINE } from './ricetteBase';

describe('ricette di sistema', () => {
  it('hanno id unici, passaggi e ingredienti del catalogo', () => {
    const id = RICETTE_SISTEMA.map((r) => r.id);
    expect(new Set(id).size).toBe(id.length);
    for (const r of RICETTE_SISTEMA) {
      expect(r.passaggi.length, r.id).toBeGreaterThan(0);
      for (const riga of r.ingredienti) {
        expect(INGREDIENTI_PER_ID.has(riga.ingrediente_id!), `${r.id}: ${riga.ingrediente_id}`).toBe(true);
        expect(riga.quantita, `${r.id}: ${riga.testo}`).toBeGreaterThan(0);
      }
    }
  });

  it('coprono tutte le cucine, con più di 100 ricette italiane', () => {
    const perCucina = new Map(CUCINE.map((c) => [c.id, RICETTE_SISTEMA.filter((r) => r.cucina === c.id).length]));
    expect(perCucina.get('italiana')).toBeGreaterThan(100);
    for (const c of ['cinese', 'giapponese', 'greca', 'indiana'] as const) expect(perCucina.get(c)).toBeGreaterThanOrEqual(12);
  });
});
