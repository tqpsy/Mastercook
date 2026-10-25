import { Link, useNavigate, useParams } from 'react-router-dom';
import { ModuloMembro, membroVuoto } from '../../componenti/ModuloMembro';
import { TornaIndietro } from '../../componenti/TornaIndietro';
import { Vuoto, mostraAvviso } from '../../componenti/ui';
import { emojiMembro } from '../../dominio/emojiMembro';
import { useNucleo } from '../../nucleo/contesto';
import { eliminaMembro, salvaMembro } from '../../nucleo/azioni';
import { useMembri } from '../../nucleo/derivati';
import { useDieta } from '../../nucleo/hooksMenu';

export function Membro() {
  const { id } = useParams();
  const nucleo = useNucleo();
  const membri = useMembri();
  const naviga = useNavigate();
  const nuovo = id === 'nuovo';
  const membro = membri.find((m) => m.id === id);
  const dieta = useDieta(membro?.id);

  if (!nuovo && !membro) {
    return (
      <section className="pagina">
        <TornaIndietro a="/impostazioni" />
        <Vuoto emoji="🧑" titolo="Membro non trovato" />
      </section>
    );
  }

  return (
    <section className="pagina">
      <TornaIndietro a="/impostazioni" testo="Impostazioni" />
      <ModuloMembro
        key={id}
        iniziale={membro ? { ...membroVuoto(), ...membro } : membroVuoto()}
        etichettaInvio={nuovo ? 'Aggiungi al nucleo' : 'Salva'}
        intestazione={<h1>{nuovo ? 'Nuovo membro' : `${emojiMembro(membro!)} ${membro!.nome}`}</h1>}
        onInvia={(dati) => {
          salvaMembro(nucleo, dati, membro?.id);
          mostraAvviso(nuovo ? `${dati.nome} aggiunto al nucleo` : 'Profilo salvato');
          naviga('/impostazioni');
        }}
      />
      {membro && (
        <div className="riquadro">
          <h2>Dieta del dietista</h2>
          <p className="testo-tenue piccolo">
            {dieta
              ? `Caricata${dieta.titolo ? `: ${dieta.titolo}` : ''}. Il menù della settimana usa le sue grammature.`
              : 'Se un dietista ha dato una dieta a questo profilo, caricala: diventa il menù della settimana con ricette adatte.'}
          </p>
          <Link className="bottone secondario" to={`/menu/dieta?membro=${encodeURIComponent(membro.id)}`}>
            {dieta ? 'Apri la dieta' : 'Carica la dieta'}
          </Link>
        </div>
      )}
      {membro && membro.id !== nucleo.membroId && (
        <button
          type="button"
          className="bottone pericolo"
          onClick={() => {
            if (!confirm(`Togliere ${membro.nome} dal nucleo?`)) return;
            eliminaMembro(nucleo, membro.id);
            naviga('/impostazioni');
          }}
        >
          Togli dal nucleo
        </button>
      )}
    </section>
  );
}
