import { useState } from 'react';
import type { Membro } from '../dominio/tipi';
import { emailAccount } from '../nucleo/account';
import { useNucleo } from '../nucleo/contesto';
import { useCollezione } from '../nucleo/hooks';
import { leggiNuclei } from '../nucleo/registro';
import { elencaPermessi, togliPermesso, type Permesso } from '../piattaforma/drive';
import { aggiornaMembriRelay, relayConfigurato } from '../piattaforma/firebase';
import { richiediToken, tokenValido } from '../piattaforma/google';
import { collezione, modificaEntita } from '../piattaforma/documento';
import { messaggioErroreGoogle } from './Sincronizzazione';
import { mostraAvviso } from './ui';

/**
 * Per chi ha creato il nucleo: chi può aprire la cartella su Drive, e «Togli l'accesso».
 * Chi viene tolto non vede più i file e, alla prossima apertura, l'app cancella dal suo
 * telefono i dati e la chiave del nucleo.
 */
export function PersoneConAccesso() {
  const ctx = useNucleo();
  const membri = useCollezione<Membro>('membri');
  const cartella = leggiNuclei().find((n) => n.id === ctx.nucleo.id)?.drive?.cartella;
  const [persone, setPersone] = useState<Permesso[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState<string | null>(null);

  async function carica() {
    if (!cartella) return;
    setErrore(null);
    try {
      if (!tokenValido()) await richiediToken(emailAccount());
      setPersone((await elencaPermessi(cartella)).filter((p) => p.role !== 'owner' && p.type === 'user'));
    } catch (e) {
      setErrore(messaggioErroreGoogle(e));
    }
  }

  async function togli(p: Permesso) {
    const chi = membri.find((m) => m.utente_id && m.utente_id === p.emailAddress?.toLowerCase());
    const nome = chi?.nome ?? p.displayName ?? p.emailAddress ?? 'questa persona';
    if (!confirm(`Togliere l’accesso a ${nome}? Non vedrà più i dati della famiglia e dal suo telefono verranno cancellati alla prossima apertura.`)) return;
    setInCorso(p.id);
    try {
      if (!tokenValido()) await richiediToken(emailAccount());
      await togliPermesso(cartella!, p.id);
      if (relayConfigurato() && p.emailAddress) await aggiornaMembriRelay(ctx.nucleo.id, { togli: [p.emailAddress] });
      // Il profilo resta (porzioni, allergie), ma non è più legato al suo account Google.
      const entita = chi && collezione(ctx.dati, 'membri').get(chi.id);
      if (entita) modificaEntita(entita, { utente_id: undefined }, ctx.membroId);
      setPersone((x) => x?.filter((y) => y.id !== p.id) ?? null);
      mostraAvviso(`${nome} non ha più accesso`);
    } catch (e) {
      setErrore(messaggioErroreGoogle(e));
    } finally {
      setInCorso(null);
    }
  }

  if (!cartella) return null;
  return (
    <div className="sezione">
      <h2>Chi ha accesso</h2>
      <p className="testo-tenue piccolo">
        I dati sono sul tuo Drive: solo tu puoi invitare o togliere l’accesso. Chi viene tolto non vede più nulla e l’app cancella i dati dal suo telefono.
      </p>
      {persone === null ? (
        <button type="button" className="bottone secondario" onClick={carica}>
          Mostra chi ha accesso
        </button>
      ) : persone.length === 0 ? (
        <p className="testo-tenue">Per ora solo tu.</p>
      ) : (
        <ul className="elenco">
          {persone.map((p) => {
            const chi = membri.find((m) => m.utente_id && m.utente_id === p.emailAddress?.toLowerCase());
            return (
              <li key={p.id} className="voce" style={{ flexWrap: 'wrap' }}>
                <span className="voce-testo">
                  <span className="voce-titolo">{chi?.nome ?? p.displayName ?? p.emailAddress}</span>
                  <span className="voce-dettaglio">{p.emailAddress}</span>
                </span>
                <button type="button" className="bottone pericolo piccolo" disabled={inCorso === p.id} onClick={() => togli(p)}>
                  {inCorso === p.id ? 'Tolgo…' : 'Togli l’accesso'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {errore && (
        <p className="esito-errore" role="alert">
          {errore}
        </p>
      )}
    </div>
  );
}
