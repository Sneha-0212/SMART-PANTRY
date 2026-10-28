/**
 * inventory_adapter.js  (SMART PANTRY - Member 6: Refrigerator Monitoring)
 *
 * PURPOSE
 *   Member 6 does NOT own the inventory. Member 3 (Shared Inventory/Backend) does.
 *   This small adapter READS the shared inventory and counts items that are
 *   "Use Soon" and "Check Now". It never writes or stores inventory.
 *
 * INTEGRATION STATUS: NOT COMPLETE
 *   I do not know Member 3's real storage key or function name yet.
 *   So this file tries two guesses (both listed in INVENTORY_CONFIG below).
 *   If neither exists, it shows SAMPLE DATA and clearly says so in the UI.
 *   After you talk to Member 3, change the two values in INVENTORY_CONFIG.
 *
 * Expected shape of one inventory item (change normalizeInventoryItems if different):
 *   { name: 'Spinach', status: 'Use Soon' }      // status: 'Use Soon' | 'Check Now' | anything else
 *
 * Loaded in the browser as: window.InventoryAdapter
 */
(function (root) {
  'use strict';

  const INVENTORY_CONFIG = Object.freeze({
    // GUESS 1: Member 3 exposes a function:  window.SmartPantryInventory.getItems()  (must return an array)
    globalName: 'SmartPantryInventory',
    // GUESS 2: Member 3 saves an array (or { items: [...] }) in localStorage under this key.
    storageKey: 'smartPantry.inventory',
    // Status text we look for (compared in lowercase).
    useSoonText: 'use soon',
    checkNowText: 'check now',
    maxNamesShown: 4
  });

  // TEMPORARY sample data. Used only when the shared inventory cannot be found.
  const SAMPLE_ITEMS = Object.freeze([
    { name: 'Tomatoes', status: 'Use Soon' },
    { name: 'Curd', status: 'Use Soon' },
    { name: 'Spinach', status: 'Check Now' },
    { name: 'Coriander', status: 'Check Now' },
    { name: 'Carrots', status: 'Fresh' },
    { name: 'Beans', status: 'Fresh' }
  ]);

  /** Make a list of clean { name, status } items from unknown data. Bad entries are skipped. */
  function normalizeInventoryItems(rawItems) {
    if (!Array.isArray(rawItems)) return [];
    return rawItems
      .filter(function (item) { return item && typeof item === 'object'; })
      .map(function (item) {
        const rawStatus = item.status !== undefined ? item.status : item.freshnessStatus;
        const rawName = typeof item.name === 'string' && item.name.trim() !== '' ? item.name.trim() : 'Unnamed item';
        return { name: rawName, status: String(rawStatus === undefined || rawStatus === null ? '' : rawStatus).trim().toLowerCase() };
      });
  }

  /** Count items with one status and keep the first few names. */
  function summarizeStatus(items, statusText) {
    const matches = items.filter(function (item) { return item.status === statusText; });
    return {
      count: matches.length,
      names: matches.slice(0, INVENTORY_CONFIG.maxNamesShown).map(function (item) { return item.name; })
    };
  }

  /**
   * Try to get the shared inventory.
   * Returns { found: true, items } or { found: false, problem: 'message or null' }.
   * `problem` is null when the shared inventory simply is not there yet.
   */
  function readSharedInventory() {
    // Guess 1: a function provided by Member 3.
    try {
      const shared = root[INVENTORY_CONFIG.globalName];
      if (shared && typeof shared.getItems === 'function') {
        const items = shared.getItems();
        if (!Array.isArray(items)) return { found: false, problem: 'The shared inventory returned data in an unexpected format.' };
        return { found: true, items: items };
      }
    } catch (error) {
      return { found: false, problem: 'The shared inventory could not be read.' };
    }

    // Guess 2: data in localStorage.
    let rawText = null;
    try {
      rawText = root.localStorage.getItem(INVENTORY_CONFIG.storageKey);
    } catch (error) {
      return { found: false, problem: 'Browser storage is blocked, so the shared inventory could not be read.' };
    }
    if (rawText === null) return { found: false, problem: null };

    try {
      const parsed = JSON.parse(rawText);
      const items = Array.isArray(parsed) ? parsed : (parsed && parsed.items);
      if (!Array.isArray(items)) return { found: false, problem: 'The shared inventory data has an unexpected format.' };
      return { found: true, items: items };
    } catch (error) {
      return { found: false, problem: 'The shared inventory data is damaged and could not be read.' };
    }
  }

  /**
   * The ONE function the dashboard calls.
   * Returns:
   *   {
   *     sourceType: 'shared' | 'sample',
   *     message: 'friendly text' | null,
   *     useSoon:  { count, names },
   *     checkNow: { count, names }
   *   }
   */
  function getInventoryInsights() {
    const shared = readSharedInventory();
    const usingShared = shared.found;
    const items = normalizeInventoryItems(usingShared ? shared.items : SAMPLE_ITEMS);

    let message = null;
    if (!usingShared) {
      message = shared.problem
        ? shared.problem + ' Showing sample data instead.'
        : 'Shared inventory is not connected yet. Showing sample data instead.';
    }

    return {
      sourceType: usingShared ? 'shared' : 'sample',
      message: message,
      useSoon: summarizeStatus(items, INVENTORY_CONFIG.useSoonText),
      checkNow: summarizeStatus(items, INVENTORY_CONFIG.checkNowText)
    };
  }

  const api = {
    INVENTORY_CONFIG: INVENTORY_CONFIG,
    normalizeInventoryItems: normalizeInventoryItems,
    getInventoryInsights: getInventoryInsights
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api; // for Node tests
  root.InventoryAdapter = api;
})(typeof window !== 'undefined' ? window : globalThis);
