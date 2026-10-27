/**
 * ============================================================================
 * SMART PANTRY - RECIPE SUGGESTIONS UI
 *
 * Renders the Recipe Suggestions page. It does three things only:
 *   1. asks RecipeInventoryAdapter for the pantry (and listens for changes),
 *   2. asks RecipeEngine to rank and group recipes,
 *   3. draws the result.
 *
 * It never reads storage or other modules directly, and it never changes
 * app.js, style.css or any other page.
 *
 * Load order in recipes.html:
 *   recipe-data.js -> recipe-inventory-adapter.js -> recipe-engine.js -> recipes.js
 * ============================================================================
 */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    const Engine = window.RecipeEngine;
    const Adapter = window.RecipeInventoryAdapter;
    const Data = window.RecipeData;
    const $ = function (id) { return document.getElementById(id); };

    const els = {
      search: $('rsSearch'), summary: $('rsPantrySummary'),
      time: $('rsTime'), category: $('rsCategory'), avail: $('rsAvail'),
      clear: $('rsClear'), count: $('rsCount'), content: $('rsContent'),
      demo: $('rsDemo'), demoList: $('rsDemoList'), demoForm: $('rsDemoForm'),
      demoName: $('rsDemoName'), demoStatus: $('rsDemoStatus'),
      demoReset: $('rsDemoReset'), demoClear: $('rsDemoClear'),
      modal: $('rsModal'), modalPanel: $('rsModalPanel'),
      modalEmoji: $('rsModalEmoji'), modalTitle: $('rsModalTitle'),
      modalMeta: $('rsModalMeta'), modalNote: $('rsModalNote'),
      modalIngredients: $('rsModalIngredients'), modalSteps: $('rsModalSteps'),
      modalClose: $('rsModalClose'), modalCloseFoot: $('rsModalCloseFoot')
    };

    if (!els.content) return; // not on the recipes page

    if (!Engine || !Adapter || !Data) {
      els.content.innerHTML = stateHtml('error', '⚠️', 'Recipe module failed to load',
        'A required script is missing. Check that recipe-data.js, recipe-inventory-adapter.js and recipe-engine.js are loaded before recipes.js.');
      return;
    }

    // ------------------------------------------------------------------ state
    const state = {
      status: 'loading',   // 'loading' | 'ready' | 'error'
      error: '',
      inventory: [],
      recs: [],
      filters: { query: '', maxMinutes: 0, category: 'all', availability: 'all' },
      openRecipeId: null
    };
    let loadToken = 0;
    let lastFocus = null;

    // ---------------------------------------------------------------- helpers
    function esc(value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

    function qtyText(ing) {
      const q = ing.quantity === '' || ing.quantity == null ? '' : String(ing.quantity);
      return (q + ' ' + (ing.unit || '')).trim();
    }

    const ICON_CLOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
    const ICON_FLAME = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.2-.3-4 1.5-6 .5 2.5 2 4.9 4 6.5 2 1.7 3 3.5 3 5.5a6.5 6.5 0 1 1-13 0c0-1.1.4-2.2 1-3a2.5 2.5 0 0 0 2 2.5z"/></svg>';
    const ICON_LEVEL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 20v-5M12 20V9M18 20V4"/></svg>';

    // ---------------------------------------------------------------- loading
    function load(options) {
      const silent = options && options.silent;
      const token = ++loadToken;
      if (!silent) { state.status = 'loading'; render(); }

      Adapter.getInventory()
        .then(function (inventory) {
          if (token !== loadToken) return; // a newer load superseded this one
          state.inventory = inventory;
          state.recs = Engine.computeRecommendations(inventory, Data.recipes);
          state.status = 'ready';
          state.error = '';
        })
        .catch(function (err) {
          if (token !== loadToken) return;
          state.status = 'error';
          state.error = (err && err.message) || 'Something went wrong while loading your pantry.';
        })
        .then(function () {
          if (token === loadToken) render();
        });
    }

    let refreshTimer = null;
    function scheduleRefresh() {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(function () { load({ silent: true }); }, 60);
    }

    // ----------------------------------------------------------------- render
    function render() {
      renderSummary();
      renderDemoPanel();

      const busy = state.status === 'loading';
      els.content.setAttribute('aria-busy', busy ? 'true' : 'false');

      if (busy) {
        els.content.innerHTML = skeletonHtml();
        els.count.textContent = '';
        return;
      }

      if (state.status === 'error') {
        els.content.innerHTML = stateHtml('error', '🥕', 'We couldn’t load your pantry',
          esc(state.error) + ' Your pantry data is safe. Try again in a moment.',
          '<button type="button" class="rs-btn" data-action="retry">Try again</button>');
        els.count.textContent = '';
        closeModal(true);
        return;
      }

      const index = Engine.buildInventoryIndex(state.inventory);
      if (index.size === 0) {
        const demoHint = Adapter.getSource() === 'demo'
          ? ' You can also add demo items in the panel below.' : '';
        els.content.innerHTML = stateHtml('', '🧺', 'Your pantry is empty',
          'Add the food you have at home and we’ll suggest what to cook.' + demoHint,
          '<a class="rs-btn" href="inventory.html">Go to Food Inventory</a>');
        els.count.textContent = '';
        closeModal(true);
        return;
      }

      const filtered = Engine.filterRecipes(state.recs, state.filters);
      els.count.textContent = 'Showing ' + plural(filtered.length, 'recipe', 'recipes') +
        ' of ' + state.recs.length;
      els.clear.hidden = !filtersActive();

      if (filtered.length === 0) {
        els.content.innerHTML = stateHtml('', '🔍', 'No recipes match',
          'Try a different ingredient, or loosen the filters.',
          '<button type="button" class="rs-btn rs-btn-ghost" data-action="clear">Clear filters</button>');
        return;
      }

      els.content.innerHTML = Engine.groupSections(filtered)
        .filter(function (s) { return s.recipes.length > 0; })
        .map(sectionHtml).join('');

      if (state.openRecipeId) {
        const open = state.recs.find(function (r) { return r.id === state.openRecipeId; });
        if (open) fillModal(open); else closeModal(true);
      }
    }

    function filtersActive() {
      const f = state.filters;
      return !!(f.query || f.maxMinutes || f.category !== 'all' || f.availability !== 'all');
    }

    // ---------------------------------------------------------------- summary
    function renderSummary() {
      if (state.status !== 'ready') { els.summary.innerHTML = ''; return; }
      const index = Engine.buildInventoryIndex(state.inventory);
      let soon = 0;
      index.forEach(function (entry) { if (entry.useSoon) soon += 1; });
      const expired = state.inventory.filter(function (i) { return !Engine.isUsable(i); }).length;

      let html = '<span class="rs-pill">' + plural(index.size, 'ingredient', 'ingredients') + ' in your pantry</span>';
      if (soon) html += '<span class="rs-pill rs-pill-soon">' + soon + ' to use soon</span>';
      if (expired) html += '<span class="rs-pill">' + plural(expired, 'expired item', 'expired items') + ' ignored</span>';
      if (Adapter.getSource() === 'demo') html += '<span class="rs-pill rs-pill-demo">Demo data</span>';
      els.summary.innerHTML = html;
    }

    // ------------------------------------------------------------------ cards
    function tileHtml(r) {
      const cat = String(r.category).replace(/\W/g, '');
      return '<div class="rs-tile rs-tile-' + esc(cat) + '" role="img" aria-label="' + esc(r.name) + '">' +
        '<span aria-hidden="true">' + esc(r.emoji || '🍽️') + '</span></div>';
    }

    function chipsHtml(items, kind) {
      return '<ul class="rs-chips">' + items.map(function (ing) {
        const soon = kind === 'have' && ing.useSoon;
        const cls = kind === 'miss' ? 'rs-chip-miss' : soon ? 'rs-chip-soon' : 'rs-chip-have';
        return '<li class="rs-chip ' + cls + '">' + esc(ing.name) +
          (soon ? '<span class="rs-sr-only"> (use soon)</span>' : '') + '</li>';
      }).join('') + '</ul>';
    }

    function cardHtml(r, sectionId) {
      const titleId = 'rs-t-' + sectionId + '-' + r.id;
      const have = r.available.concat(r.optionalHave);
      const level = r.matchPercent >= 80 ? '' : r.matchPercent >= 50 ? ' rs-match-mid' : ' rs-match-low';
      const media = r.image
        ? '<img src="' + esc(r.image) + '" alt="' + esc(r.name) + '" loading="lazy" data-tile="' + esc(r.id) + '">'
        : tileHtml(r);

      return '<article class="rs-card" aria-labelledby="' + titleId + '">' +
        '<div class="rs-card-media">' + media +
          '<div class="rs-badges">' +
            (r.useSoonCount ? '<span class="rs-badge rs-badge-soon">Use soon</span>' : '<span></span>') +
            '<span class="rs-badge">' + esc(r.category) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="rs-card-body">' +
          '<h4 class="rs-card-title" id="' + titleId + '">' + esc(r.name) + '</h4>' +
          '<div class="rs-match">' +
            '<div class="rs-match-bar' + level + '" role="img" aria-label="' + r.matchPercent + ' percent of ingredients available"><span style="width:' + r.matchPercent + '%"></span></div>' +
            '<span class="rs-match-label">' + r.matchPercent + '% match</span>' +
          '</div>' +
          '<ul class="rs-meta">' +
            '<li>' + ICON_CLOCK + r.prepMinutes + ' min prep</li>' +
            '<li>' + ICON_FLAME + (r.cookMinutes ? r.cookMinutes + ' min cook' : 'No cooking') + '</li>' +
            '<li>' + ICON_LEVEL + '<span class="rs-diff rs-diff-' + esc(r.difficulty) + '">' + esc(r.difficulty) + '</span></li>' +
          '</ul>' +
          '<div class="rs-chip-group"><p class="rs-chip-label">You have</p>' +
            (have.length ? chipsHtml(have, 'have') : '<ul class="rs-chips"><li class="rs-chip rs-chip-none">Nothing yet</li></ul>') +
          '</div>' +
          '<div class="rs-chip-group"><p class="rs-chip-label">You need</p>' +
            (r.missing.length ? chipsHtml(r.missing, 'miss') : '<ul class="rs-chips"><li class="rs-chip rs-chip-none">Nothing, you have it all</li></ul>') +
          '</div>' +
          '<button type="button" class="rs-view" data-recipe-id="' + esc(r.id) + '" aria-label="View recipe: ' + esc(r.name) + '">View recipe</button>' +
        '</div>' +
      '</article>';
    }

    function sectionHtml(section) {
      const headId = 'rs-sec-' + section.id;
      return '<section class="rs-section" aria-labelledby="' + headId + '">' +
        '<header class="rs-section-head">' +
          '<h3 class="rs-section-title" id="' + headId + '">' + esc(section.title) + '</h3>' +
          '<span class="rs-section-count">' + plural(section.recipes.length, 'recipe', 'recipes') + '</span>' +
          '<p class="rs-section-desc">' + esc(section.description) + '</p>' +
        '</header>' +
        '<ul class="rs-grid">' + section.recipes.map(function (r) {
          return '<li>' + cardHtml(r, section.id) + '</li>';
        }).join('') + '</ul>' +
      '</section>';
    }

    // ----------------------------------------------------------- state screens
    function stateHtml(kind, icon, title, text, actionHtml) {
      return '<div class="rs-state' + (kind === 'error' ? ' rs-state-error' : '') + '" role="' + (kind === 'error' ? 'alert' : 'status') + '">' +
        '<div class="rs-state-icon" aria-hidden="true">' + icon + '</div>' +
        '<h3>' + title + '</h3><p>' + text + '</p>' + (actionHtml || '') + '</div>';
    }

    function skeletonHtml() {
      const card = '<li><div class="rs-card rs-skeleton" aria-hidden="true"><div class="rs-card-media"></div>' +
        '<div class="rs-card-body"><div class="rs-skel-line w90"></div><div class="rs-skel-line w60"></div>' +
        '<div class="rs-skel-line"></div><div class="rs-skel-line w90"></div><div class="rs-skel-line rs-skel-btn"></div></div></div></li>';
      return '<p class="rs-sr-only" role="status">Loading recipes…</p><ul class="rs-grid">' +
        new Array(6 + 1).join(card) + '</ul>';
    }

    // ------------------------------------------------------------------ modal
    function ingredientRow(ing, tagText, tagClass, missing) {
      return '<li class="rs-ing-row' + (missing ? ' is-missing' : '') + '">' +
        '<span class="rs-ing-qty">' + esc(qtyText(ing) || '–') + '</span>' +
        '<span>' + esc(ing.name) + '</span>' +
        '<span class="rs-ing-tag ' + tagClass + '">' + tagText + '</span></li>';
    }

    function fillModal(r) {
      els.modalEmoji.textContent = r.emoji || '🍽️';
      els.modalTitle.textContent = r.name;
      els.modalMeta.innerHTML =
        '<li>' + r.matchPercent + '% match</li>' +
        '<li>' + ICON_CLOCK + r.prepMinutes + ' min prep</li>' +
        '<li>' + ICON_FLAME + (r.cookMinutes ? r.cookMinutes + ' min cook' : 'No cooking') + '</li>' +
        '<li>' + ICON_LEVEL + esc(r.difficulty) + '</li>' +
        '<li>Serves ' + esc(r.servings) + '</li>';

      const notes = [];
      if (r.useSoonNames.length) notes.push('Uses your ' + r.useSoonNames.join(', ') + ' before it goes off.');
      if (r.missing.length) notes.push('You still need ' + r.missing.map(function (m) { return m.name; }).join(', ') + '.');
      els.modalNote.textContent = notes.join(' ');
      els.modalNote.hidden = notes.length === 0;

      let rows = '';
      r.available.forEach(function (i) {
        rows += i.useSoon ? ingredientRow(i, 'Use soon', 'rs-tag-soon') : ingredientRow(i, 'In pantry', 'rs-tag-have');
      });
      r.missing.forEach(function (i) { rows += ingredientRow(i, 'Missing', 'rs-tag-miss', true); });
      r.optionalHave.forEach(function (i) {
        rows += ingredientRow(i, i.useSoon ? 'Optional, use soon' : 'Optional, in pantry', i.useSoon ? 'rs-tag-soon' : 'rs-tag-have');
      });
      r.optionalMissing.forEach(function (i) { rows += ingredientRow(i, 'Optional', 'rs-tag-neutral'); });
      r.staples.forEach(function (i) { rows += ingredientRow(i, 'Pantry staple', 'rs-tag-neutral'); });
      els.modalIngredients.innerHTML = rows;

      els.modalSteps.innerHTML = r.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
    }

    function openModal(recipeId, trigger) {
      const r = state.recs.find(function (x) { return x.id === recipeId; });
      if (!r) return;
      lastFocus = trigger || document.activeElement;
      state.openRecipeId = recipeId;
      fillModal(r);
      els.modal.hidden = false;
      document.body.style.overflow = 'hidden';
      els.modalPanel.scrollTop = 0;
      els.modalClose.focus();
    }

    function closeModal(silent) {
      if (els.modal.hidden && !state.openRecipeId) return;
      els.modal.hidden = true;
      state.openRecipeId = null;
      document.body.style.overflow = '';
      if (!silent && lastFocus && document.contains(lastFocus)) lastFocus.focus();
      lastFocus = null;
    }

    function trapFocus(event) {
      if (els.modal.hidden) return;
      if (event.key === 'Escape') { event.preventDefault(); closeModal(); return; }
      if (event.key !== 'Tab') return;
      const focusable = els.modalPanel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }

    // ------------------------------------------------------------- demo panel
    function renderDemoPanel() {
      const isDemo = state.status !== 'loading' && Adapter.getSource() === 'demo';
      els.demo.hidden = !isDemo;
      if (!isDemo) return;

      // keep keyboard focus on the same control after the list is redrawn
      const active = document.activeElement;
      const keep = active && active.closest && active.closest('#rsDemoList')
        ? { id: active.getAttribute('data-id'), kind: active.getAttribute('data-kind') } : null;

      els.demoList.innerHTML = Adapter.demo.list().map(function (item) {
        const id = esc(item.id);
        return '<li class="rs-demo-row"><span>' + esc(item.name) + '</span>' +
          '<select data-kind="status" data-id="' + id + '" aria-label="Status of ' + esc(item.name) + '">' +
          ['fresh', 'use_soon', 'expired'].map(function (s) {
            return '<option value="' + s + '"' + (item.status === s ? ' selected' : '') + '>' +
              (s === 'use_soon' ? 'Use soon' : s.charAt(0).toUpperCase() + s.slice(1)) + '</option>';
          }).join('') + '</select>' +
          '<button type="button" class="rs-demo-remove" data-kind="remove" data-id="' + id + '" aria-label="Remove ' + esc(item.name) + '">Remove</button></li>';
      }).join('');

      if (keep) {
        const again = els.demoList.querySelector('[data-kind="' + keep.kind + '"][data-id="' + keep.id + '"]');
        if (again) again.focus();
      }
    }

    // ---------------------------------------------------------------- events
    let searchTimer = null;
    els.search.addEventListener('input', function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        state.filters.query = els.search.value;
        if (state.status === 'ready') render();
      }, 150);
    });

    els.time.addEventListener('change', function () {
      state.filters.maxMinutes = parseInt(els.time.value, 10) || 0;
      if (state.status === 'ready') render();
    });

    els.category.addEventListener('change', function () {
      state.filters.category = els.category.value;
      if (state.status === 'ready') render();
    });

    els.avail.addEventListener('click', function (event) {
      const btn = event.target.closest('button[data-avail]');
      if (!btn) return;
      state.filters.availability = btn.getAttribute('data-avail');
      Array.prototype.forEach.call(els.avail.querySelectorAll('button'), function (b) {
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
      if (state.status === 'ready') render();
    });

    function clearFilters() {
      state.filters = { query: '', maxMinutes: 0, category: 'all', availability: 'all' };
      els.search.value = '';
      els.time.value = '0';
      els.category.value = 'all';
      Array.prototype.forEach.call(els.avail.querySelectorAll('button'), function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-avail') === 'all' ? 'true' : 'false');
      });
      render();
    }

    els.clear.addEventListener('click', clearFilters);

    els.content.addEventListener('click', function (event) {
      const view = event.target.closest('[data-recipe-id]');
      if (view) { openModal(view.getAttribute('data-recipe-id'), view); return; }
      const action = event.target.closest('[data-action]');
      if (!action) return;
      if (action.getAttribute('data-action') === 'retry') load();
      if (action.getAttribute('data-action') === 'clear') clearFilters();
    });

    // A recipe photo that fails to load is swapped for the illustrated tile.
    els.content.addEventListener('error', function (event) {
      const img = event.target;
      if (!img || img.tagName !== 'IMG') return;
      const recipe = state.recs.find(function (r) { return r.id === img.getAttribute('data-tile'); });
      if (recipe) img.outerHTML = tileHtml(recipe);
    }, true);

    els.modal.addEventListener('click', function (event) { if (event.target === els.modal) closeModal(); });
    els.modalClose.addEventListener('click', function () { closeModal(); });
    els.modalCloseFoot.addEventListener('click', function () { closeModal(); });
    document.addEventListener('keydown', trapFocus);

    // demo panel
    els.demoList.addEventListener('change', function (event) {
      const sel = event.target.closest('select[data-kind="status"]');
      if (sel) Adapter.demo.setStatus(sel.getAttribute('data-id'), sel.value);
    });
    els.demoList.addEventListener('click', function (event) {
      const btn = event.target.closest('button[data-kind="remove"]');
      if (btn) Adapter.demo.remove(btn.getAttribute('data-id'));
    });
    els.demoForm.addEventListener('submit', function (event) {
      event.preventDefault();
      const name = els.demoName.value.trim();
      if (!name) { els.demoName.focus(); return; }
      Adapter.demo.add(name, els.demoStatus.value);
      els.demoName.value = '';
      els.demoName.focus();
    });
    els.demoReset.addEventListener('click', function () { Adapter.demo.reset(); });
    els.demoClear.addEventListener('click', function () { Adapter.demo.clear(); });

    // ------------------------------------------------------------------ start
    const categories = Array.from(new Set(Data.recipes.map(function (r) { return r.category; }))).sort();
    els.category.innerHTML = '<option value="all">All categories</option>' +
      categories.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + '</option>'; }).join('');

    Adapter.subscribe(scheduleRefresh); // re-rank whenever the inventory changes
    load();
  }
})();
