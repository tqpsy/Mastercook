import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import { generaChiaveNucleo, cifraFile } from '../piattaforma/cifratura';

// Drive finto in memoria: un file con contenuto e versione crescente.
const file: { contenuto: Uint8Array; versione: number } = { contenuto: new Uint8Array(), versione: 1 };
vi.mock('../piattaforma/drive', () => ({
  ErroreDrive: class extends Error {},
  versioneFile: async () => String(file.versione),
  scaricaFile: async () => file.contenuto,
  aggiornaFile: async (_id: string, c: Uint8Array) => {
    file.contenuto = c;
    file.versione += 1;
    return String(file.versione);
  },
}));
vi.mock('./account', () => ({ VERSIONE_CHIAVE: 1 }));

const { sincronizzaDocumento } = await import('./sync');

describe('sincronizzazione con Drive', () => {
  let chiave: CryptoKey;
  beforeEach(async () => {
    chiave = await generaChiaveNucleo();
    file.contenuto = await cifraFile(chiave, 1, Y.encodeStateAsUpdate(new Y.Doc()));
    file.versione = 1;
  });

  it('due dispositivi che modificano offline convergono', async () => {
    const a = new Y.Doc();
    const b = new Y.Doc();
    const ra = {};
    const rb = {};
    a.getMap('liste').set('pane', 'da_comprare');
    b.getMap('liste').set('latte', 'da_comprare');
    await sincronizzaDocumento(a, 'f', chiave, ra);
    await sincronizzaDocumento(b, 'f', chiave, rb);
    await sincronizzaDocumento(a, 'f', chiave, ra);
    expect(a.getMap('liste').toJSON()).toEqual({ pane: 'da_comprare', latte: 'da_comprare' });
    expect(b.getMap('liste').toJSON()).toEqual(a.getMap('liste').toJSON());
  });

  it('non ricarica se non è cambiato nulla', async () => {
    const a = new Y.Doc();
    const ra = {};
    a.getMap('liste').set('pane', 'x');
    await sincronizzaDocumento(a, 'f', chiave, ra);
    const versione = file.versione;
    await sincronizzaDocumento(a, 'f', chiave, ra);
    expect(file.versione).toBe(versione);
  });
});
