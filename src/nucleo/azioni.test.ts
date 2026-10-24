import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { articoliPresenti, calcolaDisponibilita } from '../dominio/disponibilita';
import { dataLocale } from '../dominio/id';
import { vistaLista } from '../dominio/lista';
import { valutaRicetta } from '../dominio/suggerimenti';
import type { ArticoloInventario, ArticoloLista, EventoStorico } from '../dominio/tipi';
import { collezione } from '../piattaforma/documento';
import { RICETTE_SISTEMA_PER_ID } from '../rif/ricette';
import { aggiungiAllaLista, aggiungiArticolo, buttaArticolo, consumaArticolo, hoCucinato, spuntaRiga } from './azioni';

function nuovoCtx() {
  return { dati: new Y.Doc(), storico: new Y.Doc(), membroId: 'm1' };
}

const inventario = (ctx: ReturnType<typeof nuovoCtx>) =>
  [...collezione(ctx.dati, 'inventario').values()].map((e) => e.toJSON() as ArticoloInventario);
const eventi = (ctx: ReturnType<typeof nuovoCtx>) =>
  [...collezione(ctx.storico, 'eventi').values()].map((e) => e.toJSON() as EventoStorico);

describe('azioni sul nucleo', () => {
  it('carica, consuma e butta registrando gli eventi', () => {
    const ctx = nuovoCtx();
    aggiungiArticolo(ctx, { nome: 'Latte', ingrediente_id: 'ing:latte', unita: 'ml', quantita: 1000, luogo: 'frigo', origine: 'manuale' });
    const [latte] = articoliPresenti(inventario(ctx), dataLocale());
    consumaArticolo(ctx, latte!.articolo, 300);
    expect(articoliPresenti(inventario(ctx), dataLocale())[0]!.quantita).toBe(700);
    buttaArticolo(ctx, inventario(ctx)[0]!, 'andato_a_male');
    expect(articoliPresenti(inventario(ctx), dataLocale())).toHaveLength(0);
    expect(eventi(ctx).map((e) => e.tipo).sort()).toEqual(['carico', 'consumo', 'spreco']);
  });

  it('somma i consumi concorrenti di due dispositivi', () => {
    const a = nuovoCtx();
    aggiungiArticolo(a, { nome: 'Pasta', ingrediente_id: 'ing:pasta', unita: 'g', quantita: 500, luogo: 'dispensa', origine: 'manuale' });
    const b = { dati: new Y.Doc(), storico: new Y.Doc(), membroId: 'm2' };
    Y.applyUpdate(b.dati, Y.encodeStateAsUpdate(a.dati));
    consumaArticolo(a, inventario(a)[0]!, 100);
    consumaArticolo(b, inventario(b)[0]!, 200);
    Y.applyUpdate(a.dati, Y.encodeStateAsUpdate(b.dati));
    expect(articoliPresenti(inventario(a), dataLocale())[0]!.quantita).toBe(200);
  });

  it('una riga per ingrediente nella lista, e la spunta carica l’inventario', () => {
    const ctx = nuovoCtx();
    aggiungiAllaLista(ctx, { ingrediente_id: 'ing:uova', testo: 'Uova' }, { tipo: 'manuale', quantita: 6 });
    aggiungiAllaLista(ctx, { ingrediente_id: 'ing:uova', testo: 'Uova' }, { tipo: 'ricetta', riferimento: 'sys:carbonara', quantita: 4 });
    const righe = [...collezione(ctx.dati, 'liste').values()].map((e) => e.toJSON() as ArticoloLista);
    expect(righe).toHaveLength(1);
    const vista = vistaLista(righe, calcolaDisponibilita([]));
    expect(vista.daComprare[0]!.mancante).toBe(10);
    const annulla = spuntaRiga(ctx, righe[0]!, 10);
    expect(articoliPresenti(inventario(ctx), dataLocale())[0]!.quantita).toBe(10);
    annulla();
    expect(inventario(ctx)).toHaveLength(0);
  });

  it('"Ho cucinato" scarica gli ingredienti e crea l’avanzo entro il limite', () => {
    const ctx = nuovoCtx();
    for (const [ing, q, unita] of [['spaghetti', 500, 'g'], ['aglio', 50, 'g'], ['peperoncino', 30, 'g']] as const) {
      aggiungiArticolo(ctx, { nome: ing, ingrediente_id: `ing:${ing}`, unita, quantita: q, luogo: 'dispensa', origine: 'manuale' });
    }
    const ricetta = RICETTE_SISTEMA_PER_ID.get('sys:spaghetti_aglio_olio')!;
    const valutati = articoliPresenti(inventario(ctx), dataLocale());
    const suggerimento = valutaRicetta(ricetta, {
      mese: 10,
      disponibilita: calcolaDisponibilita(valutati),
      presenti: [{ nome: 'A', allergie: [], restrizioni: [], sgraditi: [], fattore_porzione: 1 }, { nome: 'B', allergie: [], restrizioni: [], sgraditi: [], fattore_porzione: 1 }],
      preferite: new Set(),
      voti: new Map(),
      recenti: new Set(),
    });
    hoCucinato(ctx, inventario(ctx), { suggerimento, porzioniAvanzate: 1, luogoAvanzo: 'frigo', giorniAvanzo: 10 });
    const dopo = articoliPresenti(inventario(ctx), dataLocale());
    expect(dopo.find((v) => v.articolo.ingrediente_id === 'ing:spaghetti')!.quantita).toBe(340);
    const avanzo = dopo.find((v) => v.articolo.ricetta_id)!;
    // pasta condita: massimo 3 giorni anche se l'utente ne chiede 10
    expect(avanzo.giorni).toBe(3);
  });
});
