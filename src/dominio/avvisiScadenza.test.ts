import { describe, expect, it } from 'vitest';
import { preparaPromemoria } from './avvisiScadenza';
import type { ArticoloValutato } from './disponibilita';
import type { Suggerimento } from './suggerimenti';

const oggi = '2026-10-25';

function articolo(nome: string, scadenza: string, ingrediente_id?: string, luogo = 'frigo'): ArticoloValutato {
  return { articolo: { nome, ingrediente_id, luogo } as ArticoloValutato['articolo'], quantita: 1, scadenza, stato: 'in_scadenza' };
}

function ricetta(id: string, titolo: string, ingredienti: string[], punteggio = 0.5): Suggerimento {
  return {
    ricetta: { id, titolo } as Suggerimento['ricetta'],
    punteggio,
    righe: ingredienti.map((i) => ({ riga: { ingrediente_id: i, testo: i }, richiesto: 1, disponibile: 1, copertura: 1, nonConteggiata: false })),
  } as Suggerimento;
}

describe('preparaPromemoria', () => {
  it('avvisa il giorno prima e il giorno stesso, con la ricetta che usa il prodotto', () => {
    const p = preparaPromemoria([articolo('Yogurt', '2026-10-27', 'ing:yogurt')], [ricetta('r1', 'Torta allo yogurt', ['ing:yogurt'])], oggi);
    expect(p.map((x) => x.giorno)).toEqual(['2026-10-26', '2026-10-27']);
    expect(p[0]).toMatchObject({ titolo: 'Yogurt scade domani', testo: 'Idea: Torta allo yogurt.', apri: 'ricette/r1' });
    expect(p[1]!.titolo).toBe('Yogurt scade oggi');
  });

  it('con più prodotti sceglie la ricetta che ne usa di più', () => {
    const p = preparaPromemoria(
      [articolo('Zucchine', '2026-10-25', 'ing:zucchina'), articolo('Uova', '2026-10-26', 'ing:uovo')],
      [ricetta('a', 'Zucchine trifolate', ['ing:zucchina'], 0.9), ricetta('b', 'Frittata di zucchine', ['ing:zucchina', 'ing:uovo'], 0.4)],
      oggi,
    );
    expect(p[0]).toMatchObject({ giorno: oggi, titolo: '2 prodotti scadono entro domani', testo: 'Zucchine e Uova. Idea: Frittata di zucchine.' });
  });

  it('senza ricette suggerisce di usarlo o congelarlo; ignora freezer e scaduti', () => {
    const p = preparaPromemoria([articolo('Pane', '2026-10-25'), articolo('Piselli', '2026-10-25', undefined, 'freezer'), articolo('Latte', '2026-10-20')], [], oggi);
    expect(p).toEqual([{ giorno: oggi, titolo: 'Pane scade oggi', testo: 'Usalo presto o mettilo in freezer.', apri: 'casa' }]);
  });
});
