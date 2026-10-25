import { useState, type FormEvent } from 'react';
import { ALLERGENI_UE, CODICI_ALLERGENI, type Allergene } from '../dominio/allergeni';
import {
  calcolaFabbisogno,
  annoNascita,
  etaDaAnno,
  fattoreDaFabbisogno,
  puoAvereCondizione,
  type Condizione,
  type Sesso,
} from '../dominio/fabbisogni';
import { emojiMembro } from '../dominio/emojiMembro';
import { formattaNumero } from '../dominio/formato';
import { dataLocale } from '../dominio/id';
import type { Restrizione } from '../dominio/tipi';
import type { DatiMembro } from '../nucleo/azioni';
import { ingrediente } from '../rif/ingredienti';
import { Chip, SelettoreIngrediente } from './ui';

export const PORZIONI = [
  { fattore: 0.6, nome: 'Piccola', dettaglio: 'bambini' },
  { fattore: 1, nome: 'Normale', dettaglio: 'adulti' },
  { fattore: 1.3, nome: 'Abbondante', dettaglio: 'più appetito' },
] as const;

const SESSI: { id: Sesso | undefined; nome: string }[] = [
  { id: 'femmina', nome: 'Femmina' },
  { id: 'maschio', nome: 'Maschio' },
  { id: undefined, nome: 'Non indicato' },
];

const CONDIZIONI: { id: Condizione | undefined; nome: string }[] = [
  { id: undefined, nome: 'Nessuna' },
  { id: 'gravidanza', nome: 'In gravidanza' },
  { id: 'allattamento', nome: 'Allatta' },
];

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
  const servoConsenso = chiediConsenso && (dati.allergie.length > 0 || dati.intolleranze.length > 0 || !!dati.condizione);
  const oggi = dataLocale();
  const annoOggi = Number(oggi.slice(0, 4));
  const anno = annoNascita(dati);
  const eta = anno !== undefined && anno >= 1900 && anno <= annoOggi ? etaDaAnno(anno, oggi) : undefined;
  const conCondizione = puoAvereCondizione(dati.sesso, eta);
  const fabbisogno = eta !== undefined ? calcolaFabbisogno(eta, dati.sesso, conCondizione ? dati.condizione : undefined) : undefined;
  const automatica = !!fabbisogno && dati.porzione_automatica !== false;
  const valido = dati.nome.trim().length > 0 && (!servoConsenso || consenso);

  const aggiorna = (campi: Partial<DatiMembro>) => setDati((d) => ({ ...d, ...campi }));

  function invia(e: FormEvent) {
    e.preventDefault();
    if (!valido) return;
    onInvia({
      ...dati,
      nome: dati.nome.trim(),
      // Solo l'anno: la data completa non serve e non si conserva.
      anno_nascita: eta !== undefined ? anno : undefined,
      data_nascita: undefined,
      condizione: conCondizione ? dati.condizione : undefined,
      // Tiene un valore di riserva coerente anche per chi legge solo fattore_porzione.
      fattore_porzione: automatica ? fattoreDaFabbisogno(fabbisogno) : dati.fattore_porzione,
    });
  }

  return (
    <form className="pagina" onSubmit={invia}>
      {intestazione}
      <label className="campo">
        <span>Nome</span>
        <input value={dati.nome} onChange={(e) => aggiorna({ nome: e.target.value })} placeholder="Es. Luca" autoComplete="given-name" required />
      </label>

      <label className="campo">
        <span>Anno di nascita (facoltativo)</span>
        <input
          type="number"
          inputMode="numeric"
          min={1900}
          max={annoOggi}
          placeholder={`Es. ${annoOggi - 35}`}
          value={anno ?? ''}
          onChange={(e) => aggiorna({ anno_nascita: e.target.value ? Number(e.target.value) : undefined, data_nascita: undefined })}
        />
        <small>Basta l’anno: serve solo per le porzioni giuste per l’età.</small>
      </label>

      <fieldset className="campo">
        <legend>Sesso (facoltativo)</legend>
        <div className="chips">
          {SESSI.map((x) => (
            <Chip key={x.nome} attivo={dati.sesso === x.id} onClick={() => aggiorna({ sesso: x.id })}>
              {emojiMembro({ ...dati, sesso: x.id }, oggi)} {x.nome}
            </Chip>
          ))}
        </div>
        <small>I fabbisogni cambiano tra maschi e femmine della stessa età. Se non lo indichi usiamo la media.</small>
      </fieldset>

      {conCondizione && (
        <fieldset className="campo">
          <legend>Gravidanza o allattamento</legend>
          <div className="chips">
            {CONDIZIONI.map((x) => (
              <Chip key={x.nome} attivo={dati.condizione === x.id} onClick={() => aggiorna({ condizione: x.id })}>
                {x.nome}
              </Chip>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="campo">
        <legend>Porzione</legend>
        <div className="chips">
          {fabbisogno && (
            <Chip attivo={automatica} onClick={() => aggiorna({ porzione_automatica: true })}>
              Automatica <span className="testo-tenue piccolo">×{formattaNumero(fattoreDaFabbisogno(fabbisogno))}</span>
            </Chip>
          )}
          {PORZIONI.map((p) => (
            <Chip
              key={p.fattore}
              attivo={!automatica && dati.fattore_porzione === p.fattore}
              onClick={() => aggiorna({ fattore_porzione: p.fattore, porzione_automatica: false })}
            >
              {p.nome} <span className="testo-tenue piccolo">{p.dettaglio}</span>
            </Chip>
          ))}
        </div>
        <small>
          {fabbisogno
            ? `Fabbisogno indicativo (LARN): circa ${formattaNumero(fabbisogno.energia_kcal)} kcal, ${fabbisogno.proteine_g} g di proteine e ${fabbisogno.ferro_mg} mg di ferro al giorno. Serve a calcolare le quantità delle ricette e della spesa.`
            : 'Serve a calcolare le quantità delle ricette e della spesa. Con l’anno di nascita la calcoliamo noi dai fabbisogni per età e sesso.'}
        </small>
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
            Acconsento al trattamento dei dati su allergie, gravidanza e allattamento, che sono dati relativi alla salute,
            per filtrare ricette e prodotti e calcolare le porzioni. Restano cifrati nei dati del nucleo e nessun server li può leggere.
          </span>
        </label>
      )}

      <button type="submit" className="bottone pieno" disabled={!valido}>
        {etichettaInvio}
      </button>
    </form>
  );
}
