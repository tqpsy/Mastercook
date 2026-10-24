import { describe, expect, it } from 'vitest';
import { codiceValido, daRispostaOff, genuinitaProdotto, leggiFormato } from './openFoodFacts';

describe('Open Food Facts', () => {
  it('controlla la cifra di controllo dei codici', () => {
    expect(codiceValido('8076800195057')).toBe(true);
    expect(codiceValido('8076800195058')).toBe(false);
    expect(codiceValido('96385074')).toBe(true);
  });

  it('legge i formati delle confezioni', () => {
    expect(leggiFormato('500 g')).toEqual({ quantita: 500, unita: 'g' });
    expect(leggiFormato('1 L')).toEqual({ quantita: 1000, unita: 'ml' });
    expect(leggiFormato('1,5 kg')).toEqual({ quantita: 1500, unita: 'g' });
    expect(leggiFormato('6 x 125 g')).toEqual({ quantita: 750, unita: 'g' });
    expect(leggiFormato('75 cl')).toEqual({ quantita: 750, unita: 'ml' });
  });

  it('collega il prodotto all’ingrediente più specifico e agli allergeni UE', () => {
    const p = daRispostaOff('8076800195057', {
      product_name_it: 'Spaghetti n.5',
      brands: 'Barilla',
      quantity: '500 g',
      categories_tags: ['en:plant-based-foods', 'en:pastas', 'en:dry-pastas', 'en:spaghetti'],
      allergens_tags: ['en:gluten'],
      traces_tags: ['en:soybeans', 'en:mustard'],
      additives_tags: [],
      additives_n: 0,
      nova_group: 1,
      nutriscore_grade: 'a',
    });
    expect(p).toMatchObject({ ingrediente_id: 'ing:spaghetti', marca: 'Barilla', allergeni: ['glutine'], tracce: ['soia', 'senape'] });
    expect(genuinitaProdotto(p)).toMatchObject({ valutabile: true, voto: 5 });
  });
});
