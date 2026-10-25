import { consigliFrigo, REGOLE_FRIGO, type ProdottoInFrigo } from '../dominio/sistemazioneFrigo';

/** Consigli per sistemare il frigo: pochi alla volta, i più importanti per primi. */
export function ConsigliFrigo({ prodotti, dalleFoto }: { prodotti: ProdottoInFrigo[]; dalleFoto: boolean }) {
  const consigli = consigliFrigo(prodotti);
  return (
    <div className="sezione">
      <h2>Consigli per il frigo</h2>
      {consigli.length > 0 ? (
        <ul className="elenco">
          {consigli.map((c) => (
            <li key={c.titolo} className="voce" style={{ cursor: 'default' }}>
              <span className="emoji" aria-hidden="true">
                {c.priorita <= 2 ? '⚠️' : '💡'}
              </span>
              <span className="voce-testo">
                <span className="voce-titolo">{c.titolo}</span>
                <span className="voce-dettaglio">{c.testo}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="testo-tenue piccolo">{dalleFoto ? 'Dalle foto il frigo è sistemato bene. 👍' : 'Nessun consiglio per ora.'}</p>
      )}
      <p className="testo-tenue piccolo">
        {dalleFoto
          ? 'In base a cosa vedo nelle foto e a dove si trova.'
          : 'In base all’inventario. Con le foto analizzate (chiave Gemini) controllo anche dove sono i prodotti.'}
      </p>
      <details className="riquadro">
        <summary>Come sistemare il frigo</summary>
        <ul className="regole-frigo">
          {REGOLE_FRIGO.map((r) => (
            <li key={r.dove}>
              <strong>{r.dove}:</strong> {r.cosa}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
