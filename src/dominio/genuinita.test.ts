import { describe, expect, it } from 'vitest';
import { calcolaGenuinita } from './genuinita';

describe('calcolaGenuinita', () => {
  it('dà 5 a un prodotto con tutti i criteri al massimo', () => {
    const esito = calcolaGenuinita({ nutriScore: 'a', rischioAdditivi: 'nessuno', nova: 1, biologico: true });
    expect(esito).toMatchObject({ valutabile: true, voto: 5, etichetta: 'Ottimo' });
  });

  it('calcola la media pesata 40/30/20/10 arrotondata', () => {
    // 0,4·4 + 0,3·4 + 0,2·3 + 0,1·1 = 3,5 → 4
    const esito = calcolaGenuinita({ nutriScore: 'b', rischioAdditivi: 'basso', nova: 3, biologico: false });
    expect(esito).toMatchObject({ valutabile: true, voto: 4, etichetta: 'Buono' });
  });

  it('ridistribuisce i pesi se manca un criterio', () => {
    // senza biologico: (40·3 + 30·2 + 20·1) / 90 = 2,22 → 2
    const esito = calcolaGenuinita({ nutriScore: 'c', rischioAdditivi: 'moderato', nova: 4 });
    expect(esito).toMatchObject({ valutabile: true, voto: 2, etichetta: 'Scarso' });
  });

  it('limita a 2 il voto con un additivo a rischio elevato', () => {
    // (40·5 + 30·1 + 20·5 + 10·5) / 100 = 3,8 → 4, limitato a 2
    const esito = calcolaGenuinita({ nutriScore: 'a', rischioAdditivi: 'elevato', nova: 1, biologico: true });
    expect(esito).toMatchObject({ valutabile: true, voto: 2, limitatoDaAdditivi: true });
  });

  it('non inventa un voto con meno di due criteri principali', () => {
    const esito = calcolaGenuinita({ nutriScore: 'a', biologico: true });
    expect(esito.valutabile).toBe(false);
    expect(esito.etichetta).toBe('Non valutabile');
  });

  it('dà 1 al prodotto peggiore', () => {
    const esito = calcolaGenuinita({ nutriScore: 'e', rischioAdditivi: 'elevato', nova: 4, biologico: false });
    expect(esito).toMatchObject({ valutabile: true, voto: 1, etichetta: 'Da limitare' });
  });
});
