import { useEffect } from 'react';
import { collezione, modificaEntita } from '../piattaforma/documento';
import { ascoltaChiave, chiavePropria, impostaChiaveDelNucleo } from '../piattaforma/chiaviApi';
import { eProprietario } from './account';
import { useNucleo } from './contesto';

/**
 * Condivide nel nucleo la chiave Gemini di chi l'ha creato: viaggia con i dati cifrati e i
 * familiari la usano senza vederla. Non disegna nulla.
 */
export function ChiaveCondivisa() {
  const { nucleo, dati, membroId } = useNucleo();

  useEffect(() => {
    const meta = collezione(dati, 'meta');
    const leggi = () => impostaChiaveDelNucleo((meta.get('nucleo')?.get('chiave_gemini') as string | undefined) ?? '');
    // Solo chi ha creato il nucleo la mette nei dati. La toglie solo se la cancella lui: un suo
    // secondo telefono senza chiave usa quella condivisa e non la cancella.
    const allinea = (anche_vuota: boolean) => {
      if (!eProprietario(nucleo.id)) return;
      const entita = meta.get('nucleo');
      const propria = chiavePropria('gemini');
      if (!entita || (!propria && !anche_vuota) || (entita.get('chiave_gemini') ?? '') === propria) return;
      modificaEntita(entita, { chiave_gemini: propria || undefined }, membroId);
    };
    leggi();
    allinea(false);
    meta.observeDeep(leggi);
    const smetti = ascoltaChiave(() => allinea(true));
    return () => {
      meta.unobserveDeep(leggi);
      smetti();
      impostaChiaveDelNucleo('');
    };
  }, [nucleo.id, dati, membroId]);

  return null;
}
