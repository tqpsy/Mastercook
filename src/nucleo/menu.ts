/**
 * Azioni sul menù settimanale e sulla dieta del dietista. Come in azioni.ts, ogni modifica
 * registra l'autore; la dieta è un dato relativo alla salute e resta nel documento cifrato del nucleo.
 */
import { aggiungiGiorni } from '../dominio/date';
import { quantitaVoce, type DietaLetta } from '../dominio/dieta';
import { idDieta, idPasto, idPiano, type TipoPasto } from '../dominio/id';
import { fabbisognoMenu } from '../dominio/menu';
import type { PortataProposta, PastoProposto } from '../dominio/menuDieta';
import type { DataLocale, MembroId, Pasto, PortataPianificata, Ricetta } from '../dominio/tipi';
import { collezione, eliminaEntita, inserisciEntita, modificaEntita } from '../piattaforma/documento';
import { ingrediente } from '../rif/ingredienti';
import { aggiungiAllaLista } from './azioni';
import type { ContestoNucleo } from './contesto';

type Ctx = Pick<ContestoNucleo, 'dati' | 'storico' | 'membroId'>;

// ───────── Dieta ─────────

export function salvaDieta(ctx: Ctx, membroId: MembroId, dieta: DietaLetta, lettaCon: 'gemini' | 'telefono'): void {
  const diete = collezione(ctx.dati, 'diete');
  const id = idDieta(membroId);
  const campi = { membro_id: membroId, titolo: dieta.titolo, dietista: dieta.dietista, note: dieta.note, giorni: dieta.giorni, letta_con: lettaCon };
  const esistente = diete.get(id);
  if (esistente) {
    ctx.dati.transact(() => {
      esistente.delete('eliminato_il');
      modificaEntita(esistente, campi, ctx.membroId);
    });
  } else inserisciEntita(diete, { id, ...campi }, ctx.membroId);
}

/** Toglie la dieta e, dal menù di oggi in poi, le portate messe per lei. */
export function eliminaDieta(ctx: Ctx, membroId: MembroId, oggi: DataLocale): void {
  const d = collezione(ctx.dati, 'diete').get(idDieta(membroId));
  ctx.dati.transact(() => {
    if (d) eliminaEntita(d, ctx.membroId);
    for (const [, pasto] of collezione(ctx.dati, 'piani')) {
      const data = pasto.get('data') as string | undefined;
      if (!data || data < oggi || pasto.get('eliminato_il')) continue;
      const portate = togliDieta((pasto.get('portate') as PortataPianificata[]) ?? [], membroId);
      modificaEntita(pasto, { portate }, ctx.membroId);
    }
  });
}

/** Le portate senza quelle messe dalla dieta del membro (che resta nelle altre, se le mangia anche lui). */
function togliDieta(portate: readonly PortataPianificata[], membroId: MembroId): PortataPianificata[] {
  return portate.flatMap((p) => {
    if (!p.dieta_di?.includes(membroId)) return [p];
    const membri = p.membri.filter((m) => m !== membroId);
    if (!membri.length) return [];
    const { [membroId]: _p, ...porzioni } = p.porzioni_dieta ?? {};
    const { [membroId]: _n, ...note } = p.note_dieta ?? {};
    void _p;
    void _n;
    return [{ ...p, membri, dieta_di: p.dieta_di.filter((m) => m !== membroId), porzioni_dieta: porzioni, note_dieta: note }];
  });
}

function scriviPasto(ctx: Ctx, data: DataLocale, tipo: TipoPasto, aggiorna: (p: Pasto) => Pasto): void {
  const piani = collezione(ctx.dati, 'piani');
  const id = idPasto(data, tipo);
  const esistente = piani.get(id);
  const attuale: Pasto =
    esistente && !esistente.get('eliminato_il')
      ? (esistente.toJSON() as Pasto)
      : { data, tipo, membri_presenti: [], portate: [] };
  const nuovo = aggiorna(attuale);
  const campi = { data, tipo, piano: idPiano(data), membri_presenti: nuovo.membri_presenti, portate: nuovo.portate };
  if (esistente) {
    ctx.dati.transact(() => {
      esistente.delete('eliminato_il');
      modificaEntita(esistente, campi, ctx.membroId);
    });
  } else inserisciEntita(piani, { id, ...campi }, ctx.membroId);
}

function portataDaProposta(s: PortataProposta, membroId: MembroId): PortataPianificata {
  const nota = s.voci.map((v) => [v.testo, quantitaVoce(v)].filter(Boolean).join(' ')).join(', ');
  const voce = !s.ricetta && s.voci.length === 1 ? s.voci[0] : undefined;
  return {
    ...(s.ricetta ? { ricetta_id: s.ricetta.id } : {}),
    titolo: s.titolo,
    membri: [membroId],
    dieta_di: [membroId],
    porzioni_dieta: s.ricetta ? { [membroId]: s.porzioni } : {},
    note_dieta: s.ricetta && nota ? { [membroId]: nota } : {},
    ...(voce?.ingrediente_id ? { ingrediente_id: voce.ingrediente_id } : {}),
    ...(voce?.quantita_g ? { quantita_g: voce.quantita_g } : {}),
  };
}

/**
 * Porta la dieta di un membro nel menù della settimana che inizia `lunedi`.
 * Sostituisce solo le portate messe in precedenza dalla sua dieta; se un altro membro
 * mangia già la stessa ricetta in quel pasto, il membro si aggiunge a quella.
 */
export function portaNelMenu(ctx: Ctx, membroId: MembroId, lunedi: DataLocale, settimana: readonly { giorno: number; pasti: PastoProposto[] }[]): number {
  let portate = 0;
  ctx.dati.transact(() => {
    for (const g of settimana) {
      const data = aggiungiGiorni(lunedi, g.giorno - 1);
      for (const proposto of g.pasti) {
        scriviPasto(ctx, data, proposto.tipo, (pasto) => {
          const elenco = togliDieta(pasto.portate, membroId);
          for (const s of proposto.portate) {
            const nuova = portataDaProposta(s, membroId);
            const uguale = elenco.find((p) => (nuova.ricetta_id ? p.ricetta_id === nuova.ricetta_id : !p.ricetta_id && p.titolo === nuova.titolo));
            if (uguale) {
              uguale.membri = [...new Set([...uguale.membri, membroId])];
              uguale.dieta_di = [...new Set([...(uguale.dieta_di ?? []), membroId])];
              uguale.porzioni_dieta = { ...uguale.porzioni_dieta, ...nuova.porzioni_dieta };
              uguale.note_dieta = { ...uguale.note_dieta, ...nuova.note_dieta };
            } else elenco.push(nuova);
            portate++;
          }
          return { ...pasto, membri_presenti: [...new Set([...pasto.membri_presenti, membroId])], portate: elenco };
        });
      }
    }
  });
  return portate;
}

// ───────── Menù ─────────

export function aggiungiRicettaAlPasto(ctx: Ctx, data: DataLocale, tipo: TipoPasto, ricetta: Ricetta, membri: MembroId[]): void {
  scriviPasto(ctx, data, tipo, (pasto) => {
    const portate = [...pasto.portate];
    const uguale = portate.find((p) => p.ricetta_id === ricetta.id);
    if (uguale) uguale.membri = [...new Set([...uguale.membri, ...membri])];
    else portate.push({ ricetta_id: ricetta.id, titolo: ricetta.titolo, membri });
    return { ...pasto, membri_presenti: [...new Set([...pasto.membri_presenti, ...membri])], portate };
  });
}

/** Cambia la ricetta di una portata tenendo membri e note della dieta. */
export function cambiaRicetta(ctx: Ctx, data: DataLocale, tipo: TipoPasto, indice: number, ricetta: Ricetta, porzioni?: Record<MembroId, number>): void {
  scriviPasto(ctx, data, tipo, (pasto) => ({
    ...pasto,
    portate: pasto.portate.map((p, i) =>
      i === indice ? { ...p, ricetta_id: ricetta.id, titolo: ricetta.titolo, ...(porzioni ? { porzioni_dieta: { ...p.porzioni_dieta, ...porzioni } } : {}) } : p,
    ),
  }));
}

export function togliPortata(ctx: Ctx, data: DataLocale, tipo: TipoPasto, indice: number): void {
  scriviPasto(ctx, data, tipo, (pasto) => ({ ...pasto, portate: pasto.portate.filter((_, i) => i !== indice) }));
}

/** Mette in lista gli ingredienti del menù da oggi alla fine della settimana; la lista sottrae quello che c'è in casa. */
export function mettiInListaMenu(
  ctx: Ctx,
  lunedi: DataLocale,
  pasti: readonly Pasto[],
  ricettaPerId: (id: string) => Ricetta | undefined,
  fattore: (m: MembroId) => number,
): number {
  const fabbisogno = fabbisognoMenu(pasti, ricettaPerId, fattore);
  const membri = [...new Set(pasti.flatMap((p) => p.portate.flatMap((x) => x.membri)))];
  ctx.dati.transact(() => {
    for (const [id, quantita] of fabbisogno) {
      aggiungiAllaLista(ctx, { ingrediente_id: id, testo: ingrediente(id)!.nome }, { tipo: 'dieta', riferimento: idPiano(lunedi), titolo: 'Menù della settimana', quantita, membri });
    }
  });
  return fabbisogno.size;
}
