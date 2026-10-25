/**
 * Collegamento tra i dati di Open Food Facts e i dati di Masterfood:
 * categorie OFF → ingrediente generico, allergeni OFF → codici UE, additivi → livello di rischio.
 * Il rischio degli additivi è una prima proposta (fonti EFSA da confermare nella taratura della genuinità).
 */
import type { Allergene } from '../dominio/allergeni';
import type { RischioAdditivi } from '../dominio/genuinita';

export const CATEGORIE_OFF: Record<string, string> = {
  'en:milks': 'latte', 'en:uht-milks': 'latte', 'en:fresh-milks': 'latte', 'en:semi-skimmed-milks': 'latte', 'en:whole-milks': 'latte',
  'en:pastas': 'pasta', 'en:dry-pastas': 'pasta', 'en:spaghetti': 'spaghetti', 'en:penne': 'penne', 'en:fusilli': 'fusilli',
  'en:egg-pastas': 'pasta_uovo', 'en:tagliatelle': 'pasta_uovo', 'en:lasagna-sheets': 'lasagne', 'en:lasagne': 'lasagne',
  'en:gnocchi': 'gnocchi', 'en:potato-gnocchi': 'gnocchi',
  'en:rices': 'riso', 'en:risotto-rices': 'riso_risotti', 'en:arborio-rices': 'riso_risotti', 'en:carnaroli-rices': 'riso_risotti',
  'en:flours': 'farina', 'en:wheat-flours': 'farina', 'en:breadcrumbs': 'pane_grattugiato',
  'en:breads': 'pane', 'en:sliced-breads': 'pancarre', 'en:sandwich-breads': 'pancarre',
  'en:tomato-sauces': 'passata', 'en:tomato-purees': 'passata', 'en:strained-tomatoes': 'passata', 'en:tomato-passata': 'passata',
  'en:peeled-tomatoes': 'pelati', 'en:canned-tomatoes': 'pelati',
  'en:chickpeas': 'ceci', 'en:canned-chickpeas': 'ceci', 'en:common-beans': 'fagioli', 'en:beans': 'fagioli', 'en:canned-beans': 'fagioli',
  'en:lentils': 'lenticchie', 'en:canned-tunas': 'tonno_scatola', 'en:tunas': 'tonno_scatola',
  'en:olives': 'olive', 'en:capers': 'capperi',
  'en:olive-oils': 'olio_evo', 'en:extra-virgin-olive-oils': 'olio_evo', 'en:vinegars': 'aceto', 'en:salts': 'sale',
  'en:bouillon-cubes': 'dado', 'en:stock-cubes': 'dado', 'en:black-peppers': 'pepe',
  'en:butters': 'burro', 'en:yogurts': 'yogurt', 'en:cooking-creams': 'panna', 'en:creams': 'panna', 'en:eggs': 'uova', 'en:chicken-eggs': 'uova',
  'en:mozzarella': 'mozzarella', 'en:parmigiano-reggiano': 'parmigiano', 'en:pecorino': 'pecorino',
  'en:pecorino-romano': 'pecorino', 'en:ricotta': 'ricotta', 'en:mascarpone': 'mascarpone',
  'en:cooked-hams': 'prosciutto_cotto', 'en:prosciutto': 'prosciutto_crudo', 'en:dry-cured-hams': 'prosciutto_crudo', 'en:pancetta': 'pancetta',
  'en:biscuits': 'biscotti', 'en:cookies': 'biscotti', 'en:ladyfingers': 'savoiardi',
  'en:coffees': 'caffe', 'en:ground-coffees': 'caffe', 'en:jams': 'marmellata', 'en:honeys': 'miele', 'en:sugars': 'zucchero',
  'en:cocoa-powders': 'cacao_amaro', 'en:baking-powders': 'lievito_dolci', 'en:bakers-yeasts': 'lievito_birra',
  'en:frozen-peas': 'piselli', 'en:peas': 'piselli', 'en:frozen-minestrone': 'minestrone_surgelato',
  'en:walnuts': 'noci', 'en:almonds': 'mandorle', 'en:white-wines': 'vino_bianco', 'en:red-wines': 'vino_rosso',
  'en:waters': 'acqua', 'en:mineral-waters': 'acqua', 'en:bananas': 'banana', 'en:apples': 'mela',
  // Catalogo più fine (versione 3): le categorie più specifiche vincono perché si leggono dall'ultima.
  'en:grana-padano': 'grana_padano', 'en:buffalo-mozzarella': 'mozzarella_bufala', 'en:mozzarella-di-bufala-campana': 'mozzarella_bufala',
  'en:burrata': 'burrata', 'en:stracciatella': 'stracciatella', 'en:stracchino': 'stracchino', 'en:crescenza': 'stracchino',
  'en:robiola': 'robiola', 'en:goat-cheeses': 'robiola', 'en:cream-cheeses': 'spalmabile', 'en:spreadable-cheeses': 'spalmabile',
  'en:cottage-cheeses': 'fiocchi_latte', 'en:feta': 'feta', 'en:gorgonzola': 'gorgonzola', 'en:blue-cheeses': 'gorgonzola',
  'en:taleggio': 'taleggio', 'en:fontina': 'fontina', 'en:scamorza': 'scamorza', 'en:provola': 'scamorza', 'en:provolone': 'provolone',
  'en:caciocavallo': 'caciocavallo', 'en:asiago': 'asiago', 'en:montasio': 'asiago', 'en:emmental': 'emmental', 'en:emmentaler': 'emmental',
  'en:gruyere': 'emmental', 'en:cheddar': 'cheddar', 'en:gouda': 'cheddar', 'en:edam': 'cheddar', 'en:brie': 'brie', 'en:camembert': 'brie',
  'en:processed-cheese-slices': 'sottilette', 'en:sliced-cheeses': 'sottilette', 'en:pecorino-sardo': 'pecorino_dolce', 'en:pecorino-toscano': 'pecorino_dolce',
  'en:lactose-free-milks': 'latte_senza_lattosio', 'en:soy-milks': 'bevanda_soia', 'en:soy-beverages': 'bevanda_soia', 'en:oat-milks': 'bevanda_avena',
  'en:oat-based-drinks': 'bevanda_avena', 'en:almond-milks': 'bevanda_mandorla', 'en:almond-based-drinks': 'bevanda_mandorla', 'en:rice-milks': 'bevanda_riso',
  'en:greek-yogurts': 'yogurt_greco', 'en:skyr': 'yogurt_greco', 'en:kefir': 'kefir', 'en:puddings': 'budino', 'en:whipping-creams': 'panna_montare',
  'en:bechamel-sauces': 'besciamella', 'en:margarines': 'margarina',
  'en:linguine': 'linguine', 'en:bucatini': 'bucatini', 'en:rigatoni': 'rigatoni', 'en:farfalle': 'farfalle', 'en:paccheri': 'paccheri',
  'en:orecchiette': 'orecchiette', 'en:trofie': 'trofie', 'en:ditalini': 'ditalini', 'en:soup-pastas': 'pastina', 'en:wholewheat-pastas': 'pasta_integrale',
  'en:whole-wheat-pastas': 'pasta_integrale', 'en:gluten-free-pastas': 'pasta_senza_glutine', 'en:tortellini': 'tortellini', 'en:ravioli': 'ravioli',
  'en:stuffed-pastas': 'pasta_ripiena', 'en:fresh-pastas': 'pasta_uovo', 'en:noodles': 'noodles', 'en:rice-noodles': 'noodles_riso',
  'en:basmati-rices': 'riso_basmati', 'en:brown-rices': 'riso_integrale', 'en:wholegrain-rices': 'riso_integrale', 'en:couscous': 'couscous',
  'en:quinoa': 'quinoa', 'en:spelt': 'farro', 'en:barley': 'orzo', 'en:polenta': 'polenta', 'en:corn-flours': 'polenta', 'en:manitoba-flours': 'farina_manitoba',
  'en:wholemeal-flours': 'farina_integrale', 'en:durum-wheat-semolinas': 'semola', 'en:corn-starches': 'amido_mais', 'en:potato-starches': 'amido_mais',
  'en:dried-yeasts': 'lievito_secco',
  'en:wholemeal-breads': 'pane_integrale', 'en:piadina': 'piadina', 'en:tortillas': 'tortillas', 'en:wraps': 'tortillas', 'en:focaccias': 'focaccia',
  'en:breadsticks': 'grissini', 'en:crackers': 'crackers', 'en:taralli': 'taralli', 'en:rice-cakes': 'gallette', 'en:puff-pastries': 'pasta_sfoglia',
  'en:shortcrust-pastries': 'pasta_brisee', 'en:pizza-doughs': 'pasta_pizza', 'en:rusks': 'fette_biscottate', 'en:breakfast-cereals': 'cereali_colazione',
  'en:mueslis': 'cereali_colazione', 'en:rolled-oats': 'fiocchi_avena', 'en:oat-flakes': 'fiocchi_avena', 'en:hazelnut-spreads': 'crema_spalmabile',
  'en:cocoa-and-hazelnuts-spreads': 'crema_spalmabile', 'en:peanut-butters': 'crema_spalmabile', 'en:dark-chocolates': 'cioccolato',
  'en:milk-chocolates': 'cioccolato_latte', 'en:white-chocolates': 'cioccolato_latte', 'en:amaretti': 'amaretti', 'en:pistachios': 'pistacchi',
  'en:hazelnuts': 'nocciole', 'en:cashew-nuts': 'anacardi', 'en:peanuts': 'arachidi', 'en:pine-nuts': 'pinoli', 'en:raisins': 'uvetta',
  'en:dried-fruits': 'frutta_essiccata', 'en:dates': 'frutta_essiccata', 'en:chips-and-fries': 'patatine', 'en:crisps': 'patatine',
  'en:candies': 'caramelle', 'en:chewing-gum': 'caramelle', 'en:teas': 'te', 'en:green-teas': 'te', 'en:herbal-teas': 'tisane',
  'en:coffee-capsules': 'caffe_capsule', 'en:instant-coffees': 'caffe_solubile', 'en:sweeteners': 'dolcificante', 'en:icing-sugars': 'zucchero_velo',
  'en:pastries': 'merendine', 'en:croissants': 'merendine', 'en:panettone': 'fette_torta', 'en:pandoro': 'fette_torta',
  'en:mussels': 'cozze', 'en:clams': 'vongole', 'en:oysters': 'ostriche', 'en:scallops': 'capesante', 'en:octopus': 'polpo', 'en:squids': 'calamari',
  'en:cuttlefish': 'seppie', 'en:shrimps': 'gamberi', 'en:prawns': 'gamberi', 'en:frozen-shrimps': 'gamberi_surgelati', 'en:langoustines': 'scampi',
  'en:lobsters': 'astice', 'en:crabs': 'granchio', 'en:surimi': 'surimi', 'en:seafood': 'frutti_mare', 'en:frozen-seafood': 'frutti_mare',
  'en:smoked-salmons': 'salmone_affumicato', 'en:salmons': 'salmone', 'en:cods': 'merluzzo', 'en:salt-cod': 'baccala', 'en:sea-breams': 'orata',
  'en:sea-basses': 'branzino', 'en:swordfish': 'pesce_spada', 'en:trouts': 'trota', 'en:anchovies': 'acciughe_sottolio', 'en:canned-anchovies': 'acciughe_sottolio',
  'en:canned-mackerels': 'sgombro_scatola', 'en:mackerels': 'sgombro', 'en:canned-sardines': 'sardine_scatola', 'en:sardines': 'sardine',
  'en:canned-salmons': 'salmone_scatola', 'en:fish-fingers': 'bastoncini_pesce', 'en:frozen-fish-fillets': 'pesce_surgelato', 'en:bottarga': 'bottarga',
  'en:salami': 'salame', 'en:mortadella': 'mortadella', 'en:speck': 'speck', 'en:bresaola': 'bresaola', 'en:coppa': 'coppa', 'en:guanciale': 'guanciale',
  'en:bacon': 'pancetta', 'en:lard': 'lardo', 'en:nduja': 'nduja', 'en:porchetta': 'porchetta', 'en:frankfurters': 'wurstel', 'en:sausages': 'salsiccia',
  'en:cotechino': 'cotechino', 'en:zampone': 'cotechino', 'en:sliced-turkey': 'tacchino_affettato', 'en:turkey-breast-cold-cuts': 'tacchino_affettato',
  'en:chicken-breasts': 'petto_pollo', 'en:chicken-legs': 'cosce_pollo', 'en:chicken-wings': 'ali_pollo', 'en:chickens': 'pollo', 'en:turkeys': 'tacchino',
  'en:beef': 'manzo', 'en:minced-beef': 'carne_macinata', 'en:minced-meats': 'carne_macinata', 'en:burgers': 'hamburger', 'en:hamburgers': 'hamburger',
  'en:veal': 'vitello', 'en:pork': 'maiale', 'en:lamb': 'agnello', 'en:rabbits': 'coniglio', 'en:breaded-chicken': 'cotolette_pronte', 'en:nuggets': 'cotolette_pronte',
  'en:diced-tomatoes': 'polpa_pomodoro', 'en:chopped-tomatoes': 'polpa_pomodoro', 'en:tomato-pastes': 'concentrato', 'en:dried-tomatoes': 'pomodori_secchi',
  'en:sun-dried-tomatoes': 'pomodori_secchi', 'en:borlotti-beans': 'fagioli_borlotti', 'en:cannellini-beans': 'fagioli_cannellini', 'en:white-beans': 'fagioli_cannellini',
  'en:red-lentils': 'lenticchie_rosse', 'en:broad-beans': 'fave_secche', 'en:lupin-beans': 'lupini', 'en:edamame': 'soia_edamame', 'en:sweet-corn': 'mais',
  'en:canned-corn': 'mais', 'en:artichoke-hearts': 'carciofini', 'en:pickles': 'sottaceti', 'en:pickled-vegetables': 'sottaceti', 'en:dried-mushrooms': 'funghi_secchi',
  'en:pestos': 'pesto', 'en:pesto-alla-genovese': 'pesto', 'en:pasta-sauces': 'sugo_pronto', 'en:bolognese-sauces': 'ragu_pronto', 'en:coconut-milks': 'latte_cocco',
  'en:broths': 'brodo_pronto', 'en:hummus': 'hummus', 'en:tofu': 'tofu', 'en:seitan': 'seitan',
  'en:sunflower-oils': 'olio_semi', 'en:peanut-oils': 'olio_semi', 'en:vegetable-oils': 'olio_semi', 'en:sesame-oils': 'olio_sesamo',
  'en:balsamic-vinegars': 'aceto_balsamico', 'en:mayonnaises': 'maionese', 'en:ketchup': 'ketchup', 'en:mustards': 'senape', 'en:soy-sauces': 'salsa_soia',
  'en:hot-sauces': 'salsa_piccante', 'en:paprika': 'paprika', 'en:curry-powders': 'curry', 'en:cinnamon': 'cannella', 'en:saffron': 'zafferano',
  'en:sesame-seeds': 'semi_sesamo', 'en:seeds': 'semi_misti',
  'en:frozen-spinach': 'spinaci_surgelati', 'en:frozen-green-beans': 'fagiolini_surgelati', 'en:frozen-vegetables': 'verdure_surgelate',
  'en:frozen-fries': 'patatine_fritte', 'en:french-fries': 'patatine_fritte', 'en:frozen-pizzas': 'pizza_surgelata', 'en:pizzas': 'pizza_surgelata',
  'en:frozen-ready-meals': 'piatti_pronti_surgelati', 'en:ice-creams': 'gelato', 'en:sorbets': 'gelato',
  'en:sparkling-waters': 'acqua_frizzante', 'en:carbonated-waters': 'acqua_frizzante', 'en:fruit-juices': 'succo_frutta', 'en:juices-and-nectars': 'succo_frutta',
  'en:sodas': 'bibite', 'en:colas': 'bibite', 'en:iced-teas': 'bibite', 'en:beers': 'birra', 'en:sparkling-wines': 'spumante', 'en:proseccos': 'spumante',
  'en:liqueurs': 'marsala', 'en:fortified-wines': 'marsala',
  'en:oranges': 'arancia', 'en:lemons': 'limone', 'en:pears': 'pera', 'en:kiwis': 'kiwi', 'en:strawberries': 'fragole', 'en:tomatoes': 'pomodoro',
  'en:cherry-tomatoes': 'pomodorini', 'en:potatoes': 'patata', 'en:onions': 'cipolla', 'en:carrots': 'carota', 'en:zucchini': 'zucchina',
  'en:salads': 'insalata', 'en:rocket': 'rucola', 'en:lamb-s-lettuces': 'valeriana', 'en:spinachs': 'spinaci', 'en:mushrooms': 'funghi',
  'en:porcini-mushrooms': 'porcini', 'en:avocados': 'avocado', 'en:grapes': 'uva', 'en:pineapples': 'ananas', 'en:mangoes': 'mango',
  'en:dishwashing-liquids': 'detersivo_piatti', 'en:dishwasher-tablets': 'detersivo_piatti', 'en:laundry-detergents': 'detersivo_bucato',
  'en:toilet-papers': 'carta_igienica', 'en:paper-towels': 'carta_cucina',
};

export const ALLERGENI_OFF: Record<string, Allergene> = {
  'en:gluten': 'glutine', 'en:crustaceans': 'crostacei', 'en:eggs': 'uova', 'en:fish': 'pesce', 'en:peanuts': 'arachidi',
  'en:soybeans': 'soia', 'en:milk': 'latte', 'en:nuts': 'frutta_a_guscio', 'en:celery': 'sedano', 'en:mustard': 'senape',
  'en:sesame-seeds': 'sesamo', 'en:sulphur-dioxide-and-sulphites': 'solfiti', 'en:lupin': 'lupini', 'en:molluscs': 'molluschi',
};

const ELEVATO = new Set(['e171', 'e249', 'e250', 'e251', 'e252', 'e102', 'e110', 'e122', 'e124', 'e129', 'e104']);
const MODERATO = new Set([
  'e621', 'e951', 'e950', 'e955', 'e954', 'e320', 'e321', 'e338', 'e339', 'e340', 'e341', 'e450', 'e451', 'e452', 'e407', 'e433', 'e466', 'e150c', 'e150d',
]);

/** Rischio più alto tra gli additivi (codici OFF "en:e250"). Lista vuota e conteggio noto = nessuno. */
export function rischioAdditivi(tag: readonly string[] | undefined, numero: number | undefined): RischioAdditivi | undefined {
  if (!tag || tag.length === 0) return numero === 0 ? 'nessuno' : undefined;
  let rischio: RischioAdditivi = 'basso';
  for (const t of tag) {
    const codice = t.replace(/^en:/, '').replace(/[^a-z0-9]/g, '').toLowerCase();
    const base = codice.match(/^e\d+[a-z]?/)?.[0] ?? codice;
    if (ELEVATO.has(base) || ELEVATO.has(base.replace(/[a-z]$/, ''))) return 'elevato';
    if (MODERATO.has(base) || MODERATO.has(base.replace(/[a-z]$/, ''))) rischio = 'moderato';
  }
  return rischio;
}
