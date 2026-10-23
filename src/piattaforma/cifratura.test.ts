import { describe, expect, it } from 'vitest';
import {
  ErroreFileCifrato,
  cifraFile,
  decifraFile,
  esportaChiave,
  generaChiaveNucleo,
  importaChiave,
  versioneChiaveFile,
} from './cifratura';

const testo = new TextEncoder().encode('latte, uova, farina');

describe('cifratura dei file del nucleo', () => {
  it('cifra e decifra con la stessa chiave', async () => {
    const chiave = await generaChiaveNucleo();
    const file = await cifraFile(chiave, 3, testo);
    expect(versioneChiaveFile(file)).toBe(3);
    expect(await decifraFile(chiave, file)).toEqual(testo);
  });

  it('usa un IV diverso a ogni salvataggio', async () => {
    const chiave = await generaChiaveNucleo();
    const a = await cifraFile(chiave, 1, testo);
    const b = await cifraFile(chiave, 1, testo);
    expect(a).not.toEqual(b);
  });

  it('rifiuta una chiave diversa', async () => {
    const file = await cifraFile(await generaChiaveNucleo(), 1, testo);
    await expect(decifraFile(await generaChiaveNucleo(), file)).rejects.toBeInstanceOf(ErroreFileCifrato);
  });

  it('rifiuta un file con la versione della chiave alterata', async () => {
    const chiave = await generaChiaveNucleo();
    const file = await cifraFile(chiave, 1, testo);
    file[7] = 2;
    await expect(decifraFile(chiave, file)).rejects.toBeInstanceOf(ErroreFileCifrato);
  });

  it('esporta e reimporta la chiave grezza', async () => {
    const chiave = await generaChiaveNucleo();
    const reimportata = await importaChiave(await esportaChiave(chiave));
    const file = await cifraFile(chiave, 1, testo);
    expect(await decifraFile(reimportata, file)).toEqual(testo);
  });
});
