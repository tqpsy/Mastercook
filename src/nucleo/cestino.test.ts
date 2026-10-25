import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { collezione } from '../piattaforma/documento';
import { aggiungiArticolo, eliminaArticolo, eliminaDefinitivamente, ripristinaDalCestino, svuotaCestinoScaduto } from './azioni';

const nuovoCtx = () => ({ dati: new Y.Doc(), storico: new Y.Doc(), membroId: 'm1' });

describe('cestino', () => {
  it('ripristina un prodotto eliminato', () => {
    const ctx = nuovoCtx();
    aggiungiArticolo(ctx, { nome: 'Latte', ingrediente_id: 'ing:latte', unita: 'ml', quantita: 1000, luogo: 'frigo', origine: 'manuale' });
    const [id] = [...collezione(ctx.dati, 'inventario').keys()];
    eliminaArticolo(ctx, id!);
    expect(collezione(ctx.dati, 'inventario').get(id!)?.get('eliminato_il')).toBeTruthy();
    ripristinaDalCestino(ctx, 'inventario', id!);
    expect(collezione(ctx.dati, 'inventario').get(id!)?.get('eliminato_il')).toBeUndefined();
  });

  it('elimina per sempre solo ciò che è nel cestino', () => {
    const ctx = nuovoCtx();
    aggiungiArticolo(ctx, { nome: 'Pane', ingrediente_id: 'ing:pane', unita: 'g', quantita: 500, luogo: 'dispensa', origine: 'manuale' });
    const [id] = [...collezione(ctx.dati, 'inventario').keys()];
    eliminaDefinitivamente(ctx, 'inventario', id!);
    expect(collezione(ctx.dati, 'inventario').has(id!)).toBe(true);
    eliminaArticolo(ctx, id!);
    eliminaDefinitivamente(ctx, 'inventario', id!);
    expect(collezione(ctx.dati, 'inventario').has(id!)).toBe(false);
  });

  it('dopo 30 giorni il cestino si svuota da solo', () => {
    const ctx = nuovoCtx();
    aggiungiArticolo(ctx, { nome: 'Uova', ingrediente_id: 'ing:uova', unita: 'pz', quantita: 6, luogo: 'frigo', origine: 'manuale' });
    const [id] = [...collezione(ctx.dati, 'inventario').keys()];
    eliminaArticolo(ctx, id!);
    expect(svuotaCestinoScaduto(ctx, new Date(Date.now() + 29 * 86_400_000))).toBe(0);
    expect(svuotaCestinoScaduto(ctx, new Date(Date.now() + 31 * 86_400_000))).toBe(1);
    expect(collezione(ctx.dati, 'inventario').has(id!)).toBe(false);
  });
});
