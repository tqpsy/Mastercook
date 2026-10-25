import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../config', () => ({ config: { firebaseApiKey: 'chiave', firebaseProjectId: 'prova' } }));
vi.mock('./google', () => ({ tokenValido: () => 'token-google' }));

// Firestore finto in memoria: documenti per nome completo, con commit, get e batchGet.
const documenti = new Map<string, Record<string, unknown>>();
let accessi = 0;
let negato = false;

const risposta = (corpo: unknown, stato = 200) => new Response(JSON.stringify(corpo), { status: stato });

vi.stubGlobal('location', { origin: 'https://esempio.it' });
vi.stubGlobal(
  'fetch',
  vi.fn(async (url: string, init?: RequestInit) => {
    if (url.includes('signInWithIdp')) {
      accessi++;
      return risposta({ idToken: 'id', expiresIn: '3600', email: 'Luca@Gmail.com' });
    }
    if (negato) return risposta({ error: { status: 'PERMISSION_DENIED' } }, 403);
    const percorso = url.replace('https://firestore.googleapis.com/v1/', '');
    const corpo = init?.body ? (JSON.parse(init.body as string) as Record<string, unknown>) : {};
    if (percorso.endsWith(':commit')) {
      for (const w of corpo.writes as { update?: { name: string; fields: Record<string, unknown> }; delete?: string }[]) {
        if (w.update) documenti.set(w.update.name, { ...(documenti.get(w.update.name) ?? {}), ...w.update.fields });
        if (w.delete) documenti.delete(w.delete);
      }
      return risposta({});
    }
    if (percorso.endsWith(':batchGet')) {
      return risposta((corpo.documents as string[]).map((n) => (documenti.has(n) ? { found: { name: n, fields: documenti.get(n) } } : { missing: n })));
    }
    const doc = documenti.get(percorso);
    return doc ? risposta({ fields: doc }) : risposta({ error: { status: 'NOT_FOUND' } }, 404);
  }),
);

const { depositoRelay, fileRelay } = await import('./firebase');
const { ErroreDrive } = await import('./drive');

describe('copia condivisa su Firebase', () => {
  beforeEach(() => {
    documenti.clear();
    negato = false;
  });

  it('un file che non c’è ancora ha versione vuota', async () => {
    expect(await depositoRelay.versione(fileRelay('n1', 'dati'))).toBe('');
  });

  it('carica e scarica un file grande diviso in pezzi', async () => {
    const id = fileRelay('n1', 'foto');
    const contenuto = new Uint8Array(1_600_000);
    for (let i = 0; i < contenuto.length; i++) contenuto[i] = i % 251;
    const versione = await depositoRelay.aggiorna(id, contenuto);
    expect(await depositoRelay.versione(id)).toBe(versione);
    expect([...documenti.keys()].filter((k) => k.includes('/parti/'))).toHaveLength(3);
    const scaricato = await depositoRelay.scarica(id);
    expect(scaricato.length === contenuto.length && scaricato.every((x, i) => x === contenuto[i])).toBe(true);
    // Un solo accesso a Firebase per tutta la sessione.
    expect(accessi).toBe(1);
  });

  it('chi non è più tra i membri riceve «non trovato», come su Drive', async () => {
    negato = true;
    await expect(depositoRelay.versione(fileRelay('n1', 'dati'))).rejects.toEqual(new ErroreDrive(404, 'notFound'));
  });
});
