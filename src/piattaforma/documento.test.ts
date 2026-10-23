import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { idArticoloLista } from '../dominio/id';
import { generaChiaveNucleo } from './cifratura';
import {
  apriDocumentoLocale,
  applicaDocumentoCifrato,
  collezione,
  eliminaEntita,
  esportaDocumentoCifrato,
  inserisciEntita,
  modificaEntita,
} from './documento';

describe('documento del nucleo', () => {
  it('registra autore e istanti su inserimento e modifica', () => {
    const doc = new Y.Doc();
    const membri = collezione(doc, 'membri');
    const maria = inserisciEntita(membri, { id: 'm1', nome: 'Maria' }, 'm1', '2026-10-23T10:00:00Z');
    modificaEntita(maria, { nome: 'Maria Rossi' }, 'm2', '2026-10-23T11:00:00Z');
    expect(maria.toJSON()).toMatchObject({
      nome: 'Maria Rossi',
      creato_da: 'm1',
      modificato_da: 'm2',
      modificato_il: '2026-10-23T11:00:00Z',
    });
    eliminaEntita(maria, 'm2', '2026-10-23T12:00:00Z');
    expect(maria.get('eliminato_il')).toBe('2026-10-23T12:00:00Z');
  });

  it('unisce le modifiche offline di due dispositivi tramite file cifrati', async () => {
    const chiave = await generaChiaveNucleo();
    const telefono = new Y.Doc();
    const tablet = new Y.Doc();

    // Stessa riga della lista creata offline su entrambi: l'id deterministico evita il doppione.
    const id = idArticoloLista('ing:latte');
    inserisciEntita(collezione(telefono, 'liste'), { id, testo: 'Latte' }, 'm1');
    inserisciEntita(collezione(tablet, 'liste'), { id, testo: 'Latte' }, 'm2');
    inserisciEntita(collezione(tablet, 'liste'), { id: idArticoloLista('ing:uova'), testo: 'Uova' }, 'm2');

    await applicaDocumentoCifrato(telefono, chiave, await esportaDocumentoCifrato(tablet, chiave, 1));
    await applicaDocumentoCifrato(tablet, chiave, await esportaDocumentoCifrato(telefono, chiave, 1));

    expect([...collezione(telefono, 'liste').keys()].sort()).toEqual([id, idArticoloLista('ing:uova')].sort());
    expect(collezione(telefono, 'liste').toJSON()).toEqual(collezione(tablet, 'liste').toJSON());
  });

  it('ritrova i dati in IndexedDB alla riapertura', async () => {
    const primo = await apriDocumentoLocale('nucleo-test', 'dati');
    inserisciEntita(collezione(primo.doc, 'inventario'), { id: 'a1', luogo: 'frigo' }, 'm1');
    await primo.persistenza.destroy();

    const secondo = await apriDocumentoLocale('nucleo-test', 'dati');
    expect(collezione(secondo.doc, 'inventario').get('a1')?.get('luogo')).toBe('frigo');
    await secondo.persistenza.clearData();
  });
});
