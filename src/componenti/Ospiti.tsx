import { useState } from 'react';
import { ALLERGENI_UE, CODICI_ALLERGENI } from '../dominio/allergeni';
import { MASSIMO_OSPITI, nessunOspite, normalizzaOspiti, quantiOspiti } from '../dominio/ospiti';
import type { Ospiti, Restrizione } from '../dominio/tipi';
import { Chip, Foglio, PassoQuantita } from './ui';

const RESTRIZIONI: { id: Restrizione; nome: string }[] = [
  { id: 'vegetariano', nome: 'Vegetariani' },
  { id: 'vegano', nome: 'Vegani' },
  { id: 'senza_maiale', nome: 'Senza maiale' },
  { id: 'senza_alcol', nome: 'Senza alcol' },
];

/** Le intolleranze più comuni, con l'allergene che le copre. */
const SCORCIATOIE: { nome: string; allergene: string }[] = [
  { nome: 'Lattosio', allergene: 'latte' },
  { nome: 'Celiachia', allergene: 'glutine' },
];

const alterna = <T,>(lista: readonly T[], v: T) => (lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v]);

/** Quanti adulti, quanti bambini e le loro intolleranze, allergie e scelte alimentari. */
export function FoglioOspiti({
  iniziale,
  titolo = 'Ospiti',
  onSalva,
  onChiudi,
}: {
  iniziale: Ospiti | null | undefined;
  titolo?: string;
  onSalva: (ospiti: Ospiti | null) => void;
  onChiudi: () => void;
}) {
  const [o, setO] = useState<Ospiti>(() => iniziale ?? { ...nessunOspite(), adulti: 2 });
  const aggiorna = (campi: Partial<Ospiti>) => setO((x) => normalizzaOspiti({ ...x, ...campi }));
  const totale = quantiOspiti(o);

  return (
    <Foglio titolo={titolo} onChiudi={onChiudi}>
      <div className="riga-campi">
        <div className="campo">
          <span>Adulti</span>
          <PassoQuantita valore={o.adulti} passo={1} etichetta="Ospiti adulti" onCambia={(v) => aggiorna({ adulti: v })} />
        </div>
        <div className="campo">
          <span>Bambini</span>
          <PassoQuantita valore={o.bambini} passo={1} etichetta="Ospiti bambini" onCambia={(v) => aggiorna({ bambini: v })} />
        </div>
      </div>
      <p className="testo-tenue piccolo">
        {totale ? `${totale} ${totale === 1 ? 'ospite' : 'ospiti'} in tutto` : 'Nessun ospite'} · un bambino conta come 0,6 porzioni · massimo{' '}
        {MASSIMO_OSPITI}.
      </p>

      <fieldset className="campo">
        <legend>Intolleranze e allergie</legend>
        <div className="chips">
          {SCORCIATOIE.map((s) => (
            <Chip
              key={s.nome}
              pericolo
              attivo={o.allergie.includes(s.allergene)}
              onClick={() => aggiorna({ allergie: alterna(o.allergie, s.allergene) })}
            >
              {s.nome}
            </Chip>
          ))}
          {CODICI_ALLERGENI.filter((a) => !SCORCIATOIE.some((s) => s.allergene === a)).map((a) => (
            <Chip key={a} pericolo attivo={o.allergie.includes(a)} onClick={() => aggiorna({ allergie: alterna(o.allergie, a) })}>
              {ALLERGENI_UE[a]}
            </Chip>
          ))}
        </div>
        <small>Basta che riguardi uno degli ospiti: le ricette con questi ingredienti non verranno proposte. Non servono nomi.</small>
      </fieldset>

      <fieldset className="campo">
        <legend>Alimentazione</legend>
        <div className="chips">
          {RESTRIZIONI.map((r) => (
            <Chip key={r.id} attivo={o.restrizioni.includes(r.id)} onClick={() => aggiorna({ restrizioni: alterna(o.restrizioni, r.id) })}>
              {r.nome}
            </Chip>
          ))}
        </div>
      </fieldset>

      <div className="azioni colonna">
        <button
          type="button"
          className="bottone pieno"
          onClick={() => {
            onSalva(totale ? o : null);
            onChiudi();
          }}
        >
          {totale ? 'Conferma gli ospiti' : 'Nessun ospite'}
        </button>
        {iniziale && quantiOspiti(iniziale) > 0 && (
          <button
            type="button"
            className="bottone secondario"
            onClick={() => {
              onSalva(null);
              onChiudi();
            }}
          >
            Togli gli ospiti
          </button>
        )}
      </div>
    </Foglio>
  );
}
