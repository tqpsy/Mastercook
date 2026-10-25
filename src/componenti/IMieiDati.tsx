import { useState } from 'react';
import { Link } from 'react-router-dom';
import type * as Y from 'yjs';
import { eliminaAccount, eliminaNucleoDaDrive, eliminaNucleoDalDispositivo, useAccount } from '../nucleo/account';
import { useNucleo } from '../nucleo/contesto';
import { leggiBackup, ripristinaNelNucleo } from '../nucleo/ripristino';
import { richiediToken, tokenValido } from '../piattaforma/google';
import { useSessione } from '../stato/sessione';
import { messaggioErroreGoogle, nucleoSuDrive } from './Sincronizzazione';
import { mostraAvviso } from './ui';

function scaricaBackup(nome: string, dati: Y.Doc, storico: Y.Doc) {
  const contenuto = {
    formato: 'masterfood-export',
    versione: 1,
    esportato_il: new Date().toISOString(),
    dati: dati.toJSON(),
    storico: storico.toJSON(),
  };
  const blob = new Blob([JSON.stringify(contenuto, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `masterfood-${nome.toLowerCase().replace(/\W+/g, '-')}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Copia dei dati, ripristino, cestino ed eliminazione (dal telefono, da Drive, dell'account). */
export function IMieiDati() {
  const ctx = useNucleo();
  const { nucleo } = ctx;
  const email = useAccount((s) => s.email);
  const scegliNucleo = useSessione((s) => s.scegliNucleo);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const suDrive = nucleoSuDrive(nucleo.id);

  async function ripristina(file: File) {
    setErrore(null);
    try {
      const backup = leggiBackup(await file.text());
      const quando = backup.esportato_il ? ` del ${new Date(backup.esportato_il).toLocaleDateString('it-IT')}` : '';
      if (!confirm(`Ripristinare la copia${quando}? Aggiungo solo quello che manca: niente di quello che c’è adesso viene cancellato o cambiato.`)) return;
      const aggiunti = ripristinaNelNucleo(ctx, backup);
      mostraAvviso(aggiunti ? `Ripristino fatto: ${aggiunti === 1 ? '1 elemento recuperato' : `${aggiunti} elementi recuperati`}` : 'Niente da recuperare: c’è già tutto');
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Ripristino non riuscito.');
    }
  }

  /** Le azioni su Drive partono da un tocco: se il token è scaduto si chiede di nuovo a Google. */
  async function conGoogle(azione: () => Promise<void>) {
    setInCorso(true);
    setErrore(null);
    try {
      if (!tokenValido()) await richiediToken(email ?? undefined);
      await azione();
      scegliNucleo(null);
    } catch (e) {
      setErrore(messaggioErroreGoogle(e));
    } finally {
      setInCorso(false);
    }
  }

  return (
    <div className="sezione">
      <h2>I tuoi dati</h2>
      <p className="testo-tenue piccolo">
        Puoi scaricare una copia leggibile di inventario, lista, ricette e profili, e ricaricarla qui o su un altro telefono. La copia non è
        cifrata e contiene le allergie: tienila in un posto sicuro.
      </p>
      <div className="azioni">
        <button type="button" className="bottone secondario" onClick={() => scaricaBackup(nucleo.nome, ctx.dati, ctx.storico)}>
          Scarica i dati (JSON)
        </button>
        <label className="bottone secondario">
          Ripristina da una copia
          <input
            type="file"
            accept="application/json,.json"
            className="nascosto-visivamente"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) ripristina(f);
              e.target.value = '';
            }}
          />
        </label>
        <Link className="bottone secondario" to="/impostazioni/cestino">
          Cestino
        </Link>
      </div>
      {errore && (
        <p className="esito-errore" role="alert">
          {errore}
        </p>
      )}

      <details className="riquadro">
        <summary>Eliminare i dati</summary>
        <div className="azioni colonna" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="bottone pericolo"
            disabled={inCorso}
            onClick={() => {
              if (!confirm(`Eliminare «${nucleo.nome}» da questo telefono? ${suDrive ? 'Su Google Drive resta: potrai riscaricarlo.' : 'Non è salvato su Drive: senza una copia non si può recuperare.'}`)) return;
              eliminaNucleoDalDispositivo(nucleo.id);
              scegliNucleo(null);
            }}
          >
            Elimina da questo telefono
          </button>
          {suDrive && (
            <button
              type="button"
              className="bottone pericolo"
              disabled={inCorso}
              onClick={() => {
                if (
                  !confirm(
                    `Eliminare «${nucleo.nome}» da questo telefono e da Google Drive? Se la cartella è sul tuo Drive la cancello per tutta la famiglia; se te l’ha condivisa un altro, esci solo tu. Non si può annullare.`,
                  )
                )
                  return;
                conGoogle(async () => {
                  const esito = await eliminaNucleoDaDrive(nucleo.id);
                  mostraAvviso(esito === 'cancellato' ? 'Eliminato anche da Google Drive' : 'Sei uscito dal nucleo: i file restano a chi li ha creati');
                });
              }}
            >
              Elimina anche da Google Drive
            </button>
          )}
          {email && (
            <button
              type="button"
              className="bottone pericolo"
              disabled={inCorso}
              onClick={() => {
                if (
                  !confirm(
                    'Eliminare il tuo account Masterfood? Cancello le cartelle dei nuclei che hai creato (anche per gli invitati), le chiavi nascoste nel tuo Drive, i dati su questo telefono e l’accesso a Google. Non si può annullare.',
                  )
                )
                  return;
                conGoogle(async () => {
                  await eliminaAccount();
                  mostraAvviso('Account eliminato');
                });
              }}
            >
              Elimina il mio account
            </button>
          )}
          {inCorso && <p className="testo-tenue piccolo">Elimino da Google Drive…</p>}
          <p className="testo-tenue piccolo">
            Sugli altri telefoni i dati restano finché non li elimini anche lì. La chiave Gemini si toglie da Funzioni avanzate.
          </p>
        </div>
      </details>
    </div>
  );
}
