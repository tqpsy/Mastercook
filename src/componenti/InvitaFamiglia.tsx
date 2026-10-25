import { useState, type FormEvent } from 'react';
import type { Membro } from '../dominio/tipi';
import { emailAccount } from '../nucleo/account';
import { useNucleo } from '../nucleo/contesto';
import { useCollezione } from '../nucleo/hooks';
import { invita } from '../nucleo/invito';
import { richiediToken, tokenValido } from '../piattaforma/google';
import { messaggioErroreGoogle } from './Sincronizzazione';
import { mostraAvviso } from './ui';

/** Invita un familiare: condivide la cartella del nucleo sul proprio Drive e prepara il link. */
export function InvitaFamiglia() {
  const ctx = useNucleo();
  const membri = useCollezione<Membro>('membri');
  const [email, setEmail] = useState('');
  const [inCorso, setInCorso] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const conAccount = membri.filter((m) => m.utente_id && m.utente_id !== emailAccount());
  const io = membri.find((m) => m.id === ctx.membroId)?.nome ?? 'Un familiare';

  async function invia(e: FormEvent) {
    e.preventDefault();
    const destinatario = email.trim().toLowerCase();
    if (!destinatario) return;
    setInCorso(true);
    setErrore(null);
    setLink(null);
    try {
      if (!tokenValido()) await richiediToken(emailAccount());
      const nuovo = await invita(ctx, destinatario, io);
      setLink(nuovo);
      setEmail('');
      const testo = `${io} ti invita in Masterfood, per gestire insieme dispensa e spesa. Apri il link e accedi con Google (${destinatario}):`;
      if (navigator.share) {
        await navigator.share({ title: 'Invito a Masterfood', text: testo, url: nuovo }).catch(() => undefined);
      }
    } catch (err) {
      setErrore(/invalid|emailAddress|400/i.test((err as Error).message) ? 'Controlla l’indirizzo: serve un account Google (es. Gmail).' : messaggioErroreGoogle(err));
    } finally {
      setInCorso(false);
    }
  }

  return (
    <div className="sezione">
      <h2>Invita in famiglia</h2>
      <p className="testo-tenue piccolo">
        Chi inviti entra con il suo account Google e il suo nome, ma i dati restano sul tuo Drive. Riceve un’email da Google e un link da te.
      </p>
      <form className="riquadro" onSubmit={invia}>
        <label className="campo">
          <span>Email Google di chi inviti</span>
          <input type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@gmail.com" required />
        </label>
        <button type="submit" className="bottone" disabled={inCorso || !email.trim()}>
          {inCorso ? 'Condivido…' : 'Invita'}
        </button>
        {errore && <p className="esito-errore">{errore}</p>}
        {link && (
          <>
            <p className="esito-ok">✓ Cartella condivisa. Manda questo link a chi hai invitato:</p>
            <div className="azioni">
              {navigator.share && (
                <button type="button" className="bottone secondario piccolo" onClick={() => navigator.share({ title: 'Invito a Masterfood', url: link }).catch(() => undefined)}>
                  Condividi il link
                </button>
              )}
              <button
                type="button"
                className="bottone secondario piccolo"
                onClick={() =>
                  navigator.clipboard
                    .writeText(link)
                    .then(() => mostraAvviso('Link copiato'))
                    .catch(() => mostraAvviso('Copia non riuscita: tieni premuto sul link'))
                }
              >
                Copia il link
              </button>
            </div>
          </>
        )}
      </form>
      {conAccount.length > 0 && (
        <p className="testo-tenue piccolo">Usano già l’app con te: {conAccount.map((m) => `${m.nome} (${m.utente_id})`).join(', ')}.</p>
      )}
    </div>
  );
}
