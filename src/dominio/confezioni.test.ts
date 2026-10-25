import { describe, expect, it } from 'vitest';
import { confezioneIniziata, misuraConfezione, numeroConfezioni, quantitaConUnaInMeno } from './confezioni';
import type { Movimento } from './tipi';

const carico = (delta: number): Movimento => ({ delta, unita: 'ml', membro: 'm1', il: '2026-10-25T10:00:00Z', motivo: 'carico' });

describe('confezioni', () => {
  it('conta le confezioni e quelle iniziate come intere', () => {
    expect(numeroConfezioni(2000, 1000)).toBe(2);
    expect(numeroConfezioni(1700, 1000)).toBe(2);
    expect(numeroConfezioni(2020, 1000)).toBe(2);
    expect(numeroConfezioni(300, 1000)).toBe(1);
    expect(numeroConfezioni(0, 1000)).toBe(0);
    expect(numeroConfezioni(3, 1)).toBe(3);
  });

  it('togliendone una se ne va prima quella iniziata', () => {
    expect(quantitaConUnaInMeno(1700, 1000)).toBe(1000);
    expect(quantitaConUnaInMeno(2000, 1000)).toBe(1000);
    expect(quantitaConUnaInMeno(400, 1000)).toBe(0);
    expect(confezioneIniziata(1700, 1000)).toBe(true);
    expect(confezioneIniziata(2000, 1000)).toBe(false);
  });

  it('per gli articoli senza confezione usa il primo carico, per i pezzi 1', () => {
    expect(misuraConfezione({ unita: 'ml', movimenti: [carico(1000)] }, 2000)).toBe(1000);
    expect(misuraConfezione({ unita: 'ml', confezione: 500, movimenti: [carico(1000)] }, 1000)).toBe(500);
    expect(misuraConfezione({ unita: 'pz', movimenti: [] }, 3)).toBe(1);
    expect(misuraConfezione({ unita: 'g', movimenti: [] }, 250)).toBe(250);
  });
});
