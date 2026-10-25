import { describe, expect, it } from 'vitest';
import { leggiInvito, linkInvito, type Invito } from './invito';

const invito: Invito = { n: 'nucleo-1', nome: 'Casa Rossi è nostra', da: 'Luca', c: 'cartella', d: 'dati', s: 'storico', k: 'a+b/c==' };

describe('invito', () => {
  it('il link porta tutto dopo il # e si rilegge uguale, anche con accenti', () => {
    const link = linkInvito(invito, 'https://tqpsy.github.io', '/Mastercook/');
    expect(link.startsWith('https://tqpsy.github.io/Mastercook/invito#i=')).toBe(true);
    expect(link).not.toMatch(/[+/=]$/);
    expect(leggiInvito(new URL(link).hash)).toEqual(invito);
  });

  it('un link rovinato o incompleto non è un invito', () => {
    expect(leggiInvito('')).toBeNull();
    expect(leggiInvito('#i=xyz')).toBeNull();
    expect(leggiInvito(`#i=${btoa(JSON.stringify({ n: 'x' }))}`)).toBeNull();
  });
});
