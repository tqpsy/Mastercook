import { Component, type ReactNode } from 'react';
import { useRouteError } from 'react-router-dom';

/** La schermata mostrata al posto della pagina bianca quando qualcosa si rompe. */
function SchermataErrore({ errore, onRiprova }: { errore: unknown; onRiprova?: () => void }) {
  const dettaglio = errore instanceof Error ? errore.message : String(errore ?? '');
  return (
    <section className="pagina" role="alert" style={{ minHeight: '100dvh', justifyContent: 'center', padding: '24px 16px' }}>
      <div className="vuoto">
        <span className="emoji" aria-hidden="true">
          🍳
        </span>
        <h3>Qualcosa non ha funzionato</h3>
        <p className="testo-tenue">I tuoi dati sono al sicuro su questo telefono. Riprova, oppure riapri l’app.</p>
        <div className="azioni colonna">
          {onRiprova && (
            <button type="button" className="bottone pieno" onClick={onRiprova}>
              Riprova
            </button>
          )}
          <button type="button" className="bottone secondario" onClick={() => location.assign(import.meta.env.BASE_URL)}>
            Torna all’inizio
          </button>
        </div>
        {dettaglio && (
          <details className="testo-tenue piccolo">
            <summary>Dettagli per chi sviluppa</summary>
            <code style={{ wordBreak: 'break-word' }}>{dettaglio}</code>
          </details>
        )}
      </div>
    </section>
  );
}

/** Per gli errori dentro le pagine: React Router li passa qui invece di mostrare la sua schermata tecnica. */
export function ErrorePagina() {
  return <SchermataErrore errore={useRouteError()} onRiprova={() => location.reload()} />;
}

/** Per tutto il resto (avvio, nucleo, inviti): un errore non lascia mai la pagina bianca. */
export class Paracadute extends Component<{ children: ReactNode }, { errore: unknown }> {
  state = { errore: null as unknown };

  static getDerivedStateFromError(errore: unknown) {
    return { errore: errore ?? new Error('Errore sconosciuto') };
  }

  render() {
    if (this.state.errore) return <SchermataErrore errore={this.state.errore} onRiprova={() => this.setState({ errore: null })} />;
    return this.props.children;
  }
}
