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
  'en:mozzarella': 'mozzarella', 'en:parmigiano-reggiano': 'parmigiano', 'en:grana-padano': 'parmigiano', 'en:pecorino': 'pecorino',
  'en:pecorino-romano': 'pecorino', 'en:ricotta': 'ricotta', 'en:mascarpone': 'mascarpone',
  'en:cooked-hams': 'prosciutto_cotto', 'en:prosciutto': 'prosciutto_crudo', 'en:dry-cured-hams': 'prosciutto_crudo', 'en:pancetta': 'pancetta',
  'en:biscuits': 'biscotti', 'en:cookies': 'biscotti', 'en:ladyfingers': 'savoiardi',
  'en:coffees': 'caffe', 'en:ground-coffees': 'caffe', 'en:jams': 'marmellata', 'en:honeys': 'miele', 'en:sugars': 'zucchero',
  'en:cocoa-powders': 'cacao_amaro', 'en:baking-powders': 'lievito_dolci', 'en:bakers-yeasts': 'lievito_birra',
  'en:frozen-peas': 'piselli', 'en:peas': 'piselli', 'en:frozen-minestrone': 'minestrone_surgelato',
  'en:walnuts': 'noci', 'en:almonds': 'mandorle', 'en:white-wines': 'vino_bianco', 'en:red-wines': 'vino_rosso',
  'en:waters': 'acqua', 'en:mineral-waters': 'acqua', 'en:bananas': 'banana', 'en:apples': 'mela',
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
