import { describe, expect, it } from 'vitest';
import { calcolaDisponibilita } from './disponibilita';
import { vistaLista, vistaSpesa } from './lista';
import type { ArticoloLista } from './tipi';

function riga(id: string, testo: string, extra: Partial<ArticoloLista> = {}): ArticoloLista {
  return {
    id,
    testo,
    origini: [{ tipo: 'manuale', membri: ['m1'] }],
    stato: 'da_comprare',
    creato_da: 'm1',
    creato_il: '2026-10-25T08:00:00Z',
    modificato_da: 'm1',
    modificato_il: '2026-10-25T08:00:00Z',
    ...extra,
  };
}

describe('modalità supermercato', () => {
  it('raggruppa per reparto nell’ordine del supermercato e mette i presi nel carrello', () => {
    const righe = [
      riga('a', 'Detersivo', { reparto: 'casa' }),
      riga('b', 'Mele', { reparto: 'frutta_verdura' }),
      riga('c', 'Pane', { reparto: 'pane_forno', stato: 'preso', modificato_il: '2026-10-25T09:00:00Z' }),
      riga('d', 'Banane', { reparto: 'frutta_verdura' }),
      riga('e', 'Latte', { reparto: 'latticini', stato: 'preso', modificato_il: '2026-10-25T09:05:00Z' }),
      riga('f', 'Vecchia', { stato: 'rimosso' }),
    ];
    const spesa = vistaSpesa(vistaLista(righe, calcolaDisponibilita([])));
    expect(spesa.reparti.map((r) => r.id)).toEqual(['frutta_verdura', 'casa']);
    expect(spesa.reparti[0]!.righe.map((v) => v.riga.testo)).toEqual(['Banane', 'Mele']);
    expect(spesa.carrello.map((v) => v.riga.testo)).toEqual(['Latte', 'Pane']);
    expect(spesa.totale).toBe(5);
    expect(spesa.presi).toBe(2);
  });
});
