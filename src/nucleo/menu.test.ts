import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { calcolaDisponibilita } from '../dominio/disponibilita';
import { leggiDietaDaTesto } from '../dominio/dieta';
import { proponiSettimana } from '../dominio/menuDieta';
import type { ContestoSuggerimenti } from '../dominio/suggerimenti';
import type { ArticoloLista, DietaMembro, Pasto } from '../dominio/tipi';
import { collezione } from '../piattaforma/documento';
import { RICETTE_SISTEMA, RICETTE_SISTEMA_PER_ID } from '../rif/ricette';
import { aggiungiRicettaAlPasto, eliminaDieta, mettiInListaMenu, portaNelMenu, salvaDieta } from './menu';

const nuovoCtx = () => ({ dati: new Y.Doc(), storico: new Y.Doc(), membroId: 'luca' });
const pasti = (ctx: ReturnType<typeof nuovoCtx>) => [...collezione(ctx.dati, 'piani').values()].map((e) => e.toJSON() as Pasto);
const contesto: ContestoSuggerimenti = {
  mese: 10,
  disponibilita: calcolaDisponibilita([]),
  presenti: [{ nome: 'Luca', allergie: [], restrizioni: [], sgraditi: [], fattore_porzione: 1 }],
  preferite: new Set(),
  voti: new Map(),
  recenti: new Set(),
};

describe('dieta nel menù', () => {
  const dieta = leggiDietaDaTesto('Lunedì\nPranzo: pasta 80 g, zucchine 200 g\nCena: frutta 150 g');
  const LUNEDI = '2026-10-26';

  it('salva la dieta del membro e la porta nel menù senza toccare le portate degli altri', () => {
    const ctx = nuovoCtx();
    salvaDieta(ctx, 'luca', dieta, 'telefono');
    expect((collezione(ctx.dati, 'diete').get('dieta:luca')!.toJSON() as DietaMembro).giorni[0]!.pasti).toHaveLength(2);

    aggiungiRicettaAlPasto(ctx, LUNEDI, 'pranzo', RICETTE_SISTEMA_PER_ID.get('sys:pasta_zucchine')!, ['anna']);
    aggiungiRicettaAlPasto(ctx, LUNEDI, 'pranzo', RICETTE_SISTEMA_PER_ID.get('sys:caprese')!, ['anna']);
    const settimana = proponiSettimana(dieta.giorni, RICETTE_SISTEMA, contesto, () => new Set(['sys:pasta_zucchine']));
    portaNelMenu(ctx, 'luca', LUNEDI, settimana);
    portaNelMenu(ctx, 'luca', LUNEDI, settimana); // ricaricare non duplica

    const pranzo = pasti(ctx).find((p) => p.tipo === 'pranzo')!;
    expect(pranzo.membri_presenti.sort()).toEqual(['anna', 'luca']);
    expect(pranzo.portate).toHaveLength(2);
    const pasta = pranzo.portate.find((p) => p.ricetta_id === 'sys:pasta_zucchine')!;
    expect(pasta.membri.sort()).toEqual(['anna', 'luca']);
    expect(pasta.porzioni_dieta).toEqual({ luca: 1 });
    expect(pasta.note_dieta?.luca).toBe('Pasta 80 g, Zucchine 200 g');
    const cena = pasti(ctx).find((p) => p.tipo === 'cena')!;
    expect(cena.portate).toEqual([expect.objectContaining({ titolo: 'Frutta 150 g', membri: ['luca'], quantita_g: 150 })]);

    mettiInListaMenu(ctx, LUNEDI, pasti(ctx), (id) => RICETTE_SISTEMA_PER_ID.get(id), () => 1);
    const lista = [...collezione(ctx.dati, 'liste').values()].map((e) => e.toJSON() as ArticoloLista);
    expect(lista.find((r) => r.ingrediente_id === 'ing:pasta')?.origini[0]).toMatchObject({ tipo: 'dieta', quantita: 160 });

    eliminaDieta(ctx, 'luca', '2026-10-20');
    const dopo = pasti(ctx).find((p) => p.tipo === 'pranzo')!;
    expect(dopo.portate.find((p) => p.ricetta_id === 'sys:pasta_zucchine')!.membri).toEqual(['anna']);
    expect(pasti(ctx).find((p) => p.tipo === 'cena')!.portate).toHaveLength(0);
  });
});
