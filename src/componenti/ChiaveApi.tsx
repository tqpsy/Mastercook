import { useState } from 'react';
import { leggiChiave, scriviChiave } from '../piattaforma/chiaviApi';
import { verificaChiave, type EsitoVerifica } from '../piattaforma/verificaChiave';
import { mostraAvviso } from './ui';

/** `compatta`: senza titolo né spiegazione, per la guida del primo avvio. */
export function ChiaveApi({ compatta = false }: { compatta?: boolean }) {
  const [valore, setValore] = useState(() => leggiChiave('gemini'));
  const [esito, setEsito] = useState<EsitoVerifica | 'in_corso'>();
  return (
    <div className="sezione">
      {!compatta && <h2>Funzioni avanzate</h2>}
      <p className="testo-tenue piccolo" hidden={compatta}>
        Masterfood è gratuita. Per riconoscere i prodotti nelle foto serve solo una chiave Gemini tua, gratuita: le
        chiamate partono da questo telefono verso Google, e Masterfood non vede né la chiave né le foto. Senza chiave
        tutto il resto funziona, scontrini compresi (si leggono sul telefono).
      </p>
      <form
        className="riquadro"
        onSubmit={(e) => {
          e.preventDefault();
          scriviChiave('gemini', valore.trim());
          mostraAvviso(valore.trim() ? 'Chiave Gemini salvata su questo dispositivo' : 'Chiave Gemini rimossa');
        }}
      >
        <label className="campo">
          <span>Google Gemini</span>
          <input
            type="password"
            autoComplete="off"
            value={valore}
            placeholder="Incolla la chiave"
            onChange={(e) => {
              setValore(e.target.value);
              setEsito(undefined);
            }}
          />
          <small>
            Serve a: riconoscere i prodotti nelle foto di frigo, freezer e dispensa.{' '}
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">
              Creala gratis su Google AI Studio (basta l’account Google, nessuna carta)
            </a>
          </small>
        </label>
        <div className="azioni">
          <button
            type="button"
            className="bottone secondario piccolo"
            disabled={!valore.trim() || esito === 'in_corso'}
            onClick={async () => {
              setEsito('in_corso');
              const r = await verificaChiave('gemini', valore);
              // Una chiave che funziona si salva subito.
              if (r.ok) scriviChiave('gemini', valore.trim());
              setEsito(r.ok ? { ok: true, messaggio: 'Chiave valida e salvata su questo dispositivo.' } : r);
            }}
          >
            {esito === 'in_corso' ? 'Verifico…' : 'Verifica'}
          </button>
          <button type="submit" className="bottone secondario piccolo">
            Salva
          </button>
        </div>
        {esito && esito !== 'in_corso' && (
          <p role="status" className={esito.ok ? 'esito-ok' : 'esito-errore'}>
            {esito.ok ? '✓ ' : '✗ '}
            {esito.messaggio}
          </p>
        )}
      </form>
    </div>
  );
}
