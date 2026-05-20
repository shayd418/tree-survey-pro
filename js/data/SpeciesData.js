/**
 * SpeciesData.js
 * =================================================================
 * נטען ראשון. מכיל:
 *   SPECIES_K        — מקדמי k לחישוב ערך עץ (נוהל 2024)
 *   DEFAULT_K_BY_SCORE — k ברירת מחדל לפי ניקוד מין
 *   Global state vars — currentProjectId, rowCounter, unsaved, autoSaveTimer
 *   genId()          — יצירת ID ייחודי לפרויקט
 *   SPECIES_DATA     — מאגר מינים (גרסת דמו: 15 דוגמאות מתוך 600+)
 *   TREE_LIST        — רשימת מינים לאוטוקומפליט (גרסת דמו: 25 דוגמאות מתוך 800+)
 *
 * להוספת מין חדש:
 *   SPECIES_K:    הוסף 'latin name': k_value
 *   SPECIES_DATA: הוסף "שם עברי, Latin name": {"k":..., "t":1, "s":...}
 *   TREE_LIST:    הוסף "שם עברי, Latin name"
 * =================================================================
 */

// ═══════════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════════

// Ministry of Agriculture base value table by trunk diameter (₪, 2024 rates)
// Species coefficients: V = k × Σ(d²) × (health/5) × (location/5) × count
// Derived from Ministry of Agriculture pricing, verified against example report
const SPECIES_K = {
  // ── Pines ──
  'pinus pinea':              12.874,
  'אורן הגלעין':              12.874,
  'pinus halepensis':          8.007,
  'אורן ירושלים':              8.007,
  'pinus brutia':             10.362,
  'אורן קפריסאי':             10.362,
  // ── Olive / Ficus ──
  'ficus carica':             10.676,
  'פיקוס התאנה':              10.676,
  'olea europaea':            13.346,
  'זית אירופי':               13.346,
  // ── Cypress ──
  'cupressus macrocarpa':      7.538,
  'ברוש גדול-פירות':           7.538,
  'ברוש גדול פירות':           7.538,
  'cupressus sempervirens':   13.190,
  'ברוש מצוי':                13.190,
  // ── Celtis ──
  'celtis australis':         13.820,
  'מיש דרומי':                13.820,
  'celtis bungeana':          12.875,
  'מיש בונגה':                12.875,
  // ── Almond ──
  'amygdalus communis':       10.3619,
  'שקד מצוי':                 10.3619,
  // ── Elm ──
  'ulmus pumila':              6.5941,
  'בוקיצה נמוכה':              6.5941,
  // ── Ailanthus (invasive — low k) ──
  'ailanthus altissima':       0,
  'אילנטה בלוטית':             0,
  'אילנתה בלוטית':             0,
  // ── Washingtonia ──
  'washingtonia robusta':      4.200,
  'ווושינגטוניה חסונה':        4.200,
  'washingtonia filifera':     4.200,
  // ── Cercis ──
  'cercis siliquastrum':      12.403,
  'כליל החורש':               12.403,
  // ── Jacaranda ──
  'jacaranda mimosifolia':    11.920,
  'סיגלון עלי-מימוסה':        11.920,
  // ── Fraxinus ──
  'fraxinus syriaca':         12.716,
  'מילה סורית':               12.716,
  // ── Ceratonia ──
  'ceratonia siliqua':        11.932,
  'חרוב מצוי':                11.932,
  // ── Schinus ──
  'schinus molle':             7.850,
  'פלפלון בכות':               7.850,
};

// Default k per specVal score for unknown species
const K_BY_SPECVAL = { 1: 3.4, 2: 6.8, 3: 10.2, 4: 13.6, 5: 17.0 };

const STATUS_OPTS = ['', 'כריתה', 'שימור', 'העתקה', 'לא נדרש ברישיון'];
const SCORE_OPTS = [0, 1, 2, 3, 4, 5];

// ═══════════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════════
let currentProjectId = null;
let rowCounter = 0;
let unsaved = false;
let autoSaveTimer = null;

// ═══════════════════════════════════════════════════════════════
//  STORAGE HELPERS
// ═══════════════════════════════════════════════════════════════

function genId() {
  return 'proj_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

// ═══════════════════════════════════════════════════════════════

/* ── Species database (demo: 15 representative entries out of 600+ in full version) ── */
const SPECIES_DATA = {
  "Unknown":                                  {"k": 0.0,  "t": 1, "s": 0},
  "אורן הגלעין, Pinus pinea":                 {"k": 0.82, "t": 1, "s": 4},
  "אורן ירושלים, Pinus halepensis":           {"k": 0.51, "t": 1, "s": 3},
  "זית אירופי, Olea europaea":                {"k": 0.85, "t": 1, "s": 4},
  "ברוש מצוי, Cupressus sempervirens":        {"k": 0.84, "t": 1, "s": 4},
  "חרוב מצוי, Ceratonia siliqua":             {"k": 0.76, "t": 1, "s": 4},
  "כליל החורש, Cercis siliquastrum":          {"k": 0.79, "t": 1, "s": 4},
  "סיגלון עלי-מימוסה, Jacaranda mimosifolia": {"k": 0.76, "t": 1, "s": 4},
  "מייש דרומי, Celtis australis":             {"k": 0.88, "t": 1, "s": 4},
  "דולב מזרחי, Platanus orientalis":          {"k": 0.78, "t": 1, "s": 4},
  "אלון מצוי, Quercus calliprino":            {"k": 0.93, "t": 1, "s": 5},
  "פיקוס השקמה, Ficus sycomorus":             {"k": 0.85, "t": 1, "s": 4},
  "תמר מצוי, Phoenix dactylifera":            {"k": 0.71, "t": 2, "s": 2},
  "שיזף מצוי, Zizphus spina-christi":         {"k": 0.80, "t": 1, "s": 4},
  "אילנתה בלוטית, Ailanthus altissima":       {"k": 0.0,  "t": 1, "s": 0},
  // Full production database contains 600+ species with calibrated k-values
};

/* ── Species list for autocomplete (demo: 25 entries out of 800+ in full version) ── */
const TREE_LIST = [
  'אורן הגלעין, Pinus pinea',
  'אורן ירושלים, Pinus halepensis',
  'אורן קפריסאי, Pinus brutia',
  'זית אירופי, Olea europaea',
  'ברוש מצוי, Cupressus sempervirens',
  'ברוש גדול-פירות, Cupressus macrocarpa',
  'חרוב מצוי, Ceratonia siliqua',
  'כליל החורש, Cercis siliquastrum',
  'סיגלון עלי-מימוסה, Jacaranda mimosifolia',
  'מייש דרומי, Celtis australis',
  'מייש בונגה, Celtis bungeana',
  'דולב מזרחי, Platanus orientalis',
  'דולב אדרי, Platanus acerifolia',
  'אלון מצוי, Quercus calliprino',
  'אלון התבור, Quercus ithaburensis',
  'פיקוס השקמה, Ficus sycomorus',
  'פיקוס בנימינה, Ficus benjamina',
  'תמר מצוי, Phoenix dactylifera',
  'תמר קנרי, Phoenix canariensis',
  'שיזף מצוי, Zizphus spina-christi',
  'שקד מצוי, Amygdalus communis',
  'מילה סורית, Fraxinus syriaca',
  'פלפלון בכות, Schinus molle',
  'וושינגטוניה חסונה, Washingtonia robusta',
  'אילנתה בלוטית, Ailanthus altissima',
  // Full autocomplete list contains 800+ species
];

/* ── Namespace ── */
const SpeciesData = {
  SPECIES_K, K_BY_SPECVAL, STATUS_OPTS, SCORE_OPTS,
  SPECIES_DATA, TREE_LIST, genId,
};
