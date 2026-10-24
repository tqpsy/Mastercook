import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ModuloCarico, type Carico } from '../../componenti/ModuloCarico';
import { SelettoreIngrediente, mostraAvviso } from '../../componenti/ui';
import type { Luogo } from '../../dominio/tipi';
import { emojiIngrediente } from '../../rif/emoji';
import { TornaIndietro } from '../../componenti/TornaIndietro';

export function AggiungiAMano() {
  const [parametri] = useSearchParams();
  const luogo = (parametri.get('luogo') as Luogo | null) ?? undefined;
  const [carico, setCarico] = useState<Carico | null>(null);
  const [aggiunti, setAggiunti] = useState<string[]>([]);

  return (
    <section className="pagina">
      <TornaIndietro a="/aggiungi" />
      <div className="saluto">
        <h1>Aggiungi a mano</h1>
        <p className="sottotitolo">Cerca l’ingrediente: la marca non serve, conta cosa è.</p>
      </div>
      {!carico ? (
        <SelettoreIngrediente
          autoFocus
          onScegli={(ing) =>
            setCarico({ nome: ing.nome, ingrediente: ing, unita: ing.unita, quantita: ing.formato ?? (ing.unita === 'pz' ? 1 : 500), luogo, origine: 'manuale' })
          }
          testoLibero={(testo) => setCarico({ nome: testo, unita: 'pz', quantita: 1, luogo, origine: 'manuale' })}
        />
      ) : (
        <div className="scheda-card">
          <div className="voce" style={{ padding: 0, minHeight: 0 }}>
            <span className="emoji" aria-hidden="true">
              {emojiIngrediente(carico.ingrediente?.id)}
            </span>
            <span className="voce-testo">
              <span className="voce-titolo">{carico.nome}</span>
              {!carico.ingrediente && <span className="voce-dettaglio">Voce libera: non verrà usata nelle ricette</span>}
            </span>
          </div>
          <ModuloCarico
            carico={carico}
            onAnnulla={() => setCarico(null)}
            onFatto={(nome) => {
              mostraAvviso(`${nome} aggiunto`);
              setAggiunti((a) => [nome, ...a]);
              setCarico(null);
            }}
          />
        </div>
      )}
      {aggiunti.length > 0 && <p className="testo-tenue piccolo">Aggiunti ora: {aggiunti.join(', ')}</p>}
    </section>
  );
}
