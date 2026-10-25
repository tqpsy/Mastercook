/**
 * Tutte le modifiche al documento del nucleo passano da qui: ogni azione registra l'autore
 * e, quando serve, un evento immutabile nello storico (raccolta attiva già dall'MVP).
 */
import * as Y from 'yjs';
import { aggiungiGiorni } from '../dominio/date';
import { dataLocale, idArticoloLista, idArticoloListaTesto, idRicettaMeta, uuidv7 } from '../dominio/id';
import { arrotonda } from '../dominio/formato';
import { quantitaDisponibile } from '../dominio/quantita';
import type { Suggerimento } from '../dominio/suggerimenti';
import type {
  ArticoloInventario,
  ArticoloLista,
  DataLocale,
  EventoStorico,
  Luogo,
  Membro,
  Movimento,
  OrigineArticolo,
  OrigineRigaLista,
  Ricetta,
  TipoEventoStorico,
  TipoScadenza,
  UnitaCanonica,
} from '../dominio/tipi';
import { collezione, eliminaEntita, inserisciEntita, modificaEntita, type Entita } from '../piattaforma/documento';
import { ingrediente } from '../rif/ingredienti';
import { REGOLA_FREEZER_COTTI, REGOLA_SCONGELATO, regolaConservazione } from '../rif/conservazione';
import type { ContestoNucleo } from './contesto';

type Ctx = Pick<ContestoNucleo, 'dati' | 'storico' | 'membroId'>;

const adesso = () => new Date().toISOString();
const oggi = () => dataLocale();

function entita(ctx: Ctx, nome: Parameters<typeof collezione>[1], id: string): Entita | undefined {
  return collezione(ctx.dati, nome).get(id);
}

function registraEvento(ctx: Ctx, tipo: TipoEventoStorico, dati: Omit<EventoStorico, 'id' | 'tipo' | 'il' | 'membro'>): void {
  const evento = new Y.Map<unknown>();
  const completo: EventoStorico = { id: uuidv7(), tipo, il: adesso(), membro: ctx.membroId, ...dati };
  for (const [k, v] of Object.entries(completo)) if (v !== undefined) evento.set(k, v);
  collezione(ctx.storico, 'eventi').set(completo.id, evento);
}

function pesoGrammi(quantita: number, unita: UnitaCanonica, ingredienteId?: string): number | undefined {
  if (unita !== 'pz') return quantita;
  const peso = ingrediente(ingredienteId)?.peso_pz;
  return peso ? quantita * peso : undefined;
}

// ───────────── Membri ─────────────

export type DatiMembro = Pick<
  Membro,
  'nome' | 'allergie' | 'intolleranze' | 'escludi_tracce' | 'restrizioni' | 'preferenze' | 'fattore_porzione' | 'attivo'
> & Partial<Pick<Membro, 'data_nascita' | 'sesso' | 'condizione' | 'porzione_automatica' | 'utente_id'>>;

export function salvaMembro(ctx: Ctx, dati: DatiMembro, id?: string): string {
  const membri = collezione(ctx.dati, 'membri');
  const esistente = id ? membri.get(id) : undefined;
  if (esistente) {
    modificaEntita(esistente, dati, ctx.membroId);
    return id!;
  }
  const nuovoId = id ?? uuidv7();
  inserisciEntita(membri, { id: nuovoId, ...dati }, ctx.membroId || nuovoId);
  return nuovoId;
}

export function eliminaMembro(ctx: Ctx, id: string): void {
  const m = entita(ctx, 'membri', id);
  if (m) eliminaEntita(m, ctx.membroId);
}

// ───────────── Inventario ─────────────

export interface NuovoArticolo {
  nome: string;
  ingrediente_id?: string;
  prodotto_id?: string;
  ricetta_id?: string;
  unita: UnitaCanonica;
  quantita: number;
  luogo: Luogo;
  data_scadenza?: DataLocale;
  tipo_scadenza?: TipoScadenza;
  conservare_fino?: DataLocale;
  data_preparazione?: DataLocale;
  stato_conservazione?: ArticoloInventario['stato_conservazione'];
  origine: OrigineArticolo;
  prezzo?: number;
}

/** Scadenza stimata dalla durata tipica dell'ingrediente, quando manca la data stampata. */
export function scadenzaStimata(ingredienteId: string | undefined, luogo: Luogo, da: DataLocale = oggi()): DataLocale | undefined {
  const ing = ingrediente(ingredienteId);
  if (!ing) return undefined;
  const giorni = luogo === 'freezer' && ing.luogo !== 'freezer' ? 90 : ing.giorni;
  return aggiungiGiorni(da, giorni);
}

export function aggiungiArticolo(ctx: Ctx, nuovo: NuovoArticolo): string {
  const id = uuidv7();
  const movimenti = new Y.Array<Movimento>();
  movimenti.push([{ delta: nuovo.quantita, unita: nuovo.unita, membro: ctx.membroId, il: adesso(), motivo: 'carico' }]);
  const { quantita, ...resto } = nuovo;
  const campi: Record<string, unknown> = { id, stato_conservazione: 'fresco', ...resto, movimenti };
  for (const k of Object.keys(campi)) if (campi[k] === undefined) delete campi[k];
  ctx.dati.transact(() => {
    inserisciEntita(collezione(ctx.dati, 'inventario'), campi as { id: string }, ctx.membroId);
    registraEvento(ctx, 'carico', {
      ingrediente_id: nuovo.ingrediente_id,
      prodotto_id: nuovo.prodotto_id,
      reparto: ingrediente(nuovo.ingrediente_id)?.reparto,
      quantita_g: pesoGrammi(quantita, nuovo.unita, nuovo.ingrediente_id),
      valore_eur: nuovo.prezzo,
    });
  });
  return id;
}

function aggiungiMovimento(ctx: Ctx, id: string, delta: number, motivo: Movimento['motivo']): void {
  const a = entita(ctx, 'inventario', id);
  const movimenti = a?.get('movimenti');
  if (!a || !(movimenti instanceof Y.Array)) return;
  ctx.dati.transact(() => {
    movimenti.push([{ delta, unita: a.get('unita') as UnitaCanonica, membro: ctx.membroId, il: adesso(), motivo }]);
    modificaEntita(a, {}, ctx.membroId);
  });
}

function quantitaArticolo(ctx: Ctx, id: string): number {
  const a = entita(ctx, 'inventario', id);
  if (!a) return 0;
  return quantitaDisponibile((a.toJSON() as ArticoloInventario).movimenti, a.get('unita') as UnitaCanonica);
}

export function consumaArticolo(ctx: Ctx, articolo: ArticoloInventario, quantita: number): void {
  const q = Math.min(quantita, quantitaArticolo(ctx, articolo.id));
  if (q <= 0) return;
  ctx.storico.transact(() => {
    aggiungiMovimento(ctx, articolo.id, -q, 'consumo');
    registraEvento(ctx, 'consumo', {
      ingrediente_id: articolo.ingrediente_id,
      prodotto_id: articolo.prodotto_id,
      reparto: ingrediente(articolo.ingrediente_id)?.reparto,
      quantita_g: pesoGrammi(q, articolo.unita, articolo.ingrediente_id),
    });
  });
}

export type MotivoSpreco = 'scaduto' | 'andato_a_male' | 'avanzato' | 'non_piaciuto' | 'altro';

export function buttaArticolo(ctx: Ctx, articolo: ArticoloInventario, motivo: MotivoSpreco): void {
  const q = quantitaArticolo(ctx, articolo.id);
  if (q <= 0) return;
  ctx.storico.transact(() => {
    aggiungiMovimento(ctx, articolo.id, -q, 'spreco');
    registraEvento(ctx, 'spreco', {
      ingrediente_id: articolo.ingrediente_id,
      prodotto_id: articolo.prodotto_id,
      reparto: ingrediente(articolo.ingrediente_id)?.reparto,
      quantita_g: pesoGrammi(q, articolo.unita, articolo.ingrediente_id),
      motivo,
    });
  });
}

export function correggiQuantita(ctx: Ctx, articolo: ArticoloInventario, nuova: number): void {
  const delta = nuova - quantitaArticolo(ctx, articolo.id);
  if (delta !== 0) aggiungiMovimento(ctx, articolo.id, delta, 'correzione');
}

export function modificaArticolo(ctx: Ctx, id: string, campi: Partial<ArticoloInventario>): void {
  const a = entita(ctx, 'inventario', id);
  if (a) modificaEntita(a, campi, ctx.membroId);
}

/** Aperto: per i deperibili il limite si accorcia (latte fresco 2 giorni, latticini 1–2, affettati 2). */
export function apriArticolo(ctx: Ctx, articolo: ArticoloInventario): void {
  const ing = ingrediente(articolo.ingrediente_id);
  const giorniAperto =
    ing?.reparto === 'latticini' || ing?.reparto === 'gastronomia' ? 2 : ing?.reparto === 'conserve' ? 3 : undefined;
  const limite = giorniAperto !== undefined ? aggiungiGiorni(oggi(), giorniAperto) : undefined;
  modificaArticolo(ctx, articolo.id, {
    stato_conservazione: 'aperto',
    data_apertura: oggi(),
    ...(limite && (!articolo.conservare_fino || limite < articolo.conservare_fino) ? { conservare_fino: limite } : {}),
  });
}

export function congelaArticolo(ctx: Ctx, articolo: ArticoloInventario): void {
  const cotto = articolo.stato_conservazione === 'cotto' || articolo.stato_conservazione === 'avanzato';
  modificaArticolo(ctx, articolo.id, {
    luogo: 'freezer',
    stato_conservazione: 'congelato',
    conservare_fino: aggiungiGiorni(oggi(), cotto ? REGOLA_FREEZER_COTTI.massimo : 90),
  });
  registraEvento(ctx, 'congelamento', { ingrediente_id: articolo.ingrediente_id, prodotto_id: articolo.prodotto_id });
}

/** Scongelato: 1 giorno in frigo, non ricongelabile. */
export function scongelaArticolo(ctx: Ctx, articolo: ArticoloInventario): void {
  modificaArticolo(ctx, articolo.id, {
    luogo: 'frigo',
    stato_conservazione: 'scongelato',
    conservare_fino: aggiungiGiorni(oggi(), REGOLA_SCONGELATO.massimo),
  });
}

export function eliminaArticolo(ctx: Ctx, id: string): void {
  const a = entita(ctx, 'inventario', id);
  if (a) eliminaEntita(a, ctx.membroId);
}

export function ripristinaArticolo(ctx: Ctx, id: string): void {
  const a = entita(ctx, 'inventario', id);
  if (a) ctx.dati.transact(() => a.delete('eliminato_il'));
}

// ───────────── Lista della spesa ─────────────

export interface NuovaOrigine {
  tipo: OrigineRigaLista;
  riferimento?: string;
  titolo?: string;
  quantita?: number;
  membri?: string[];
}

/** Aggiunge (o somma a) la riga di un ingrediente, oppure una riga a testo libero. */
export function aggiungiAllaLista(ctx: Ctx, voce: { ingrediente_id?: string; testo: string }, origine: NuovaOrigine): string {
  const id = voce.ingrediente_id ? idArticoloLista(voce.ingrediente_id) : idArticoloListaTesto(voce.testo);
  const lista = collezione(ctx.dati, 'liste');
  const nuovaOrigine = { membri: [], ...origine };
  const esistente = lista.get(id);
  if (esistente && !esistente.get('eliminato_il') && esistente.get('stato') === 'da_comprare') {
    const origini = [...((esistente.get('origini') as ArticoloLista['origini']) ?? [])];
    const stessa = origini.findIndex((o) => o.tipo === origine.tipo && o.riferimento === origine.riferimento);
    if (stessa >= 0) origini[stessa] = { ...origini[stessa]!, ...nuovaOrigine };
    else origini.push(nuovaOrigine);
    modificaEntita(esistente, { origini }, ctx.membroId);
    return id;
  }
  if (esistente) lista.delete(id);
  inserisciEntita(
    lista,
    { id, testo: voce.testo, ...(voce.ingrediente_id ? { ingrediente_id: voce.ingrediente_id } : {}), origini: [nuovaOrigine], stato: 'da_comprare' },
    ctx.membroId,
  );
  return id;
}

/**
 * Spunta "preso": carica l'articolo in inventario con scadenza stimata.
 * Restituisce la funzione che annulla entrambe le cose (Annulla per 6 secondi).
 */
export function spuntaRiga(ctx: Ctx, riga: ArticoloLista, quantita: number | undefined): () => void {
  const r = entita(ctx, 'liste', riga.id);
  if (!r) return () => {};
  const ing = ingrediente(riga.ingrediente_id);
  let articoloId: string | undefined;
  ctx.dati.transact(() => {
    modificaEntita(r, { stato: 'preso', modo_spunta: 'manuale' }, ctx.membroId);
    if (ing) {
      const q = quantita && quantita > 0 ? arrotonda(quantita, ing.unita) : (ing.formato ?? (ing.unita === 'pz' ? 1 : 500));
      articoloId = aggiungiArticolo(ctx, {
        nome: ing.nome,
        ingrediente_id: ing.id,
        unita: ing.unita,
        quantita: q,
        luogo: ing.luogo,
        data_scadenza: scadenzaStimata(ing.id, ing.luogo),
        tipo_scadenza: 'stimata',
        origine: 'manuale',
      });
    }
  });
  return () => {
    ctx.dati.transact(() => {
      modificaEntita(r, { stato: 'da_comprare' }, ctx.membroId);
      if (articoloId) collezione(ctx.dati, 'inventario').delete(articoloId);
    });
  };
}

export function rimettiDaComprare(ctx: Ctx, id: string): void {
  const r = entita(ctx, 'liste', id);
  if (r) modificaEntita(r, { stato: 'da_comprare' }, ctx.membroId);
}

export function rimuoviRiga(ctx: Ctx, id: string): void {
  const r = entita(ctx, 'liste', id);
  if (r) eliminaEntita(r, ctx.membroId);
}

export function svuotaPresi(ctx: Ctx, righe: readonly ArticoloLista[]): void {
  ctx.dati.transact(() => {
    for (const riga of righe) if (riga.stato === 'preso') rimuoviRiga(ctx, riga.id);
  });
}

/** "Aggiungi i mancanti alla lista" dalla scheda di una ricetta, già scalati sui presenti. */
export function aggiungiMancanti(ctx: Ctx, suggerimento: Suggerimento, membri: string[]): number {
  let aggiunti = 0;
  ctx.dati.transact(() => {
    for (const m of suggerimento.mancanti) {
      const ing = ingrediente(m.riga.ingrediente_id);
      if (!ing) continue;
      aggiungiAllaLista(
        ctx,
        { ingrediente_id: ing.id, testo: ing.nome },
        { tipo: 'ricetta', riferimento: suggerimento.ricetta.id, titolo: suggerimento.ricetta.titolo, quantita: m.richiesto, membri },
      );
      aggiunti++;
    }
  });
  return aggiunti;
}

// ───────────── Ricette ─────────────

export function salvaRicettaPersonale(ctx: Ctx, ricetta: Omit<Ricetta, 'id' | 'origine'> & { id?: string }): string {
  const ricette = collezione(ctx.dati, 'ricette');
  const id = ricetta.id ?? uuidv7();
  const { id: _ignorato, ...campi } = ricetta;
  void _ignorato;
  const esistente = ricette.get(id);
  if (esistente) modificaEntita(esistente, { ...campi, origine: 'personale' }, ctx.membroId);
  else inserisciEntita(ricette, { id, ...campi, origine: 'personale' }, ctx.membroId);
  return id;
}

export function eliminaRicetta(ctx: Ctx, id: string): void {
  const r = entita(ctx, 'ricette', id);
  if (r) eliminaEntita(r, ctx.membroId);
}

export function impostaPreferita(ctx: Ctx, ricettaId: string, preferita: boolean): void {
  const meta = collezione(ctx.dati, 'ricette_meta');
  const id = idRicettaMeta(ricettaId);
  const esistente = meta.get(id);
  if (esistente) modificaEntita(esistente, { preferita }, ctx.membroId);
  else inserisciEntita(meta, { id, ricetta_id: ricettaId, preferita }, ctx.membroId);
}

export interface Cottura {
  suggerimento: Suggerimento;
  /** Porzioni avanzate da conservare (0 = nessun avanzo). */
  porzioniAvanzate: number;
  luogoAvanzo: 'frigo' | 'freezer';
  /** Giorni scelti dall'utente, mai oltre il massimo della regola. */
  giorniAvanzo: number;
}

/**
 * "Ho cucinato": scarica gli ingredienti usati, prima quelli che scadono prima (FEFO),
 * registra preparazione e consumi e, se resta qualcosa, crea l'avanzo con limite bloccato.
 */
export function hoCucinato(ctx: Ctx, articoli: readonly ArticoloInventario[], cottura: Cottura): void {
  const { suggerimento } = cottura;
  const ricetta = suggerimento.ricetta;
  const regola = regolaConservazione(ricetta.categoria_conservazione);
  ctx.dati.transact(() => {
    ctx.storico.transact(() => {
      for (const riga of suggerimento.righe) {
        const ing = ingrediente(riga.riga.ingrediente_id);
        if (!ing || ing.base || riga.richiesto <= 0) continue;
        let daScaricare = riga.richiesto;
        const candidati = articoli
          .filter((a) => !a.eliminato_il && a.ingrediente_id && (a.ingrediente_id === ing.id || ingrediente(a.ingrediente_id)?.genitore === ing.id))
          .map((a) => ({ a, q: quantitaDisponibile(a.movimenti, a.unita), s: a.conservare_fino ?? a.data_scadenza ?? '9999' }))
          .filter((x) => x.q > 0)
          .sort((x, y) => x.s.localeCompare(y.s));
        for (const { a, q } of candidati) {
          if (daScaricare <= 0) break;
          const usa = Math.min(q, daScaricare);
          consumaArticolo(ctx, a, usa);
          daScaricare -= usa;
        }
      }
      registraEvento(ctx, 'preparazione', { motivo: ricetta.id });
      if (cottura.porzioniAvanzate > 0) {
        const inFreezer = cottura.luogoAvanzo === 'freezer';
        const giorni = inFreezer ? REGOLA_FREEZER_COTTI.consigliati : Math.min(cottura.giorniAvanzo, regola.massimo);
        aggiungiArticolo(ctx, {
          nome: ricetta.titolo,
          ricetta_id: ricetta.id,
          unita: 'pz',
          quantita: cottura.porzioniAvanzate,
          luogo: cottura.luogoAvanzo,
          stato_conservazione: inFreezer ? 'congelato' : 'avanzato',
          data_preparazione: oggi(),
          conservare_fino: aggiungiGiorni(oggi(), giorni),
          origine: 'ricetta',
        });
      }
    });
  });
}

// ───────── Scontrino ─────────

export interface RigaConfermata {
  ingrediente_id: string;
  nome: string;
  quantita: number;
  prezzo: number;
}

/**
 * Conferma di uno scontrino: carica gli articoli, spunta le righe corrispondenti della lista
 * e registra l'acquisto nello storico. La foto non viene mai salvata.
 */
export function caricaScontrino(ctx: Ctx, righe: readonly RigaConfermata[], negozio: string | undefined, totale: number | undefined): number {
  let spuntate = 0;
  const acquistoId = uuidv7();
  ctx.dati.transact(() => {
    const lista = collezione(ctx.dati, 'liste');
    for (const r of righe) {
      const ing = ingrediente(r.ingrediente_id);
      if (!ing) continue;
      const id = aggiungiArticolo(ctx, {
        nome: r.nome,
        ingrediente_id: ing.id,
        unita: ing.unita,
        quantita: r.quantita,
        luogo: ing.luogo,
        data_scadenza: scadenzaStimata(ing.id, ing.luogo),
        tipo_scadenza: 'stimata',
        origine: 'scontrino',
        prezzo: r.prezzo,
      });
      modificaArticolo(ctx, id, { acquisto_id: acquistoId });
      // Spunta automatica: stesso ingrediente, poi ingrediente "padre" (spaghetti → pasta).
      for (const candidato of [ing.id, ing.genitore].filter(Boolean) as string[]) {
        const riga = lista.get(idArticoloLista(candidato));
        if (riga && !riga.get('eliminato_il') && riga.get('stato') === 'da_comprare') {
          modificaEntita(riga, { stato: 'preso', modo_spunta: 'scontrino', prezzo_pagato: r.prezzo }, ctx.membroId);
          spuntate++;
          break;
        }
      }
    }
    registraEvento(ctx, 'acquisto', {
      valore_eur: totale ?? righe.reduce((s, r) => s + r.prezzo, 0),
      motivo: negozio,
      prodotto_id: acquistoId,
    });
  });
  return spuntate;
}

/** Le correzioni dell'utente diventano alias del nucleo (testo normalizzato → ingrediente). */
export function salvaAlias(ctx: Ctx, testo: string, ingredienteId: string): void {
  const impostazioni = collezione(ctx.dati, 'impostazioni');
  const esistente = impostazioni.get('alias');
  const mappa = { ...((esistente?.get('mappa') as Record<string, string> | undefined) ?? {}), [testo]: ingredienteId };
  if (esistente) modificaEntita(esistente, { mappa }, ctx.membroId);
  else inserisciEntita(impostazioni, { id: 'alias', mappa }, ctx.membroId);
}

// ───────────── Cestino ─────────────

/** Le collezioni che si possono recuperare dal cestino. */
export const COLLEZIONI_CESTINO = ['inventario', 'ricette', 'membri'] as const;
export type CollezioneCestino = (typeof COLLEZIONI_CESTINO)[number];
export const GIORNI_CESTINO = 30;

export function ripristinaDalCestino(ctx: Ctx, nome: CollezioneCestino, id: string): void {
  const e = entita(ctx, nome, id);
  if (e) modificaEntita(e, { eliminato_il: undefined }, ctx.membroId);
}

export function eliminaDefinitivamente(ctx: Ctx, nome: CollezioneCestino, id: string): void {
  const coll = collezione(ctx.dati, nome);
  if (coll.get(id)?.get('eliminato_il')) coll.delete(id);
}

/** Toglie per sempre quello che è nel cestino da più di 30 giorni; restituisce quanti elementi. */
export function svuotaCestinoScaduto(ctx: Pick<Ctx, 'dati'>, adesso = new Date()): number {
  const limite = new Date(adesso.getTime() - GIORNI_CESTINO * 86_400_000).toISOString();
  let tolti = 0;
  ctx.dati.transact(() => {
    for (const nome of [...COLLEZIONI_CESTINO, 'liste'] as const) {
      const coll = collezione(ctx.dati, nome);
      for (const [id, e] of [...coll.entries()]) {
        const il = e.get('eliminato_il');
        if (typeof il === 'string' && il < limite) {
          coll.delete(id);
          tolti++;
        }
      }
    }
  });
  return tolti;
}
