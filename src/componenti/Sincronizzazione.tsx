import { config } from '../config';
import { useNucleo } from '../nucleo/contesto';

/** Stato di archiviazione del nucleo; il collegamento a Google Drive arriva con l'accesso Google. */
export function Sincronizzazione() {
  const { nucleo } = useNucleo();
  const configurato = !!(config.googleClientId && config.supabaseUrl);
  return (
    <div className="sezione">
      <h2>Account e sincronizzazione</h2>
      <div className="riquadro">
        <p>
          <strong>{nucleo.modalita === 'locale' ? 'Solo su questo dispositivo' : 'Locale + Google Drive'}</strong>
        </p>
        <p className="testo-tenue piccolo">
          {nucleo.modalita === 'locale'
            ? 'I dati sono salvati solo qui. Per usarli su altri telefoni e condividerli con la famiglia collega il tuo Google Drive: i file restano sul tuo Drive, cifrati.'
            : 'I dati sono cifrati e sincronizzati con il Google Drive dell’amministratore del nucleo.'}
        </p>
        {nucleo.modalita === 'locale' && (
          <button type="button" className="bottone secondario" disabled={!configurato}>
            Accedi con Google e collega Drive
          </button>
        )}
        {!configurato && <p className="testo-tenue piccolo">L’accesso con Google sarà attivo appena l’app viene collegata al progetto Google Cloud.</p>}
      </div>
    </div>
  );
}
