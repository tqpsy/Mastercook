# Masterfood

Web app installabile (PWA) per la gestione alimentare della famiglia: inventario di frigo, freezer e dispensa, lista della spesa condivisa, ricette suggerite da ciò che c'è in casa. In italiano, **local-first** e a **costo zero**.

> Stato: base del progetto (scaffolding). Le schermate sono segnaposto; sono pronte le fondamenta su cui costruire l'MVP.

## Principi

- **I dati del nucleo non passano dallo sviluppatore.** Inventario, lista, ricette, profili e allergie vivono in un documento CRDT [Yjs](https://yjs.dev) salvato in IndexedDB e, cifrato con AES-256-GCM sul dispositivo, sul Google Drive personale di chi crea il nucleo (scope `drive.file`, condiviso ai membri con Google Picker).
- **Nessun server:** l'accesso è con Google; chiave del nucleo ed elenco dei nuclei stanno nell'area nascosta dell'app sul Drive dell'utente (`appDataFolder`), i dati nella cartella "Masterfood - <nucleo>", cifrati.
- **Costo zero:** solo piani gratuiti (GitHub Pages, API Google gratuite, Open Food Facts). OCR degli scontrini sul dispositivo con Tesseract.js. Riconoscimento delle foto con Gemini solo con la chiave gratuita dell'utente (BYOK), chiamato direttamente dal dispositivo.
- **Sicurezza alimentare invalicabile:** 14 allergeni UE come filtro rigido prima di ogni suggerimento, limiti di conservazione che non si possono superare.
- **Nessun segreto nel repository:** solo `.env.example` con valori pubblici lato client.

## Stack

React 18 + TypeScript + Vite · vite-plugin-pwa (Workbox) · React Router · Zustand · Yjs + y-indexeddb · Google Identity Services · Vitest.

## Struttura

```
src/
  App.tsx, main.tsx        router e avvio
  config.ts                ID client Google (pubblico) e scope
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
  stato/                   stato UI (Zustand)
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

## Accesso con Google e Google Drive

Una sola configurazione, fatta una volta dal proprietario dell'app in [Google Cloud Console](https://console.cloud.google.com/):

1. Crea un progetto e abilita **Google Drive API**.
2. Schermata di consenso OAuth: tipo *Esterno*, ambiti `openid`, `email`, `drive.file`, `drive.appdata` (tutti non sensibili), poi *Pubblica l'app*.
3. Crea un **ID client OAuth** di tipo *Applicazione web* con origini `https://tqpsy.github.io` e `http://localhost:5173`.
4. Metti l'ID client in `ID_CLIENT_GOOGLE` in `src/config.ts` (non è un segreto). Per provare un altro progetto in locale basta `VITE_GOOGLE_CLIENT_ID` in `.env.local`.

Gli utenti poi toccano solo **Accedi con Google**: l'app crea la cartella su Drive, cifra i dati e li sincronizza.

## Pubblicazione su GitHub Pages (gratis)

Il workflow `.github/workflows/pubblica.yml` pubblica l'app a ogni push su `main` all'indirizzo `https://<utente>.github.io/Mastercook/`.

1. Una sola volta: **Settings → Pages → Source: GitHub Actions**.
2. Aggiungi l'indirizzo di Pages tra le origini autorizzate del client OAuth Google.

In alternativa va bene anche **Cloudflare Pages**: comando di build `npm run build`, cartella `dist`.

## Installarla sul telefono

È una web app installabile (PWA): niente store, funziona anche offline.

- **Android (Chrome):** apri l'indirizzo, tocca **Installa app** nel banner o nel menu ⋮ → *Installa app*. In alternativa, Impostazioni → *Installa sul telefono* dentro l'app.
- **iPhone (Safari, iOS 16.4+):** apri l'indirizzo **in Safari**, tocca **Condividi** (il quadrato con la freccia) → **Aggiungi alla schermata Home**. Da altri browser su iPhone non si installa.

Dopo l'installazione l'app si apre a schermo intero con la sua icona. I dati restano sul dispositivo (IndexedDB); per non perderli, esporta il JSON dalle impostazioni finché la sync con Drive non è attiva.

## Documenti di design

Le decisioni da cui nasce questo codice sono nel [riepilogo del progetto](https://claude.ai/artifact/YQjsjEkb4aMLDrHBSP2aJq) e nei documenti di [architettura](https://claude.ai/artifact/4SaomwvpGbzQezv8wnnHtt), [modello dati](https://claude.ai/artifact/EJbDFi9B92j79wj8hC6P4W), [MVP](https://claude.ai/artifact/HPB13wJmaoJMQnBk3w4kjb) e [fase 2](https://claude.ai/artifact/WtZW7pXZoRqxgMmYfKTvcN).

## Stato

Funziona oggi, tutto sul dispositivo e senza account: nucleo e membri con allergie e restrizioni, casa (frigo, freezer, dispensa) con scadenze stimate e "usa prima", aggiunta a mano, codice a barre con Open Food Facts, scontrino in più foto o dal QR code con Tesseract.js sul telefono, foto di frigo, freezer e dispensa, più foto per zona (riconoscimento con chiave Gemini gratuita propria), ricette di sistema e personali, suggerimenti filtrati per allergie, accesso con Google e sincronizzazione cifrata sul Google Drive dell'amministratore, inviti in famiglia (Impostazioni → Invita in famiglia: la cartella si condivide con l'email Google del familiare, che entra dal link con il suo account e il suo nome; se Google lo chiede conferma i file con il selettore, che usa la chiave API pubblica `VITE_GOOGLE_API_KEY` limitata al sito), foto di casa condivise in un file cifrato sul Drive di chi ha creato il nucleo, "Ho cucinato" con scarico e avanzi, lista della spesa per reparti che carica in casa ciò che spunti, esportazione JSON.

## Prossimi passi

1. **Promemoria push** per le scadenze e piano della settimana.
