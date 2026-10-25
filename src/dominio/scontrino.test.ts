import { describe, expect, it } from 'vitest';
import { abbinaRiga, espandi, leggiScontrino, unisciParti } from './scontrino';

const ESEMPIO = `SUPERMERCATO ESEMPIO
Via Roma 1 - Milano
P.IVA 01234567890
DOCUMENTO COMMERCIALE
DESCRIZIONE IVA PREZZO(€)
LATTE PS 1L 4% 1,29
SPAGHETTI N5 500G 10% 0,99
YOGURT BIANCO
2 x 0,65 1,30
ZUCCHINE
0,532 kg x 2,19 €/kg 1,17
MOZZ. FIORDILATTE 4% 1,49
SCONTO -0,30
SHOPPER 22% 0,10
SUBTOTALE 6,34
TOTALE COMPLESSIVO 6,34
PAGAMENTO CONTANTE 10,00
RESTO 3,66`;

describe('scontrino', () => {
  it('legge righe, quantità, pesi, sconti e totale', () => {
    const letto = leggiScontrino(ESEMPIO);
    expect(letto.totale).toBe(6.34);
    expect(letto.negozio).toBe('SUPERMERCATO ESEMPIO');
    expect(letto.righe).toEqual([
      { testo: 'LATTE PS 1L', quantita: 1, prezzo: 1.29 },
      { testo: 'SPAGHETTI N5 500G', quantita: 1, prezzo: 0.99 },
      { testo: 'YOGURT BIANCO', quantita: 2, prezzo: 1.3 },
      { testo: 'ZUCCHINE', quantita: 1, peso_g: 532, prezzo: 1.17 },
      { testo: 'MOZZ. FIORDILATTE', quantita: 1, prezzo: 1.19 },
      { testo: 'SHOPPER', quantita: 1, prezzo: 0.1 },
    ]);
  });

  it('espande le abbreviazioni', () => {
    expect(espandi('MOZZ. FIORDILATTE 125G')).toBe('mozzarella fiordilatte');
  });

  it('abbina le righe agli ingredienti con le soglie di confidenza', () => {
    expect(abbinaRiga('LATTE PS 1L', new Map(), new Set())).toMatchObject({ esito: 'confermato', migliore: { ingrediente: { id: 'ing:latte' } } });
    expect(abbinaRiga('ZUCCHINE', new Map(), new Set()).migliore?.ingrediente.id).toBe('ing:zucchina');
    expect(abbinaRiga('SHOPPER', new Map(), new Set()).esito).toBe('da_scegliere');
    expect(abbinaRiga('XYZ BRAND 3', new Map([['xyz brand', 'ing:biscotti']]), new Set()).migliore?.ingrediente.id).toBe('ing:biscotti');
  });
});

describe('unisciParti', () => {
  it('tiene una volta sola le righe in comune tra due foto', () => {
    const prima = 'SUPERMERCATO\nLATTE PS 1L 1,29\nPANE COMUNE 2,10';
    const seconda = 'PANE COMUNE  2,10\nUOVA 6 2,49\nTOTALE 5,88';
    expect(unisciParti([prima, seconda])).toBe('SUPERMERCATO\nLATTE PS 1L 1,29\nPANE COMUNE 2,10\nUOVA 6 2,49\nTOTALE 5,88');
  });

  it('senza righe in comune accoda tutto, anche due prodotti uguali comprati davvero', () => {
    expect(unisciParti(['LATTE 1,29', 'UOVA 2,49'])).toBe('LATTE 1,29\nUOVA 2,49');
    expect(unisciParti(['LATTE 1,29\nLATTE 1,29'])).toBe('LATTE 1,29\nLATTE 1,29');
  });
});
