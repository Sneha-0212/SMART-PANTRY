/**
 * ============================================================================
 * SMART PANTRY - RECIPE ENGINE (Recipe Suggestions module)
 *
 * Pure functions only: no DOM access, no storage access, no network.
 * Input is an inventory array and a recipe array; output is plain objects.
 *
 * HOW A RECIPE IS SCORED
 * ----------------------
 *   required     = recipe ingredients that are not optional and not a staple
 *   available    = required ingredients found in the (non-expired) inventory
 *   matchPercent = available / required * 100
 *   useSoonCount = recipe ingredients in stock whose inventory status is "use_soon"
 *
 *   score = matchPercent * W_MATCH
 *         + min(useSoonCount * USE_SOON_BONUS, USE_SOON_CAP)
 *
 * With the defaults (0.6, 15, 40) a recipe at 100% match scores 60 and each
 * Use Soon ingredient it consumes adds 15, up to +40. So a recipe that is
 * 75% available but saves three Use Soon items (45 + 40 = 85) beats a plain
 * 100% recipe that saves none (60).
 *
 * Ties are broken by shorter total time, then by name.
 * ============================================================================
 */
(function (root) {
  'use strict';

  // --------------------------------------------------------------------------
  // TUNABLE CONSTANTS
  // --------------------------------------------------------------------------
  const W_MATCH = 0.6;               // weight of the ingredient match percentage
  const USE_SOON_BONUS = 15;         // points per in-stock "use_soon" ingredient
  const USE_SOON_CAP = 40;           // maximum bonus a recipe can earn
  const ALMOST_READY_MIN = 50;       // "Almost Ready" starts at this match %
  const QUICK_MEAL_MAX_MINUTES = 30; // "Quick Meals" = prep + cook <= this

  // Ingredients assumed to be in every kitchen. They are shown in the recipe
  // but never count as "missing". Edit this list to suit your pantry.
  const STAPLES = [
    'salt', 'black pepper', 'water', 'oil', 'cooking oil', 'vegetable oil',
    'olive oil', 'sugar', 'turmeric powder', 'red chilli powder',
    'cumin seeds', 'cumin powder', 'mustard seeds', 'garam masala',
    'coriander powder', 'cardamom'
  ];

  // --------------------------------------------------------------------------
  // NAME NORMALISATION
  // "Organic Whole Milk" -> "milk", "Tomatoes" -> "tomato",
  // "Baby Spinach" -> "spinach", "Greek Yogurt (Plain)" -> "yogurt"
  // --------------------------------------------------------------------------
  const MODIFIERS = new Set([
    'organic', 'fresh', 'ripe', 'whole', 'plain', 'large', 'small', 'medium',
    'baby', 'raw', 'chopped', 'diced', 'sliced', 'boiled', 'cooked', 'frozen',
    'unsalted', 'greek', 'low', 'fat', 'full', 'natural', 'big', 'grated'
  ]);

  // Applied AFTER modifiers are removed and words are singularised.
  const SYNONYMS = {
    'curd': 'yogurt', 'dahi': 'yogurt', 'yoghurt': 'yogurt',
    'cottage cheese': 'paneer',
    'cheddar cheese': 'cheese', 'cheddar': 'cheese', 'mozzarella': 'cheese',
    'mozzarella cheese': 'cheese', 'parmesan': 'cheese',
    'red onion': 'onion', 'white onion': 'onion', 'yellow onion': 'onion',
    'scallion': 'spring onion', 'green onion': 'spring onion',
    'coriander leave': 'coriander', 'coriander leaf': 'coriander',
    'cilantro': 'coriander',
    'green chili': 'green chilli', 'green chile': 'green chilli',
    'chili': 'green chilli', 'chilli': 'green chilli',
    'garlic clove': 'garlic', 'ginger root': 'ginger',
    'brown rice': 'rice', 'white rice': 'rice', 'basmati rice': 'rice',
    'basmati': 'rice', 'chawal': 'rice',
    'wheat bread': 'bread', 'brown bread': 'bread', 'white bread': 'bread',
    'sandwich bread': 'bread', 'bread slice': 'bread',
    'rolled oat': 'oat', 'oatmeal': 'oat',
    'cream milk': 'milk', 'toned milk': 'milk', 'skim milk': 'milk',
    'skimmed milk': 'milk', 'doodh': 'milk',
    'capsicum': 'bell pepper', 'eggplant': 'brinjal', 'aubergine': 'brinjal',
    'aloo': 'potato', 'tamatar': 'tomato', 'pyaz': 'onion',
    'palak': 'spinach', 'anda': 'egg'
  };

  // Words that end in "s" but are not plurals.
  const NO_SINGULAR = new Set(['hummus', 'asparagus', 'couscous', 'molasses', 'swiss']);

  function singularizeWord(word) {
    if (word.length <= 3 || NO_SINGULAR.has(word)) return word;
    if (/(ss|us|is)$/.test(word)) return word;
    if (/ies$/.test(word)) return word.slice(0, -3) + 'y';        // cherries
    if (/oes$/.test(word)) return word.slice(0, -2);              // tomatoes
    if (/(ches|shes|xes|sses)$/.test(word)) return word.slice(0, -2);
    if (/s$/.test(word)) return word.slice(0, -1);                // eggs, bananas
    return word;
  }

  function normalizeName(name) {
    let text = String(name == null ? '' : name)
      .toLowerCase()
      .replace(/\(.*?\)/g, ' ')
      .replace(/[^a-z\s-]/g, ' ')
      .replace(/-/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) return '';

    let words = text.split(' ');
    const kept = words.filter(function (w) { return !MODIFIERS.has(w); });
    if (kept.length) words = kept; // never strip a name down to nothing
    const joined = words.map(singularizeWord).join(' ');
    return SYNONYMS[joined] || joined;
  }

  const STAPLE_SET = new Set(STAPLES.map(normalizeName));

  // --------------------------------------------------------------------------
  // INVENTORY INDEX
  // --------------------------------------------------------------------------
  // An item counts as available when it is not expired and, if its quantity is
  // a number, that number is above zero.
  function isUsable(item) {
    if (!item || item.status === 'expired') return false;
    if (typeof item.quantity === 'number' && item.quantity <= 0) return false;
    return true;
  }

  // Map of normalised name -> { name, useSoon }. Duplicate entries are merged:
  // if ANY usable entry is "use_soon", the ingredient is treated as use soon.
  function buildInventoryIndex(inventory) {
    const index = new Map();
    (inventory || []).forEach(function (item) {
      if (!isUsable(item)) return;
      const key = normalizeName(item.name);
      if (!key) return;
      const entry = index.get(key) || { name: item.name, useSoon: false };
      if (item.status === 'use_soon') entry.useSoon = true;
      index.set(key, entry);
    });
    return index;
  }

  // --------------------------------------------------------------------------
  // RECIPE EVALUATION
  // --------------------------------------------------------------------------
  function evaluateRecipe(recipe, index) {
    const available = [];       // required + in stock
    const missing = [];         // required + not in stock
    const optionalHave = [];    // optional + in stock
    const optionalMissing = []; // optional + not in stock
    const staples = [];         // assumed available
    const useSoonNames = [];

    recipe.ingredients.forEach(function (ing) {
      const key = normalizeName(ing.name);
      const stock = index.get(key);
      const info = Object.assign({}, ing, { useSoon: !!(stock && stock.useSoon) });

      if (STAPLE_SET.has(key)) { staples.push(info); return; }

      if (stock) {
        if (info.useSoon) useSoonNames.push(ing.name);
        (ing.optional ? optionalHave : available).push(info);
      } else {
        (ing.optional ? optionalMissing : missing).push(info);
      }
    });

    const requiredCount = available.length + missing.length;
    const matchPercent = requiredCount === 0
      ? 100
      : Math.round((available.length / requiredCount) * 100);
    const useSoonCount = useSoonNames.length;
    const bonus = Math.min(useSoonCount * USE_SOON_BONUS, USE_SOON_CAP);
    const score = Math.round((matchPercent * W_MATCH + bonus) * 10) / 10;

    return Object.assign({}, recipe, {
      available: available,
      missing: missing,
      optionalHave: optionalHave,
      optionalMissing: optionalMissing,
      staples: staples,
      matchPercent: matchPercent,
      useSoonCount: useSoonCount,
      useSoonNames: useSoonNames,
      totalMinutes: recipe.prepMinutes + recipe.cookMinutes,
      score: score
    });
  }

  // Evaluate and rank every recipe (best first).
  function computeRecommendations(inventory, recipes) {
    const list = recipes || (root.RecipeData && root.RecipeData.recipes) || [];
    const index = buildInventoryIndex(inventory);
    return list
      .map(function (r) { return evaluateRecipe(r, index); })
      .sort(function (a, b) {
        return (b.score - a.score) ||
               (a.totalMinutes - b.totalMinutes) ||
               a.name.localeCompare(b.name);
      });
  }

  // --------------------------------------------------------------------------
  // SECTIONS (a recipe can appear in several)
  // --------------------------------------------------------------------------
  const SECTION_DEFS = [
    { id: 'priority', title: 'Priority recipes',
      description: 'Use up ingredients that are about to expire.',
      test: function (r) { return r.useSoonCount >= 1; } },
    { id: 'ready', title: 'Ready to cook',
      description: 'You have everything you need.',
      test: function (r) { return r.matchPercent === 100; } },
    { id: 'almost', title: 'Almost ready',
      description: 'Just a few ingredients away.',
      test: function (r) { return r.matchPercent >= ALMOST_READY_MIN && r.matchPercent < 100; } },
    { id: 'quick', title: 'Quick meals',
      description: 'On the table in ' + QUICK_MEAL_MAX_MINUTES + ' minutes or less.',
      test: function (r) { return r.totalMinutes <= QUICK_MEAL_MAX_MINUTES; } }
  ];

  function groupSections(recommendations) {
    const sections = SECTION_DEFS.map(function (def) {
      return { id: def.id, title: def.title, description: def.description,
               recipes: recommendations.filter(def.test) };
    });
    // Anything that fits no section above still gets shown.
    const placed = new Set();
    sections.forEach(function (s) { s.recipes.forEach(function (r) { placed.add(r.id); }); });
    sections.push({
      id: 'more', title: 'More ideas',
      description: 'You are missing most ingredients for these.',
      recipes: recommendations.filter(function (r) { return !placed.has(r.id); })
    });
    return sections;
  }

  // --------------------------------------------------------------------------
  // SEARCH + FILTERS
  // filters = { query, maxMinutes, category, availability }
  //   query: recipe name or ingredient. Comma-separated terms must ALL match
  //          ("tomato, egg" finds recipes that use both).
  //   maxMinutes: 0/null = any
  //   category: "" or "all" = any
  //   availability: "all" | "ready" (100%) | "almost" (>= ALMOST_READY_MIN, < 100%)
  // --------------------------------------------------------------------------
  function matchesTerm(recipe, term) {
    const raw = term.toLowerCase().trim();
    if (!raw) return true;
    const norm = normalizeName(raw) || raw;
    if (recipe.name.toLowerCase().indexOf(raw) !== -1) return true;
    return recipe.ingredients.some(function (ing) {
      return ing.name.toLowerCase().indexOf(raw) !== -1 ||
             normalizeName(ing.name).indexOf(norm) !== -1;
    });
  }

  function filterRecipes(recommendations, filters) {
    const f = filters || {};
    const terms = String(f.query || '').split(',')
      .map(function (t) { return t.trim(); })
      .filter(Boolean);

    return recommendations.filter(function (r) {
      if (f.maxMinutes && r.totalMinutes > f.maxMinutes) return false;
      if (f.category && f.category !== 'all' && r.category !== f.category) return false;
      if (f.availability === 'ready' && r.matchPercent !== 100) return false;
      if (f.availability === 'almost' &&
          !(r.matchPercent >= ALMOST_READY_MIN && r.matchPercent < 100)) return false;
      return terms.every(function (t) { return matchesTerm(r, t); });
    });
  }

  const api = {
    constants: {
      W_MATCH: W_MATCH, USE_SOON_BONUS: USE_SOON_BONUS, USE_SOON_CAP: USE_SOON_CAP,
      ALMOST_READY_MIN: ALMOST_READY_MIN, QUICK_MEAL_MAX_MINUTES: QUICK_MEAL_MAX_MINUTES,
      STAPLES: STAPLES
    },
    normalizeName: normalizeName,
    isUsable: isUsable,
    buildInventoryIndex: buildInventoryIndex,
    evaluateRecipe: evaluateRecipe,
    computeRecommendations: computeRecommendations,
    groupSections: groupSections,
    filterRecipes: filterRecipes,
    SECTION_DEFS: SECTION_DEFS
  };

  root.RecipeEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
