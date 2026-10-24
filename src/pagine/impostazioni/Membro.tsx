import { useNavigate, useParams } from 'react-router-dom';
import { ModuloMembro, membroVuoto } from '../../componenti/ModuloMembro';
import { TornaIndietro } from '../../componenti/TornaIndietro';
import { Vuoto, mostraAvviso } from '../../componenti/ui';
import { useNucleo } from '../../nucleo/contesto';
import { eliminaMembro, salvaMembro } from '../../nucleo/azioni';
import { useMembri } from '../../nucleo/derivati';

export function Membro() {
  const { id } = useParams();
  const nucleo = useNucleo();
  const membri = useMembri();
  const naviga = useNavigate();
  const nuovo = id === 'nuovo';
  const membro = membri.find((m) => m.id === id);

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
        intestazione={<h1>{nuovo ? 'Nuovo membro' : membro!.nome}</h1>}
        onInvia={(dati) => {
          salvaMembro(nucleo, dati, membro?.id);
          mostraAvviso(nuovo ? `${dati.nome} aggiunto al nucleo` : 'Profilo salvato');
          naviga('/impostazioni');
        }}
      />
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
