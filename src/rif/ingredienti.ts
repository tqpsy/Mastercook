/**
 * Tassonomia degli ingredienti generici (`ing:<slug>`), versione 3.
 *
 * È la chiave comune tra inventario, lista della spesa e ricette: "Latte Granarolo 1 l"
 * e "Latte Parmalat" sono prodotti diversi ma lo stesso ingrediente `ing:latte`.
 * - giorni: durata indicativa da chiuso, usata per la scadenza stimata quando manca la data;
 * - formato: confezione tipica nell'unità dell'ingrediente;
 * - allergeni: quelli che l'ingrediente contiene sempre o quasi (per i prodotti reali valgono quelli in etichetta);
 * - classi: servono al filtro delle restrizioni (vegetariano, vegano, senza maiale, senza alcol);
 * - genitore: un articolo di "spaghetti" conta anche come "pasta" nelle ricette;
 * - sottocategoria: il gruppo dentro il reparto ("Formaggi freschi", "Molluschi"…), per sfogliare il catalogo.
 *
 * Gli slug non si tolgono e non si rinominano mai: sono salvati negli articoli, nelle liste e nelle ricette.
 * Quando una voce è troppo generica si crea una voce nuova più precisa e, se in cucina la sostituisce,
 * le si dà come genitore la voce di prima (il grana vale come parmigiano, le mazzancolle come gamberi).
 */
import type { Allergene } from '../dominio/allergeni';
import type { GruppoAlimentare } from '../dominio/dieta';
import type { Luogo, UnitaCanonica } from '../dominio/tipi';
import type { Reparto } from './reparti';

export type ClasseIngrediente = 'carne' | 'maiale' | 'pesce' | 'latticini' | 'uova' | 'miele' | 'alcol';

export interface Ingrediente {
  id: string;
  nome: string;
  sinonimi: string[];
  reparto: Reparto;
  unita: UnitaCanonica;
  luogo: Luogo;
  giorni: number;
  allergeni: Allergene[];
  classi: ClasseIngrediente[];
  formato?: number;
  /** Peso medio di un pezzo in grammi, per mostrare "2 pz" invece di "360 g". */
  peso_pz?: number;
  genitore?: string;
  /** Dispensa di base, presunta sempre presente (sale, pepe, olio, aceto, acqua). */
  base?: boolean;
  /** Mesi di stagione (1–12), solo per frutta e verdura. */
  mesi?: number[];
  /** Gruppo dentro il reparto, per sfogliare il catalogo. */
  sottocategoria?: string;
  /** Gruppo alimentare per la dieta, quando non si ricava dal reparto. */
  dieta?: GruppoAlimentare;
}

type Extra = Partial<Omit<Ingrediente, 'id' | 'nome' | 'reparto' | 'unita' | 'luogo' | 'giorni'>>;

function i(slug: string, nome: string, reparto: Reparto, unita: UnitaCanonica, luogo: Luogo, giorni: number, extra: Extra = {}): Ingrediente {
  return {
    id: `ing:${slug}`,
    nome,
    reparto,
    unita,
    luogo,
    giorni,
    sinonimi: extra.sinonimi ?? [],
    allergeni: extra.allergeni ?? [],
    classi: extra.classi ?? [],
    ...extra,
    ...(extra.genitore ? { genitore: `ing:${extra.genitore}` } : {}),
  };
}

/** Un gruppo di voci della stessa sottocategoria, con il gruppo alimentare comune (se c'è). */
function sezione(sottocategoria: string, dieta: GruppoAlimentare | undefined, voci: Ingrediente[]): Ingrediente[] {
  return voci.map((v) => ({ ...v, sottocategoria, ...(dieta && !v.dieta ? { dieta } : {}) }));
}

// Scorciatoie per classi e allergeni ricorrenti.
const formaggio = (x: Extra = {}): Extra => ({ classi: ['latticini'], allergeni: ['latte'], ...x });
const pesce = (x: Extra = {}): Extra => ({ classi: ['pesce'], allergeni: ['pesce'], ...x });
const crostaceo = (x: Extra = {}): Extra => ({ classi: ['pesce'], allergeni: ['crostacei'], ...x });
const mollusco = (x: Extra = {}): Extra => ({ classi: ['pesce'], allergeni: ['molluschi'], ...x });
const carne = (x: Extra = {}): Extra => ({ classi: ['carne'], ...x });
const maiale = (x: Extra = {}): Extra => ({ classi: ['carne', 'maiale'], ...x });
const glutine = (x: Extra = {}): Extra => ({ allergeni: ['glutine'], ...x });

const TUTTO_ANNO = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const ESTATE = [6, 7, 8, 9];
const AUTUNNO_INVERNO = [10, 11, 12, 1, 2, 3];
const PRIMAVERA = [3, 4, 5, 6];

export const INGREDIENTI: Ingrediente[] = [
  // ───────── Frutta e verdura ─────────
  ...sezione('Ortaggi', 'verdura', [
    i('pomodoro', 'Pomodori', 'frutta_verdura', 'g', 'dispensa', 5, { peso_pz: 120, sinonimi: ['pomodoro', 'pomodori ramati', 'pomodori insalata', 'cuore di bue', 'pomodori san marzano'], mesi: ESTATE }),
    i('pomodorini', 'Pomodorini', 'frutta_verdura', 'g', 'frigo', 6, { formato: 250, sinonimi: ['ciliegini', 'datterini', 'pachino', 'pomodori ciliegia'], mesi: [5, 6, 7, 8, 9] }),
    i('cipolla', 'Cipolle', 'frutta_verdura', 'g', 'dispensa', 30, { peso_pz: 150, formato: 1000, sinonimi: ['cipolla', 'cipolle dorate', 'cipolle rosse', 'cipolle bianche'], mesi: TUTTO_ANNO }),
    i('cipollotto', 'Cipollotti', 'frutta_verdura', 'g', 'frigo', 7, { peso_pz: 30, formato: 150, sinonimi: ['cipollotto', 'cipolla di tropea', 'cipolla verde'], mesi: TUTTO_ANNO }),
    i('scalogno', 'Scalogno', 'frutta_verdura', 'g', 'dispensa', 30, { peso_pz: 25, formato: 200, sinonimi: ['scalogni'], mesi: TUTTO_ANNO }),
    i('aglio', 'Aglio', 'frutta_verdura', 'g', 'dispensa', 60, { peso_pz: 5, formato: 50, sinonimi: ['spicchio aglio', 'testa di aglio'], mesi: TUTTO_ANNO }),
    i('carota', 'Carote', 'frutta_verdura', 'g', 'frigo', 21, { peso_pz: 80, formato: 1000, sinonimi: ['carote'], mesi: TUTTO_ANNO }),
    i('sedano', 'Sedano', 'frutta_verdura', 'g', 'frigo', 14, { formato: 500, allergeni: ['sedano'], sinonimi: ['sedano verde', 'coste di sedano'], mesi: TUTTO_ANNO }),
    i('sedano_rapa', 'Sedano rapa', 'frutta_verdura', 'g', 'frigo', 21, { peso_pz: 600, allergeni: ['sedano'], sinonimi: ['sedano di verona'], mesi: AUTUNNO_INVERNO }),
    i('zucchina', 'Zucchine', 'frutta_verdura', 'g', 'frigo', 7, { peso_pz: 200, formato: 500, sinonimi: ['zucchine', 'zucchina', 'zucchine romanesche'], mesi: [5, 6, 7, 8, 9] }),
    i('fiori_zucca', 'Fiori di zucca', 'frutta_verdura', 'g', 'frigo', 2, { formato: 100, sinonimi: ['fiori di zucchina'], mesi: [5, 6, 7, 8] }),
    i('melanzana', 'Melanzane', 'frutta_verdura', 'g', 'frigo', 7, { peso_pz: 300, sinonimi: ['melanzane', 'melanzana viola', 'melanzana tonda'], mesi: ESTATE }),
    i('peperone', 'Peperoni', 'frutta_verdura', 'g', 'frigo', 7, { peso_pz: 200, sinonimi: ['peperoni', 'peperoni rossi', 'peperoni gialli', 'peperoni verdi', 'friggitelli'], mesi: ESTATE }),
    i('cetriolo', 'Cetrioli', 'frutta_verdura', 'g', 'frigo', 7, { peso_pz: 250, sinonimi: ['cetriolo'], mesi: ESTATE }),
    i('finocchio', 'Finocchi', 'frutta_verdura', 'g', 'frigo', 10, { peso_pz: 300, sinonimi: ['finocchio'], mesi: AUTUNNO_INVERNO }),
    i('carciofo', 'Carciofi', 'frutta_verdura', 'g', 'frigo', 5, { peso_pz: 200, sinonimi: ['carciofo', 'carciofi romaneschi', 'mammole'], mesi: [11, 12, 1, 2, 3, 4] }),
    i('porro', 'Porri', 'frutta_verdura', 'g', 'frigo', 10, { peso_pz: 200, sinonimi: ['porro'], mesi: AUTUNNO_INVERNO }),
    i('zucca', 'Zucca', 'frutta_verdura', 'g', 'dispensa', 30, { formato: 1000, sinonimi: ['zucca delica', 'zucca mantovana', 'zucca butternut'], mesi: [9, 10, 11, 12, 1] }),
    i('fagiolini', 'Fagiolini', 'frutta_verdura', 'g', 'frigo', 5, { formato: 500, sinonimi: ['fagiolini verdi'], mesi: [5, 6, 7, 8, 9] }),
    i('taccole', 'Taccole', 'frutta_verdura', 'g', 'frigo', 4, { formato: 250, sinonimi: ['piselli mangiatutto', 'fagiolini piatti'], mesi: [4, 5, 6] }),
    i('piselli_freschi', 'Piselli freschi', 'frutta_verdura', 'g', 'frigo', 3, { formato: 500, genitore: 'piselli', sinonimi: ['piselli in baccello'], mesi: [4, 5, 6] }),
    i('fave', 'Fave fresche', 'frutta_verdura', 'g', 'frigo', 4, { formato: 1000, sinonimi: ['fave'], mesi: [4, 5, 6] }),
    i('asparagi', 'Asparagi', 'frutta_verdura', 'g', 'frigo', 4, { formato: 500, sinonimi: ['asparago', 'asparagi verdi', 'asparagi bianchi'], mesi: PRIMAVERA }),
    i('barbabietola', 'Barbabietole', 'frutta_verdura', 'g', 'frigo', 7, { formato: 500, sinonimi: ['barbabietola', 'barbabietole cotte', 'rape rosse'], mesi: TUTTO_ANNO }),
    i('ravanelli', 'Ravanelli', 'frutta_verdura', 'g', 'frigo', 7, { formato: 200, sinonimi: ['ravanello', 'rapanelli'], mesi: [3, 4, 5, 6, 7] }),
    i('rapa', 'Rape', 'frutta_verdura', 'g', 'frigo', 14, { peso_pz: 200, sinonimi: ['rapa', 'rape bianche'], mesi: AUTUNNO_INVERNO }),
    i('mais_pannocchia', 'Pannocchie di mais', 'frutta_verdura', 'g', 'frigo', 3, { peso_pz: 250, genitore: 'mais', sinonimi: ['pannocchia', 'mais fresco'], mesi: [7, 8, 9] }),
    i('avocado', 'Avocado', 'frutta_verdura', 'g', 'dispensa', 5, { peso_pz: 200, mesi: TUTTO_ANNO }),
  ]),
  ...sezione('Insalate e verdure a foglia', 'verdura', [
    i('insalata', 'Insalata', 'frutta_verdura', 'g', 'frigo', 5, { formato: 250, sinonimi: ['lattuga', 'iceberg', 'misticanza', 'insalata in busta', 'lattuga romana', 'gentilina', 'trocadero'], mesi: TUTTO_ANNO }),
    i('rucola', 'Rucola', 'frutta_verdura', 'g', 'frigo', 4, { formato: 125, sinonimi: ['rughetta'], mesi: TUTTO_ANNO }),
    i('valeriana', 'Valeriana', 'frutta_verdura', 'g', 'frigo', 4, { formato: 125, sinonimi: ['songino', 'soncino', 'dolcetta'], mesi: TUTTO_ANNO }),
    i('spinaci', 'Spinaci', 'frutta_verdura', 'g', 'frigo', 4, { formato: 500, sinonimi: ['spinacino', 'spinaci freschi'], mesi: [10, 11, 12, 1, 2, 3, 4] }),
    i('radicchio', 'Radicchio', 'frutta_verdura', 'g', 'frigo', 7, { peso_pz: 250, sinonimi: ['radicchio trevisano', 'radicchio di chioggia', 'radicchio tardivo'], mesi: [10, 11, 12, 1, 2, 3] }),
    i('indivia', 'Indivia e scarola', 'frutta_verdura', 'g', 'frigo', 5, { peso_pz: 400, sinonimi: ['indivia', 'scarola', 'riccia', 'indivia belga'], mesi: AUTUNNO_INVERNO }),
    i('cicoria', 'Cicoria', 'frutta_verdura', 'g', 'frigo', 4, { formato: 500, sinonimi: ['catalogna', 'puntarelle', 'cicoria di campo'], mesi: AUTUNNO_INVERNO }),
    i('bietole', 'Bietole', 'frutta_verdura', 'g', 'frigo', 4, { formato: 500, sinonimi: ['bieta', 'erbette', 'coste'], mesi: TUTTO_ANNO }),
    i('cime_rapa', 'Cime di rapa', 'frutta_verdura', 'g', 'frigo', 4, { formato: 500, sinonimi: ['broccoletti', 'friarielli'], mesi: [11, 12, 1, 2, 3] }),
    i('pak_choi', 'Pak choi', 'frutta_verdura', 'g', 'frigo', 5, { formato: 300, sinonimi: ['cavolo cinese', 'bok choy'], mesi: TUTTO_ANNO }),
    i('germogli_soia', 'Germogli di soia', 'frutta_verdura', 'g', 'frigo', 3, { formato: 200, allergeni: ['soia'], sinonimi: ['germogli'] }),
  ]),
  ...sezione('Cavoli', 'verdura', [
    i('broccoli', 'Broccoli', 'frutta_verdura', 'g', 'frigo', 5, { peso_pz: 400, sinonimi: ['broccolo', 'cime di broccolo'], mesi: AUTUNNO_INVERNO }),
    i('cavolfiore', 'Cavolfiore', 'frutta_verdura', 'g', 'frigo', 7, { peso_pz: 800, sinonimi: ['cavolfiore viola'], mesi: AUTUNNO_INVERNO }),
    i('romanesco', 'Broccolo romanesco', 'frutta_verdura', 'g', 'frigo', 7, { peso_pz: 700, sinonimi: ['romanesco', 'cavolo romanesco'], mesi: AUTUNNO_INVERNO }),
    i('verza', 'Verza', 'frutta_verdura', 'g', 'frigo', 10, { peso_pz: 1000, sinonimi: ['cavolo verza'], mesi: AUTUNNO_INVERNO }),
    i('cavolo_cappuccio', 'Cavolo cappuccio', 'frutta_verdura', 'g', 'frigo', 21, { peso_pz: 1000, sinonimi: ['cappuccio', 'cavolo rosso', 'cavolo bianco'], mesi: AUTUNNO_INVERNO }),
    i('cavolo_nero', 'Cavolo nero', 'frutta_verdura', 'g', 'frigo', 5, { formato: 300, sinonimi: ['cavolo toscano'], mesi: AUTUNNO_INVERNO }),
    i('cavolini_bruxelles', 'Cavolini di Bruxelles', 'frutta_verdura', 'g', 'frigo', 7, { formato: 500, sinonimi: ['cavoletti di bruxelles'], mesi: [10, 11, 12, 1, 2] }),
  ]),
  ...sezione('Patate e tuberi', 'patate', [
    i('patata', 'Patate', 'frutta_verdura', 'g', 'dispensa', 30, { peso_pz: 180, formato: 1500, sinonimi: ['patate', 'patate gialle', 'patate novelle', 'patate rosse'], mesi: TUTTO_ANNO }),
    i('patata_dolce', 'Patate dolci', 'frutta_verdura', 'g', 'dispensa', 21, { peso_pz: 300, sinonimi: ['patata americana', 'batata'], mesi: [9, 10, 11, 12] }),
    i('topinambur', 'Topinambur', 'frutta_verdura', 'g', 'frigo', 10, { formato: 500, mesi: [10, 11, 12, 1, 2, 3] }),
  ]),
  ...sezione('Funghi', 'verdura', [
    i('funghi', 'Funghi champignon', 'frutta_verdura', 'g', 'frigo', 4, { formato: 400, sinonimi: ['funghi', 'champignon', 'prataioli', 'funghi coltivati'], mesi: TUTTO_ANNO }),
    i('porcini', 'Funghi porcini', 'frutta_verdura', 'g', 'frigo', 3, { formato: 300, genitore: 'funghi', sinonimi: ['porcini', 'porcino'], mesi: [8, 9, 10, 11] }),
    i('funghi_misti', 'Funghi misti', 'frutta_verdura', 'g', 'frigo', 3, { formato: 300, genitore: 'funghi', sinonimi: ['finferli', 'gallinacci', 'chiodini', 'pleurotus', 'funghi cardoncelli', 'shiitake'], mesi: [9, 10, 11] }),
  ]),
  ...sezione('Erbe aromatiche', undefined, [
    i('basilico', 'Basilico', 'frutta_verdura', 'g', 'frigo', 5, { formato: 20, sinonimi: ['basilico fresco', 'piantina di basilico'], mesi: TUTTO_ANNO }),
    i('prezzemolo', 'Prezzemolo', 'frutta_verdura', 'g', 'frigo', 7, { formato: 30, sinonimi: ['prezzemolo fresco'], mesi: TUTTO_ANNO }),
    i('rosmarino', 'Rosmarino', 'frutta_verdura', 'g', 'frigo', 10, { formato: 20, mesi: TUTTO_ANNO }),
    i('salvia', 'Salvia', 'frutta_verdura', 'g', 'frigo', 7, { formato: 20, mesi: TUTTO_ANNO }),
    i('menta', 'Menta', 'frutta_verdura', 'g', 'frigo', 5, { formato: 20, mesi: TUTTO_ANNO }),
    i('aneto', 'Aneto', 'frutta_verdura', 'g', 'frigo', 5, { formato: 20, mesi: TUTTO_ANNO }),
    i('coriandolo', 'Coriandolo fresco', 'frutta_verdura', 'g', 'frigo', 5, { formato: 30, sinonimi: ['coriandolo'], mesi: TUTTO_ANNO }),
    i('erba_cipollina', 'Erba cipollina', 'frutta_verdura', 'g', 'frigo', 5, { formato: 20, mesi: TUTTO_ANNO }),
    i('maggiorana', 'Maggiorana', 'frutta_verdura', 'g', 'frigo', 5, { formato: 20, mesi: TUTTO_ANNO }),
    i('zenzero', 'Zenzero fresco', 'frutta_verdura', 'g', 'frigo', 21, { formato: 100, sinonimi: ['zenzero', 'radice di zenzero'], mesi: TUTTO_ANNO }),
  ]),
  ...sezione('Frutta', 'frutta', [
    i('mela', 'Mele', 'frutta_verdura', 'g', 'frigo', 30, { peso_pz: 180, formato: 1000, sinonimi: ['mela', 'golden', 'fuji', 'renetta', 'gala', 'pink lady', 'granny smith', 'melinda'], mesi: [8, 9, 10, 11, 12, 1, 2, 3, 4] }),
    i('pera', 'Pere', 'frutta_verdura', 'g', 'frigo', 10, { peso_pz: 180, sinonimi: ['pera', 'pere williams', 'pere abate', 'pere kaiser'], mesi: [8, 9, 10, 11, 12, 1] }),
    i('banana', 'Banane', 'frutta_verdura', 'g', 'dispensa', 5, { peso_pz: 150, formato: 1000, sinonimi: ['banana'], mesi: TUTTO_ANNO }),
    i('pesca', 'Pesche', 'frutta_verdura', 'g', 'frigo', 5, { peso_pz: 150, sinonimi: ['pesca', 'pesche noci', 'nettarine', 'percoche', 'tabacchiere'], mesi: ESTATE }),
    i('albicocca', 'Albicocche', 'frutta_verdura', 'g', 'frigo', 4, { peso_pz: 50, formato: 500, sinonimi: ['albicocca'], mesi: [6, 7] }),
    i('susine', 'Susine', 'frutta_verdura', 'g', 'frigo', 5, { peso_pz: 50, formato: 500, sinonimi: ['prugne', 'prugna', 'susina'], mesi: [7, 8, 9] }),
    i('ciliegie', 'Ciliegie', 'frutta_verdura', 'g', 'frigo', 4, { formato: 500, sinonimi: ['ciliegia', 'duroni'], mesi: [5, 6, 7] }),
    i('fragole', 'Fragole', 'frutta_verdura', 'g', 'frigo', 3, { formato: 250, sinonimi: ['fragola'], mesi: [4, 5, 6] }),
    i('frutti_bosco', 'Frutti di bosco', 'frutta_verdura', 'g', 'frigo', 3, { formato: 125, sinonimi: ['mirtilli', 'lamponi', 'more', 'ribes'], mesi: [6, 7, 8, 9] }),
    i('uva', 'Uva', 'frutta_verdura', 'g', 'frigo', 7, { formato: 1000, sinonimi: ['uva bianca', 'uva nera', 'uva italia'], mesi: [8, 9, 10] }),
    i('anguria', 'Anguria', 'frutta_verdura', 'g', 'dispensa', 7, { peso_pz: 5000, sinonimi: ['cocomero'], mesi: [6, 7, 8] }),
    i('melone', 'Melone', 'frutta_verdura', 'g', 'dispensa', 5, { peso_pz: 1500, sinonimi: ['melone retato', 'melone giallo'], mesi: [6, 7, 8, 9] }),
    i('fichi', 'Fichi', 'frutta_verdura', 'g', 'frigo', 3, { formato: 500, sinonimi: ['fico', 'fichi freschi'], mesi: [7, 8, 9] }),
    i('cachi', 'Cachi', 'frutta_verdura', 'g', 'dispensa', 7, { peso_pz: 200, sinonimi: ['kaki', 'loti'], mesi: [10, 11, 12] }),
    i('melograno', 'Melograno', 'frutta_verdura', 'g', 'dispensa', 21, { peso_pz: 300, sinonimi: ['melagrana'], mesi: [10, 11, 12] }),
    i('arancia', 'Arance', 'frutta_verdura', 'g', 'frigo', 21, { peso_pz: 200, formato: 2000, sinonimi: ['arancia', 'arance tarocco', 'arance navel', 'arance rosse', 'arance da spremuta'], mesi: [11, 12, 1, 2, 3, 4] }),
    i('mandarino', 'Mandarini', 'frutta_verdura', 'g', 'frigo', 14, { peso_pz: 80, formato: 1000, sinonimi: ['mandarino', 'clementine', 'clementina', 'mandaranci'], mesi: [11, 12, 1, 2] }),
    i('pompelmo', 'Pompelmi', 'frutta_verdura', 'g', 'frigo', 21, { peso_pz: 350, sinonimi: ['pompelmo'], mesi: [11, 12, 1, 2, 3, 4] }),
    i('limone', 'Limoni', 'frutta_verdura', 'g', 'frigo', 21, { peso_pz: 120, formato: 500, sinonimi: ['limone'], mesi: TUTTO_ANNO }),
    i('lime', 'Lime', 'frutta_verdura', 'g', 'frigo', 21, { peso_pz: 70, mesi: TUTTO_ANNO }),
    i('kiwi', 'Kiwi', 'frutta_verdura', 'g', 'frigo', 14, { peso_pz: 80, formato: 500, mesi: [11, 12, 1, 2, 3, 4] }),
    i('ananas', 'Ananas', 'frutta_verdura', 'g', 'dispensa', 5, { peso_pz: 1500, mesi: TUTTO_ANNO }),
    i('mango', 'Mango', 'frutta_verdura', 'g', 'dispensa', 5, { peso_pz: 350, mesi: TUTTO_ANNO }),
    i('castagne', 'Castagne', 'frutta_verdura', 'g', 'dispensa', 14, { formato: 500, sinonimi: ['marroni', 'caldarroste'], mesi: [10, 11, 12] }),
  ]),

  // ───────── Pane e forno ─────────
  ...sezione('Pane', 'pane', [
    i('pane', 'Pane', 'pane_forno', 'g', 'dispensa', 2, glutine({ formato: 500, sinonimi: ['pagnotta', 'filone', 'rosetta', 'baguette', 'michetta', 'ciabatta', 'pane casereccio', 'pane fresco'] })),
    i('pane_integrale', 'Pane integrale', 'pane_forno', 'g', 'dispensa', 3, glutine({ formato: 500, genitore: 'pane', sinonimi: ['pane ai cereali', 'pane di segale', 'pane multicereali'] })),
    i('pancarre', 'Pancarrè', 'pane_forno', 'g', 'dispensa', 10, glutine({ formato: 400, sinonimi: ['pan carre', 'pane in cassetta', 'pane per tramezzini', 'pan bauletto'] })),
    i('pane_grattugiato', 'Pangrattato', 'pane_forno', 'g', 'dispensa', 180, glutine({ formato: 500, sinonimi: ['pane grattugiato'] })),
    i('panko', 'Panko', 'pane_forno', 'g', 'dispensa', 180, glutine({ formato: 200, sinonimi: ['pangrattato giapponese'] })),
    i('pita', 'Pane pita', 'pane_forno', 'g', 'dispensa', 5, glutine({ formato: 300, sinonimi: ['pita', 'pane arabo'] })),
    i('piadina', 'Piadine', 'pane_forno', 'g', 'dispensa', 30, glutine({ formato: 400, sinonimi: ['piadina', 'piadina romagnola'] })),
    i('tortillas', 'Tortillas', 'pane_forno', 'g', 'dispensa', 30, glutine({ formato: 320, sinonimi: ['tortilla', 'wrap', 'piadelle'] })),
    i('focaccia', 'Focaccia', 'pane_forno', 'g', 'dispensa', 2, glutine({ formato: 300, sinonimi: ['focaccia genovese', 'schiacciata', 'pizza bianca'] })),
  ]),
  ...sezione('Sostituti del pane', 'pane', [
    i('grissini', 'Grissini', 'pane_forno', 'g', 'dispensa', 180, glutine({ formato: 250, sinonimi: ['grissino', 'stirati'] })),
    i('crackers', 'Crackers', 'pane_forno', 'g', 'dispensa', 180, glutine({ formato: 500, sinonimi: ['cracker', 'salatini'] })),
    i('taralli', 'Taralli', 'pane_forno', 'g', 'dispensa', 180, glutine({ formato: 250, sinonimi: ['tarallini'] })),
    i('friselle', 'Friselle', 'pane_forno', 'g', 'dispensa', 180, glutine({ formato: 500, sinonimi: ['frisa', 'frise'] })),
    i('gallette', 'Gallette di riso', 'pane_forno', 'g', 'dispensa', 180, { formato: 130, sinonimi: ['gallette', 'gallette di mais'] }),
  ]),
  ...sezione('Impasti pronti', 'cereali', [
    i('pasta_sfoglia', 'Pasta sfoglia', 'pane_forno', 'g', 'frigo', 20, glutine({ formato: 230, sinonimi: ['sfoglia', 'rotolo di sfoglia'] })),
    i('pasta_brisee', 'Pasta brisée', 'pane_forno', 'g', 'frigo', 20, glutine({ formato: 230, sinonimi: ['pasta brisee', 'brisè'] })),
    i('pasta_frolla', 'Pasta frolla', 'pane_forno', 'g', 'frigo', 20, { formato: 230, allergeni: ['glutine', 'uova', 'latte'], classi: ['uova', 'latticini'], sinonimi: ['frolla'] }),
    i('pasta_pizza', 'Impasto per pizza', 'pane_forno', 'g', 'frigo', 10, glutine({ formato: 400, sinonimi: ['pasta per pizza', 'base pizza', 'pasta di pane'] })),
    i('pasta_fillo', 'Pasta fillo', 'pane_forno', 'g', 'frigo', 30, glutine({ formato: 250, sinonimi: ['fillo', 'phyllo'] })),
  ]),

  // ───────── Carne ─────────
  ...sezione('Pollo e tacchino', 'carne_bianca', [
    i('pollo', 'Pollo', 'carne', 'g', 'frigo', 2, carne({ formato: 1000, sinonimi: ['pollo intero', 'pollo a pezzi', 'pollo ruspante'] })),
    i('petto_pollo', 'Petto di pollo', 'carne', 'g', 'frigo', 2, carne({ formato: 500, genitore: 'pollo', sinonimi: ['fettine di pollo', 'pollo petto', 'bocconcini di pollo', 'straccetti di pollo'] })),
    i('cosce_pollo', 'Cosce di pollo', 'carne', 'g', 'frigo', 2, carne({ formato: 700, genitore: 'pollo', sinonimi: ['fusi di pollo', 'sovracosce', 'sovracosce di pollo', 'coscette di pollo'] })),
    i('ali_pollo', 'Ali di pollo', 'carne', 'g', 'frigo', 2, carne({ formato: 600, genitore: 'pollo', sinonimi: ['alette di pollo'] })),
    i('tacchino', 'Fesa di tacchino', 'carne', 'g', 'frigo', 2, carne({ formato: 400, sinonimi: ['tacchino', 'fettine di tacchino', 'petto di tacchino'] })),
    i('macinato_pollo', 'Macinato di pollo o tacchino', 'carne', 'g', 'frigo', 1, carne({ formato: 400, sinonimi: ['macinato di pollo', 'macinato di tacchino'] })),
  ]),
  ...sezione('Manzo e vitello', 'carne_rossa', [
    i('manzo', 'Manzo', 'carne', 'g', 'frigo', 2, carne({ formato: 500, sinonimi: ['fettine di manzo', 'carne di manzo', 'scottona', 'roast beef', 'carne per brasato'] })),
    i('bistecca', 'Bistecca di manzo', 'carne', 'g', 'frigo', 2, carne({ formato: 400, genitore: 'manzo', sinonimi: ['bistecca', 'fiorentina', 'costata', 'entrecote', 'tagliata'] })),
    i('spezzatino', 'Spezzatino di manzo', 'carne', 'g', 'frigo', 2, carne({ formato: 500, genitore: 'manzo', sinonimi: ['spezzatino', 'bocconcini di manzo', 'carne per spezzatino'] })),
    i('bollito', 'Carne da bollito', 'carne', 'g', 'frigo', 2, carne({ formato: 800, genitore: 'manzo', sinonimi: ['bollito', 'biancostato', 'muscolo', 'punta di petto', 'carne per brodo'] })),
    i('carne_macinata', 'Carne macinata', 'carne', 'g', 'frigo', 1, carne({ formato: 500, sinonimi: ['macinato', 'trita', 'macinato di manzo', 'macinato misto', 'carne trita'] })),
    i('hamburger', 'Hamburger', 'carne', 'g', 'frigo', 1, carne({ formato: 400, peso_pz: 125, genitore: 'carne_macinata', sinonimi: ['burger', 'hamburger di manzo', 'polpette'] })),
    i('vitello', 'Vitello', 'carne', 'g', 'frigo', 2, carne({ formato: 500, sinonimi: ['fesa di vitello', 'fettine di vitello', 'scaloppine', 'vitello tonnato', 'girello'] })),
    i('ossobuco', 'Ossobuco', 'carne', 'g', 'frigo', 2, carne({ formato: 600, genitore: 'vitello', sinonimi: ['ossibuchi'] })),
    i('fegato', 'Fegato', 'carne', 'g', 'frigo', 1, carne({ formato: 400, sinonimi: ['fegato di vitello', 'fegatini di pollo', 'fegato alla veneziana'] })),
  ]),
  ...sezione('Maiale', 'carne_rossa', [
    i('maiale', 'Maiale', 'carne', 'g', 'frigo', 2, maiale({ formato: 500, sinonimi: ['lonza', 'arista', 'carne di maiale', 'filetto di maiale', 'coppa di maiale'] })),
    i('braciole_maiale', 'Braciole di maiale', 'carne', 'g', 'frigo', 2, maiale({ formato: 500, genitore: 'maiale', sinonimi: ['braciole', 'braciola', 'costolette di maiale', 'nodini'] })),
    i('costine_maiale', 'Costine di maiale', 'carne', 'g', 'frigo', 2, maiale({ formato: 800, genitore: 'maiale', sinonimi: ['costine', 'costolette', 'puntine', 'spare ribs'] })),
    i('salsiccia', 'Salsiccia', 'carne', 'g', 'frigo', 3, maiale({ formato: 400, sinonimi: ['salsicce', 'luganega', 'salsiccia fresca'] })),
  ]),
  ...sezione('Altre carni', 'carne_rossa', [
    i('agnello', 'Agnello', 'carne', 'g', 'frigo', 2, carne({ formato: 800, sinonimi: ['abbacchio', 'costolette di agnello', 'capretto'] })),
    i('coniglio', 'Coniglio', 'carne', 'g', 'frigo', 2, carne({ formato: 1200, dieta: 'carne_bianca', sinonimi: ['coniglio a pezzi'] })),
    i('anatra', 'Anatra', 'carne', 'g', 'frigo', 2, carne({ formato: 1500, sinonimi: ['petto di anatra', 'anitra'] })),
    i('cavallo', 'Carne di cavallo', 'carne', 'g', 'frigo', 2, carne({ formato: 400, sinonimi: ['cavallo', 'equino', 'sfilacci di cavallo'] })),
  ]),

  // ───────── Pesce ─────────
  ...sezione('Pesce fresco', 'pesce', [
    i('salmone', 'Salmone', 'pesce', 'g', 'frigo', 1, pesce({ formato: 300, sinonimi: ['filetto di salmone', 'trancio di salmone', 'salmone fresco'] })),
    i('merluzzo', 'Merluzzo', 'pesce', 'g', 'frigo', 1, pesce({ formato: 400, sinonimi: ['filetti di merluzzo', 'nasello', 'merluzzo fresco', 'cod'] })),
    i('orata', 'Orata', 'pesce', 'g', 'frigo', 1, pesce({ peso_pz: 400, sinonimi: ['orate', 'filetti di orata'] })),
    i('branzino', 'Branzino', 'pesce', 'g', 'frigo', 1, pesce({ peso_pz: 400, genitore: 'orata', sinonimi: ['spigola', 'branzini', 'filetti di branzino'] })),
    i('sogliola', 'Sogliola', 'pesce', 'g', 'frigo', 1, pesce({ peso_pz: 250, sinonimi: ['sogliole', 'filetti di sogliola'] })),
    i('platessa', 'Platessa', 'pesce', 'g', 'frigo', 1, pesce({ formato: 400, sinonimi: ['filetti di platessa', 'limanda'] })),
    i('rombo', 'Rombo', 'pesce', 'g', 'frigo', 1, pesce({ peso_pz: 800, sinonimi: ['rombo chiodato', 'rombo liscio'] })),
    i('trota', 'Trota', 'pesce', 'g', 'frigo', 1, pesce({ peso_pz: 350, sinonimi: ['trota salmonata', 'filetti di trota'] })),
    i('pesce_spada', 'Pesce spada', 'pesce', 'g', 'frigo', 1, pesce({ formato: 300, sinonimi: ['trancio di pesce spada', 'spada'] })),
    i('tonno_fresco', 'Tonno fresco', 'pesce', 'g', 'frigo', 1, pesce({ formato: 300, sinonimi: ['trancio di tonno', 'tonno rosso'] })),
    i('cernia', 'Cernia', 'pesce', 'g', 'frigo', 1, pesce({ formato: 400, sinonimi: ['dentice', 'pagello', 'ricciola'] })),
    i('pesce_persico', 'Pesce persico', 'pesce', 'g', 'frigo', 1, pesce({ formato: 400, sinonimi: ['persico', 'filetti di persico', 'pangasio', 'tilapia'] })),
    i('palombo', 'Palombo', 'pesce', 'g', 'frigo', 1, pesce({ formato: 400, sinonimi: ['verdesca', 'smeriglio'] })),
    i('triglie', 'Triglie', 'pesce', 'g', 'frigo', 1, pesce({ formato: 500, sinonimi: ['triglia', 'scorfano', 'gallinella'] })),
    i('pesce_frittura', 'Pesce per frittura', 'pesce', 'g', 'frigo', 1, pesce({ formato: 500, sinonimi: ['paranza', 'frittura di paranza', 'latterini', 'calamaretti per frittura'] })),
  ]),
  ...sezione('Pesce azzurro', 'pesce', [
    i('acciughe', 'Acciughe fresche', 'pesce', 'g', 'frigo', 1, pesce({ formato: 300, sinonimi: ['alici', 'alici fresche', 'acciughe'] })),
    i('sardine', 'Sardine', 'pesce', 'g', 'frigo', 1, pesce({ formato: 500, sinonimi: ['sarde', 'sardine fresche'] })),
    i('sgombro', 'Sgombro', 'pesce', 'g', 'frigo', 1, pesce({ peso_pz: 300, sinonimi: ['sgombri', 'lanzardo'] })),
    i('aguglia', 'Aguglie e sugarelli', 'pesce', 'g', 'frigo', 1, pesce({ formato: 500, sinonimi: ['aguglia', 'sugarello', 'suro', 'alalunga', 'palamita'] })),
  ]),
  ...sezione('Molluschi', 'pesce', [
    i('cozze', 'Cozze', 'pesce', 'g', 'frigo', 2, mollusco({ formato: 1000, genitore: 'frutti_mare', sinonimi: ['muscoli', 'mitili', 'cozza'] })),
    i('vongole', 'Vongole', 'pesce', 'g', 'frigo', 2, mollusco({ formato: 1000, genitore: 'frutti_mare', sinonimi: ['vongole veraci', 'lupini di mare', 'vongola'] })),
    i('telline', 'Telline', 'pesce', 'g', 'frigo', 2, mollusco({ formato: 500, genitore: 'frutti_mare', sinonimi: ['tellina', 'arselle'] })),
    i('cannolicchi', 'Cannolicchi', 'pesce', 'g', 'frigo', 2, mollusco({ formato: 500, genitore: 'frutti_mare', sinonimi: ['cannellicchi', 'cappelunghe'] })),
    i('fasolari', 'Fasolari', 'pesce', 'g', 'frigo', 2, mollusco({ formato: 500, genitore: 'frutti_mare', sinonimi: ['fasolaro', 'noci di mare', 'tartufi di mare'] })),
    i('ostriche', 'Ostriche', 'pesce', 'pz', 'frigo', 3, mollusco({ formato: 6, peso_pz: 80, genitore: 'frutti_mare', sinonimi: ['ostrica'] })),
    i('capesante', 'Capesante', 'pesce', 'g', 'frigo', 1, mollusco({ formato: 300, genitore: 'frutti_mare', sinonimi: ['capasanta', 'cappesante', 'canestrelli'] })),
  ]),
  ...sezione('Polpi, calamari e seppie', 'pesce', [
    i('polpo', 'Polpo', 'pesce', 'g', 'frigo', 1, mollusco({ formato: 1000, genitore: 'frutti_mare', sinonimi: ['polipo', 'polpi', 'piovra'] })),
    i('moscardini', 'Moscardini', 'pesce', 'g', 'frigo', 1, mollusco({ formato: 500, genitore: 'polpo', sinonimi: ['moscardino', 'polpetti'] })),
    i('calamari', 'Calamari', 'pesce', 'g', 'frigo', 1, mollusco({ formato: 500, genitore: 'frutti_mare', sinonimi: ['calamaro', 'anelli di calamaro', 'calamaretti'] })),
    i('totani', 'Totani', 'pesce', 'g', 'frigo', 1, mollusco({ formato: 500, genitore: 'calamari', sinonimi: ['totano'] })),
    i('seppie', 'Seppie', 'pesce', 'g', 'frigo', 1, mollusco({ formato: 500, genitore: 'frutti_mare', sinonimi: ['seppia', 'seppioline', 'seppie pulite'] })),
  ]),
  ...sezione('Crostacei', 'pesce', [
    i('gamberi', 'Gamberi', 'pesce', 'g', 'frigo', 1, crostaceo({ formato: 300, genitore: 'frutti_mare', sinonimi: ['gamberetti', 'gambero', 'gamberi sgusciati', 'code di gambero'] })),
    i('mazzancolle', 'Mazzancolle', 'pesce', 'g', 'frigo', 1, crostaceo({ formato: 400, genitore: 'gamberi', sinonimi: ['mazzancolla', 'gamberi tropicali'] })),
    i('gamberoni', 'Gamberoni', 'pesce', 'g', 'frigo', 1, crostaceo({ formato: 500, genitore: 'gamberi', sinonimi: ['gamberi rossi', 'gambero rosso', 'gamberoni argentini'] })),
    i('scampi', 'Scampi', 'pesce', 'g', 'frigo', 1, crostaceo({ formato: 500, genitore: 'frutti_mare', sinonimi: ['scampo', 'scampetti'] })),
    i('astice', 'Astice', 'pesce', 'g', 'frigo', 1, crostaceo({ peso_pz: 500, genitore: 'frutti_mare', sinonimi: ['aragosta', 'astici'] })),
    i('granchio', 'Granchio', 'pesce', 'g', 'frigo', 1, crostaceo({ formato: 500, genitore: 'frutti_mare', sinonimi: ['granchi', 'granceola', 'polpa di granchio', 'granchio blu'] })),
    i('canocchie', 'Canocchie', 'pesce', 'g', 'frigo', 1, crostaceo({ formato: 500, genitore: 'frutti_mare', sinonimi: ['cicale di mare', 'pannocchie di mare'] })),
  ]),
  ...sezione('Misti, affumicati e conservati', 'pesce', [
    i('frutti_mare', 'Frutti di mare misti', 'pesce', 'g', 'freezer', 180, { formato: 400, classi: ['pesce'], allergeni: ['molluschi', 'crostacei'], sinonimi: ['frutti di mare', 'misto mare', 'preparato per risotto alla marinara', 'insalata di mare', 'zuppa di pesce', 'pesce misto'] }),
    i('salmone_affumicato', 'Salmone affumicato', 'pesce', 'g', 'frigo', 20, pesce({ formato: 100, genitore: 'salmone', sinonimi: ['salmone norvegese affumicato'] })),
    i('pesce_affumicato', 'Pesce spada o tonno affumicato', 'pesce', 'g', 'frigo', 20, pesce({ formato: 100, sinonimi: ['spada affumicato', 'tonno affumicato', 'aringa affumicata'] })),
    i('baccala', 'Baccalà', 'pesce', 'g', 'frigo', 3, pesce({ formato: 500, sinonimi: ['baccala ammollato', 'stoccafisso', 'merluzzo salato'] })),
    i('bottarga', 'Bottarga', 'pesce', 'g', 'dispensa', 180, pesce({ formato: 80, sinonimi: ['bottarga di muggine', 'bottarga di tonno'] })),
    i('surimi', 'Surimi', 'pesce', 'g', 'frigo', 20, { formato: 200, classi: ['pesce'], allergeni: ['pesce', 'crostacei', 'uova'], sinonimi: ['bastoncini di granchio'] }),
  ]),

  // ───────── Salumi e formaggi ─────────
  ...sezione('Salumi', 'salumi', [
    i('prosciutto_cotto', 'Prosciutto cotto', 'gastronomia', 'g', 'frigo', 5, maiale({ formato: 100, sinonimi: ['cotto', 'prosciutto cotto alta qualita'] })),
    i('prosciutto_crudo', 'Prosciutto crudo', 'gastronomia', 'g', 'frigo', 7, maiale({ formato: 100, sinonimi: ['crudo', 'prosciutto di parma', 'san daniele', 'crudo di parma'] })),
    i('speck', 'Speck', 'gastronomia', 'g', 'frigo', 21, maiale({ formato: 100, sinonimi: ['speck alto adige'] })),
    i('mortadella', 'Mortadella', 'gastronomia', 'g', 'frigo', 7, maiale({ formato: 150, sinonimi: ['mortadella bologna'] })),
    i('salame', 'Salame', 'gastronomia', 'g', 'frigo', 30, maiale({ formato: 150, sinonimi: ['salame milano', 'salame napoli', 'salamino', 'salame felino', 'finocchiona', 'cacciatorini', 'spianata'] })),
    i('coppa', 'Coppa', 'gastronomia', 'g', 'frigo', 21, maiale({ formato: 100, sinonimi: ['capocollo', 'lonza stagionata'] })),
    i('pancetta', 'Pancetta', 'gastronomia', 'g', 'frigo', 14, maiale({ formato: 150, sinonimi: ['pancetta a cubetti', 'dadini di pancetta', 'pancetta affumicata', 'bacon'] })),
    i('guanciale', 'Guanciale', 'gastronomia', 'g', 'frigo', 21, maiale({ formato: 200, sinonimi: ['guanciale amatriciano'] })),
    i('lardo', 'Lardo', 'gastronomia', 'g', 'frigo', 30, maiale({ formato: 100, sinonimi: ['lardo di colonnata', 'lardo di arnad'] })),
    i('nduja', "'Nduja", 'gastronomia', 'g', 'frigo', 60, maiale({ formato: 150, sinonimi: ['nduja', 'salame piccante spalmabile'] })),
    i('porchetta', 'Porchetta', 'gastronomia', 'g', 'frigo', 5, maiale({ formato: 150, sinonimi: ['porchetta di ariccia'] })),
    i('wurstel', 'Würstel', 'gastronomia', 'g', 'frigo', 20, maiale({ formato: 250, sinonimi: ['wurstel', 'wuerstel', 'frankfurter', 'hot dog'] })),
    i('cotechino', 'Cotechino e zampone', 'gastronomia', 'g', 'dispensa', 180, maiale({ formato: 500, sinonimi: ['cotechino', 'zampone'] })),
    i('bresaola', 'Bresaola', 'gastronomia', 'g', 'frigo', 7, carne({ formato: 100, sinonimi: ['bresaola della valtellina'] })),
    i('tacchino_affettato', 'Fesa di tacchino affettata', 'gastronomia', 'g', 'frigo', 5, carne({ formato: 100, sinonimi: ['affettato di tacchino', 'petto di pollo arrosto', 'arrosto di tacchino'] })),
  ]),
  ...sezione('Formaggi freschi', 'formaggi', [
    i('mozzarella', 'Mozzarella', 'gastronomia', 'g', 'frigo', 4, formaggio({ formato: 125, sinonimi: ['fiordilatte', 'mozzarella fiordilatte', 'bocconcini', 'ciliegine', 'treccia', 'mozzarella per pizza'] })),
    i('mozzarella_bufala', 'Mozzarella di bufala', 'gastronomia', 'g', 'frigo', 4, formaggio({ formato: 250, genitore: 'mozzarella', sinonimi: ['bufala', 'mozzarella di bufala campana'] })),
    i('burrata', 'Burrata', 'gastronomia', 'g', 'frigo', 3, formaggio({ formato: 200, genitore: 'mozzarella', sinonimi: ['burratina'] })),
    i('stracciatella', 'Stracciatella', 'gastronomia', 'g', 'frigo', 3, formaggio({ formato: 200, sinonimi: ['stracciatella di burrata'] })),
    i('ricotta', 'Ricotta', 'gastronomia', 'g', 'frigo', 5, formaggio({ formato: 250, sinonimi: ['ricotta vaccina', 'ricotta di pecora', 'ricotta fresca'] })),
    i('mascarpone', 'Mascarpone', 'gastronomia', 'g', 'frigo', 10, formaggio({ formato: 250 })),
    i('stracchino', 'Stracchino', 'gastronomia', 'g', 'frigo', 7, formaggio({ formato: 250, sinonimi: ['crescenza', 'squacquerone'] })),
    i('robiola', 'Robiola', 'gastronomia', 'g', 'frigo', 7, formaggio({ formato: 100, sinonimi: ['caprino', 'formaggio di capra', 'caprino fresco'] })),
    i('spalmabile', 'Formaggio spalmabile', 'gastronomia', 'g', 'frigo', 21, formaggio({ formato: 150, sinonimi: ['philadelphia', 'formaggio cremoso', 'formaggino', 'formaggini'] })),
    i('fiocchi_latte', 'Fiocchi di latte', 'gastronomia', 'g', 'frigo', 10, formaggio({ formato: 150, sinonimi: ['cottage cheese', 'jocca'] })),
    i('primosale', 'Primosale', 'gastronomia', 'g', 'frigo', 7, formaggio({ formato: 250, sinonimi: ['primo sale', 'tomino', 'tomini'] })),
    i('feta', 'Feta', 'gastronomia', 'g', 'frigo', 21, formaggio({ formato: 200 })),
    i('paneer', 'Paneer', 'gastronomia', 'g', 'frigo', 7, formaggio({ formato: 200, sinonimi: ['formaggio indiano'] })),
  ]),
  ...sezione('Formaggi stagionati e da grattugiare', 'formaggi', [
    i('parmigiano', 'Parmigiano Reggiano', 'gastronomia', 'g', 'frigo', 60, formaggio({ formato: 200, sinonimi: ['parmigiano', 'parmigiano grattugiato', 'formaggio grattugiato', 'reggiano'] })),
    i('grana_padano', 'Grana Padano', 'gastronomia', 'g', 'frigo', 60, formaggio({ formato: 200, genitore: 'parmigiano', sinonimi: ['grana', 'grana grattugiato', 'trentingrana'] })),
    i('pecorino', 'Pecorino Romano', 'gastronomia', 'g', 'frigo', 60, formaggio({ formato: 200, sinonimi: ['pecorino', 'pecorino grattugiato'] })),
    i('pecorino_dolce', 'Pecorino da tavola', 'gastronomia', 'g', 'frigo', 30, formaggio({ formato: 250, genitore: 'pecorino', sinonimi: ['pecorino sardo', 'pecorino toscano', 'pecorino siciliano', 'canestrato', 'fiore sardo'] })),
    i('provolone', 'Provolone', 'gastronomia', 'g', 'frigo', 30, formaggio({ formato: 250, sinonimi: ['provolone dolce', 'provolone piccante', 'provolone valpadana'] })),
    i('caciocavallo', 'Caciocavallo', 'gastronomia', 'g', 'frigo', 30, formaggio({ formato: 300, sinonimi: ['caciocavallo silano', 'ragusano'] })),
    i('asiago', 'Asiago', 'gastronomia', 'g', 'frigo', 30, formaggio({ formato: 250, sinonimi: ['montasio', 'piave', 'latteria'] })),
    i('emmental', 'Emmental', 'gastronomia', 'g', 'frigo', 30, formaggio({ formato: 200, sinonimi: ['emmentaler', 'groviera', 'gruyere', 'leerdammer', 'maasdam'] })),
    i('cheddar', 'Cheddar', 'gastronomia', 'g', 'frigo', 30, formaggio({ formato: 200, sinonimi: ['edamer', 'edam', 'gouda'] })),
  ]),
  ...sezione('Formaggi morbidi ed erborinati', 'formaggi', [
    i('gorgonzola', 'Gorgonzola', 'gastronomia', 'g', 'frigo', 10, formaggio({ formato: 200, sinonimi: ['gorgonzola dolce', 'gorgonzola piccante', 'erborinato', 'roquefort'] })),
    i('taleggio', 'Taleggio', 'gastronomia', 'g', 'frigo', 14, formaggio({ formato: 200, sinonimi: ['quartirolo', 'italico', 'bel paese'] })),
    i('fontina', 'Fontina', 'gastronomia', 'g', 'frigo', 21, formaggio({ formato: 250, sinonimi: ['formaggio da fondere', 'fontal', 'toma'] })),
    i('scamorza', 'Scamorza', 'gastronomia', 'g', 'frigo', 14, formaggio({ formato: 250, sinonimi: ['provola', 'provola affumicata', 'scamorza affumicata'] })),
    i('brie', 'Brie', 'gastronomia', 'g', 'frigo', 14, formaggio({ formato: 200, sinonimi: ['camembert'] })),
    i('sottilette', 'Sottilette', 'gastronomia', 'g', 'frigo', 60, formaggio({ formato: 200, sinonimi: ['formaggio a fette', 'fette di formaggio', 'cheese slices'] })),
  ]),
  ...sezione('Gastronomia', undefined, [
    i('tofu', 'Tofu', 'gastronomia', 'g', 'frigo', 14, { formato: 250, allergeni: ['soia'], dieta: 'legumi', sinonimi: ['tofu al naturale', 'tofu affumicato'] }),
    i('seitan', 'Seitan', 'gastronomia', 'g', 'frigo', 14, glutine({ formato: 200 })),
    i('hummus', 'Hummus', 'gastronomia', 'g', 'frigo', 10, { formato: 200, allergeni: ['sesamo'], dieta: 'legumi', sinonimi: ['crema di ceci'] }),
  ]),

  // ───────── Latte, latticini e uova ─────────
  ...sezione('Latte', 'latte_yogurt', [
    i('latte', 'Latte', 'latticini', 'ml', 'frigo', 6, formaggio({ formato: 1000, sinonimi: ['latte intero', 'latte parzialmente scremato', 'latte uht', 'latte fresco', 'latte scremato', 'latte a lunga conservazione'] })),
    i('latte_senza_lattosio', 'Latte senza lattosio', 'latticini', 'ml', 'frigo', 30, formaggio({ formato: 1000, genitore: 'latte', sinonimi: ['latte delattosato', 'latte zymil', 'latte accadi'] })),
  ]),
  ...sezione('Bevande vegetali', 'latte_yogurt', [
    i('bevanda_soia', 'Bevanda di soia', 'latticini', 'ml', 'dispensa', 180, { formato: 1000, allergeni: ['soia'], sinonimi: ['latte di soia', 'soia drink'] }),
    i('bevanda_avena', "Bevanda d'avena", 'latticini', 'ml', 'dispensa', 180, glutine({ formato: 1000, sinonimi: ["latte d'avena", 'latte di avena', 'avena drink'] })),
    i('bevanda_mandorla', 'Bevanda di mandorla', 'latticini', 'ml', 'dispensa', 180, { formato: 1000, allergeni: ['frutta_a_guscio'], sinonimi: ['latte di mandorla'] }),
    i('bevanda_riso', 'Bevanda di riso', 'latticini', 'ml', 'dispensa', 180, { formato: 1000, sinonimi: ['latte di riso'] }),
  ]),
  ...sezione('Yogurt e dessert', 'latte_yogurt', [
    i('yogurt', 'Yogurt', 'latticini', 'g', 'frigo', 14, formaggio({ formato: 125, sinonimi: ['yogurt bianco', 'yogurt intero', 'yogurt magro', 'yogurt alla frutta', 'vasetto di yogurt'] })),
    i('yogurt_greco', 'Yogurt greco', 'latticini', 'g', 'frigo', 14, formaggio({ formato: 500, genitore: 'yogurt', sinonimi: ['skyr', 'yogurt colato'] })),
    i('kefir', 'Kefir', 'latticini', 'ml', 'frigo', 14, formaggio({ formato: 500 })),
    i('budino', 'Budini e dessert', 'latticini', 'g', 'frigo', 21, formaggio({ formato: 400, dieta: 'dolci', sinonimi: ['budino', 'panna cotta', 'creme caramel', 'dessert al cucchiaio'] })),
  ]),
  ...sezione('Burro e panna', 'condimenti', [
    i('burro', 'Burro', 'latticini', 'g', 'frigo', 60, formaggio({ formato: 250, sinonimi: ['burro chiarificato', 'burro salato'] })),
    i('margarina', 'Margarina', 'latticini', 'g', 'frigo', 90, { formato: 250, sinonimi: ['burro vegetale'] }),
    i('panna', 'Panna da cucina', 'latticini', 'ml', 'frigo', 30, formaggio({ formato: 200, sinonimi: ['panna', 'panna uht', 'panna per cucinare'] })),
    i('panna_montare', 'Panna fresca da montare', 'latticini', 'ml', 'frigo', 10, formaggio({ formato: 250, genitore: 'panna', sinonimi: ['panna fresca', 'panna montata', 'panna spray'] })),
    i('besciamella', 'Besciamella pronta', 'latticini', 'ml', 'dispensa', 180, { formato: 500, allergeni: ['latte', 'glutine'], classi: ['latticini'], sinonimi: ['besciamella', 'balsamella'] }),
  ]),
  ...sezione('Uova', 'uova', [
    i('uova', 'Uova', 'latticini', 'pz', 'frigo', 21, { formato: 6, peso_pz: 60, classi: ['uova'], allergeni: ['uova'], sinonimi: ['uovo', 'uova fresche', 'uova bio', 'uova di gallina'] }),
    i('albumi', 'Albumi', 'latticini', 'g', 'frigo', 7, { formato: 500, classi: ['uova'], allergeni: ['uova'], sinonimi: ['albume', 'chiare d’uovo', 'albumi in brick'] }),
  ]),

  // ───────── Pasta, riso e farine ─────────
  ...sezione('Pasta secca', 'cereali', [
    i('pasta', 'Pasta', 'pasta_riso', 'g', 'dispensa', 365, glutine({ formato: 500, sinonimi: ['pasta secca', 'pasta di semola', 'mezze maniche', 'sedani', 'tortiglioni', 'maccheroni', 'conchiglie', 'mezzi rigatoni'] })),
    i('spaghetti', 'Spaghetti', 'pasta_riso', 'g', 'dispensa', 365, glutine({ formato: 500, genitore: 'pasta', sinonimi: ['spaghettoni', 'vermicelli', 'spaghetti quadrati', 'capellini'] })),
    i('linguine', 'Linguine', 'pasta_riso', 'g', 'dispensa', 365, glutine({ formato: 500, genitore: 'pasta', sinonimi: ['bavette', 'trenette'] })),
    i('bucatini', 'Bucatini', 'pasta_riso', 'g', 'dispensa', 365, glutine({ formato: 500, genitore: 'pasta', sinonimi: ['perciatelli'] })),
    i('penne', 'Penne', 'pasta_riso', 'g', 'dispensa', 365, glutine({ formato: 500, genitore: 'pasta', sinonimi: ['penne rigate', 'pennette', 'penne lisce'] })),
    i('rigatoni', 'Rigatoni', 'pasta_riso', 'g', 'dispensa', 365, glutine({ formato: 500, genitore: 'pasta', sinonimi: ['rigatone'] })),
    i('fusilli', 'Fusilli', 'pasta_riso', 'g', 'dispensa', 365, glutine({ formato: 500, genitore: 'pasta', sinonimi: ['eliche', 'tortiglioni corti'] })),
    i('farfalle', 'Farfalle', 'pasta_riso', 'g', 'dispensa', 365, glutine({ formato: 500, genitore: 'pasta', sinonimi: ['farfalline'] })),
    i('paccheri', 'Paccheri', 'pasta_riso', 'g', 'dispensa', 365, glutine({ formato: 500, genitore: 'pasta', sinonimi: ['mezzi paccheri', 'calamarata'] })),
    i('orecchiette', 'Orecchiette', 'pasta_riso', 'g', 'dispensa', 365, glutine({ formato: 500, genitore: 'pasta', sinonimi: ['cavatelli', 'strascinati'] })),
    i('trofie', 'Trofie', 'pasta_riso', 'g', 'dispensa', 365, glutine({ formato: 500, genitore: 'pasta', sinonimi: ['strozzapreti', 'casarecce'] })),
    i('ditalini', 'Ditalini', 'pasta_riso', 'g', 'dispensa', 365, glutine({ formato: 500, genitore: 'pasta', sinonimi: ['tubetti', 'pasta mista', 'gnocchetti sardi', 'malloreddus'] })),
    i('pastina', 'Pastina da brodo', 'pasta_riso', 'g', 'dispensa', 365, glutine({ formato: 500, genitore: 'pasta', sinonimi: ['pastina', 'stelline', 'anellini', 'risoni', 'quadrucci', 'grattini'] })),
    i('pasta_integrale', 'Pasta integrale', 'pasta_riso', 'g', 'dispensa', 365, glutine({ formato: 500, genitore: 'pasta', sinonimi: ['spaghetti integrali', 'penne integrali'] })),
    i('pasta_senza_glutine', 'Pasta senza glutine', 'pasta_riso', 'g', 'dispensa', 365, { formato: 400, genitore: 'pasta', sinonimi: ['pasta di mais', 'pasta di riso', 'pasta di legumi', 'pasta di lenticchie'] }),
  ]),
  ...sezione('Pasta fresca e gnocchi', 'cereali', [
    i('pasta_uovo', "Pasta all'uovo", 'pasta_riso', 'g', 'dispensa', 180, { formato: 250, allergeni: ['glutine', 'uova'], classi: ['uova'], sinonimi: ['tagliatelle', 'fettuccine', 'pappardelle', 'tagliolini', 'pasta fresca', 'tajarin'] }),
    i('lasagne', 'Sfoglie per lasagne', 'pasta_riso', 'g', 'dispensa', 180, { formato: 500, allergeni: ['glutine', 'uova'], classi: ['uova'], sinonimi: ['lasagne', 'cannelloni'] }),
    i('pasta_ripiena', 'Pasta ripiena', 'pasta_riso', 'g', 'frigo', 20, { formato: 250, allergeni: ['glutine', 'uova', 'latte'], classi: ['uova', 'latticini'], sinonimi: ['tortelloni', 'agnolotti', 'cappelletti', 'mezzelune'] }),
    i('tortellini', 'Tortellini', 'pasta_riso', 'g', 'frigo', 20, { formato: 250, genitore: 'pasta_ripiena', allergeni: ['glutine', 'uova', 'latte'], classi: ['uova', 'latticini', 'carne', 'maiale'], sinonimi: ['tortellini al prosciutto', 'tortellini alla carne'] }),
    i('ravioli', 'Ravioli ricotta e spinaci', 'pasta_riso', 'g', 'frigo', 20, { formato: 250, genitore: 'pasta_ripiena', allergeni: ['glutine', 'uova', 'latte'], classi: ['uova', 'latticini'], sinonimi: ['ravioli', 'tortelli', 'ravioli di magro'] }),
    i('gnocchi', 'Gnocchi di patate', 'pasta_riso', 'g', 'frigo', 20, glutine({ formato: 500, sinonimi: ['gnocchi', 'chicche'] })),
  ]),
  ...sezione('Pasta e riso orientali', 'cereali', [
    i('noodles', 'Noodles di grano', 'pasta_riso', 'g', 'dispensa', 365, glutine({ formato: 250, sinonimi: ['noodles', 'udon', 'ramen', 'tagliolini cinesi', 'noodles all uovo'] })),
    i('noodles_riso', 'Spaghetti di riso', 'pasta_riso', 'g', 'dispensa', 365, { formato: 250, sinonimi: ['noodles di riso', 'vermicelli di riso', 'tagliatelle di riso'] }),
    i('soba', 'Soba', 'pasta_riso', 'g', 'dispensa', 365, glutine({ formato: 250, sinonimi: ['spaghetti di grano saraceno'] })),
  ]),
  ...sezione('Riso', 'cereali', [
    i('riso', 'Riso', 'pasta_riso', 'g', 'dispensa', 365, { formato: 1000, sinonimi: ['riso parboiled', 'riso ribe', 'riso per insalate', 'riso fino'] }),
    i('riso_risotti', 'Riso per risotti', 'pasta_riso', 'g', 'dispensa', 365, { formato: 1000, genitore: 'riso', sinonimi: ['carnaroli', 'arborio', 'vialone nano', 'riso roma', 'baldo'] }),
    i('riso_basmati', 'Riso basmati', 'pasta_riso', 'g', 'dispensa', 365, { formato: 1000, genitore: 'riso', sinonimi: ['basmati', 'riso thai', 'riso jasmine', 'riso profumato'] }),
    i('riso_integrale', 'Riso integrale', 'pasta_riso', 'g', 'dispensa', 365, { formato: 1000, genitore: 'riso', sinonimi: ['riso venere', 'riso nero', 'riso rosso', 'riso selvaggio'] }),
    i('riso_sushi', 'Riso per sushi', 'pasta_riso', 'g', 'dispensa', 365, { formato: 1000, genitore: 'riso', sinonimi: ['riso giapponese', 'riso originario'] }),
  ]),
  ...sezione('Cereali in chicchi', 'cereali', [
    i('farro', 'Farro', 'pasta_riso', 'g', 'dispensa', 365, glutine({ formato: 500, sinonimi: ['farro perlato', 'farro decorticato'] })),
    i('orzo', 'Orzo perlato', 'pasta_riso', 'g', 'dispensa', 365, glutine({ formato: 500, sinonimi: ['orzo'] })),
    i('couscous', 'Cous cous', 'pasta_riso', 'g', 'dispensa', 365, glutine({ formato: 500, sinonimi: ['couscous', 'cuscus', 'bulgur'] })),
    i('quinoa', 'Quinoa', 'pasta_riso', 'g', 'dispensa', 365, { formato: 400, sinonimi: ['amaranto', 'miglio', 'grano saraceno'] }),
  ]),
  ...sezione('Farine e lieviti', 'cereali', [
    i('farina', 'Farina 00', 'pasta_riso', 'g', 'dispensa', 180, glutine({ formato: 1000, sinonimi: ['farina', 'farina 0', 'farina di grano tenero', 'farina per dolci'] })),
    i('farina_manitoba', 'Farina Manitoba', 'pasta_riso', 'g', 'dispensa', 180, glutine({ formato: 1000, genitore: 'farina', sinonimi: ['manitoba', 'farina forte', 'farina per pizza', 'farina per pane'] })),
    i('farina_integrale', 'Farina integrale', 'pasta_riso', 'g', 'dispensa', 180, glutine({ formato: 1000, sinonimi: ['farina di farro', 'farina di segale', 'farina tipo 2'] })),
    i('semola', 'Semola di grano duro', 'pasta_riso', 'g', 'dispensa', 365, glutine({ formato: 1000, sinonimi: ['semola rimacinata', 'semolino'] })),
    i('polenta', 'Farina di mais', 'pasta_riso', 'g', 'dispensa', 365, { formato: 500, sinonimi: ['polenta', 'polenta istantanea', 'farina gialla', 'fioretto'] }),
    i('farina_ceci', 'Farina di ceci', 'pasta_riso', 'g', 'dispensa', 365, { formato: 500, sinonimi: ['farina di legumi'] }),
    i('farina_riso', 'Farina di riso', 'pasta_riso', 'g', 'dispensa', 365, { formato: 500, sinonimi: ['farina senza glutine', 'mix per pane senza glutine'] }),
    i('amido_mais', 'Amido di mais', 'pasta_riso', 'g', 'dispensa', 730, { formato: 250, sinonimi: ['maizena', 'fecola', 'fecola di patate'] }),
    i('lievito_birra', 'Lievito di birra', 'pasta_riso', 'g', 'frigo', 20, { formato: 25, sinonimi: ['lievito fresco', 'cubetto di lievito'] }),
    i('lievito_secco', 'Lievito di birra secco', 'pasta_riso', 'g', 'dispensa', 365, { formato: 7, genitore: 'lievito_birra', sinonimi: ['lievito disidratato', 'lievito secco'] }),
  ]),

  // ───────── Conserve e legumi ─────────
  ...sezione('Pomodoro', undefined, [
    i('passata', 'Passata di pomodoro', 'conserve', 'g', 'dispensa', 365, { formato: 700, sinonimi: ['passata', 'salsa di pomodoro', 'passata rustica', 'sugo di pomodoro'] }),
    i('polpa_pomodoro', 'Polpa di pomodoro', 'conserve', 'g', 'dispensa', 730, { formato: 400, genitore: 'passata', sinonimi: ['polpa di pomodoro', 'pomodoro a pezzi', 'pomodori a cubetti', 'polpa'] }),
    i('pelati', 'Pomodori pelati', 'conserve', 'g', 'dispensa', 730, { formato: 400, sinonimi: ['pelati', 'pomodorini in scatola', 'pomodorini pelati'] }),
    i('concentrato', 'Concentrato di pomodoro', 'conserve', 'g', 'dispensa', 730, { formato: 130, sinonimi: ['doppio concentrato', 'triplo concentrato'] }),
    i('pomodori_secchi', 'Pomodori secchi', 'conserve', 'g', 'dispensa', 365, { formato: 200, sinonimi: ['pomodori secchi sott olio'] }),
  ]),
  ...sezione('Legumi', 'legumi', [
    i('ceci', 'Ceci', 'conserve', 'g', 'dispensa', 730, { formato: 400, sinonimi: ['ceci in scatola', 'ceci lessati', 'ceci secchi'] }),
    i('fagioli', 'Fagioli', 'conserve', 'g', 'dispensa', 730, { formato: 400, sinonimi: ['fagioli in scatola', 'fagioli secchi', 'fagioli misti', 'fagioli neri', 'fagioli rossi', 'fagioli kidney'] }),
    i('fagioli_borlotti', 'Fagioli borlotti', 'conserve', 'g', 'dispensa', 730, { formato: 400, genitore: 'fagioli', sinonimi: ['borlotti'] }),
    i('fagioli_cannellini', 'Fagioli cannellini', 'conserve', 'g', 'dispensa', 730, { formato: 400, genitore: 'fagioli', sinonimi: ['cannellini', 'fagioli bianchi', 'fagioli di spagna'] }),
    i('lenticchie', 'Lenticchie', 'conserve', 'g', 'dispensa', 365, { formato: 500, sinonimi: ['lenticchie secche', 'lenticchie in scatola', 'lenticchie di castelluccio'] }),
    i('lenticchie_rosse', 'Lenticchie rosse', 'conserve', 'g', 'dispensa', 365, { formato: 500, genitore: 'lenticchie', sinonimi: ['lenticchie decorticate'] }),
    i('fave_secche', 'Fave secche', 'conserve', 'g', 'dispensa', 365, { formato: 500, sinonimi: ['fave decorticate', 'cicerchie'] }),
    i('piselli_secchi', 'Piselli secchi', 'conserve', 'g', 'dispensa', 365, { formato: 500, genitore: 'piselli', sinonimi: ['piselli spezzati', 'piselli in scatola'] }),
    i('soia_edamame', 'Soia ed edamame', 'conserve', 'g', 'dispensa', 365, { formato: 400, allergeni: ['soia'], sinonimi: ['edamame', 'fagioli di soia', 'soia gialla'] }),
    i('lupini', 'Lupini', 'conserve', 'g', 'frigo', 30, { formato: 300, allergeni: ['lupini'], sinonimi: ['lupini salati'] }),
  ]),
  ...sezione('Pesce in scatola', 'pesce', [
    i('tonno_scatola', 'Tonno in scatola', 'conserve', 'g', 'dispensa', 1000, pesce({ formato: 160, sinonimi: ['tonno', "tonno all'olio", 'tonno al naturale', 'tonno in vasetto'] })),
    i('sgombro_scatola', 'Sgombro in scatola', 'conserve', 'g', 'dispensa', 1000, pesce({ formato: 125, sinonimi: ['filetti di sgombro', 'sgombro all olio'] })),
    i('acciughe_sottolio', "Acciughe sott'olio", 'conserve', 'g', 'dispensa', 365, pesce({ formato: 80, genitore: 'acciughe', sinonimi: ['filetti di acciughe', 'acciughe sott’olio', 'alici sott olio', 'pasta di acciughe', 'colatura di alici'] })),
    i('sardine_scatola', 'Sardine in scatola', 'conserve', 'g', 'dispensa', 1000, pesce({ formato: 120, sinonimi: ['sardine sott olio'] })),
    i('salmone_scatola', 'Salmone in scatola', 'conserve', 'g', 'dispensa', 1000, pesce({ formato: 160, sinonimi: ['salmone al naturale'] })),
  ]),
  ...sezione('Sott’oli, sottaceti e verdure in vasetto', undefined, [
    i('olive', 'Olive', 'conserve', 'g', 'dispensa', 365, { formato: 200, sinonimi: ['olive nere', 'olive verdi', 'olive taggiasche', 'olive di gaeta', 'olive denocciolate'] }),
    i('capperi', 'Capperi', 'conserve', 'g', 'dispensa', 365, { formato: 100, sinonimi: ['capperi sotto sale', 'cucunci'] }),
    i('carciofini', "Carciofini sott'olio", 'conserve', 'g', 'dispensa', 365, { formato: 280, sinonimi: ['carciofini', 'carciofi sott olio'] }),
    i('funghi_sottolio', "Funghi sott'olio", 'conserve', 'g', 'dispensa', 365, { formato: 280, sinonimi: ['funghetti', 'funghi trifolati in vasetto'] }),
    i('sottaceti', 'Sottaceti', 'conserve', 'g', 'dispensa', 365, { formato: 300, allergeni: ['solfiti'], sinonimi: ['giardiniera', 'cetriolini', 'cipolline sottaceto', 'peperoni sottaceto'] }),
    i('mais', 'Mais in scatola', 'conserve', 'g', 'dispensa', 730, { formato: 300, dieta: 'verdura', sinonimi: ['mais', 'mais dolce'] }),
    i('funghi_secchi', 'Funghi porcini secchi', 'conserve', 'g', 'dispensa', 365, { formato: 40, genitore: 'porcini', sinonimi: ['porcini secchi', 'funghi secchi'] }),
    i('alga_nori', 'Alga nori', 'conserve', 'g', 'dispensa', 365, { formato: 25, sinonimi: ['nori', 'fogli di alga', 'alga wakame', 'alga kombu'] }),
  ]),
  ...sezione('Sughi e creme pronte', undefined, [
    i('pesto', 'Pesto alla genovese', 'conserve', 'g', 'frigo', 30, { formato: 190, classi: ['latticini'], allergeni: ['latte', 'frutta_a_guscio'], sinonimi: ['pesto', 'pesto genovese', 'pesto al basilico'] }),
    i('sugo_pronto', 'Sugo pronto', 'conserve', 'g', 'dispensa', 365, { formato: 300, sinonimi: ['sugo al basilico', "sugo all'arrabbiata", 'sugo in vasetto', 'pesto rosso', 'pesto di pistacchi'] }),
    i('ragu_pronto', 'Ragù pronto', 'conserve', 'g', 'dispensa', 365, carne({ formato: 400, sinonimi: ['ragu', 'ragù alla bolognese', 'sugo di carne'] })),
    i('latte_cocco', 'Latte di cocco', 'conserve', 'ml', 'dispensa', 730, { formato: 400, sinonimi: ['crema di cocco'] }),
    i('brodo_pronto', 'Brodo pronto', 'conserve', 'ml', 'dispensa', 365, { formato: 1000, allergeni: ['sedano'], sinonimi: ['brodo in brick', 'brodo di carne', 'brodo di pollo'] }),
  ]),

  // ───────── Olio, spezie e condimenti ─────────
  ...sezione('Olio e aceto', 'condimenti', [
    i('olio_evo', "Olio extravergine d'oliva", 'condimenti', 'ml', 'dispensa', 540, { formato: 1000, base: true, sinonimi: ['olio', 'olio evo', 'olio extra vergine', "olio d'oliva", 'olio extravergine'] }),
    i('olio_semi', 'Olio di semi', 'condimenti', 'ml', 'dispensa', 365, { formato: 1000, sinonimi: ['olio di arachidi', 'olio di girasole', 'olio per friggere', 'olio di mais', 'olio di semi vari'] }),
    i('olio_sesamo', 'Olio di sesamo', 'condimenti', 'ml', 'dispensa', 365, { formato: 250, allergeni: ['sesamo'] }),
    i('aceto', 'Aceto di vino', 'condimenti', 'ml', 'dispensa', 1000, { formato: 1000, base: true, allergeni: ['solfiti'], sinonimi: ['aceto', 'aceto bianco', 'aceto rosso', 'aceto di mele'] }),
    i('aceto_balsamico', 'Aceto balsamico', 'condimenti', 'ml', 'dispensa', 1000, { formato: 250, genitore: 'aceto', allergeni: ['solfiti'], sinonimi: ['balsamico', 'aceto balsamico di modena', 'glassa di aceto balsamico'] }),
    i('aceto_riso', 'Aceto di riso', 'condimenti', 'ml', 'dispensa', 730, { formato: 250 }),
  ]),
  ...sezione('Sale e spezie', undefined, [
    i('sale', 'Sale', 'condimenti', 'g', 'dispensa', 3650, { formato: 1000, base: true, sinonimi: ['sale fino', 'sale grosso', 'sale iodato', 'sale marino'] }),
    i('pepe', 'Pepe nero', 'condimenti', 'g', 'dispensa', 730, { formato: 50, base: true, sinonimi: ['pepe', 'pepe in grani', 'pepe macinato'] }),
    i('peperoncino', 'Peperoncino', 'condimenti', 'g', 'dispensa', 365, { formato: 30, sinonimi: ['peperoncino secco', 'peperoncino in polvere', 'peperoncino fresco', 'peperoncini'] }),
    i('origano', 'Origano', 'condimenti', 'g', 'dispensa', 365, { formato: 20, sinonimi: ['origano secco'] }),
    i('alloro', 'Alloro', 'condimenti', 'g', 'dispensa', 365, { formato: 10, sinonimi: ['foglie di alloro'] }),
    i('timo', 'Timo', 'condimenti', 'g', 'dispensa', 365, { formato: 10, sinonimi: ['timo secco'] }),
    i('erbe_secche', 'Erbe aromatiche secche', 'condimenti', 'g', 'dispensa', 365, { formato: 30, sinonimi: ['erbe di provenza', 'insaporitore per arrosti', 'sale aromatizzato', 'mix di erbe'] }),
    i('paprika', 'Paprika', 'condimenti', 'g', 'dispensa', 365, { formato: 50, sinonimi: ['paprika dolce', 'paprika affumicata', 'paprika piccante'] }),
    i('curry', 'Curry in polvere', 'condimenti', 'g', 'dispensa', 365, { formato: 50, allergeni: ['senape'], sinonimi: ['curry'] }),
    i('garam_masala', 'Garam masala', 'condimenti', 'g', 'dispensa', 365, { formato: 50, sinonimi: ['masala'] }),
    i('curcuma', 'Curcuma', 'condimenti', 'g', 'dispensa', 365, { formato: 50 }),
    i('cumino', 'Cumino', 'condimenti', 'g', 'dispensa', 365, { formato: 50, sinonimi: ['semi di cumino'] }),
    i('zenzero_polvere', 'Zenzero in polvere', 'condimenti', 'g', 'dispensa', 365, { formato: 30, genitore: 'zenzero' }),
    i('cannella', 'Cannella', 'condimenti', 'g', 'dispensa', 730, { formato: 30, sinonimi: ['cannella in polvere', 'stecca di cannella'] }),
    i('noce_moscata', 'Noce moscata', 'condimenti', 'g', 'dispensa', 730, { formato: 30 }),
    i('chiodi_garofano', 'Chiodi di garofano', 'condimenti', 'g', 'dispensa', 730, { formato: 20, sinonimi: ['chiodi di garofano', 'anice stellato', 'cardamomo'] }),
    i('zafferano', 'Zafferano', 'condimenti', 'g', 'dispensa', 730, { formato: 1, sinonimi: ['bustina di zafferano', 'pistilli di zafferano'] }),
    i('semi_sesamo', 'Semi di sesamo', 'condimenti', 'g', 'dispensa', 365, { formato: 100, allergeni: ['sesamo'], sinonimi: ['sesamo', 'gomasio'] }),
    i('semi_misti', 'Semi misti', 'condimenti', 'g', 'dispensa', 365, { formato: 150, sinonimi: ['semi di girasole', 'semi di zucca', 'semi di lino', 'semi di chia', 'semi di papavero'] }),
  ]),
  ...sezione('Brodi e insaporitori', undefined, [
    i('dado', 'Dado vegetale', 'condimenti', 'g', 'dispensa', 365, { formato: 100, allergeni: ['sedano'], sinonimi: ['dado', 'brodo granulare', 'brodo vegetale', 'preparato per brodo'] }),
    i('dado_carne', 'Dado di carne', 'condimenti', 'g', 'dispensa', 365, carne({ formato: 100, genitore: 'dado', allergeni: ['sedano'], sinonimi: ['dado di manzo', 'dado di pollo', 'brodo di carne granulare'] })),
    i('dashi', 'Dashi granulare', 'condimenti', 'g', 'dispensa', 365, pesce({ formato: 50, sinonimi: ['brodo dashi'] })),
    i('miso', 'Miso', 'condimenti', 'g', 'frigo', 180, { formato: 300, allergeni: ['soia'], sinonimi: ['pasta di miso'] }),
  ]),
  ...sezione('Salse', undefined, [
    i('maionese', 'Maionese', 'condimenti', 'g', 'frigo', 90, { formato: 225, classi: ['uova'], allergeni: ['uova', 'senape'], sinonimi: ['maionese in tubetto', 'salsa tonnata', 'salsa rosa'] }),
    i('ketchup', 'Ketchup', 'condimenti', 'g', 'frigo', 180, { formato: 450, sinonimi: ['salsa barbecue', 'salsa bbq'] }),
    i('senape', 'Senape', 'condimenti', 'g', 'frigo', 180, { formato: 200, allergeni: ['senape'], sinonimi: ['mostarda', 'senape di digione'] }),
    i('salsa_soia', 'Salsa di soia', 'condimenti', 'ml', 'dispensa', 730, { formato: 150, allergeni: ['soia', 'glutine'], sinonimi: ['soia', 'shoyu', 'salsa teriyaki', 'tamari'] }),
    i('salsa_ostrica', 'Salsa di ostriche', 'condimenti', 'ml', 'dispensa', 365, { formato: 150, classi: ['pesce'], allergeni: ['molluschi', 'glutine', 'soia'], sinonimi: ['oyster sauce'] }),
    i('salsa_piccante', 'Salsa piccante', 'condimenti', 'ml', 'dispensa', 365, { formato: 150, sinonimi: ['tabasco', 'sriracha', 'salsa chili', 'harissa'] }),
    i('mirin', 'Mirin', 'condimenti', 'ml', 'dispensa', 730, { formato: 150, classi: ['alcol'], sinonimi: ['sake da cucina'] }),
  ]),

  // ───────── Colazione e dolci ─────────
  ...sezione('Caffè, tè e tisane', undefined, [
    i('caffe', 'Caffè', 'colazione', 'g', 'dispensa', 365, { formato: 250, sinonimi: ['caffe macinato', 'caffè moka', 'caffe in grani', 'caffe espresso'] }),
    i('caffe_capsule', 'Caffè in capsule', 'colazione', 'pz', 'dispensa', 365, { formato: 30, genitore: 'caffe', sinonimi: ['capsule', 'cialde', 'capsule caffe', 'cialde caffe'] }),
    i('caffe_solubile', 'Caffè solubile e orzo', 'colazione', 'g', 'dispensa', 730, { formato: 100, sinonimi: ['caffe solubile', 'orzo solubile', 'caffe d orzo', 'ginseng'] }),
    i('te', 'Tè', 'colazione', 'g', 'dispensa', 730, { formato: 50, sinonimi: ['te', 'the', 'tè nero', 'tè verde', 'bustine di te'] }),
    i('tisane', 'Tisane e camomilla', 'colazione', 'g', 'dispensa', 730, { formato: 30, sinonimi: ['camomilla', 'tisana', 'infuso', 'karkade'] }),
  ]),
  ...sezione('Colazione', 'dolci', [
    i('biscotti', 'Biscotti', 'colazione', 'g', 'dispensa', 180, glutine({ formato: 400, sinonimi: ['frollini', 'biscotti secchi', 'biscotti integrali', 'biscotti al cioccolato', 'wafer'] })),
    i('fette_biscottate', 'Fette biscottate', 'colazione', 'g', 'dispensa', 180, glutine({ formato: 315, dieta: 'pane', sinonimi: ['fette biscottate integrali'] })),
    i('cereali_colazione', 'Cereali per colazione', 'colazione', 'g', 'dispensa', 180, glutine({ formato: 375, dieta: 'cereali', sinonimi: ['corn flakes', 'muesli', 'cereali', 'granola', 'riso soffiato', 'special k'] })),
    i('fiocchi_avena', "Fiocchi d'avena", 'colazione', 'g', 'dispensa', 365, glutine({ formato: 500, dieta: 'cereali', sinonimi: ['fiocchi di avena', 'avena', 'porridge'] })),
    i('merendine', 'Merendine', 'colazione', 'g', 'dispensa', 90, { formato: 300, allergeni: ['glutine', 'uova', 'latte'], classi: ['uova', 'latticini'], sinonimi: ['merendina', 'cornetti', 'brioche', 'plumcake', 'crostatine', 'pan di stelle'] }),
    i('marmellata', 'Confettura', 'colazione', 'g', 'dispensa', 365, { formato: 340, sinonimi: ['marmellata', 'confettura extra', 'composta di frutta'] }),
    i('crema_spalmabile', 'Crema spalmabile', 'colazione', 'g', 'dispensa', 365, { formato: 400, allergeni: ['frutta_a_guscio', 'latte', 'soia'], classi: ['latticini'], sinonimi: ['nutella', 'crema alle nocciole', 'crema al cacao', 'burro di arachidi'] }),
    i('miele', 'Miele', 'colazione', 'g', 'dispensa', 730, { formato: 500, classi: ['miele'], sinonimi: ['miele di acacia', 'miele millefiori'] }),
    i('fette_torta', 'Torte e dolci pronti', 'colazione', 'g', 'dispensa', 30, { formato: 400, allergeni: ['glutine', 'uova', 'latte'], classi: ['uova', 'latticini'], sinonimi: ['panettone', 'pandoro', 'colomba', 'torta pronta', 'crostata'] }),
  ]),
  ...sezione('Per fare i dolci', 'dolci', [
    i('zucchero', 'Zucchero', 'colazione', 'g', 'dispensa', 1000, { formato: 1000, sinonimi: ['zucchero semolato', 'zucchero di canna', 'zucchero bianco', 'zucchero integrale'] }),
    i('zucchero_velo', 'Zucchero a velo', 'colazione', 'g', 'dispensa', 730, { formato: 250, genitore: 'zucchero' }),
    i('dolcificante', 'Dolcificante', 'colazione', 'g', 'dispensa', 730, { formato: 100, sinonimi: ['stevia', 'saccarina', 'eritritolo', 'sciroppo d acero'] }),
    i('cacao_amaro', 'Cacao amaro', 'colazione', 'g', 'dispensa', 365, { formato: 75, sinonimi: ['cacao', 'cacao in polvere'] }),
    i('cioccolato', 'Cioccolato fondente', 'colazione', 'g', 'dispensa', 365, { formato: 100, allergeni: ['latte', 'soia'], sinonimi: ['cioccolato', 'tavoletta di cioccolato', 'gocce di cioccolato', 'cioccolato extra fondente'] }),
    i('cioccolato_latte', 'Cioccolato al latte', 'colazione', 'g', 'dispensa', 365, { formato: 100, genitore: 'cioccolato', classi: ['latticini'], allergeni: ['latte', 'soia'], sinonimi: ['cioccolato bianco', 'cioccolatini'] }),
    i('lievito_dolci', 'Lievito per dolci', 'colazione', 'g', 'dispensa', 365, { formato: 16, sinonimi: ['lievito vanigliato', 'lievito in polvere', 'bicarbonato', 'cremor tartaro'] }),
    i('vaniglia', 'Vanillina', 'colazione', 'g', 'dispensa', 730, { formato: 2, sinonimi: ['vaniglia', 'baccello di vaniglia', 'estratto di vaniglia', 'aroma vaniglia'] }),
    i('savoiardi', 'Savoiardi', 'colazione', 'g', 'dispensa', 180, { formato: 400, allergeni: ['glutine', 'uova'], classi: ['uova'], sinonimi: ['pavesini'] }),
    i('amaretti', 'Amaretti', 'colazione', 'g', 'dispensa', 180, { formato: 200, allergeni: ['frutta_a_guscio', 'uova'], classi: ['uova'], sinonimi: ['amaretti di saronno', 'amaretti morbidi'] }),
    i('gelatina', 'Colla di pesce', 'colazione', 'g', 'dispensa', 730, { formato: 12, classi: ['carne', 'maiale'], sinonimi: ['gelatina in fogli', 'gelatina', 'gelatina alimentare'] }),
    i('agar_agar', 'Agar agar', 'colazione', 'g', 'dispensa', 730, { formato: 10, sinonimi: ['agar', 'gelificante vegetale'] }),
    i('canditi', 'Canditi', 'colazione', 'g', 'dispensa', 365, { formato: 100, sinonimi: ['frutta candita', 'scorza d arancia candita', 'cedro candito'] }),
    i('codette', 'Decorazioni per dolci', 'colazione', 'g', 'dispensa', 730, { formato: 50, sinonimi: ['codette', 'zuccherini', 'granella di zucchero', 'confettini'] }),
  ]),
  ...sezione('Frutta secca', 'frutta_secca', [
    i('noci', 'Noci', 'colazione', 'g', 'dispensa', 180, { formato: 200, allergeni: ['frutta_a_guscio'], sinonimi: ['gherigli di noce', 'noci sgusciate', 'noci pecan'] }),
    i('mandorle', 'Mandorle', 'colazione', 'g', 'dispensa', 365, { formato: 200, allergeni: ['frutta_a_guscio'], sinonimi: ['mandorle pelate', 'farina di mandorle', 'mandorle a lamelle'] }),
    i('nocciole', 'Nocciole', 'colazione', 'g', 'dispensa', 180, { formato: 150, allergeni: ['frutta_a_guscio'], sinonimi: ['nocciole tostate', 'granella di nocciole'] }),
    i('pistacchi', 'Pistacchi', 'colazione', 'g', 'dispensa', 180, { formato: 150, allergeni: ['frutta_a_guscio'], sinonimi: ['pistacchio', 'granella di pistacchio', 'pistacchi di bronte'] }),
    i('pinoli', 'Pinoli', 'colazione', 'g', 'dispensa', 180, { formato: 100, allergeni: ['frutta_a_guscio'] }),
    i('anacardi', 'Anacardi', 'colazione', 'g', 'dispensa', 180, { formato: 150, allergeni: ['frutta_a_guscio'], sinonimi: ['anacardi tostati', 'noci del brasile', 'noci di macadamia'] }),
    i('arachidi', 'Arachidi', 'colazione', 'g', 'dispensa', 180, { formato: 200, allergeni: ['arachidi'], sinonimi: ['noccioline', 'arachidi tostate', 'arachidi salate'] }),
    i('uvetta', 'Uvetta', 'colazione', 'g', 'dispensa', 365, { formato: 150, allergeni: ['solfiti'], sinonimi: ['uva passa', 'uva sultanina'] }),
    i('frutta_essiccata', 'Frutta essiccata', 'colazione', 'g', 'dispensa', 365, { formato: 200, dieta: 'frutta', sinonimi: ['datteri', 'fichi secchi', 'albicocche secche', 'prugne secche', 'mirtilli rossi essiccati'] }),
    i('cocco', 'Cocco rapè', 'colazione', 'g', 'dispensa', 365, { formato: 100, sinonimi: ['cocco grattugiato', 'farina di cocco', 'cocco disidratato'] }),
  ]),
  ...sezione('Snack e dolciumi', undefined, [
    i('patatine', 'Patatine e snack salati', 'colazione', 'g', 'dispensa', 120, { formato: 150, sinonimi: ['patatine', 'chips', 'pop corn', 'snack salati', 'tortilla chips', 'pizzette'] }),
    i('caramelle', 'Caramelle e dolciumi', 'colazione', 'g', 'dispensa', 365, { formato: 150, dieta: 'dolci', sinonimi: ['caramelle', 'gomme da masticare', 'chewing gum', 'liquirizia', 'barrette', 'snack al cioccolato'] }),
  ]),

  // ───────── Surgelati ─────────
  ...sezione('Verdure surgelate', 'verdura', [
    i('piselli', 'Piselli surgelati', 'surgelati', 'g', 'freezer', 365, { formato: 450, dieta: 'legumi', sinonimi: ['piselli', 'pisellini', 'piselli finissimi'] }),
    i('spinaci_surgelati', 'Spinaci surgelati', 'surgelati', 'g', 'freezer', 365, { formato: 750, genitore: 'spinaci', sinonimi: ['spinaci a cubetti', 'spinaci in foglia surgelati'] }),
    i('fagiolini_surgelati', 'Fagiolini surgelati', 'surgelati', 'g', 'freezer', 365, { formato: 750, genitore: 'fagiolini' }),
    i('minestrone_surgelato', 'Minestrone surgelato', 'surgelati', 'g', 'freezer', 365, { formato: 1000, allergeni: ['sedano'], sinonimi: ['minestrone', 'zuppa surgelata', 'passato di verdure'] }),
    i('verdure_surgelate', 'Verdure miste surgelate', 'surgelati', 'g', 'freezer', 365, { formato: 750, sinonimi: ['verdure grigliate surgelate', 'misto per soffritto', 'soffritto surgelato', 'verdure per contorno', 'carciofi surgelati', 'broccoli surgelati'] }),
    i('patatine_fritte', 'Patatine fritte surgelate', 'surgelati', 'g', 'freezer', 365, { formato: 750, dieta: 'patate', sinonimi: ['patatine fritte', 'patate surgelate', 'patate al forno surgelate', 'crocchette di patate'] }),
  ]),
  ...sezione('Pesce e carne surgelati', undefined, [
    i('pesce_surgelato', 'Filetti di pesce surgelati', 'surgelati', 'g', 'freezer', 365, pesce({ formato: 400, dieta: 'pesce', genitore: 'merluzzo', sinonimi: ['filetti surgelati', 'merluzzo surgelato', 'platessa surgelata', 'pesce surgelato'] })),
    i('bastoncini_pesce', 'Bastoncini di pesce', 'surgelati', 'g', 'freezer', 365, pesce({ formato: 450, dieta: 'pesce', allergeni: ['pesce', 'glutine'], sinonimi: ['bastoncini', 'fish sticks', 'cotolette di pesce'] })),
    i('gamberi_surgelati', 'Gamberi surgelati', 'surgelati', 'g', 'freezer', 365, crostaceo({ formato: 400, dieta: 'pesce', genitore: 'gamberi', sinonimi: ['gamberetti surgelati', 'code di gambero surgelate'] })),
    i('cotolette_pronte', 'Cotolette e panati pronti', 'surgelati', 'g', 'freezer', 365, carne({ formato: 400, dieta: 'carne_bianca', allergeni: ['glutine'], sinonimi: ['cotolette', 'nuggets', 'crocchette di pollo', 'cordon bleu', 'sofficini'] })),
  ]),
  ...sezione('Piatti pronti e dolci surgelati', undefined, [
    i('pizza_surgelata', 'Pizza surgelata', 'surgelati', 'g', 'freezer', 365, { formato: 350, allergeni: ['glutine', 'latte'], classi: ['latticini'], sinonimi: ['pizza', 'pizze surgelate', 'focaccia surgelata'] }),
    i('piatti_pronti_surgelati', 'Piatti pronti surgelati', 'surgelati', 'g', 'freezer', 365, { formato: 500, allergeni: ['glutine'], sinonimi: ['primi piatti surgelati', 'lasagne surgelate', 'risotto surgelato', 'involtini primavera', 'gyoza', 'ravioli cinesi'] }),
    i('gelato', 'Gelato', 'surgelati', 'g', 'freezer', 365, formaggio({ formato: 500, dieta: 'dolci', sinonimi: ['gelati', 'vaschetta di gelato', 'coni gelato', 'ghiaccioli', 'sorbetto'] })),
    i('ghiaccio', 'Ghiaccio', 'surgelati', 'g', 'freezer', 3650, { formato: 2000, sinonimi: ['cubetti di ghiaccio', 'ghiaccio in sacchetto'] }),
  ]),

  // ───────── Bevande ─────────
  ...sezione('Acqua e bibite', undefined, [
    i('acqua', 'Acqua', 'bevande', 'ml', 'dispensa', 3650, { base: true, sinonimi: ['acqua naturale', 'acqua minerale', 'acqua oligominerale'] }),
    i('acqua_frizzante', 'Acqua frizzante', 'bevande', 'ml', 'dispensa', 365, { formato: 9000, sinonimi: ['acqua gassata', 'acqua effervescente', 'acqua leggermente frizzante'] }),
    i('succo_frutta', 'Succhi di frutta', 'bevande', 'ml', 'dispensa', 365, { formato: 1000, dieta: 'frutta', sinonimi: ['succo', 'succo di frutta', 'succo d arancia', 'spremuta', 'nettare', 'succo ace'] }),
    i('bibite', 'Bibite', 'bevande', 'ml', 'dispensa', 365, { formato: 1500, sinonimi: ['coca cola', 'cola', 'aranciata', 'gassosa', 'chinotto', 'tè freddo', 'te freddo', 'acqua tonica', 'bibita'] }),
  ]),
  ...sezione('Vino, birra e alcolici', undefined, [
    i('vino_bianco', 'Vino bianco', 'bevande', 'ml', 'dispensa', 365, { formato: 750, classi: ['alcol'], allergeni: ['solfiti'], sinonimi: ['vino bianco secco', 'pinot grigio', 'vermentino', 'chardonnay'] }),
    i('vino_rosso', 'Vino rosso', 'bevande', 'ml', 'dispensa', 365, { formato: 750, classi: ['alcol'], allergeni: ['solfiti'], sinonimi: ['chianti', 'montepulciano', 'barbera', 'nero d avola', 'lambrusco'] }),
    i('spumante', 'Spumante', 'bevande', 'ml', 'dispensa', 365, { formato: 750, classi: ['alcol'], allergeni: ['solfiti'], sinonimi: ['prosecco', 'champagne', 'franciacorta', 'moscato'] }),
    i('birra', 'Birra', 'bevande', 'ml', 'dispensa', 180, { formato: 660, classi: ['alcol'], allergeni: ['glutine'], sinonimi: ['birre', 'birra chiara', 'birra rossa', 'birra analcolica'] }),
    i('marsala', 'Vini da cucina e liquori', 'bevande', 'ml', 'dispensa', 1000, { formato: 500, classi: ['alcol'], allergeni: ['solfiti'], sinonimi: ['marsala', 'brandy', 'cognac', 'rum', 'grappa', 'limoncello', 'amaro', 'liquore', 'vermouth', 'porto'] }),
    i('sake', 'Sake', 'bevande', 'ml', 'dispensa', 365, { formato: 300, classi: ['alcol'] }),
  ]),

  // ───────── Casa e igiene ─────────
  ...sezione('Casa e igiene', undefined, [
    i('detersivo_piatti', 'Detersivo per piatti', 'casa', 'pz', 'dispensa', 3650, { formato: 1, sinonimi: ['detersivo piatti', 'pastiglie lavastoviglie', 'brillantante', 'sale per lavastoviglie'] }),
    i('detersivo_bucato', 'Detersivo per bucato', 'casa', 'pz', 'dispensa', 3650, { formato: 1, sinonimi: ['detersivo lavatrice', 'ammorbidente', 'candeggina', 'smacchiatore'] }),
    i('detergenti_casa', 'Detergenti per la casa', 'casa', 'pz', 'dispensa', 3650, { formato: 1, sinonimi: ['sgrassatore', 'anticalcare', 'detersivo pavimenti', 'vetri', 'alcol denaturato', 'spugne'] }),
    i('carta_igienica', 'Carta igienica', 'casa', 'pz', 'dispensa', 3650, { formato: 4, sinonimi: ['rotoli carta igienica'] }),
    i('carta_cucina', 'Carta da cucina', 'casa', 'pz', 'dispensa', 3650, { formato: 2, sinonimi: ['scottex', 'tovaglioli', 'fazzoletti', 'rotoli carta cucina'] }),
    i('pellicola', 'Pellicola e alluminio', 'casa', 'pz', 'dispensa', 3650, { formato: 1, sinonimi: ['pellicola trasparente', 'carta alluminio', 'carta forno', 'sacchetti gelo', 'sacchetti freezer'] }),
    i('sacchi_spazzatura', 'Sacchi per la spazzatura', 'casa', 'pz', 'dispensa', 3650, { formato: 20, sinonimi: ['sacchetti immondizia', 'sacchi umido', 'sacchetti compostabili'] }),
    i('igiene_persona', 'Igiene personale', 'casa', 'pz', 'dispensa', 3650, { formato: 1, sinonimi: ['sapone', 'bagnoschiuma', 'shampoo', 'dentifricio', 'deodorante', 'spazzolino', 'assorbenti', 'pannolini'] }),
  ]),
];

export const INGREDIENTI_PER_ID: ReadonlyMap<string, Ingrediente> = new Map(INGREDIENTI.map((x) => [x.id, x]));

export function ingrediente(id: string | undefined): Ingrediente | undefined {
  return id ? INGREDIENTI_PER_ID.get(id) : undefined;
}

/** L'ingrediente e tutti i suoi antenati: un articolo di spaghetti vale per "spaghetti" e per "pasta". */
export function antenati(id: string): string[] {
  const catena: string[] = [];
  let corrente: string | undefined = id;
  while (corrente && !catena.includes(corrente)) {
    catena.push(corrente);
    corrente = INGREDIENTI_PER_ID.get(corrente)?.genitore;
  }
  return catena;
}

/** Il catalogo per reparto e sottocategoria, nell'ordine in cui è scritto, per sfogliarlo. */
export function catalogoPerReparto(): { reparto: Reparto; sottocategorie: { nome: string; voci: Ingrediente[] }[] }[] {
  const perReparto = new Map<Reparto, Map<string, Ingrediente[]>>();
  for (const ing of INGREDIENTI) {
    if (ing.base) continue;
    const sotto = perReparto.get(ing.reparto) ?? new Map<string, Ingrediente[]>();
    perReparto.set(ing.reparto, sotto);
    const nome = ing.sottocategoria ?? 'Altro';
    sotto.set(nome, [...(sotto.get(nome) ?? []), ing]);
  }
  return [...perReparto].map(([reparto, sotto]) => ({ reparto, sottocategorie: [...sotto].map(([nome, voci]) => ({ nome, voci })) }));
}
