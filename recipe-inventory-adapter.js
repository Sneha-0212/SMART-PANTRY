/**
 * ============================================================================
 * SMART PANTRY - RECIPE INVENTORY ADAPTER
 * This is the ONLY file in the Recipe Suggestions module that knows where
 * inventory data comes from. The UI and the engine never read storage or call
 * other modules directly.
 *
 * ----------------------------------------------------------------------------
 * CONNECTING THE REAL INVENTORY  (for Member 3 / backend inventory owner)
 * ----------------------------------------------------------------------------
 * The Recipe page looks for the shared inventory in this order, every time it
 * loads or refreshes:
 *
 *   1. window.SmartPantry.getInventory()
 *        A function that returns an array (or a Promise of an array).
 *        Add it to the existing window.SmartPantry object in app.js, or
 *        define it in your own inventory script.
 *
 *   2. localStorage key  "smartPantry.inventory"
 *        A JSON array. Write it from inventory.html whenever items change:
 *          localStorage.setItem('smartPantry.inventory', JSON.stringify(items));
 *
 *   3. Otherwise the page falls back to DEMO data (RecipeData.mockInventory)
 *      and shows a "Demo data" badge plus a demo panel. Nothing is saved.
 *
 * ITEM SHAPE (extra fields are ignored)
 *   {
 *     id:         string | number,
 *     name:       "Baby Spinach",              // required
 *     quantity:   200,                         // number or string
 *     unit:       "g",
 *     status:     "fresh" | "use_soon" | "expired",
 *     expiryDate: "2026-10-27"                 // optional, ISO date
 *   }
 * If you have no `status`, the adapter derives it, in this order, from:
 *   - `daysLeft`   (number): < 0 expired, 0 to 3 use_soon, otherwise fresh
 *   - `expiryDate` (date):   same rules, counted from today
 *   - `urgency`:  "critical" or "warning" -> use_soon  (dashboard sample data)
 * Items with no usable status are treated as "fresh". Expired items are never
 * used as available ingredients.
 *
 * TELLING THE RECIPE PAGE THAT INVENTORY CHANGED
 *   - Another browser tab: the page listens to the "storage" event, so it
 *     updates by itself when the localStorage key changes.
 *   - Same page: dispatch
 *       window.dispatchEvent(new CustomEvent('smartpantry:inventory-changed'));
 *
 * That is all. No change to recipes.js, recipe-engine.js or recipes.html is
 * needed.
 * ============================================================================
 */
(function (root) {
  'use strict';

  const CONFIG = {
    storageKey: 'smartPantry.inventory',
    changeEvent: 'smartpantry:inventory-changed',
    useShared: true,        // set to false to force demo data
    demoLoadDelayMs: 450,   // lets the loading skeleton show in demos
    soonThresholdDays: 3    // used only when deriving status from dates
  };

  const listeners = new Set();
  let lastSource = 'demo'; // 'shared' | 'demo'
  let failNextLoad = /[?&]error=1(&|$)/.test((root.location && root.location.search) || '');

  // --------------------------------------------------------------------------
  // NORMALISING WHATEVER THE SHARED INVENTORY RETURNS
  // --------------------------------------------------------------------------
  function statusFromDays(days) {
    if (days < 0) return 'expired';
    if (days <= CONFIG.soonThresholdDays) return 'use_soon';
    return 'fresh';
  }

  function daysUntil(dateString) {
    const target = new Date(dateString);
    if (isNaN(target.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    return Math.round((target - today) / 86400000);
  }

  function deriveStatus(raw) {
    if (raw.status === 'fresh' || raw.status === 'use_soon' || raw.status === 'expired') {
      return raw.status;
    }
    if (typeof raw.daysLeft === 'number') return statusFromDays(raw.daysLeft);
    if (raw.expiryDate) {
      const d = daysUntil(raw.expiryDate);
      if (d !== null) return statusFromDays(d);
    }
    if (raw.urgency === 'critical' || raw.urgency === 'warning') return 'use_soon';
    return 'fresh';
  }

  function normalizeItem(raw, position) {
    if (!raw || typeof raw !== 'object') return null;
    const name = String(raw.name != null ? raw.name : (raw.title || '')).trim();
    if (!name) return null;
    return {
      id: raw.id != null ? raw.id : 'item-' + position,
      name: name,
      quantity: raw.quantity != null ? raw.quantity : '',
      unit: raw.unit || '',
      status: deriveStatus(raw),
      expiryDate: raw.expiryDate || null
    };
  }

  function normalizeList(list) {
    if (!Array.isArray(list)) throw new Error('Inventory data must be an array.');
    return list.map(normalizeItem).filter(Boolean);
  }

  // --------------------------------------------------------------------------
  // DEMO INVENTORY (in memory only; never written to the shared storage key)
  // --------------------------------------------------------------------------
  let demoItems = null;
  let demoLoaded = false;

  function seedDemo() {
    const seed = (root.RecipeData && root.RecipeData.mockInventory) || [];
    demoItems = seed.map(function (item) { return Object.assign({}, item); });
  }

  // --------------------------------------------------------------------------
  // READING THE SHARED INVENTORY
  // --------------------------------------------------------------------------
  function readStoredList() {
    try {
      const text = root.localStorage.getItem(CONFIG.storageKey);
      if (text === null) return undefined; // key does not exist yet
      return JSON.parse(text);
    } catch (err) {
      return undefined; // storage blocked or JSON invalid -> treat as absent
    }
  }

  /** Resolves with InventoryItem[]. Rejects with an Error if loading fails. */
  function getInventory() {
    if (failNextLoad) {
      failNextLoad = false; // demo helper: add ?error=1 to the URL to see the error state
      return Promise.reject(new Error('Could not reach the inventory service.'));
    }

    if (CONFIG.useShared) {
      // 1) function provided by another module
      if (root.SmartPantry && typeof root.SmartPantry.getInventory === 'function') {
        lastSource = 'shared';
        return Promise.resolve(root.SmartPantry.getInventory()).then(normalizeList);
      }
      // 2) localStorage key
      const stored = readStoredList();
      if (stored !== undefined) {
        lastSource = 'shared';
        return Promise.resolve().then(function () { return normalizeList(stored); });
      }
    }

    // 3) demo data
    lastSource = 'demo';
    if (!demoItems) seedDemo();
    const snapshot = normalizeList(demoItems);
    // The delay only applies to the first load (and retries), so the loading
    // skeleton shows once; live demo edits then re-rank instantly.
    if (demoLoaded) return Promise.resolve(snapshot);
    demoLoaded = true;
    return new Promise(function (resolve) {
      setTimeout(function () { resolve(snapshot); }, CONFIG.demoLoadDelayMs);
    });
  }

  // --------------------------------------------------------------------------
  // CHANGE NOTIFICATIONS
  // --------------------------------------------------------------------------
  function notify() {
    listeners.forEach(function (cb) {
      try { cb(); } catch (err) { console.error('[RecipeInventoryAdapter] listener failed', err); }
    });
  }

  let wired = false;
  function wireGlobalEvents() {
    if (wired) return;
    wired = true;
    root.addEventListener('storage', function (event) {
      if (event.key === null || event.key === CONFIG.storageKey) notify();
    });
    root.addEventListener(CONFIG.changeEvent, notify);
  }

  /** Calls callback() whenever inventory changes. Returns an unsubscribe function. */
  function subscribe(callback) {
    wireGlobalEvents();
    listeners.add(callback);
    return function unsubscribe() { listeners.delete(callback); };
  }

  // --------------------------------------------------------------------------
  // DEMO CONTROLS (used by the demo panel; no effect on shared inventory)
  // --------------------------------------------------------------------------
  const demo = {
    list: function () { if (!demoItems) seedDemo(); return demoItems.map(function (i) { return Object.assign({}, i); }); },
    add: function (name, status) {
      if (!demoItems) seedDemo();
      demoItems.push({ id: 'demo-' + Date.now(), name: name, quantity: 1, unit: 'pc', status: status || 'fresh' });
      notify();
    },
    remove: function (id) {
      if (!demoItems) seedDemo();
      demoItems = demoItems.filter(function (i) { return i.id !== id; });
      notify();
    },
    setStatus: function (id, status) {
      if (!demoItems) seedDemo();
      demoItems.forEach(function (i) { if (i.id === id) i.status = status; });
      notify();
    },
    clear: function () { demoItems = []; notify(); },
    reset: function () { seedDemo(); notify(); }
  };

  root.RecipeInventoryAdapter = {
    getInventory: getInventory,
    subscribe: subscribe,
    /** 'shared' when real inventory was used on the last load, otherwise 'demo'. */
    getSource: function () { return lastSource; },
    demo: demo,
    config: CONFIG
  };
})(typeof window !== 'undefined' ? window : globalThis);
