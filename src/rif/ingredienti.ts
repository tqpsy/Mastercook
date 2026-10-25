/**
 * Tassonomia degli ingredienti generici (`ing:<slug>`), versione 1.
 *
 * È la chiave comune tra inventario, lista della spesa e ricette: "Latte Granarolo 1 l"
 * e "Latte Parmalat" sono prodotti diversi ma lo stesso ingrediente `ing:latte`.
 * - giorni: durata indicativa da chiuso, usata per la scadenza stimata quando manca la data;
 * - formato: confezione tipica nell'unità dell'ingrediente;
 * - allergeni: quelli che l'ingrediente contiene sempre o quasi (per i prodotti reali valgono quelli in etichetta);
 * - classi: servono al filtro delle restrizioni (vegetariano, vegano, senza maiale, senza alcol);
 * - genitore: un articolo di "spaghetti" conta anche come "pasta" nelle ricette.
 */
import type { Allergene } from '../dominio/allergeni';
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

const TUTTO_ANNO = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const ESTATE = [6, 7, 8, 9];
const AUTUNNO_INVERNO = [10, 11, 12, 1, 2, 3];

export const INGREDIENTI: Ingrediente[] = [
  // Frutta e verdura
  i('pomodoro', 'Pomodori', 'frutta_verdura', 'g', 'dispensa', 5, { peso_pz: 120, sinonimi: ['pomodoro', 'pomodori ramati', 'pomodori insalata'], mesi: ESTATE }),
  i('pomodorini', 'Pomodorini', 'frutta_verdura', 'g', 'frigo', 6, { formato: 250, sinonimi: ['ciliegini', 'datterini', 'pachino'], mesi: [5, 6, 7, 8, 9] }),
  i('patata', 'Patate', 'frutta_verdura', 'g', 'dispensa', 30, { peso_pz: 180, formato: 1500, sinonimi: ['patate'], mesi: TUTTO_ANNO }),
  i('cipolla', 'Cipolle', 'frutta_verdura', 'g', 'dispensa', 30, { peso_pz: 150, formato: 1000, sinonimi: ['cipolla', 'cipolle dorate', 'cipolle rosse'], mesi: TUTTO_ANNO }),
  i('aglio', 'Aglio', 'frutta_verdura', 'g', 'dispensa', 60, { peso_pz: 5, formato: 50, sinonimi: ['spicchio aglio'], mesi: TUTTO_ANNO }),
  i('carota', 'Carote', 'frutta_verdura', 'g', 'frigo', 21, { peso_pz: 80, formato: 1000, sinonimi: ['carote'], mesi: TUTTO_ANNO }),
  i('sedano', 'Sedano', 'frutta_verdura', 'g', 'frigo', 14, { formato: 500, allergeni: ['sedano'], mesi: TUTTO_ANNO }),
  i('zucchina', 'Zucchine', 'frutta_verdura', 'g', 'frigo', 7, { peso_pz: 200, formato: 500, sinonimi: ['zucchine', 'zucchina'], mesi: [5, 6, 7, 8, 9] }),
  i('melanzana', 'Melanzane', 'frutta_verdura', 'g', 'frigo', 7, { peso_pz: 300, sinonimi: ['melanzane'], mesi: ESTATE }),
  i('peperone', 'Peperoni', 'frutta_verdura', 'g', 'frigo', 7, { peso_pz: 200, sinonimi: ['peperoni'], mesi: ESTATE }),
  i('insalata', 'Insalata', 'frutta_verdura', 'g', 'frigo', 5, { formato: 250, sinonimi: ['lattuga', 'iceberg', 'misticanza', 'insalata in busta'], mesi: TUTTO_ANNO }),
  i('rucola', 'Rucola', 'frutta_verdura', 'g', 'frigo', 4, { formato: 125, mesi: TUTTO_ANNO }),
  i('spinaci', 'Spinaci', 'frutta_verdura', 'g', 'frigo', 4, { formato: 500, mesi: [10, 11, 12, 1, 2, 3, 4] }),
  i('broccoli', 'Broccoli', 'frutta_verdura', 'g', 'frigo', 5, { peso_pz: 400, sinonimi: ['broccolo'], mesi: AUTUNNO_INVERNO }),
  i('cavolfiore', 'Cavolfiore', 'frutta_verdura', 'g', 'frigo', 7, { peso_pz: 800, mesi: AUTUNNO_INVERNO }),
  i('zucca', 'Zucca', 'frutta_verdura', 'g', 'dispensa', 30, { formato: 1000, mesi: [9, 10, 11, 12, 1] }),
  i('funghi', 'Funghi champignon', 'frutta_verdura', 'g', 'frigo', 4, { formato: 400, sinonimi: ['funghi', 'champignon'], mesi: [9, 10, 11] }),
  i('fagiolini', 'Fagiolini', 'frutta_verdura', 'g', 'frigo', 5, { formato: 500, mesi: [5, 6, 7, 8, 9] }),
  i('cetriolo', 'Cetrioli', 'frutta_verdura', 'g', 'frigo', 7, { peso_pz: 250, sinonimi: ['cetriolo'], mesi: ESTATE }),
  i('finocchio', 'Finocchi', 'frutta_verdura', 'g', 'frigo', 10, { peso_pz: 300, sinonimi: ['finocchio'], mesi: AUTUNNO_INVERNO }),
  i('carciofo', 'Carciofi', 'frutta_verdura', 'g', 'frigo', 5, { peso_pz: 200, sinonimi: ['carciofo'], mesi: [11, 12, 1, 2, 3, 4] }),
  i('porro', 'Porri', 'frutta_verdura', 'g', 'frigo', 10, { peso_pz: 200, sinonimi: ['porro'], mesi: AUTUNNO_INVERNO }),
  i('basilico', 'Basilico', 'frutta_verdura', 'g', 'frigo', 5, { formato: 20, mesi: TUTTO_ANNO }),
  i('prezzemolo', 'Prezzemolo', 'frutta_verdura', 'g', 'frigo', 7, { formato: 30, mesi: TUTTO_ANNO }),
  i('rosmarino', 'Rosmarino', 'frutta_verdura', 'g', 'frigo', 10, { formato: 20, mesi: TUTTO_ANNO }),
  i('limone', 'Limoni', 'frutta_verdura', 'g', 'frigo', 21, { peso_pz: 120, formato: 500, sinonimi: ['limone'], mesi: TUTTO_ANNO }),
  i('mela', 'Mele', 'frutta_verdura', 'g', 'frigo', 30, { peso_pz: 180, formato: 1000, sinonimi: ['mela', 'golden', 'fuji', 'renetta'], mesi: [8, 9, 10, 11, 12, 1, 2, 3, 4] }),
  i('pera', 'Pere', 'frutta_verdura', 'g', 'frigo', 10, { peso_pz: 180, sinonimi: ['pera'], mesi: [8, 9, 10, 11, 12, 1] }),
  i('banana', 'Banane', 'frutta_verdura', 'g', 'dispensa', 5, { peso_pz: 150, formato: 1000, sinonimi: ['banana'], mesi: TUTTO_ANNO }),
  i('arancia', 'Arance', 'frutta_verdura', 'g', 'frigo', 21, { peso_pz: 200, formato: 2000, sinonimi: ['arancia'], mesi: [11, 12, 1, 2, 3, 4] }),
  i('kiwi', 'Kiwi', 'frutta_verdura', 'g', 'frigo', 14, { peso_pz: 80, formato: 500, mesi: [11, 12, 1, 2, 3, 4] }),
  i('fragole', 'Fragole', 'frutta_verdura', 'g', 'frigo', 3, { formato: 250, sinonimi: ['fragola'], mesi: [4, 5, 6] }),

  // Pane e forno
  i('pane', 'Pane', 'pane_forno', 'g', 'dispensa', 2, { formato: 500, allergeni: ['glutine'], sinonimi: ['pagnotta', 'filone', 'rosetta', 'baguette'] }),
  i('pancarre', 'Pancarrè', 'pane_forno', 'g', 'dispensa', 10, { formato: 400, allergeni: ['glutine'], sinonimi: ['pan carre', 'pane in cassetta', 'pane per tramezzini'] }),
  i('pane_grattugiato', 'Pangrattato', 'pane_forno', 'g', 'dispensa', 180, { formato: 500, allergeni: ['glutine'], sinonimi: ['pane grattugiato'] }),

  // Carne
  i('petto_pollo', 'Petto di pollo', 'carne', 'g', 'frigo', 2, { formato: 500, classi: ['carne'], genitore: 'pollo', sinonimi: ['fettine di pollo', 'pollo petto'] }),
  i('pollo', 'Pollo', 'carne', 'g', 'frigo', 2, { formato: 1000, classi: ['carne'], sinonimi: ['cosce di pollo', 'fusi di pollo', 'sovracosce'] }),
  i('tacchino', 'Fesa di tacchino', 'carne', 'g', 'frigo', 2, { formato: 400, classi: ['carne'], sinonimi: ['tacchino'] }),
  i('carne_macinata', 'Carne macinata', 'carne', 'g', 'frigo', 1, { formato: 500, classi: ['carne'], sinonimi: ['macinato', 'trita', 'macinato di manzo', 'macinato misto'] }),
  i('manzo', 'Manzo', 'carne', 'g', 'frigo', 2, { formato: 500, classi: ['carne'], sinonimi: ['fettine di manzo', 'bistecca', 'spezzatino'] }),
  i('maiale', 'Maiale', 'carne', 'g', 'frigo', 2, { formato: 500, classi: ['carne', 'maiale'], sinonimi: ['lonza', 'braciole', 'arista', 'costine'] }),
  i('salsiccia', 'Salsiccia', 'carne', 'g', 'frigo', 3, { formato: 400, classi: ['carne', 'maiale'], sinonimi: ['salsicce'] }),

  // Pesce
  i('salmone', 'Salmone', 'pesce', 'g', 'frigo', 1, { formato: 300, classi: ['pesce'], allergeni: ['pesce'], sinonimi: ['filetto di salmone', 'trancio di salmone'] }),
  i('merluzzo', 'Merluzzo', 'pesce', 'g', 'frigo', 1, { formato: 400, classi: ['pesce'], allergeni: ['pesce'], sinonimi: ['filetti di merluzzo', 'nasello'] }),
  i('orata', 'Orata', 'pesce', 'g', 'frigo', 1, { peso_pz: 400, classi: ['pesce'], allergeni: ['pesce'], sinonimi: ['branzino', 'spigola'] }),
  i('gamberi', 'Gamberi', 'pesce', 'g', 'frigo', 1, { formato: 300, classi: ['pesce'], allergeni: ['crostacei'], sinonimi: ['gamberetti', 'mazzancolle'] }),
  i('cozze', 'Cozze', 'pesce', 'g', 'frigo', 1, { formato: 1000, classi: ['pesce'], allergeni: ['molluschi'], sinonimi: ['muscoli'] }),

  // Salumi e formaggi
  i('prosciutto_cotto', 'Prosciutto cotto', 'gastronomia', 'g', 'frigo', 5, { formato: 100, classi: ['carne', 'maiale'], sinonimi: ['cotto'] }),
  i('prosciutto_crudo', 'Prosciutto crudo', 'gastronomia', 'g', 'frigo', 7, { formato: 100, classi: ['carne', 'maiale'], sinonimi: ['crudo', 'prosciutto di parma'] }),
  i('pancetta', 'Pancetta', 'gastronomia', 'g', 'frigo', 14, { formato: 150, classi: ['carne', 'maiale'], sinonimi: ['pancetta a cubetti', 'dadini di pancetta'] }),
  i('guanciale', 'Guanciale', 'gastronomia', 'g', 'frigo', 21, { formato: 200, classi: ['carne', 'maiale'] }),
  i('parmigiano', 'Parmigiano Reggiano', 'gastronomia', 'g', 'frigo', 60, { formato: 200, classi: ['latticini'], allergeni: ['latte'], sinonimi: ['parmigiano', 'grana padano', 'grana', 'formaggio grattugiato'] }),
  i('pecorino', 'Pecorino Romano', 'gastronomia', 'g', 'frigo', 60, { formato: 200, classi: ['latticini'], allergeni: ['latte'], sinonimi: ['pecorino'] }),
  i('mozzarella', 'Mozzarella', 'gastronomia', 'g', 'frigo', 4, { formato: 125, classi: ['latticini'], allergeni: ['latte'], sinonimi: ['fiordilatte', 'mozzarella di bufala'] }),
  i('ricotta', 'Ricotta', 'gastronomia', 'g', 'frigo', 5, { formato: 250, classi: ['latticini'], allergeni: ['latte'] }),
  i('mascarpone', 'Mascarpone', 'gastronomia', 'g', 'frigo', 10, { formato: 250, classi: ['latticini'], allergeni: ['latte'] }),

  // Latte, latticini e uova
  i('latte', 'Latte', 'latticini', 'ml', 'frigo', 6, { formato: 1000, classi: ['latticini'], allergeni: ['latte'], sinonimi: ['latte intero', 'latte parzialmente scremato', 'latte uht', 'latte fresco'] }),
  i('burro', 'Burro', 'latticini', 'g', 'frigo', 60, { formato: 250, classi: ['latticini'], allergeni: ['latte'] }),
  i('yogurt', 'Yogurt', 'latticini', 'g', 'frigo', 14, { formato: 125, classi: ['latticini'], allergeni: ['latte'], sinonimi: ['yogurt bianco', 'yogurt greco'] }),
  i('panna', 'Panna da cucina', 'latticini', 'ml', 'frigo', 30, { formato: 200, classi: ['latticini'], allergeni: ['latte'], sinonimi: ['panna'] }),
  i('uova', 'Uova', 'latticini', 'pz', 'frigo', 21, { formato: 6, peso_pz: 60, classi: ['uova'], allergeni: ['uova'], sinonimi: ['uovo', 'uova fresche'] }),

  // Pasta, riso e farine
  i('pasta', 'Pasta', 'pasta_riso', 'g', 'dispensa', 365, { formato: 500, allergeni: ['glutine'], sinonimi: ['pasta secca', 'rigatoni', 'mezze maniche', 'farfalle', 'linguine', 'bucatini'] }),
  i('spaghetti', 'Spaghetti', 'pasta_riso', 'g', 'dispensa', 365, { formato: 500, allergeni: ['glutine'], genitore: 'pasta', sinonimi: ['spaghettoni', 'vermicelli'] }),
  i('penne', 'Penne', 'pasta_riso', 'g', 'dispensa', 365, { formato: 500, allergeni: ['glutine'], genitore: 'pasta', sinonimi: ['penne rigate'] }),
  i('fusilli', 'Fusilli', 'pasta_riso', 'g', 'dispensa', 365, { formato: 500, allergeni: ['glutine'], genitore: 'pasta' }),
  i('pasta_uovo', "Pasta all'uovo", 'pasta_riso', 'g', 'dispensa', 180, { formato: 250, allergeni: ['glutine', 'uova'], classi: ['uova'], sinonimi: ['tagliatelle', 'fettuccine', 'pappardelle'] }),
  i('lasagne', 'Sfoglie per lasagne', 'pasta_riso', 'g', 'dispensa', 180, { formato: 500, allergeni: ['glutine', 'uova'], classi: ['uova'], sinonimi: ['lasagne'] }),
  i('gnocchi', 'Gnocchi di patate', 'pasta_riso', 'g', 'frigo', 20, { formato: 500, allergeni: ['glutine'], sinonimi: ['gnocchi'] }),
  i('riso', 'Riso', 'pasta_riso', 'g', 'dispensa', 365, { formato: 1000, sinonimi: ['riso parboiled', 'riso basmati'] }),
  i('riso_risotti', 'Riso per risotti', 'pasta_riso', 'g', 'dispensa', 365, { formato: 1000, genitore: 'riso', sinonimi: ['carnaroli', 'arborio', 'vialone nano'] }),
  i('farina', 'Farina 00', 'pasta_riso', 'g', 'dispensa', 180, { formato: 1000, allergeni: ['glutine'], sinonimi: ['farina', 'farina 0', 'farina di grano tenero'] }),
  i('lievito_birra', 'Lievito di birra', 'pasta_riso', 'g', 'frigo', 20, { formato: 25, sinonimi: ['lievito fresco'] }),

  // Conserve e legumi
  i('passata', 'Passata di pomodoro', 'conserve', 'g', 'dispensa', 365, { formato: 700, sinonimi: ['passata', 'salsa di pomodoro', 'polpa di pomodoro'] }),
  i('pelati', 'Pomodori pelati', 'conserve', 'g', 'dispensa', 730, { formato: 400, sinonimi: ['pelati'] }),
  i('ceci', 'Ceci', 'conserve', 'g', 'dispensa', 730, { formato: 400, sinonimi: ['ceci in scatola', 'ceci lessati'] }),
  i('fagioli', 'Fagioli', 'conserve', 'g', 'dispensa', 730, { formato: 400, sinonimi: ['borlotti', 'cannellini', 'fagioli in scatola'] }),
  i('lenticchie', 'Lenticchie', 'conserve', 'g', 'dispensa', 365, { formato: 500, sinonimi: ['lenticchie secche'] }),
  i('tonno_scatola', 'Tonno in scatola', 'conserve', 'g', 'dispensa', 1000, { formato: 160, classi: ['pesce'], allergeni: ['pesce'], sinonimi: ['tonno', "tonno all'olio", 'tonno al naturale'] }),
  i('olive', 'Olive', 'conserve', 'g', 'dispensa', 365, { formato: 200, sinonimi: ['olive nere', 'olive verdi', 'olive taggiasche'] }),
  i('capperi', 'Capperi', 'conserve', 'g', 'dispensa', 365, { formato: 100 }),

  // Olio, spezie e condimenti
  i('olio_evo', "Olio extravergine d'oliva", 'condimenti', 'ml', 'dispensa', 540, { formato: 1000, base: true, sinonimi: ['olio', 'olio evo', 'olio extra vergine', "olio d'oliva"] }),
  i('sale', 'Sale', 'condimenti', 'g', 'dispensa', 3650, { formato: 1000, base: true, sinonimi: ['sale fino', 'sale grosso'] }),
  i('pepe', 'Pepe nero', 'condimenti', 'g', 'dispensa', 730, { formato: 50, base: true, sinonimi: ['pepe'] }),
  i('aceto', 'Aceto di vino', 'condimenti', 'ml', 'dispensa', 1000, { formato: 1000, base: true, allergeni: ['solfiti'], sinonimi: ['aceto', 'aceto balsamico'] }),
  i('acqua', 'Acqua', 'bevande', 'ml', 'dispensa', 3650, { base: true, sinonimi: ['acqua naturale'] }),
  i('peperoncino', 'Peperoncino', 'condimenti', 'g', 'dispensa', 365, { formato: 30, sinonimi: ['peperoncino secco', 'peperoncino in polvere'] }),
  i('origano', 'Origano', 'condimenti', 'g', 'dispensa', 365, { formato: 20 }),
  i('dado', 'Dado vegetale', 'condimenti', 'g', 'dispensa', 365, { formato: 100, allergeni: ['sedano'], sinonimi: ['dado', 'brodo granulare', 'brodo vegetale'] }),

  // Colazione e dolci
  i('zucchero', 'Zucchero', 'colazione', 'g', 'dispensa', 1000, { formato: 1000, sinonimi: ['zucchero semolato', 'zucchero di canna'] }),
  i('miele', 'Miele', 'colazione', 'g', 'dispensa', 730, { formato: 500, classi: ['miele'] }),
  i('caffe', 'Caffè', 'colazione', 'g', 'dispensa', 365, { formato: 250, sinonimi: ['caffe macinato', 'caffè moka'] }),
  i('marmellata', 'Confettura', 'colazione', 'g', 'dispensa', 365, { formato: 340, sinonimi: ['marmellata', 'confettura extra'] }),
  i('biscotti', 'Biscotti', 'colazione', 'g', 'dispensa', 180, { formato: 400, allergeni: ['glutine'], sinonimi: ['frollini', 'biscotti secchi'] }),
  i('savoiardi', 'Savoiardi', 'colazione', 'g', 'dispensa', 180, { formato: 400, allergeni: ['glutine', 'uova'], classi: ['uova'] }),
  i('cacao_amaro', 'Cacao amaro', 'colazione', 'g', 'dispensa', 365, { formato: 75, sinonimi: ['cacao'] }),
  i('lievito_dolci', 'Lievito per dolci', 'colazione', 'g', 'dispensa', 365, { formato: 16, sinonimi: ['lievito vanigliato', 'lievito in polvere'] }),
  i('noci', 'Noci', 'colazione', 'g', 'dispensa', 180, { formato: 200, allergeni: ['frutta_a_guscio'], sinonimi: ['gherigli di noce'] }),
  i('mandorle', 'Mandorle', 'colazione', 'g', 'dispensa', 365, { formato: 200, allergeni: ['frutta_a_guscio'] }),

  // Surgelati
  i('piselli', 'Piselli surgelati', 'surgelati', 'g', 'freezer', 365, { formato: 450, sinonimi: ['piselli'] }),
  i('minestrone_surgelato', 'Minestrone surgelato', 'surgelati', 'g', 'freezer', 365, { formato: 1000, allergeni: ['sedano'], sinonimi: ['minestrone'] }),

  // Bevande
  i('vino_bianco', 'Vino bianco', 'bevande', 'ml', 'dispensa', 365, { formato: 750, classi: ['alcol'], allergeni: ['solfiti'] }),
  i('vino_rosso', 'Vino rosso', 'bevande', 'ml', 'dispensa', 365, { formato: 750, classi: ['alcol'], allergeni: ['solfiti'] }),

  // Aggiunti con le ricette nuove (versione 2)
  i('asparagi', 'Asparagi', 'frutta_verdura', 'g', 'frigo', 4, { formato: 500, sinonimi: ['asparago'], mesi: [3, 4, 5, 6] }),
  i('cavolo_nero', 'Cavolo nero', 'frutta_verdura', 'g', 'frigo', 5, { formato: 300, mesi: [10, 11, 12, 1, 2, 3] }),
  i('verza', 'Verza', 'frutta_verdura', 'g', 'frigo', 10, { peso_pz: 1000, sinonimi: ['cavolo verza', 'cavolo cappuccio'], mesi: [10, 11, 12, 1, 2, 3] }),
  i('cime_rapa', 'Cime di rapa', 'frutta_verdura', 'g', 'frigo', 4, { formato: 500, sinonimi: ['broccoletti', 'friarielli'], mesi: [11, 12, 1, 2, 3] }),
  i('bietole', 'Bietole', 'frutta_verdura', 'g', 'frigo', 4, { formato: 500, sinonimi: ['bieta', 'erbette'], mesi: TUTTO_ANNO }),
  i('radicchio', 'Radicchio', 'frutta_verdura', 'g', 'frigo', 7, { peso_pz: 250, sinonimi: ['radicchio trevisano', 'radicchio di chioggia'], mesi: [10, 11, 12, 1, 2, 3] }),
  i('cipollotto', 'Cipollotti', 'frutta_verdura', 'g', 'frigo', 7, { peso_pz: 30, formato: 150, sinonimi: ['cipollotto', 'cipolla di tropea', 'cipolla verde'], mesi: TUTTO_ANNO }),
  i('fave', 'Fave fresche', 'frutta_verdura', 'g', 'frigo', 4, { formato: 1000, sinonimi: ['fave'], mesi: [4, 5, 6] }),
  i('pak_choi', 'Pak choi', 'frutta_verdura', 'g', 'frigo', 5, { formato: 300, sinonimi: ['cavolo cinese', 'bok choy'], mesi: TUTTO_ANNO }),
  i('germogli_soia', 'Germogli di soia', 'frutta_verdura', 'g', 'frigo', 3, { formato: 200, allergeni: ['soia'], sinonimi: ['germogli'] }),
  i('zenzero', 'Zenzero fresco', 'frutta_verdura', 'g', 'frigo', 21, { formato: 100, sinonimi: ['zenzero'], mesi: TUTTO_ANNO }),
  i('coriandolo', 'Coriandolo fresco', 'frutta_verdura', 'g', 'frigo', 5, { formato: 30, sinonimi: ['coriandolo'], mesi: TUTTO_ANNO }),
  i('menta', 'Menta', 'frutta_verdura', 'g', 'frigo', 5, { formato: 20, mesi: TUTTO_ANNO }),
  i('aneto', 'Aneto', 'frutta_verdura', 'g', 'frigo', 5, { formato: 20, mesi: TUTTO_ANNO }),
  i('salvia', 'Salvia', 'frutta_verdura', 'g', 'frigo', 7, { formato: 20, mesi: TUTTO_ANNO }),
  i('pesca', 'Pesche', 'frutta_verdura', 'g', 'frigo', 5, { peso_pz: 150, sinonimi: ['pesca', 'pesche noci'], mesi: [6, 7, 8, 9] }),
  i('frutti_bosco', 'Frutti di bosco', 'frutta_verdura', 'g', 'frigo', 3, { formato: 125, sinonimi: ['mirtilli', 'lamponi', 'more'], mesi: [6, 7, 8, 9] }),
  i('castagne', 'Castagne', 'frutta_verdura', 'g', 'dispensa', 14, { formato: 500, sinonimi: ['marroni'], mesi: [10, 11, 12] }),
  i('pita', 'Pane pita', 'pane_forno', 'g', 'dispensa', 5, { formato: 300, allergeni: ['glutine'], sinonimi: ['pita', 'piadina', 'pane arabo'] }),
  i('pasta_sfoglia', 'Pasta sfoglia', 'pane_forno', 'g', 'frigo', 20, { formato: 230, allergeni: ['glutine'], sinonimi: ['sfoglia', 'pasta brisée', 'pasta brisee'] }),
  i('pasta_fillo', 'Pasta fillo', 'pane_forno', 'g', 'frigo', 30, { formato: 250, allergeni: ['glutine'], sinonimi: ['fillo', 'phyllo'] }),
  i('panko', 'Panko', 'pane_forno', 'g', 'dispensa', 180, { formato: 200, allergeni: ['glutine'], sinonimi: ['pangrattato giapponese'] }),
  i('vitello', 'Vitello', 'carne', 'g', 'frigo', 2, { formato: 500, classi: ['carne'], sinonimi: ['fesa di vitello', 'fettine di vitello', 'ossobuco'] }),
  i('agnello', 'Agnello', 'carne', 'g', 'frigo', 2, { formato: 800, classi: ['carne'], sinonimi: ['abbacchio', 'costolette di agnello'] }),
  i('coniglio', 'Coniglio', 'carne', 'g', 'frigo', 2, { formato: 1200, classi: ['carne'] }),
  i('vongole', 'Vongole', 'pesce', 'g', 'frigo', 1, { formato: 1000, classi: ['pesce'], allergeni: ['molluschi'], sinonimi: ['lupini di mare'] }),
  i('calamari', 'Calamari', 'pesce', 'g', 'frigo', 1, { formato: 500, classi: ['pesce'], allergeni: ['molluschi'], sinonimi: ['totani', 'seppie', 'anelli di calamaro'] }),
  i('polpo', 'Polpo', 'pesce', 'g', 'frigo', 1, { formato: 1000, classi: ['pesce'], allergeni: ['molluschi'], sinonimi: ['polipo'] }),
  i('acciughe', 'Acciughe', 'pesce', 'g', 'frigo', 1, { formato: 300, classi: ['pesce'], allergeni: ['pesce'], sinonimi: ['alici', 'acciughe sott’olio'] }),
  i('baccala', 'Baccalà', 'pesce', 'g', 'frigo', 3, { formato: 500, classi: ['pesce'], allergeni: ['pesce'], sinonimi: ['baccala ammollato', 'stoccafisso'] }),
  i('tonno_fresco', 'Tonno fresco', 'pesce', 'g', 'frigo', 1, { formato: 300, classi: ['pesce'], allergeni: ['pesce'], sinonimi: ['trancio di tonno'] }),
  i('speck', 'Speck', 'gastronomia', 'g', 'frigo', 21, { formato: 100, classi: ['carne', 'maiale'] }),
  i('bresaola', 'Bresaola', 'gastronomia', 'g', 'frigo', 7, { formato: 100, classi: ['carne'] }),
  i('gorgonzola', 'Gorgonzola', 'gastronomia', 'g', 'frigo', 10, { formato: 200, classi: ['latticini'], allergeni: ['latte'] }),
  i('scamorza', 'Scamorza', 'gastronomia', 'g', 'frigo', 14, { formato: 250, classi: ['latticini'], allergeni: ['latte'], sinonimi: ['provola', 'provola affumicata'] }),
  i('fontina', 'Fontina', 'gastronomia', 'g', 'frigo', 21, { formato: 250, classi: ['latticini'], allergeni: ['latte'], sinonimi: ['formaggio da fondere', 'asiago'] }),
  i('feta', 'Feta', 'gastronomia', 'g', 'frigo', 21, { formato: 200, classi: ['latticini'], allergeni: ['latte'] }),
  i('paneer', 'Paneer', 'gastronomia', 'g', 'frigo', 7, { formato: 200, classi: ['latticini'], allergeni: ['latte'], sinonimi: ['formaggio indiano'] }),
  i('tofu', 'Tofu', 'gastronomia', 'g', 'frigo', 14, { formato: 250, allergeni: ['soia'] }),
  i('yogurt_greco', 'Yogurt greco', 'latticini', 'g', 'frigo', 14, { formato: 500, classi: ['latticini'], allergeni: ['latte'], genitore: 'yogurt' }),
  i('farro', 'Farro', 'pasta_riso', 'g', 'dispensa', 365, { formato: 500, allergeni: ['glutine'], sinonimi: ['farro perlato'] }),
  i('orzo', 'Orzo perlato', 'pasta_riso', 'g', 'dispensa', 365, { formato: 500, allergeni: ['glutine'], sinonimi: ['orzo'] }),
  i('polenta', 'Farina di mais', 'pasta_riso', 'g', 'dispensa', 365, { formato: 500, sinonimi: ['polenta', 'polenta istantanea', 'farina gialla'] }),
  i('semola', 'Semola di grano duro', 'pasta_riso', 'g', 'dispensa', 365, { formato: 1000, allergeni: ['glutine'], sinonimi: ['semola rimacinata'] }),
  i('farina_ceci', 'Farina di ceci', 'pasta_riso', 'g', 'dispensa', 365, { formato: 500 }),
  i('pasta_ripiena', 'Pasta ripiena', 'pasta_riso', 'g', 'frigo', 20, { formato: 250, allergeni: ['glutine', 'uova', 'latte'], classi: ['uova', 'latticini'], sinonimi: ['tortellini', 'ravioli', 'tortelloni'] }),
  i('noodles', 'Noodles di grano', 'pasta_riso', 'g', 'dispensa', 365, { formato: 250, allergeni: ['glutine'], sinonimi: ['noodles', 'udon', 'ramen', 'tagliolini cinesi'] }),
  i('noodles_riso', 'Spaghetti di riso', 'pasta_riso', 'g', 'dispensa', 365, { formato: 250, sinonimi: ['noodles di riso', 'vermicelli di riso'] }),
  i('soba', 'Soba', 'pasta_riso', 'g', 'dispensa', 365, { formato: 250, allergeni: ['glutine'], sinonimi: ['spaghetti di grano saraceno'] }),
  i('riso_basmati', 'Riso basmati', 'pasta_riso', 'g', 'dispensa', 365, { formato: 1000, genitore: 'riso', sinonimi: ['basmati'] }),
  i('riso_sushi', 'Riso per sushi', 'pasta_riso', 'g', 'dispensa', 365, { formato: 1000, genitore: 'riso', sinonimi: ['riso giapponese', 'riso originario'] }),
  i('amido_mais', 'Amido di mais', 'pasta_riso', 'g', 'dispensa', 730, { formato: 250, sinonimi: ['maizena', 'fecola'] }),
  i('lenticchie_rosse', 'Lenticchie rosse', 'conserve', 'g', 'dispensa', 365, { formato: 500, genitore: 'lenticchie', sinonimi: ['lenticchie decorticate'] }),
  i('latte_cocco', 'Latte di cocco', 'conserve', 'ml', 'dispensa', 730, { formato: 400, sinonimi: ['crema di cocco'] }),
  i('concentrato', 'Concentrato di pomodoro', 'conserve', 'g', 'dispensa', 730, { formato: 130, sinonimi: ['doppio concentrato'] }),
  i('pesto', 'Pesto alla genovese', 'conserve', 'g', 'frigo', 30, { formato: 190, classi: ['latticini'], allergeni: ['latte', 'frutta_a_guscio'], sinonimi: ['pesto'] }),
  i('alga_nori', 'Alga nori', 'conserve', 'g', 'dispensa', 365, { formato: 25, sinonimi: ['nori', 'fogli di alga'] }),
  i('salsa_soia', 'Salsa di soia', 'condimenti', 'ml', 'dispensa', 730, { formato: 150, allergeni: ['soia', 'glutine'], sinonimi: ['soia', 'shoyu'] }),
  i('salsa_ostrica', 'Salsa di ostriche', 'condimenti', 'ml', 'dispensa', 365, { formato: 150, classi: ['pesce'], allergeni: ['molluschi', 'glutine', 'soia'], sinonimi: ['oyster sauce'] }),
  i('miso', 'Miso', 'condimenti', 'g', 'frigo', 180, { formato: 300, allergeni: ['soia'], sinonimi: ['pasta di miso'] }),
  i('aceto_riso', 'Aceto di riso', 'condimenti', 'ml', 'dispensa', 730, { formato: 250 }),
  i('mirin', 'Mirin', 'condimenti', 'ml', 'dispensa', 730, { formato: 150, classi: ['alcol'], sinonimi: ['sake da cucina'] }),
  i('dashi', 'Dashi granulare', 'condimenti', 'g', 'dispensa', 365, { formato: 50, classi: ['pesce'], allergeni: ['pesce'], sinonimi: ['brodo dashi'] }),
  i('olio_sesamo', 'Olio di sesamo', 'condimenti', 'ml', 'dispensa', 365, { formato: 250, allergeni: ['sesamo'] }),
  i('semi_sesamo', 'Semi di sesamo', 'condimenti', 'g', 'dispensa', 365, { formato: 100, allergeni: ['sesamo'], sinonimi: ['sesamo', 'gomasio'] }),
  i('olio_semi', 'Olio di semi', 'condimenti', 'ml', 'dispensa', 365, { formato: 1000, sinonimi: ['olio di arachidi', 'olio di girasole', 'olio per friggere'] }),
  i('curry', 'Curry in polvere', 'condimenti', 'g', 'dispensa', 365, { formato: 50, allergeni: ['senape'], sinonimi: ['curry'] }),
  i('garam_masala', 'Garam masala', 'condimenti', 'g', 'dispensa', 365, { formato: 50, sinonimi: ['masala'] }),
  i('curcuma', 'Curcuma', 'condimenti', 'g', 'dispensa', 365, { formato: 50 }),
  i('cumino', 'Cumino', 'condimenti', 'g', 'dispensa', 365, { formato: 50, sinonimi: ['semi di cumino'] }),
  i('paprika', 'Paprika', 'condimenti', 'g', 'dispensa', 365, { formato: 50, sinonimi: ['paprika dolce', 'paprika affumicata'] }),
  i('cannella', 'Cannella', 'condimenti', 'g', 'dispensa', 730, { formato: 30, sinonimi: ['cannella in polvere', 'stecca di cannella'] }),
  i('noce_moscata', 'Noce moscata', 'condimenti', 'g', 'dispensa', 730, { formato: 30 }),
  i('alloro', 'Alloro', 'condimenti', 'g', 'dispensa', 365, { formato: 10, sinonimi: ['foglie di alloro'] }),
  i('timo', 'Timo', 'condimenti', 'g', 'dispensa', 365, { formato: 10 }),
  i('zafferano', 'Zafferano', 'condimenti', 'g', 'dispensa', 730, { formato: 1, sinonimi: ['bustina di zafferano', 'pistilli di zafferano'] }),
  i('pinoli', 'Pinoli', 'colazione', 'g', 'dispensa', 180, { formato: 100, allergeni: ['frutta_a_guscio'] }),
  i('anacardi', 'Anacardi', 'colazione', 'g', 'dispensa', 180, { formato: 150, allergeni: ['frutta_a_guscio'] }),
  i('arachidi', 'Arachidi', 'colazione', 'g', 'dispensa', 180, { formato: 200, allergeni: ['arachidi'], sinonimi: ['noccioline'] }),
  i('nocciole', 'Nocciole', 'colazione', 'g', 'dispensa', 180, { formato: 150, allergeni: ['frutta_a_guscio'] }),
  i('cioccolato', 'Cioccolato fondente', 'colazione', 'g', 'dispensa', 365, { formato: 100, allergeni: ['latte', 'soia'], sinonimi: ['cioccolato', 'cioccolato al latte'] }),
  i('zucchero_velo', 'Zucchero a velo', 'colazione', 'g', 'dispensa', 730, { formato: 250, genitore: 'zucchero' }),
  i('vaniglia', 'Vanillina', 'colazione', 'g', 'dispensa', 730, { formato: 2, sinonimi: ['vaniglia', 'baccello di vaniglia', 'estratto di vaniglia'] }),
  i('amaretti', 'Amaretti', 'colazione', 'g', 'dispensa', 180, { formato: 200, allergeni: ['frutta_a_guscio', 'uova'], classi: ['uova'] }),
  i('uvetta', 'Uvetta', 'colazione', 'g', 'dispensa', 365, { formato: 150, allergeni: ['solfiti'], sinonimi: ['uva passa', 'uva sultanina'] }),
  i('gelatina', 'Colla di pesce', 'colazione', 'g', 'dispensa', 730, { formato: 12, classi: ['pesce'], sinonimi: ['gelatina in fogli', 'gelatina'] }),
  i('panna_montare', 'Panna fresca da montare', 'latticini', 'ml', 'frigo', 10, { formato: 250, classi: ['latticini'], allergeni: ['latte'], sinonimi: ['panna fresca', 'panna montata'] }),
  i('spinaci_surgelati', 'Spinaci surgelati', 'surgelati', 'g', 'freezer', 365, { formato: 750, genitore: 'spinaci', sinonimi: ['spinaci surgelati', 'spinaci a cubetti'] }),
  i('sake', 'Sake', 'bevande', 'ml', 'dispensa', 365, { formato: 300, classi: ['alcol'] }),
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
