import { describe, expect, it } from 'vitest';
import { contaVoci, dietaDaGemini, leggiDietaDaTesto, leggiVoce } from './dieta';

describe('leggiVoce', () => {
  it('legge alimento e grammi in più forme', () => {
    expect(leggiVoce('Pasta integrale 80 g')).toMatchObject({ testo: 'Pasta integrale', quantita_g: 80, gruppo: 'cereali', ingrediente_id: 'ing:pasta_integrale' });
    expect(leggiVoce('g 150 di merluzzo')).toMatchObject({ testo: 'Merluzzo', quantita_g: 150, gruppo: 'pesce' });
    expect(leggiVoce('1 vasetto di yogurt bianco')).toMatchObject({ quantita: '1 vasetto', gruppo: 'latte_yogurt' });
    expect(leggiVoce('Latte parzialmente scremato 200 ml')).toMatchObject({ quantita_g: 200, gruppo: 'latte_yogurt' });
  });

  it('riconosce le alternative e i gruppi giusti', () => {
    expect(leggiVoce('pasta o riso 70 g')).toMatchObject({ testo: 'Pasta', alternative: ['riso'], quantita_g: 70 });
    expect(leggiVoce('fette biscottate 30 g')?.gruppo).toBe('pane');
    expect(leggiVoce('fiocchi di latte 100 g')?.gruppo).toBe('formaggi');
    expect(leggiVoce('frutta secca 20 g')?.gruppo).toBe('frutta_secca');
    expect(leggiVoce('verdura di stagione a volontà')?.gruppo).toBe('verdura');
    expect(leggiVoce('80')).toBeNull();
  });
});

describe('leggiDietaDaTesto', () => {
  it('divide per giorni e pasti', () => {
    const d = leggiDietaDaTesto(`Piano alimentare
Dott.ssa Maria Bianchi, biologa nutrizionista
LUNEDÌ
Colazione: latte 200 ml + fette biscottate 30 g
Spuntino: frutta 150 g
Pranzo: pasta integrale 80 g, zucchine 200 g, olio 10 g
Merenda: yogurt 125 g
Cena: merluzzo 150 g + verdura cotta 200 g + pane 50 g
MARTEDÌ
Pranzo: riso 80 g con piselli 100 g
Cena: petto di pollo 120 g, insalata`);
    expect(d.titolo).toBe('Piano alimentare');
    expect(d.dietista).toContain('Bianchi');
    const lun = d.giorni[0]!;
    expect(lun.pasti.map((p) => p.tipo)).toEqual(['colazione', 'spuntino', 'pranzo', 'merenda', 'cena']);
    expect(lun.pasti[2]!.voci.map((v) => v.testo)).toEqual(['Pasta integrale', 'Zucchine', 'Olio']);
    expect(lun.pasti[4]!.voci).toHaveLength(3);
    expect(d.giorni[1]!.pasti.map((p) => p.tipo)).toEqual(['pranzo', 'cena']);
    expect(d.giorni[2]!.pasti).toHaveLength(0);
  });

  it('uno schema senza giorni vale per tutta la settimana', () => {
    const d = leggiDietaDaTesto('COLAZIONE\nyogurt 125 g\ncereali 30 g\nPRANZO\nlegumi 150 g\nverdura 200 g');
    expect(d.giorni.every((g) => g.pasti.length === 2)).toBe(true);
    expect(contaVoci(d.giorni)).toBe(28);
  });
});

describe('dietaDaGemini', () => {
  it('scarta i dati non validi e collega gli ingredienti', () => {
    const d = dietaDaGemini({
      titolo: 'Dieta autunno',
      giorni: [
        { giorno: 1, pasti: [{ tipo: 'pranzo', voci: [{ alimento: 'Spaghetti', quantita_g: 80 }, { alimento: '' }, { alimento: 'Ceci', quantita_g: -3 }] }, { tipo: 'brunch', voci: [{ alimento: 'x' }] }] },
        { giorno: 9, pasti: [] },
        { giorno: 0, pasti: [{ tipo: 'cena', voci: [{ alimento: 'Pesce', quantita_g: 150 }] }] },
      ],
      note: ['Bere 2 litri di acqua', 42],
    });
    expect(d.titolo).toBe('Dieta autunno');
    expect(d.giorni[0]!.pasti).toHaveLength(1);
    expect(d.giorni[0]!.pasti[0]!.voci).toEqual([
      { testo: 'Spaghetti', quantita_g: 80, ingrediente_id: 'ing:spaghetti', gruppo: 'cereali' },
      { testo: 'Ceci', ingrediente_id: 'ing:ceci', gruppo: 'legumi' },
    ]);
    // Il giorno 0 ("tutti i giorni") riempie solo i giorni rimasti vuoti.
    expect(d.giorni[3]!.pasti[0]!.tipo).toBe('cena');
    expect(d.note).toEqual(['Bere 2 litri di acqua']);
  });
});
