import { TornaIndietro } from '../../componenti/TornaIndietro';
import { mostraAvviso, Vuoto } from '../../componenti/ui';
import type { ArticoloInventario, Membro, Ricetta } from '../../dominio/tipi';
import { eliminaDefinitivamente, GIORNI_CESTINO, ripristinaDalCestino, type CollezioneCestino } from '../../nucleo/azioni';
import { useNucleo } from '../../nucleo/contesto';
import { useNomeMembro } from '../../nucleo/derivati';
import { emojiIngrediente } from '../../rif/emoji';
import { useCollezione } from '../../nucleo/hooks';

interface Eliminato {
  collezione: CollezioneCestino;
  id: string;
  nome: string;
  emoji: string;
  eliminato_il?: string;
  da?: string;
}

const TIPO: Record<CollezioneCestino, string> = { inventario: 'Prodotto', ricette: 'Ricetta', membri: 'Profilo' };

function giorniRimasti(il: string): number {
  return Math.max(0, GIORNI_CESTINO - Math.floor((Date.now() - new Date(il).getTime()) / 86_400_000));
}

/** Quello che è stato eliminato negli ultimi 30 giorni, da recuperare con un tocco. */
export function Cestino() {
  const ctx = useNucleo();
  const nomeMembro = useNomeMembro();
  const opzioni = { includiEliminate: true };
  const inventario = useCollezione<ArticoloInventario>('inventario', opzioni);
  const ricette = useCollezione<Ricetta>('ricette', opzioni);
  const membri = useCollezione<Membro>('membri', opzioni);

  const elementi = ([
    ...inventario.map((a) => ({ collezione: 'inventario' as const, id: a.id, nome: a.nome, emoji: emojiIngrediente(a.ingrediente_id), eliminato_il: a.eliminato_il, da: a.modificato_da })),
    ...ricette.filter((r) => r.origine === 'personale').map((r) => ({ collezione: 'ricette' as const, id: r.id, nome: r.titolo, emoji: '📖', eliminato_il: r.eliminato_il, da: r.modificato_da })),
    ...membri.map((m) => ({ collezione: 'membri' as const, id: m.id, nome: m.nome, emoji: '🧑', eliminato_il: m.eliminato_il, da: m.modificato_da })),
  ] as Eliminato[])
    .filter((e): e is Eliminato & { eliminato_il: string } => !!e.eliminato_il)
    .sort((a, b) => b.eliminato_il.localeCompare(a.eliminato_il));

  return (
    <section className="pagina">
      <TornaIndietro a="/impostazioni" />
      <h1>Cestino</h1>
      <p className="testo-tenue piccolo">
        Prodotti, ricette e profili eliminati restano qui {GIORNI_CESTINO} giorni, poi spariscono da soli. Il cestino è lo stesso per tutta la famiglia.
      </p>
      {elementi.length === 0 ? (
        <Vuoto emoji="🗑️" titolo="Il cestino è vuoto" />
      ) : (
        <ul className="elenco">
          {elementi.map((e) => {
            const giorni = giorniRimasti(e.eliminato_il);
            return (
              <li key={`${e.collezione}:${e.id}`} className="voce" style={{ flexWrap: 'wrap' }}>
                <span className="emoji" aria-hidden="true">
                  {e.emoji}
                </span>
                <span className="voce-testo">
                  <span className="voce-titolo">{e.nome || TIPO[e.collezione]}</span>
                  <span className="voce-dettaglio">
                    {TIPO[e.collezione]} · eliminato il {new Date(e.eliminato_il).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}
                    {e.da ? ` da ${nomeMembro(e.da)}` : ''} · {giorni === 1 ? 'resta 1 giorno' : `restano ${giorni} giorni`}
                  </span>
                </span>
                <span className="azioni" style={{ width: '100%', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="bottone secondario piccolo"
                    onClick={() => {
                      ripristinaDalCestino(ctx, e.collezione, e.id);
                      mostraAvviso(`${e.nome} ripristinato`);
                    }}
                  >
                    Ripristina
                  </button>
                  <button
                    type="button"
                    className="bottone pericolo piccolo"
                    aria-label={`Elimina per sempre ${e.nome}`}
                    onClick={() => {
                      if (!confirm(`Eliminare per sempre «${e.nome}»? Non si potrà più recuperare.`)) return;
                      eliminaDefinitivamente(ctx, e.collezione, e.id);
                    }}
                  >
                    Elimina
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
