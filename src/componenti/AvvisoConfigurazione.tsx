import { configurazioneMancante } from '../config';

/** Solo in sviluppo: ricorda quali variabili di .env.local mancano. */
export function AvvisoConfigurazione() {
  const mancanti = configurazioneMancante();
  if (!import.meta.env.DEV || mancanti.length === 0) return null;
  return (
    <p className="riquadro avviso">
      Configurazione incompleta: mancano {mancanti.join(', ')}. Copia <code>.env.example</code> in{' '}
      <code>.env.local</code> e compila i valori.
    </p>
  );
}
