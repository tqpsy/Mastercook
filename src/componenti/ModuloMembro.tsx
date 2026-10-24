import { useState, type FormEvent } from 'react';
import { ALLERGENI_UE, CODICI_ALLERGENI, type Allergene } from '../dominio/allergeni';
import type { Restrizione } from '../dominio/tipi';
import type { DatiMembro } from '../nucleo/azioni';
import { ingrediente } from '../rif/ingredienti';
import { Chip, SelettoreIngrediente } from './ui';

export const PORZIONI = [
  { fattore: 0.6, nome: 'Piccola', dettaglio: 'bambini' },
  { fattore: 1, nome: 'Normale', dettaglio: 'adulti' },
  { fattore: 1.3, nome: 'Abbondante', dettaglio: 'più appetito' },
] as const;

const RESTRIZIONI: { id: Restrizione; nome: string }[] = [
  { id: 'vegetariano', nome: 'Vegetariano' },
  { id: 'vegano', nome: 'Vegano' },
  { id: 'senza_maiale', nome: 'Senza maiale' },
  { id: 'senza_alcol', nome: 'Senza alcol' },
];

export const membroVuoto = (nome = ''): DatiMembro => ({
  nome,
  allergie: [],
  intolleranze: [],
  escludi_tracce: false,
  restrizioni: [],
  preferenze: { graditi: [], sgraditi: [] },
  fattore_porzione: 1,
  attivo: true,
});

function alterna<T>(lista: readonly T[], valore: T): T[] {
  return lista.includes(valore) ? lista.filter((v) => v !== valore) : [...lista, valore];
}

export function ModuloMembro({
  iniziale,
  etichettaInvio,
  onInvia,
  chiediConsenso = true,
  intestazione,
}: {
  iniziale: DatiMembro;
  etichettaInvio: string;
  onInvia: (dati: DatiMembro) => void;
  chiediConsenso?: boolean;
  intestazione?: React.ReactNode;
}) {
  const [dati, setDati] = useState<DatiMembro>(iniziale);
  const [consenso, setConsenso] = useState(!chiediConsenso || iniziale.allergie.length > 0);
  const servoConsenso = chiediConsenso && (dati.allergie.length > 0 || dati.intolleranze.length > 0);
  const valido = dati.nome.trim().length > 0 && (!servoConsenso || consenso);

  const aggiorna = (campi: Partial<DatiMembro>) => setDati((d) => ({ ...d, ...campi }));

  function invia(e: FormEvent) {
    e.preventDefault();
    if (valido) onInvia({ ...dati, nome: dati.nome.trim() });
  }

  return (
    <form className="pagina" onSubmit={invia}>
      {intestazione}
      <label className="campo">
        <span>Nome</span>
        <input value={dati.nome} onChange={(e) => aggiorna({ nome: e.target.value })} placeholder="Es. Luca" autoComplete="given-name" required />
      </label>

      <fieldset className="campo">
        <legend>Porzione</legend>
        <div className="chips">
          {PORZIONI.map((p) => (
            <Chip key={p.fattore} attivo={dati.fattore_porzione === p.fattore} onClick={() => aggiorna({ fattore_porzione: p.fattore })}>
              {p.nome} <span className="testo-tenue piccolo">{p.dettaglio}</span>
            </Chip>
          ))}
        </div>
        <small>Serve a calcolare le quantità delle ricette e della spesa.</small>
      </fieldset>

      <fieldset className="campo">
        <legend>Allergie</legend>
        <div className="chips">
          {CODICI_ALLERGENI.map((a: Allergene) => (
            <Chip key={a} pericolo attivo={dati.allergie.includes(a)} onClick={() => aggiorna({ allergie: alterna(dati.allergie, a) })}>
              {ALLERGENI_UE[a]}
            </Chip>
          ))}
        </div>
        <small>Le ricette con questi allergeni non verranno mai proposte quando questa persona mangia.</small>
        <label className="spunta">
          <input type="checkbox" checked={dati.escludi_tracce} onChange={(e) => aggiorna({ escludi_tracce: e.target.checked })} />
          <span>Escludi anche i prodotti che «possono contenere tracce»</span>
        </label>
      </fieldset>

      <fieldset className="campo">
        <legend>Alimentazione</legend>
        <div className="chips">
          {RESTRIZIONI.map((r) => (
            <Chip key={r.id} attivo={dati.restrizioni.includes(r.id)} onClick={() => aggiorna({ restrizioni: alterna(dati.restrizioni, r.id) })}>
              {r.nome}
            </Chip>
          ))}
        </div>
      </fieldset>

      <fieldset className="campo">
        <legend>Non gli piace</legend>
        {dati.preferenze.sgraditi.length > 0 && (
          <div className="chips">
            {dati.preferenze.sgraditi.map((id) => (
              <Chip
                key={id}
                attivo
                onClick={() => aggiorna({ preferenze: { ...dati.preferenze, sgraditi: dati.preferenze.sgraditi.filter((s) => s !== id) } })}
              >
                {ingrediente(id)?.nome ?? id} ✕
              </Chip>
            ))}
          </div>
        )}
        <SelettoreIngrediente
          segnaposto="Aggiungi un ingrediente sgradito"
          onScegli={(ing) =>
            !dati.preferenze.sgraditi.includes(ing.id) &&
            aggiorna({ preferenze: { ...dati.preferenze, sgraditi: [...dati.preferenze.sgraditi, ing.id] } })
          }
        />
        <small>Le ricette con questi ingredienti scendono in fondo, ma restano visibili.</small>
      </fieldset>

      {servoConsenso && (
        <label className="spunta riquadro avviso">
          <input type="checkbox" checked={consenso} onChange={(e) => setConsenso(e.target.checked)} />
          <span>
            Acconsento al trattamento dei dati sulle allergie, che sono dati relativi alla salute, per filtrare ricette e
            prodotti. Restano cifrati nei dati del nucleo e non arrivano mai ai server di Masterfood.
          </span>
        </label>
      )}

      <button type="submit" className="bottone pieno" disabled={!valido}>
        {etichettaInvio}
      </button>
    </form>
  );
}
