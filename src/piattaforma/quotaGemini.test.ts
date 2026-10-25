import { beforeEach, describe, expect, it } from 'vitest';

// Nei test gira Node: un archivio in memoria al posto di quello del browser.
const memoria = new Map<string, string>();
globalThis.localStorage ??= {
  getItem: (k: string) => memoria.get(k) ?? null,
  setItem: (k: string, v: string) => void memoria.set(k, v),
  removeItem: (k: string) => void memoria.delete(k),
  clear: () => memoria.clear(),
  key: (i: number) => [...memoria.keys()][i] ?? null,
  get length() {
    return memoria.size;
  },
};

const { eQuotaGiornaliera, giornoGoogle, impostaLimite, prossimoAzzeramento, quotaEsaurita, registraRichiesta, segnaEsaurita, useQuotaGemini } = await import('./quotaGemini');

describe('prova gratuita di Gemini', () => {
  beforeEach(() => localStorage.clear());

  it('il giorno di Google cambia a mezzanotte del Pacifico (le 9 in Italia d’inverno)', () => {
    // 25 ottobre 2026: in Italia ora solare (UTC+1), in California ancora ora legale (UTC−7).
    expect(giornoGoogle(new Date('2026-10-26T06:59:00Z'))).toBe('2026-10-25');
    expect(giornoGoogle(new Date('2026-10-26T07:00:00Z'))).toBe('2026-10-26');
    expect(prossimoAzzeramento(new Date('2026-10-25T14:10:00Z')).toISOString()).toBe('2026-10-26T07:00:00.000Z');
    // A dicembre entrambe in ora solare: UTC−8.
    expect(prossimoAzzeramento(new Date('2026-12-01T12:00:00Z')).toISOString()).toBe('2026-12-02T08:00:00.000Z');
  });

  it('conta le richieste e segna la fine della prova', () => {
    impostaLimite(5);
    registraRichiesta();
    registraRichiesta();
    expect(useQuotaGemini.getState()).toMatchObject({ usate: 2, limite: 5, esaurita: false });
    expect(quotaEsaurita()).toBe(false);
    segnaEsaurita();
    expect(quotaEsaurita()).toBe(true);
    expect(useQuotaGemini.getState().usate).toBe(5);
  });

  it('distingue la quota del giorno da quella del minuto', () => {
    expect(eQuotaGiornaliera('{"quotaId": "GenerateRequestsPerDayPerProjectPerModel-FreeTier"}')).toBe(true);
    expect(eQuotaGiornaliera('{"quotaId": "GenerateRequestsPerMinutePerProjectPerModel-FreeTier"}')).toBe(false);
  });
});
