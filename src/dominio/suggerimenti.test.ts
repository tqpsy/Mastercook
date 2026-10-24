import { describe, expect, it } from 'vitest';
import { RICETTE_SISTEMA_PER_ID } from '../rif/ricette';
import { articoliPresenti, calcolaDisponibilita } from './disponibilita';
import { suggerisci, valutaRicetta, type ContestoSuggerimenti, type Presente } from './suggerimenti';
import type { ArticoloInventario } from './tipi';

const OGGI = '2026-10-24';

function articolo(ingrediente: string, quantita: number, extra: Partial<ArticoloInventario> = {}): ArticoloInventario {
  return {
    id: `a-${ingrediente}`,
    nome: ingrediente,
    ingrediente_id: `ing:${ingrediente}`,
    unita: ingrediente === 'uova' ? 'pz' : 'g',
    luogo: 'dispensa',
    movimenti: [{ delta: quantita, unita: ingrediente === 'uova' ? 'pz' : 'g', membro: 'm1', il: '2026-10-20T10:00:00Z', motivo: 'carico' }],
    stato_conservazione: 'fresco',
    origine: 'manuale',
    creato_da: 'm1',
    creato_il: '',
    modificato_da: 'm1',
    modificato_il: '',
    ...extra,
  };
}

const adulto = (nome: string, extra: Partial<Presente> = {}): Presente => ({
  nome,
  allergie: [],
  restrizioni: [],
  sgraditi: [],
  fattore_porzione: 1,
  ...extra,
});

function contesto(articoli: ArticoloInventario[], presenti: Presente[]): ContestoSuggerimenti {
  return {
    mese: 10,
    disponibilita: calcolaDisponibilita(articoliPresenti(articoli, OGGI)),
    presenti,
    preferite: new Set(),
    voti: new Map(),
    recenti: new Set(),
  };
}

const carbonara = RICETTE_SISTEMA_PER_ID.get('sys:carbonara')!;
const aglioOlio = RICETTE_SISTEMA_PER_ID.get('sys:spaghetti_aglio_olio')!;

describe('suggerimenti', () => {
  it('esclude sempre le ricette con allergeni dei presenti', () => {
    const ctx = contesto([articolo('spaghetti', 500)], [adulto('Luca'), adulto('Sara', { allergie: ['uova'] })]);
    const s = valutaRicetta(carbonara, ctx);
    expect(s.sezione).toBe('escluse');
    expect(s.esclusione).toContain('Sara');
  });

  it('esclude le ricette non compatibili con le restrizioni', () => {
    const ctx = contesto([], [adulto('Luca', { restrizioni: ['vegetariano'] })]);
    expect(valutaRicetta(carbonara, ctx).esclusione).toMatch(/vegetariana/);
  });

  it('mette tra le pronte una ricetta con tutto in casa, contando la dispensa di base', () => {
    const ctx = contesto(
      [articolo('spaghetti', 500), articolo('aglio', 50), articolo('peperoncino', 30)],
      [adulto('Luca'), adulto('Sara')],
    );
    const s = valutaRicetta(aglioOlio, ctx);
    expect(s.sezione).toBe('pronte');
    expect(s.copertura).toBe(1);
  });

  it('scala il richiesto sui presenti', () => {
    // 320 g per 4 porzioni; due adulti → 160 g, quindi 200 g bastano
    const ctx = contesto([articolo('spaghetti', 200), articolo('aglio', 50), articolo('peperoncino', 30)], [adulto('A'), adulto('B')]);
    expect(valutaRicetta(aglioOlio, ctx).mancanti).toHaveLength(0);
  });

  it('conta un articolo figlio per l’ingrediente generico (spaghetti → pasta)', () => {
    const ctx = contesto([articolo('spaghetti', 500)], [adulto('A')]);
    const pomodoro = RICETTE_SISTEMA_PER_ID.get('sys:pasta_pomodoro')!;
    const rigaPasta = valutaRicetta(pomodoro, ctx).righe.find((r) => r.riga.ingrediente_id === 'ing:pasta')!;
    expect(rigaPasta.copertura).toBe(1);
  });

  it('non conta gli articoli scaduti', () => {
    const scaduta = articolo('guanciale', 200, { data_scadenza: '2026-10-20', tipo_scadenza: 'entro', luogo: 'frigo' });
    const ctx = contesto([scaduta], [adulto('A')]);
    const riga = valutaRicetta(carbonara, ctx).righe.find((r) => r.riga.ingrediente_id === 'ing:guanciale')!;
    expect(riga.disponibile).toBe(0);
  });

  it('premia le ricette che usano ciò che scade', () => {
    const base = [articolo('pasta', 1000), articolo('passata', 700), articolo('aglio', 50), articolo('basilico', 20), articolo('zucchina', 500), articolo('parmigiano', 200), articolo('cipolla', 200)];
    const zucchineInScadenza = base.map((a) => (a.ingrediente_id === 'ing:zucchina' ? { ...a, luogo: 'frigo' as const, data_scadenza: OGGI } : a));
    const sezioni = suggerisci(
      [RICETTE_SISTEMA_PER_ID.get('sys:pasta_pomodoro')!, RICETTE_SISTEMA_PER_ID.get('sys:pasta_zucchine')!],
      { ...contesto(zucchineInScadenza, [adulto('A')]), mese: 7 },
    );
    expect(sezioni.pronte[0]!.ricetta.id).toBe('sys:pasta_zucchine');
    expect(sezioni.pronte[0]!.motivi.join(' ')).toContain('zucchine');
  });
});
