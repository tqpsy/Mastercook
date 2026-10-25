import { useState } from 'react';
import { emojiMembro } from '../dominio/emojiMembro';
import { BottoneGoogle } from '../componenti/BottoneGoogle';
import { ModuloMembro, membroVuoto } from '../componenti/ModuloMembro';
import { messaggioErroreGoogle } from '../componenti/Sincronizzazione';
import type { Membro } from '../dominio/tipi';
import { accedi } from '../nucleo/account';
import { completaIngresso, membriDelNucleo, scaricaNucleoCondiviso, type Invito as DatiInvito } from '../nucleo/invito';
import { leggiNuclei } from '../nucleo/registro';
import { useSessione } from '../stato/sessione';

type Passo = { tipo: 'accedi' } | { tipo: 'chi'; email: string; membri: Membro[] } | { tipo: 'nuovo'; email: string };

/** Torna all'app normale, togliendo l'invito dall'indirizzo. */
function chiudiInvito() {
  history.replaceState(null, '', import.meta.env.BASE_URL);
}

function messaggioErrore(e: unknown): string {
  const testo = e instanceof Error ? e.message : '';
  if (/file_non_confermati/.test(testo)) return 'Per entrare devi confermare entrambi i file nella finestra di Google.';
  if (/picker/.test(testo) || /^(404|403)$|notFound|forbidden|insufficient/i.test(testo))
    return 'Non vedo ancora i file condivisi: controlla di aver usato lo stesso account Google a cui è arrivato l’invito.';
  return messaggioErroreGoogle(e);
}

/** Pagina di chi riceve un invito: accede con Google, sceglie chi è e usa i dati di chi l'ha invitato. */
export function Invito({ invito, onFatto }: { invito: DatiInvito; onFatto: () => void }) {
  const scegliNucleo = useSessione((s) => s.scegliNucleo);
  const [passo, setPasso] = useState<Passo>({ tipo: 'accedi' });
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const icona = `${import.meta.env.BASE_URL}pwa-192.png`;

  async function entra(scelta: Parameters<typeof completaIngresso>[2], email: string) {
    setInCorso(true);
    setErrore(null);
    try {
      await completaIngresso(invito, email, scelta);
      chiudiInvito();
      scegliNucleo(invito.n);
      onFatto();
    } catch (e) {
      setErrore(messaggioErrore(e));
      setInCorso(false);
    }
  }

  if (passo.tipo === 'nuovo') {
    return (
      <main className="benvenuto">
        <ModuloMembro
          iniziale={membroVuoto()}
          etichettaInvio={inCorso ? 'Entro…' : 'Entra nel nucleo'}
          intestazione={
            <div className="saluto">
              <h1>Chi sei</h1>
              <p className="sottotitolo">Il tuo profilo nel nucleo «{invito.nome}»: serve per le porzioni e le allergie.</p>
            </div>
          }
          onInvia={(dati) => entra({ nuovo: dati }, passo.email)}
        />
        {errore && <p className="esito-errore" role="alert">{errore}</p>}
      </main>
    );
  }

  if (passo.tipo === 'chi') {
    const liberi = passo.membri.filter((m) => !m.utente_id || m.utente_id === passo.email);
    return (
      <main className="benvenuto">
        <div className="saluto">
          <h1>Chi sei?</h1>
          <p className="sottotitolo">Scegli il tuo nome tra quelli del nucleo «{invito.nome}», o crea il tuo profilo.</p>
        </div>
        <div className="azioni colonna">
          {liberi.map((m) => (
            <button key={m.id} type="button" className="bottone secondario" disabled={inCorso} onClick={() => entra({ membroId: m.id }, passo.email)}>
              {emojiMembro(m)} Sono {m.nome}
            </button>
          ))}
          <button type="button" className="bottone" disabled={inCorso} onClick={() => setPasso({ tipo: 'nuovo', email: passo.email })}>
            {liberi.length ? 'Non ci sono: crea il mio profilo' : 'Crea il mio profilo'}
          </button>
        </div>
        {errore && <p className="esito-errore" role="alert">{errore}</p>}
      </main>
    );
  }

  return (
    <main className="benvenuto">
      <img className="benvenuto-logo" src={icona} alt="" />
      <div className="saluto">
        <h1>{invito.da} ti invita in Masterfood</h1>
        <p className="sottotitolo">
          Entra nel nucleo «{invito.nome}»: dispensa, lista della spesa e ricette in comune. I dati restano sul Google Drive di {invito.da}; tu usi il tuo
          account e il tuo nome.
        </p>
      </div>
      <BottoneGoogle
        testo={inCorso ? 'Scarico i dati…' : 'Accedi con Google'}
        disabled={inCorso}
        onClick={async () => {
          setInCorso(true);
          setErrore(null);
          try {
            const email = await accedi();
            await scaricaNucleoCondiviso(invito);
            const membri = await membriDelNucleo(invito.n);
            const gia = membri.find((m) => m.utente_id === email);
            if (gia) return await entra({ membroId: gia.id }, email);
            setPasso({ tipo: 'chi', email, membri });
          } catch (e) {
            setErrore(messaggioErrore(e));
          } finally {
            setInCorso(false);
          }
        }}
      />
      <p className="testo-tenue piccolo">Usa l’account Google a cui {invito.da} ha mandato l’invito. Google potrebbe chiederti di confermare i file del nucleo.</p>
      {errore && <p className="esito-errore" role="alert">{errore}</p>}
      {leggiNuclei().length > 0 && (
        <button
          type="button"
          className="bottone-testo"
          onClick={() => {
            chiudiInvito();
            onFatto();
          }}
        >
          Non ora, torna all’app
        </button>
      )}
    </main>
  );
}
