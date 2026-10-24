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
2. Crea un client OAuth di tipo "Applicazione web" con le origini dell'app (`http://localhost:5173` e il dominio di pubblicazione, es. `https://<utente>.github.io`).
3. Abilita Google Drive API e Google Picker API; crea una chiave API limitata al Picker e al dominio dell'app.

## Pubblicazione su GitHub Pages (gratis)

Il workflow `.github/workflows/pubblica.yml` pubblica l'app a ogni push su `main` all'indirizzo `https://<utente>.github.io/Mastercook/`.

1. Una sola volta: **Settings → Pages → Source: GitHub Actions**.
2. Facoltativo, per accesso Google e sync: in **Settings → Secrets and variables → Actions → Variables** aggiungi le variabili `VITE_*` di `.env.example` (sono valori pubblici, nessun segreto). Senza, l'app funziona in modalità "solo su questo dispositivo".
3. Aggiungi l'indirizzo di Pages tra le origini autorizzate del client OAuth Google.

In alternativa va bene anche **Cloudflare Pages**: comando di build `npm run build`, cartella `dist`, stesse variabili `VITE_*`.

## Installarla sul telefono

È una web app installabile (PWA): niente store, funziona anche offline.

- **Android (Chrome):** apri l'indirizzo, tocca **Installa app** nel banner o nel menu ⋮ → *Installa app*. In alternativa, Impostazioni → *Installa sul telefono* dentro l'app.
- **iPhone (Safari, iOS 16.4+):** apri l'indirizzo **in Safari**, tocca **Condividi** (il quadrato con la freccia) → **Aggiungi alla schermata Home**. Da altri browser su iPhone non si installa.

Dopo l'installazione l'app si apre a schermo intero con la sua icona. I dati restano sul dispositivo (IndexedDB); per non perderli, esporta il JSON dalle impostazioni finché la sync con Drive non è attiva.

## Documenti di design

Le decisioni da cui nasce questo codice sono nel [riepilogo del progetto](https://claude.ai/artifact/YQjsjEkb4aMLDrHBSP2aJq) e nei documenti di [architettura](https://claude.ai/artifact/4SaomwvpGbzQezv8wnnHtt), [modello dati](https://claude.ai/artifact/EJbDFi9B92j79wj8hC6P4W), [MVP](https://claude.ai/artifact/HPB13wJmaoJMQnBk3w4kjb) e [fase 2](https://claude.ai/artifact/WtZW7pXZoRqxgMmYfKTvcN).

## Stato

Funziona oggi, tutto sul dispositivo e senza account: nucleo e membri con allergie e restrizioni, casa (frigo, freezer, dispensa) con scadenze stimate e "usa prima", aggiunta a mano, codice a barre con Open Food Facts, scontrino con Tesseract.js (o Google Vision con chiave propria), foto di frigo e dispensa (riconoscimento con chiave Gemini propria), ricette di sistema e personali, suggerimenti filtrati per allergie, "Ho cucinato" con scarico e avanzi, lista della spesa per reparti che carica in casa ciò che spunti, esportazione JSON.

## Prossimi passi

1. **Accesso Google e Supabase:** GIS → `signInWithIdToken`, consensi, nucleo e inviti sul server (schema già in `supabase/migrations/`).
2. **Sync con Google Drive:** file cifrati AES-GCM (`src/piattaforma/cifratura.ts`) sul Drive dell'amministratore, `drive.file` e Picker per i membri.
3. **Promemoria push** per le scadenze e piano della settimana.
