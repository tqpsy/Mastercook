import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { collezione } from '../piattaforma/documento';
import { articoliPresenti } from '../dominio/disponibilita';
import { dataLocale } from '../dominio/id';
import type { ArticoloInventario } from '../dominio/tipi';
import { aggiungiArticolo, consumaArticolo, eliminaArticolo } from './azioni';
import { leggiBackup, ripristinaNelNucleo } from './ripristino';

const nuovoCtx = () => ({ dati: new Y.Doc(), storico: new Y.Doc(), membroId: 'm1' });
const copia = (ctx: ReturnType<typeof nuovoCtx>) =>
  JSON.stringify({ formato: 'masterfood-export', versione: 1, esportato_il: '2026-10-25T10:00:00Z', dati: ctx.dati.toJSON(), storico: ctx.storico.toJSON() });

describe('ripristino da una copia', () => {
  it('rifiuta file che non sono una copia', () => {
    expect(() => leggiBackup('ciao')).toThrow();
    expect(() => leggiBackup('{"a":1}')).toThrow();
  });

  it('su un telefono vuoto ricrea tutto, con i movimenti ancora modificabili', () => {
    const origine = nuovoCtx();
    aggiungiArticolo(origine, { nome: 'Latte', ingrediente_id: 'ing:latte', unita: 'ml', quantita: 1000, luogo: 'frigo', origine: 'manuale' });
    const destinazione = nuovoCtx();
    expect(ripristinaNelNucleo(destinazione, leggiBackup(copia(origine)))).toBeGreaterThanOrEqual(2); // articolo + evento di carico
    const inventario = () => [...collezione(destinazione.dati, 'inventario').values()].map((e) => e.toJSON() as ArticoloInventario);
    consumaArticolo(destinazione, inventario()[0]!, 250);
    expect(articoliPresenti(inventario(), dataLocale())[0]!.quantita).toBe(750);
  });

  it('non tocca ciò che c’è già, ma recupera ciò che è nel cestino', () => {
    const ctx = nuovoCtx();
    aggiungiArticolo(ctx, { nome: 'Pane', ingrediente_id: 'ing:pane', unita: 'g', quantita: 500, luogo: 'dispensa', origine: 'manuale' });
    const backup = leggiBackup(copia(ctx));
    expect(ripristinaNelNucleo(ctx, backup)).toBe(0);
    const [id] = [...collezione(ctx.dati, 'inventario').keys()];
    eliminaArticolo(ctx, id!);
    expect(ripristinaNelNucleo(ctx, backup)).toBe(1);
    expect(collezione(ctx.dati, 'inventario').get(id!)?.get('eliminato_il')).toBeUndefined();
  });
});
