import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Nei test gira Node: un archivio in memoria al posto di quello del browser.
const memoria = new Map<string, string>();
globalThis.localStorage ??= {
  getItem: (k: string) => memoria.get(k) ?? null,
  setItem: (k: string, v: string) => void memoria.set(k, v),
  removeItem: (k: string) => void memoria.delete(k),
  clear: () => memoria.clear(),
  key: (i: number) => [...memoria.keys()][i] ?? null,
  get length() {
    return memoria.size;
  },
};

const { leggiDietaConGemini } = await import('./gemini');
const { modelloEsaurito, quotaEsaurita } = await import('./quotaGemini');

const risposta = (status: number, corpo: unknown) => new Response(typeof corpo === 'string' ? corpo : JSON.stringify(corpo), { status });
const ok = () => risposta(200, { candidates: [{ content: { parts: [{ text: '{"giorni": []}' }] } }] });
const alGiorno = () => risposta(429, '{"error": {"details": [{"violations": [{"quotaId": "GenerateRequestsPerDayPerProjectPerModel-FreeTier"}]}]}}');
const alMinuto = () => risposta(429, '{"error": {"details": [{"quotaId": "GenerateRequestsPerMinutePerProjectPerModel-FreeTier"}, {"retryDelay": "5s"}]}}');
const modelloChiesto = (f: ReturnType<typeof vi.fn>, i: number) => /models\/([^:]+):/.exec(String(f.mock.calls[i]![0]))![1];

describe('richieste a Gemini', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('masterfood:chiave:gemini', 'prova');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('finita la quota del giorno passa al modello successivo', async () => {
    const f = vi.fn().mockResolvedValueOnce(alGiorno()).mockResolvedValueOnce(ok());
    vi.stubGlobal('fetch', f);
    await expect(leggiDietaConGemini({ tipo: 'testo', testo: 'lunedì pasta' })).resolves.toEqual({ giorni: [] });
    expect([modelloChiesto(f, 0), modelloChiesto(f, 1)]).toEqual(['gemini-2.5-flash', 'gemini-flash-latest']);
    expect(modelloEsaurito('gemini-2.5-flash')).toBe(true);
    expect(quotaEsaurita()).toBe(false);
  });

  it('col limite al minuto aspetta e riprova lo stesso modello', async () => {
    vi.useFakeTimers();
    const f = vi.fn().mockResolvedValueOnce(alMinuto()).mockResolvedValueOnce(ok());
    vi.stubGlobal('fetch', f);
    const lettura = leggiDietaConGemini({ tipo: 'testo', testo: 'lunedì pasta' });
    await vi.advanceTimersByTimeAsync(5_000);
    await expect(lettura).resolves.toEqual({ giorni: [] });
    expect([modelloChiesto(f, 0), modelloChiesto(f, 1)]).toEqual(['gemini-2.5-flash', 'gemini-2.5-flash']);
    expect(modelloEsaurito('gemini-2.5-flash')).toBe(false);
  });

  it('dice «finita per oggi» solo quando lo sono tutti i modelli', async () => {
    const f = vi.fn().mockImplementation(() => Promise.resolve(alGiorno()));
    vi.stubGlobal('fetch', f);
    await expect(leggiDietaConGemini({ tipo: 'testo', testo: 'lunedì pasta' })).rejects.toThrow('quota_giorno');
    expect(f).toHaveBeenCalledTimes(4);
    expect(quotaEsaurita()).toBe(true);
  });
});
