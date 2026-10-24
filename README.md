# Masterfood

Web app installabile (PWA) per la gestione alimentare della famiglia: inventario di frigo, freezer e dispensa, lista della spesa condivisa, ricette suggerite da ciò che c'è in casa. In italiano, **local-first** e a **costo zero**.

> Stato: base del progetto (scaffolding). Le schermate sono segnaposto; sono pronte le fondamenta su cui costruire l'MVP.

## Principi

- **I dati del nucleo non passano dallo sviluppatore.** Inventario, lista, ricette, profili e allergie vivono in un documento CRDT [Yjs](https://yjs.dev) salvato in IndexedDB e, cifrato con AES-256-GCM sul dispositivo, sul Google Drive personale di chi crea il nucleo (scope `drive.file`, condiviso ai membri con Google Picker).
- **Supabase (UE, Francoforte) solo per i metadati:** account, nuclei, ruoli, inviti, consensi, promemoria.
- **Costo zero:** solo piani gratuiti (Cloudflare Pages, Supabase Free, API Google gratuite, Open Food Facts). OCR degli scontrini sul dispositivo con Tesseract.js. Google Vision e modelli AI solo con la chiave API dell'utente (BYOK), chiamati direttamente dal dispositivo.
- **Sicurezza alimentare invalicabile:** 14 allergeni UE come filtro rigido prima di ogni suggerimento, limiti di conservazione che non si possono superare.
- **Nessun segreto nel repository:** solo `.env.example` con valori pubblici lato client.

## Stack

React 18 + TypeScript + Vite · vite-plugin-pwa (Workbox) · React Router · Zustand · Yjs + y-indexeddb · Supabase JS · Vitest.

## Struttura

```
src/
  App.tsx, main.tsx        router e avvio
  config.ts                variabili VITE_* e scope Google
  componenti/              struttura, barra schede (Oggi · Casa · + · Lista · Ricette), avviso aggiornamento PWA
  pagine/                  schermate (per ora segnaposto)
  dominio/                 regole pure e testate
    tipi.ts                entità del documento del nucleo
    id.ts                  UUIDv7 e id deterministici (piano:2026-W44, art:ing:latte…)
    allergeni.ts           14 allergeni UE, allergeni effettivi, conflitti
    genuinita.ts           voto 1–5 (media pesata 40/30/20/10, tetto 2 con additivi a rischio elevato)
    quantita.ts            quantità da movimenti, scalatura porzioni
  piattaforma/
    cifratura.ts           formato file .mfd cifrato AES-256-GCM
    documento.ts           documento Yjs, collezioni, IndexedDB, export/import cifrato
    supabase.ts            client Supabase
  stato/                   stato UI (Zustand)
supabase/migrations/       schema Postgres con Row Level Security
public/                    icone PWA
```

## Avvio in locale

Serve Node 22.

```bash
npm install
cp .env.example .env.local   # poi compila i valori
npm run dev
```

L'app parte anche senza configurazione: in sviluppo mostra quali variabili mancano.

| Comando | Cosa fa |
| --- | --- |
| `npm run dev` | server di sviluppo |
| `npm test` | test unitari (Vitest) |
| `npm run lint` | ESLint |
| `npm run build` | controllo tipi e build di produzione in `dist/` |
| `npm run preview` | serve la build, con service worker attivo |

## Configurazione dei servizi

**Supabase**
1. Crea un progetto Free nella regione **Central EU (Frankfurt)**.
2. Applica lo schema incollando `supabase/migrations/*.sql` nell'editor SQL del progetto (oppure con la CLI: `supabase init`, `supabase link --project-ref <id>`, `supabase db push`).
3. In Authentication → Providers abilita Google con lo stesso client ID.
4. Copia URL e chiave `anon` in `.env.local`.

**Google Cloud**
1. Crea un progetto e la schermata di consenso OAuth con gli scope `openid`, `email`, `profile` e `https://www.googleapis.com/auth/drive.file` (non sensibile: basta la verifica gratuita del brand).
2. Crea un client OAuth di tipo "Applicazione web" con le origini dell'app (`http://localhost:5173` e il dominio `*.pages.dev`).
3. Abilita Google Drive API e Google Picker API; crea una chiave API limitata al Picker e al dominio dell'app.

## Pubblicazione su Cloudflare Pages

Collega il repository a Cloudflare Pages con comando di build `npm run build`, cartella `dist` e le variabili `VITE_*` nelle impostazioni del progetto. Senza `404.html` Cloudflare serve `index.html` per tutte le rotte, come serve a una SPA.

## Documenti di design

Le decisioni da cui nasce questo codice sono nel [riepilogo del progetto](https://claude.ai/artifact/YQjsjEkb4aMLDrHBSP2aJq) e nei documenti di [architettura](https://claude.ai/artifact/4SaomwvpGbzQezv8wnnHtt), [modello dati](https://claude.ai/artifact/EJbDFi9B92j79wj8hC6P4W), [MVP](https://claude.ai/artifact/HPB13wJmaoJMQnBk3w4kjb) e [fase 2](https://claude.ai/artifact/WtZW7pXZoRqxgMmYfKTvcN).

## Prossimi passi (MVP, in ordine di dipendenza)

1. **M0 Piattaforma:** accesso con Google (GIS → `signInWithIdToken`), consensi, creazione nucleo, chiave del nucleo in Vault, sync con Drive (`drive.file`, Picker per i membri).
2. **M1 Nucleo e profili:** membri, profili senza account, inviti.
3. **M2/M3 Catalogo e acquisizione:** Open Food Facts, barcode, scontrino con Tesseract.js, dati di riferimento in `public/rif/v1/`.
4. **M4, M5, M6, M8:** inventario, ricette di sistema e personali, suggerimenti, lista della spesa.
