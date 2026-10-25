import { describe, expect, it } from 'vitest';
import { interpretaQr } from './qrScontrino';

describe('interpretaQr', () => {
  it('riconosce un link e ne mostra il sito', () => {
    expect(interpretaQr(' https://www.esempio.it/scontrino?id=123 ')).toEqual({
      tipo: 'link',
      url: 'https://www.esempio.it/scontrino?id=123',
      sito: 'esempio.it',
    });
  });

  it('legge le righe se il QR contiene il testo dello scontrino', () => {
    const esito = interpretaQr('LATTE PS 1L 1,29\r\nPANE COMUNE 2,10\r\nTOTALE 3,39');
    expect(esito.tipo).toBe('righe');
    if (esito.tipo !== 'righe') return;
    expect(esito.scontrino.righe.map((r) => r.prezzo)).toEqual([1.29, 2.1]);
    expect(esito.scontrino.totale).toBe(3.39);
  });

  it('non apre link che non sono web', () => {
    expect(interpretaQr('javascript:alert(1)').tipo).toBe('altro');
  });

  it('tiene il testo quando non capisce il contenuto', () => {
    expect(interpretaQr('RT 99MEX012345 0001-0042')).toEqual({ tipo: 'altro', testo: 'RT 99MEX012345 0001-0042' });
  });
});
