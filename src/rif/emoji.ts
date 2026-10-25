import type { Portata } from '../dominio/tipi';
import { ingrediente } from './ingredienti';
import type { Reparto } from './reparti';

export const PER_INGREDIENTE: Record<string, string> = {
  'ing:pomodoro': '🍅', 'ing:pomodorini': '🍅', 'ing:patata': '🥔', 'ing:cipolla': '🧅', 'ing:aglio': '🧄', 'ing:carota': '🥕',
  'ing:zucchina': '🥒', 'ing:cetriolo': '🥒', 'ing:melanzana': '🍆', 'ing:peperone': '🫑', 'ing:insalata': '🥬', 'ing:rucola': '🥬',
  'ing:spinaci': '🥬', 'ing:broccoli': '🥦', 'ing:funghi': '🍄', 'ing:limone': '🍋', 'ing:mela': '🍎', 'ing:pera': '🍐',
  'ing:banana': '🍌', 'ing:arancia': '🍊', 'ing:kiwi': '🥝', 'ing:fragole': '🍓', 'ing:basilico': '🌿', 'ing:prezzemolo': '🌿',
  'ing:rosmarino': '🌿', 'ing:pane': '🥖', 'ing:pancarre': '🍞', 'ing:pollo': '🍗', 'ing:petto_pollo': '🍗', 'ing:salsiccia': '🌭',
  'ing:gamberi': '🦐', 'ing:cozze': '🦪', 'ing:latte': '🥛', 'ing:burro': '🧈', 'ing:uova': '🥚', 'ing:riso': '🍚',
  'ing:riso_risotti': '🍚', 'ing:farina': '🌾', 'ing:zucchero': '🍬', 'ing:miele': '🍯', 'ing:caffe': '☕', 'ing:olio_evo': '🫒',
  'ing:olive': '🫒', 'ing:vino_bianco': '🍷', 'ing:vino_rosso': '🍷', 'ing:mozzarella': '🧀', 'ing:parmigiano': '🧀',
  'ing:pecorino': '🧀', 'ing:ricotta': '🧀', 'ing:mascarpone': '🧀', 'ing:biscotti': '🍪', 'ing:savoiardi': '🍪', 'ing:noci': '🌰',
  'ing:mandorle': '🌰', 'ing:nocciole': '🌰', 'ing:anacardi': '🌰', 'ing:arachidi': '🥜', 'ing:pinoli': '🌰', 'ing:castagne': '🌰',
  'ing:asparagi': '🥬', 'ing:zenzero': '🫚', 'ing:pesca': '🍑', 'ing:frutti_bosco': '🫐', 'ing:pita': '🫓', 'ing:polpo': '🐙',
  'ing:calamari': '🦑', 'ing:vongole': '🦪', 'ing:feta': '🧀', 'ing:gorgonzola': '🧀', 'ing:scamorza': '🧀', 'ing:fontina': '🧀',
  'ing:paneer': '🧀', 'ing:noodles': '🍜', 'ing:noodles_riso': '🍜', 'ing:soba': '🍜', 'ing:riso_basmati': '🍚', 'ing:riso_sushi': '🍙',
  'ing:alga_nori': '🍙', 'ing:latte_cocco': '🥥', 'ing:cioccolato': '🍫', 'ing:salsa_soia': '🫙', 'ing:peperoncino': '🌶️', 'ing:ceci': '🫘', 'ing:fagioli': '🫘', 'ing:lenticchie': '🫘', 'ing:zucca': '🎃', 'ing:sale': '🧂',
  // Voci aggiunte con il catalogo più fine (versione 3)
  'ing:cipollotto': '🧅', 'ing:scalogno': '🧅', 'ing:porro': '🧅', 'ing:mais': '🌽', 'ing:mais_pannocchia': '🌽', 'ing:avocado': '🥑',
  'ing:patata_dolce': '🍠', 'ing:porcini': '🍄', 'ing:funghi_misti': '🍄', 'ing:funghi_secchi': '🍄', 'ing:funghi_sottolio': '🍄',
  'ing:valeriana': '🥬', 'ing:radicchio': '🥬', 'ing:indivia': '🥬', 'ing:cicoria': '🥬', 'ing:bietole': '🥬', 'ing:cavolo_nero': '🥬',
  'ing:verza': '🥬', 'ing:cavolo_cappuccio': '🥬', 'ing:cavolfiore': '🥦', 'ing:romanesco': '🥦', 'ing:cime_rapa': '🥦',
  'ing:cavolini_bruxelles': '🥦', 'ing:spinaci_surgelati': '🥬', 'ing:fagiolini': '🫛', 'ing:taccole': '🫛', 'ing:piselli': '🫛',
  'ing:piselli_freschi': '🫛', 'ing:fave': '🫛', 'ing:soia_edamame': '🫛', 'ing:menta': '🌿', 'ing:salvia': '🌿', 'ing:aneto': '🌿',
  'ing:coriandolo': '🌿', 'ing:erba_cipollina': '🌿', 'ing:maggiorana': '🌿', 'ing:alloro': '🌿', 'ing:timo': '🌿', 'ing:origano': '🌿',
  'ing:albicocca': '🍑', 'ing:susine': '🫐', 'ing:ciliegie': '🍒', 'ing:uva': '🍇', 'ing:anguria': '🍉', 'ing:melone': '🍈',
  'ing:mandarino': '🍊', 'ing:pompelmo': '🍊', 'ing:lime': '🍋', 'ing:ananas': '🍍', 'ing:mango': '🥭', 'ing:cocco': '🥥',
  'ing:pane_integrale': '🍞', 'ing:piadina': '🫓', 'ing:tortillas': '🫓', 'ing:focaccia': '🫓', 'ing:grissini': '🥖', 'ing:crackers': '🍘',
  'ing:pasta_pizza': '🍕', 'ing:pizza_surgelata': '🍕', 'ing:cosce_pollo': '🍗', 'ing:ali_pollo': '🍗', 'ing:tacchino': '🍗',
  'ing:manzo': '🥩', 'ing:bistecca': '🥩', 'ing:vitello': '🥩', 'ing:hamburger': '🍔', 'ing:maiale': '🥩', 'ing:costine_maiale': '🍖',
  'ing:braciole_maiale': '🍖', 'ing:agnello': '🍖', 'ing:ossobuco': '🍖', 'ing:wurstel': '🌭', 'ing:pancetta': '🥓', 'ing:guanciale': '🥓',
  'ing:prosciutto_crudo': '🥓', 'ing:prosciutto_cotto': '🥓', 'ing:speck': '🥓', 'ing:salmone': '🍣', 'ing:salmone_affumicato': '🍣',
  'ing:tonno_fresco': '🍣', 'ing:mazzancolle': '🦐', 'ing:gamberoni': '🦐', 'ing:scampi': '🦐', 'ing:gamberi_surgelati': '🦐',
  'ing:canocchie': '🦐', 'ing:astice': '🦞', 'ing:granchio': '🦀', 'ing:surimi': '🦀', 'ing:telline': '🦪', 'ing:cannolicchi': '🦪',
  'ing:fasolari': '🦪', 'ing:ostriche': '🦪', 'ing:capesante': '🐚', 'ing:moscardini': '🐙', 'ing:totani': '🦑', 'ing:seppie': '🦑',
  'ing:frutti_mare': '🦐', 'ing:sardine': '🐟', 'ing:acciughe': '🐟', 'ing:sgombro': '🐟', 'ing:bastoncini_pesce': '🐟',
  'ing:mozzarella_bufala': '🧀', 'ing:burrata': '🧀', 'ing:stracciatella': '🧀', 'ing:grana_padano': '🧀', 'ing:pecorino_dolce': '🧀',
  'ing:provolone': '🧀', 'ing:caciocavallo': '🧀', 'ing:asiago': '🧀', 'ing:emmental': '🧀', 'ing:cheddar': '🧀', 'ing:taleggio': '🧀',
  'ing:brie': '🧀', 'ing:stracchino': '🧀', 'ing:robiola': '🧀', 'ing:primosale': '🧀', 'ing:sottilette': '🧀', 'ing:spalmabile': '🧀',
  'ing:latte_senza_lattosio': '🥛', 'ing:bevanda_soia': '🥛', 'ing:bevanda_avena': '🥛', 'ing:bevanda_mandorla': '🥛', 'ing:bevanda_riso': '🥛',
  'ing:yogurt': '🥛', 'ing:yogurt_greco': '🥛', 'ing:kefir': '🥛', 'ing:panna': '🥛', 'ing:panna_montare': '🥛', 'ing:budino': '🍮',
  'ing:albumi': '🥚', 'ing:pasta': '🍝', 'ing:spaghetti': '🍝', 'ing:linguine': '🍝', 'ing:bucatini': '🍝', 'ing:pasta_uovo': '🍝',
  'ing:tortellini': '🥟', 'ing:ravioli': '🥟', 'ing:pasta_ripiena': '🥟', 'ing:riso_integrale': '🍚', 'ing:couscous': '🌾',
  'ing:farina_manitoba': '🌾', 'ing:farina_integrale': '🌾', 'ing:semola': '🌾', 'ing:fiocchi_avena': '🌾', 'ing:cereali_colazione': '🥣',
  'ing:passata': '🥫', 'ing:polpa_pomodoro': '🥫', 'ing:pelati': '🥫', 'ing:tonno_scatola': '🥫', 'ing:sgombro_scatola': '🥫',
  'ing:fagioli_borlotti': '🫘', 'ing:fagioli_cannellini': '🫘', 'ing:lenticchie_rosse': '🫘', 'ing:fave_secche': '🫘', 'ing:lupini': '🫘',
  'ing:pistacchi': '🌰', 'ing:frutta_essiccata': '🍇', 'ing:uvetta': '🍇', 'ing:crema_spalmabile': '🍫', 'ing:cioccolato_latte': '🍫',
  'ing:cacao_amaro': '🍫', 'ing:merendine': '🥐', 'ing:fette_torta': '🍰', 'ing:fette_biscottate': '🍞', 'ing:caramelle': '🍬',
  'ing:patatine': '🍟', 'ing:patatine_fritte': '🍟', 'ing:gelato': '🍨', 'ing:ghiaccio': '🧊', 'ing:caffe_capsule': '☕',
  'ing:caffe_solubile': '☕', 'ing:te': '🍵', 'ing:tisane': '🍵', 'ing:acqua': '💧', 'ing:acqua_frizzante': '💧', 'ing:succo_frutta': '🧃',
  'ing:bibite': '🥤', 'ing:birra': '🍺', 'ing:spumante': '🍾', 'ing:marsala': '🥃', 'ing:sake': '🍶', 'ing:maionese': '🫙',
  'ing:ketchup': '🫙', 'ing:senape': '🫙', 'ing:olio_semi': '🫗', 'ing:olio_sesamo': '🫗', 'ing:pepe': '🧂', 'ing:paprika': '🌶️',
  'ing:salsa_piccante': '🌶️', 'ing:tofu': '🧈', 'ing:margarina': '🧈', 'ing:carta_igienica': '🧻', 'ing:carta_cucina': '🧻',
  'ing:detersivo_piatti': '🧴', 'ing:detersivo_bucato': '🧺', 'ing:detergenti_casa': '🧽', 'ing:igiene_persona': '🧼',
  'ing:sacchi_spazzatura': '🗑️', 'ing:pellicola': '📦', 'ing:mortadella': '🥓', 'ing:salame': '🥓', 'ing:coppa': '🥓', 'ing:lardo': '🥓',
  'ing:nduja': '🌶️', 'ing:porchetta': '🍖', 'ing:cotechino': '🍖', 'ing:bresaola': '🥩', 'ing:tacchino_affettato': '🍗', 'ing:seitan': '🌾',
  'ing:hummus': '🫘',
};

const PER_REPARTO: Record<Reparto, string> = {
  frutta_verdura: '🥬', pane_forno: '🥖', gastronomia: '🧀', carne: '🥩', pesce: '🐟', latticini: '🥛', pasta_riso: '🍝',
  conserve: '🥫', condimenti: '🫙', colazione: '🍪', surgelati: '🧊', bevande: '🧃', casa: '🧽', altro: '🛒',
};

export function emojiReparto(reparto: Reparto): string {
  return PER_REPARTO[reparto];
}

export function emojiIngrediente(id: string | undefined, reparto?: Reparto): string {
  if (id && PER_INGREDIENTE[id]) return PER_INGREDIENTE[id]!;
  return PER_REPARTO[ingrediente(id)?.reparto ?? reparto ?? 'altro'];
}

export const EMOJI_PORTATA: Record<Portata, string> = {
  antipasto: '🥗', primo: '🍝', secondo: '🍽️', contorno: '🥦', piatto_unico: '🥘', dolce: '🍰', colazione: '☕',
};

export const NOME_PORTATA: Record<Portata, string> = {
  antipasto: 'Antipasto', primo: 'Primo', secondo: 'Secondo', contorno: 'Contorno', piatto_unico: 'Piatto unico', dolce: 'Dolce', colazione: 'Colazione',
};
