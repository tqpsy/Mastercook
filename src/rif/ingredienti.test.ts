import { describe, expect, it } from 'vitest';
import { cercaIngredienti, normalizza } from '../dominio/ricerca';
import { PER_INGREDIENTE } from './emoji';
import { CATEGORIE_OFF } from './mappaOff';
import { INGREDIENTI, INGREDIENTI_PER_ID, antenati, catalogoPerReparto } from './ingredienti';

describe('catalogo degli ingredienti', () => {
  it('ha id unici e genitori esistenti, senza cicli', () => {
    expect(INGREDIENTI_PER_ID.size).toBe(INGREDIENTI.length);
    for (const ing of INGREDIENTI) {
      if (ing.genitore) expect(INGREDIENTI_PER_ID.has(ing.genitore), ing.id).toBe(true);
      expect(antenati(ing.id).length, ing.id).toBeLessThan(5);
    }
  });

  it('non usa lo stesso nome o sinonimo per due ingredienti', () => {
    const visti = new Map<string, string>();
    for (const ing of INGREDIENTI) {
      for (const nome of new Set([ing.nome, ...ing.sinonimi].map(normalizza))) {
        expect(visti.get(nome), `«${nome}» in ${ing.id} e ${visti.get(nome)}`).toBeUndefined();
        visti.set(nome, ing.id);
      }
    }
  });

  it('ogni voce ha una sottocategoria', () => {
    for (const ing of INGREDIENTI) expect(ing.sottocategoria, ing.id).toBeTruthy();
    expect(catalogoPerReparto().length).toBeGreaterThan(10);
  });

  it('riconosce le voci precise invece di quelle generiche', () => {
    const primo = (testo: string) => cercaIngredienti(testo, 1)[0]?.ingrediente.id;
    expect(primo('vongole veraci')).toBe('ing:vongole');
    expect(primo('cozze')).toBe('ing:cozze');
    expect(primo('polipo')).toBe('ing:polpo');
    expect(primo('scampi')).toBe('ing:scampi');
    expect(primo('mazzancolle')).toBe('ing:mazzancolle');
    expect(primo('grana padano')).toBe('ing:grana_padano');
    expect(primo('gorgonzola dolce')).toBe('ing:gorgonzola');
    expect(primo('mozzarella di bufala')).toBe('ing:mozzarella_bufala');
    expect(primo('provolone')).toBe('ing:provolone');
    expect(primo('rigatoni')).toBe('ing:rigatoni');
    expect(primo('orecchiette')).toBe('ing:orecchiette');
    expect(primo('latte di soia')).toBe('ing:bevanda_soia');
  });

  it('le voci precise valgono anche per quelle generiche nelle ricette', () => {
    expect(antenati('ing:grana_padano')).toContain('ing:parmigiano');
    expect(antenati('ing:mazzancolle')).toEqual(['ing:mazzancolle', 'ing:gamberi', 'ing:frutti_mare']);
    expect(antenati('ing:rigatoni')).toContain('ing:pasta');
  });

  it('le categorie di Open Food Facts e le emoji puntano a voci esistenti', () => {
    for (const [cat, slug] of Object.entries(CATEGORIE_OFF)) expect(INGREDIENTI_PER_ID.has(`ing:${slug}`), cat).toBe(true);
    for (const id of Object.keys(PER_INGREDIENTE)) expect(INGREDIENTI_PER_ID.has(id), id).toBe(true);
  });
});
