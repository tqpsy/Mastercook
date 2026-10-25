import { describe, expect, it } from 'vitest';
import { annoNascita, calcolaFabbisogno, etaDaAnno, fattoreDaFabbisogno, porzioneEffettiva, puoAvereCondizione } from './fabbisogni';

describe('fabbisogni LARN', () => {
  it('calcola l’età dall’anno di nascita', () => {
    expect(etaDaAnno(1985, '2026-10-24')).toBe(41);
    expect(annoNascita({ data_nascita: '1985-10-24' })).toBe(1985);
    expect(annoNascita({ anno_nascita: 1990, data_nascita: '1985-10-24' })).toBe(1990);
  });

  it('distingue maschi e femmine e usa la media se il sesso manca', () => {
    const m = calcolaFabbisogno(40, 'maschio');
    const f = calcolaFabbisogno(40, 'femmina');
    const media = calcolaFabbisogno(40);
    expect(m.energia_kcal).toBeGreaterThan(f.energia_kcal);
    expect(f.ferro_mg).toBeGreaterThan(m.ferro_mg);
    expect(media.energia_kcal).toBeGreaterThan(f.energia_kcal);
    expect(media.energia_kcal).toBeLessThan(m.energia_kcal);
  });

  it('aggiunge gravidanza e allattamento solo alle donne in età fertile', () => {
    expect(calcolaFabbisogno(32, 'femmina', 'gravidanza').ferro_mg).toBe(27);
    expect(calcolaFabbisogno(32, 'femmina', 'allattamento').energia_kcal).toBe(2550);
    expect(calcolaFabbisogno(32, 'maschio', 'gravidanza')).toEqual(calcolaFabbisogno(32, 'maschio'));
    expect(puoAvereCondizione('femmina', 70)).toBe(false);
  });

  it('ricava la porzione rispetto all’adulto medio', () => {
    expect(fattoreDaFabbisogno(calcolaFabbisogno(5))).toBeCloseTo(0.6, 1);
    expect(fattoreDaFabbisogno(calcolaFabbisogno(16, 'maschio'))).toBe(1.25);
  });

  it('rispetta la porzione scelta a mano', () => {
    const oggi = '2026-10-24';
    expect(porzioneEffettiva({ data_nascita: '2021-01-01', fattore_porzione: 1 }, oggi)).toBeLessThan(1);
    expect(porzioneEffettiva({ data_nascita: '2021-01-01', fattore_porzione: 1, porzione_automatica: false }, oggi)).toBe(1);
    expect(porzioneEffettiva({ fattore_porzione: 1.3 }, oggi)).toBe(1.3);
  });
});

describe('anno di nascita', () => {
  it('basta l’anno per la porzione e vale ancora la data dei vecchi profili', () => {
    const oggi = '2026-10-25';
    expect(porzioneEffettiva({ anno_nascita: 2021, fattore_porzione: 1 }, oggi)).toBe(porzioneEffettiva({ data_nascita: '2021-01-01', fattore_porzione: 1 }, oggi));
    expect(porzioneEffettiva({ anno_nascita: 2021, fattore_porzione: 1 }, oggi)).toBeLessThan(1);
    expect(porzioneEffettiva({ anno_nascita: 2030, fattore_porzione: 0.8 }, oggi)).toBe(0.8);
  });
});
