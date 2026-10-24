import { describe, expect, it } from 'vitest';
import { aggiungiGiorni, descriviData, differenzaGiorni } from './date';
import { statoScadenza } from './scadenza';

describe('date', () => {
  it('somma giorni anche a cavallo di mese e anno', () => {
    expect(aggiungiGiorni('2026-12-30', 3)).toBe('2027-01-02');
    expect(differenzaGiorni('2026-10-24', '2026-11-01')).toBe(8);
  });

  it('descrive le date vicine a parole', () => {
    expect(descriviData('2026-10-25', '2026-10-24')).toBe('domani');
    expect(descriviData('2026-10-27', '2026-10-24')).toBe('tra 3 giorni');
    expect(descriviData('2026-10-22', '2026-10-24')).toBe('2 giorni fa');
  });
});

describe('stato di scadenza', () => {
  const oggi = '2026-10-24';

  it('distingue "entro" da "preferibilmente entro"', () => {
    expect(statoScadenza({ data_scadenza: '2026-10-23', tipo_scadenza: 'entro' }, oggi, 2)).toBe('scaduto');
    expect(statoScadenza({ data_scadenza: '2026-10-23', tipo_scadenza: 'preferibilmente' }, oggi, 2)).toBe('controlla');
  });

  it('considera sempre il limite di conservazione degli avanzi', () => {
    expect(
      statoScadenza({ data_scadenza: '2026-12-01', tipo_scadenza: 'preferibilmente', conservare_fino: '2026-10-23' }, oggi, 2),
    ).toBe('scaduto');
  });

  it('segnala oggi, in scadenza e ok', () => {
    expect(statoScadenza({ data_scadenza: oggi }, oggi, 2)).toBe('oggi');
    expect(statoScadenza({ data_scadenza: '2026-10-26' }, oggi, 2)).toBe('in_scadenza');
    expect(statoScadenza({ data_scadenza: '2026-10-30' }, oggi, 2)).toBe('ok');
    expect(statoScadenza({}, oggi, 2)).toBe('senza_data');
  });
});
