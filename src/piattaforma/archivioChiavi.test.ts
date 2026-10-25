import { describe, expect, it } from 'vitest';
import { cifraFile, decifraFile } from './cifratura';
import { eliminaChiaveProtetta, leggiChiaveProtetta, salvaChiaveProtetta } from './archivioChiavi';

describe('chiave protetta di chi è invitato', () => {
  it('funziona per cifrare e decifrare ma non si può esportare', async () => {
    const grezza = crypto.getRandomValues(new Uint8Array(32));
    await salvaChiaveProtetta('n1', grezza);
    const chiave = (await leggiChiaveProtetta('n1'))!;
    expect(chiave.extractable).toBe(false);
    await expect(crypto.subtle.exportKey('raw', chiave)).rejects.toThrow();
    const file = await cifraFile(chiave, 1, new TextEncoder().encode('ciao'));
    expect(new TextDecoder().decode(await decifraFile(chiave, file))).toBe('ciao');
    await eliminaChiaveProtetta('n1');
    expect(await leggiChiaveProtetta('n1')).toBeUndefined();
  });
});
