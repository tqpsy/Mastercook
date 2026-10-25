import { describe, expect, it } from 'vitest';
import { RICETTE_SISTEMA } from '../rif/ricette';
import { calcolaDisponibilita } from './disponibilita';
import { leggiDietaDaTesto } from './dieta';
import { profiloRicetta, proponiPasto, proponiSettimana } from './menuDieta';
import type { ContestoSuggerimenti, Presente } from './suggerimenti';
import type { PastoDieta } from './tipi';

const membro = (extra: Partial<Presente> = {}): Presente => ({ nome: 'Luca', allergie: [], restrizioni: [], sgraditi: [], fattore_porzione: 1, ...extra });

function contesto(presente: Presente = membro()): ContestoSuggerimenti {
  return { mese: 10, disponibilita: calcolaDisponibilita([]), presenti: [presente], preferite: new Set(), voti: new Map(), recenti: new Set() };
}

const pasto = (testo: string): PastoDieta => leggiDietaDaTesto(`Pranzo: ${testo}`).giorni[0]!.pasti[0]!;

describe('profiloRicetta', () => {
  it('conta solo i gruppi che fanno il piatto', () => {
    const risotto = profiloRicetta(RICETTE_SISTEMA.find((r) => r.id === 'sys:risotto_parmigiano')!);
    expect([...risotto.gruppi.keys()]).toEqual(['cereali']);
    const pastaFagioli = profiloRicetta(RICETTE_SISTEMA.find((r) => r.id === 'sys:pasta_fagioli')!);
    expect(pastaFagioli.gruppi.has('legumi')).toBe(true);
    expect(pastaFagioli.gruppi.get('cereali')).toBe(50);
  });
});

describe('proponiPasto', () => {
  it('pasta con zucchine: sceglie la ricetta giusta con la porzione della dieta', () => {
    const p = proponiPasto(pasto('pasta 80 g + zucchine 200 g + olio 10 g'), RICETTE_SISTEMA, contesto(), { usate: new Map() });
    expect(p.portate[0]!.ricetta?.id).toBe('sys:pasta_zucchine');
    expect(p.portate[0]!.porzioni).toBe(1);
    // L'olio resta una voce a parte.
    expect(p.portate.at(-1)!.ricetta).toBeUndefined();
    expect(p.portate.at(-1)!.titolo).toBe('Olio 10 ml');
  });

  it('pesce e verdura: niente carne, e la verdura come contorno', () => {
    const p = proponiPasto(pasto('merluzzo 150 g, spinaci 200 g, pane 50 g'), RICETTE_SISTEMA, contesto(), { usate: new Map() });
    const ricette = p.portate.filter((x) => x.ricetta).map((x) => x.ricetta!.id);
    expect(ricette[0]).toBe('sys:merluzzo_umido');
    expect(ricette).toContain('sys:spinaci_burro');
    expect(p.portate.some((x) => x.titolo === 'Pane 50 g')).toBe(true);
    expect(p.portate[0]!.porzioni).toBe(1);
  });

  it('legumi e cereali: un piatto unico e grammature più alte = più porzioni', () => {
    const p = proponiPasto(pasto('pasta 50 g e ceci 240 g'), RICETTE_SISTEMA, contesto(), { usate: new Map() });
    expect(p.portate[0]!.ricetta?.id).toBe('sys:pasta_ceci');
    expect(p.portate[0]!.porzioni).toBe(1);
  });

  it('rispetta allergie e restrizioni del membro', () => {
    const vegetariano = contesto(membro({ restrizioni: ['vegetariano'] }));
    const p = proponiPasto(pasto('pasta 80 g, verdura 200 g'), RICETTE_SISTEMA, vegetariano, { usate: new Map() });
    for (const x of p.portate) expect(x.ricetta?.id).not.toBe('sys:tagliatelle_ragu');
    const celiaco = contesto(membro({ allergie: ['glutine'] }));
    const q = proponiPasto(pasto('riso 80 g'), RICETTE_SISTEMA, celiaco, { usate: new Map() });
    expect(q.portate[0]!.ricetta?.portata).toBe('primo');
    expect(q.portate[0]!.ricetta?.ingredienti.some((r) => r.ingrediente_id === 'ing:riso_risotti')).toBe(true);
  });

  it('colazione senza ricette adatte: restano le voci della dieta', () => {
    const colazione = leggiDietaDaTesto('Colazione: latte 200 ml + fette biscottate 30 g').giorni[0]!.pasti[0]!;
    const p = proponiPasto(colazione, RICETTE_SISTEMA, contesto(), { usate: new Map() });
    expect(p.portate.map((x) => x.titolo)).toEqual(['Latte 200 ml', 'Fette biscottate 30 g']);
  });
});

describe('proponiSettimana', () => {
  it('varia le ricette tra i giorni', () => {
    const dieta = leggiDietaDaTesto('Pranzo: pasta 80 g, sugo di pomodoro');
    const settimana = proponiSettimana(dieta.giorni, RICETTE_SISTEMA, contesto());
    const scelte = settimana.map((g) => g.pasti[0]!.portate[0]!.ricetta?.id);
    expect(new Set(scelte).size).toBeGreaterThan(3);
  });
});
