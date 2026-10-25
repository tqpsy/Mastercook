import { useState } from "react";
import {
  leggiChiave,
  scriviChiave,
  type Fornitore,
} from "../piattaforma/chiaviApi";
import {
  verificaChiave,
  type EsitoVerifica,
} from "../piattaforma/verificaChiave";
import { mostraAvviso } from "./ui";

const FORNITORI: {
  id: Fornitore;
  nome: string;
  uso: string;
  guida: string;
  testoGuida: string;
}[] = [
  {
    id: "gemini",
    nome: "Google Gemini",
    uso: "riconosce i prodotti nelle foto di frigo, freezer e dispensa",
    guida: "https://aistudio.google.com/app/apikey",
    testoGuida:
      "Creala gratis su Google AI Studio (basta l’account Google, nessuna carta)",
  },
  {
    id: "vision",
    nome: "Google Cloud Vision",
    uso: "legge gli scontrini con più precisione",
    guida:
      "https://console.cloud.google.com/apis/library/vision.googleapis.com",
    testoGuida: "Come ottenerla",
  },
];

export function ChiaveApi() {
  const [esiti, setEsiti] = useState<
    Partial<Record<Fornitore, EsitoVerifica | "in_corso">>
  >({});
  const [valori, setValori] = useState(
    () =>
      Object.fromEntries(
        FORNITORI.map((f) => [f.id, leggiChiave(f.id)]),
      ) as Record<Fornitore, string>,
  );
  return (
    <div className="sezione">
      <h2>Funzioni avanzate</h2>
      <p className="testo-tenue piccolo">
        Masterfood è gratuita. Per riconoscere i prodotti nelle foto serve solo
        una chiave Gemini tua, gratuita: le chiamate partono da questo telefono
        verso Google, e Masterfood non vede né la chiave né le foto. Senza
        chiave tutto il resto funziona, scontrini compresi.
      </p>
      {FORNITORI.map((f) => {
        const modulo = (
          <form
            key={f.id}
            className="riquadro"
            onSubmit={(e) => {
              e.preventDefault();
              scriviChiave(f.id, valori[f.id].trim());
              mostraAvviso(
                valori[f.id].trim()
                  ? `Chiave ${f.nome} salvata su questo dispositivo`
                  : `Chiave ${f.nome} rimossa`,
              );
            }}
          >
            <label className="campo">
              <span>{f.nome}</span>
              <input
                type="password"
                autoComplete="off"
                value={valori[f.id]}
                placeholder="Incolla la chiave"
                onChange={(e) => {
                  setValori((v) => ({ ...v, [f.id]: e.target.value }));
                  setEsiti((x) => ({ ...x, [f.id]: undefined }));
                }}
              />
              <small>
                Serve a: {f.uso}.{" "}
                <a href={f.guida} target="_blank" rel="noreferrer">
                  {f.testoGuida}
                </a>
              </small>
            </label>
            <div className="azioni">
              <button
                type="button"
                className="bottone secondario piccolo"
                disabled={!valori[f.id].trim() || esiti[f.id] === "in_corso"}
                onClick={async () => {
                  setEsiti((x) => ({ ...x, [f.id]: "in_corso" }));
                  const esito = await verificaChiave(f.id, valori[f.id]);
                  // Una chiave che funziona si salva subito.
                  if (esito.ok) scriviChiave(f.id, valori[f.id].trim());
                  setEsiti((x) => ({
                    ...x,
                    [f.id]: esito.ok
                      ? {
                          ok: true,
                          messaggio:
                            "Chiave valida e salvata su questo dispositivo.",
                        }
                      : esito,
                  }));
                }}
              >
                {esiti[f.id] === "in_corso" ? "Verifico…" : "Verifica"}
              </button>
              <button type="submit" className="bottone secondario piccolo">
                Salva
              </button>
            </div>
            {esiti[f.id] && esiti[f.id] !== "in_corso" && (
              <p
                role="status"
                className={
                  (esiti[f.id] as EsitoVerifica).ok
                    ? "esito-ok"
                    : "esito-errore"
                }
              >
                {(esiti[f.id] as EsitoVerifica).ok ? "✓ " : "✗ "}
                {(esiti[f.id] as EsitoVerifica).messaggio}
              </p>
            )}
          </form>
        );
        if (f.id !== "vision") return modulo;
        return (
          <details
            key={f.id}
            className="riquadro"
            open={!!leggiChiave("vision")}
          >
            <summary>
              Opzione avanzata: Google Cloud Vision (facoltativa)
            </summary>
            <p className="testo-tenue piccolo">
              Gli scontrini si leggono già gratis sul telefono. Cloud Vision li
              legge con più precisione, ma per attivarla Google chiede di
              collegare una carta di credito al progetto Google Cloud, anche se
              c’è una quota gratuita mensile. Se non ti serve, lascia vuoto.
            </p>
            {modulo}
          </details>
        );
      })}
    </div>
  );
}
