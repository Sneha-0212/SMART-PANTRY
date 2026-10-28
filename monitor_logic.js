/**
 * monitor_logic.js  (SMART PANTRY - Member 6: Refrigerator Monitoring)
 *
 * This file has NO screen code. It only holds the "brain" of the module:
 *   - default settings and validation rules
 *   - deciding if a reading is Normal / Warning / Critical
 *   - the alert manager (no repeated alerts, auto-resolve)
 *   - safe localStorage helpers (they never crash the page)
 *
 * Because it has no screen code, it can also be tested in Node.js.
 * It is loaded in the browser as: window.MonitorLogic
 *
 * IMPORTANT: all thresholds are configurable DEMO values.
 * They are NOT official food-safety standards.
 */
(function (root) {
  'use strict';

  // ---------------------------------------------------------------------------
  // 1. Constants
  // ---------------------------------------------------------------------------

  // Keys are prefixed so we never clash with teammates' localStorage keys.
  const STORAGE_KEYS = Object.freeze({
    settings: 'smartPantry.member6.settings',
    history: 'smartPantry.member6.history'
  });

  // Only the newest readings are stored, so localStorage never fills up.
  const MAX_STORED_READINGS = 100;

  // Where a reading came from. 'sensor' is reserved for a future real sensor.
  const VALID_SOURCES = ['simulated', 'manual-test', 'sensor'];

  // Demo defaults. "Critical margin" = how far past a limit counts as Critical.
  const DEFAULT_SETTINGS = Object.freeze({
    tempMin: 1,
    tempMax: 5,
    tempCriticalMargin: 3,
    humidityMin: 30,
    humidityMax: 70,
    humidityCriticalMargin: 10
  });

  // Allowed range for each setting (used by validation).
  const SETTING_FIELDS = Object.freeze({
    tempMin: { label: 'Minimum temperature', unit: '°C', min: -30, max: 30 },
    tempMax: { label: 'Maximum temperature', unit: '°C', min: -30, max: 30 },
    tempCriticalMargin: { label: 'Temperature critical margin', unit: '°C', min: 0.5, max: 20 },
    humidityMin: { label: 'Minimum humidity', unit: '%', min: 0, max: 100 },
    humidityMax: { label: 'Maximum humidity', unit: '%', min: 0, max: 100 },
    humidityCriticalMargin: { label: 'Humidity critical margin', unit: '%', min: 1, max: 50 }
  });

  // Describes each measured value and which settings belong to it.
  // Adding a new metric later = add one entry here.
  const METRICS = Object.freeze({
    temperature: { label: 'Temperature', unit: '°C', minKey: 'tempMin', maxKey: 'tempMax', marginKey: 'tempCriticalMargin' },
    humidity: { label: 'Humidity', unit: '%', minKey: 'humidityMin', maxKey: 'humidityMax', marginKey: 'humidityCriticalMargin' }
  });

  const STATUS_RANK = { normal: 0, warning: 1, critical: 2 };

  // ---------------------------------------------------------------------------
  // 2. Status checking
  // ---------------------------------------------------------------------------

  /**
   * Check ONE value against its limits.
   * Normal   : min <= value <= max
   * Warning  : outside the limits, but by less than the critical margin
   * Critical : outside the limits by the critical margin or more
   * Unknown  : value is missing or not a real number
   */
  function evaluateMetric(value, min, max, criticalMargin) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return { status: 'unknown', direction: null, limit: null };
    }
    // Round the gap to avoid tiny decimal errors such as 0.30000000000000004.
    const aboveBy = Math.round((value - max) * 1000) / 1000;
    const belowBy = Math.round((min - value) * 1000) / 1000;

    if (aboveBy > 0) {
      return { status: aboveBy >= criticalMargin ? 'critical' : 'warning', direction: 'high', limit: max };
    }
    if (belowBy > 0) {
      return { status: belowBy >= criticalMargin ? 'critical' : 'warning', direction: 'low', limit: min };
    }
    return { status: 'normal', direction: null, limit: null };
  }

  /** Check a whole reading. Returns { temperature: {...}, humidity: {...} }. */
  function evaluateReading(reading, settings) {
    const evaluation = {};
    Object.keys(METRICS).forEach(function (metric) {
      const info = METRICS[metric];
      evaluation[metric] = evaluateMetric(
        reading ? reading[metric] : undefined,
        settings[info.minKey],
        settings[info.maxKey],
        settings[info.marginKey]
      );
    });
    return evaluation;
  }

  /** The worst status in an evaluation (used for the table "Status" column). */
  function overallStatus(evaluation) {
    let worst = 'unknown';
    Object.keys(evaluation).forEach(function (metric) {
      const status = evaluation[metric].status;
      if (status === 'unknown') return;
      if (worst === 'unknown' || STATUS_RANK[status] > STATUS_RANK[worst]) worst = status;
    });
    return worst;
  }

  // ---------------------------------------------------------------------------
  // 3. Settings validation
  // ---------------------------------------------------------------------------

  /** Turn form text into a number. Empty or invalid text becomes NaN. */
  function parseNumberInput(raw) {
    if (typeof raw === 'number') return raw;
    if (typeof raw !== 'string') return NaN;
    const text = raw.trim();
    return text === '' ? NaN : Number(text);
  }

  /**
   * Validate settings typed by the user.
   * Returns { isValid, errors, values }.
   *   errors : { fieldName: 'friendly message' }
   *   values : clean numbers (only trustworthy when isValid is true)
   */
  function validateSettings(rawSettings) {
    const errors = {};
    const values = {};

    Object.keys(SETTING_FIELDS).forEach(function (name) {
      const rule = SETTING_FIELDS[name];
      const raw = rawSettings ? rawSettings[name] : undefined;
      const number = parseNumberInput(raw);
      const isEmpty = raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '');

      if (isEmpty) {
        errors[name] = rule.label + ' is required.';
      } else if (!Number.isFinite(number)) {
        errors[name] = rule.label + ' must be a number.';
      } else if (number < rule.min || number > rule.max) {
        errors[name] = rule.label + ' must be between ' + rule.min + ' and ' + rule.max + ' ' + rule.unit + '.';
      } else {
        values[name] = number;
      }
    });

    // Cross-checks (only when both numbers are individually valid).
    if (!errors.tempMin && !errors.tempMax && values.tempMin >= values.tempMax) {
      errors.tempMax = 'Minimum temperature must be less than maximum temperature.';
    }
    if (!errors.humidityMin && !errors.humidityMax && values.humidityMin >= values.humidityMax) {
      errors.humidityMax = 'Minimum humidity must be less than maximum humidity.';
    }

    return { isValid: Object.keys(errors).length === 0, errors: errors, values: values };
  }

  /** Use stored settings only if they are valid; otherwise use the defaults. */
  function sanitizeStoredSettings(stored) {
    const merged = Object.assign({}, DEFAULT_SETTINGS, stored && typeof stored === 'object' ? stored : {});
    const result = validateSettings(merged);
    return result.isValid ? result.values : Object.assign({}, DEFAULT_SETTINGS);
  }

  // ---------------------------------------------------------------------------
  // 4. Safe localStorage helpers (private mode / full storage safe)
  // ---------------------------------------------------------------------------

  function readStorageItem(key) {
    try {
      return root.localStorage.getItem(key);
    } catch (error) {
      return null; // storage blocked or unavailable
    }
  }

  function loadJson(key, fallback) {
    const raw = readStorageItem(key);
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw);
    } catch (error) {
      return fallback; // damaged data: ignore it
    }
  }

  /** Returns { ok: true } or { ok: false, error: 'QuotaExceededError' ... } */
  function saveJson(key, value) {
    try {
      root.localStorage.setItem(key, JSON.stringify(value));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error && error.name ? error.name : 'StorageError' };
    }
  }

  /** True if we can really write to localStorage. */
  function isStorageAvailable() {
    try {
      const testKey = 'smartPantry.member6.__test';
      root.localStorage.setItem(testKey, '1');
      root.localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  function loadSettings() {
    return sanitizeStoredSettings(loadJson(STORAGE_KEYS.settings, null));
  }

  function saveSettings(settings) {
    return saveJson(STORAGE_KEYS.settings, settings);
  }

  // ---------------------------------------------------------------------------
  // 5. Reading history
  // ---------------------------------------------------------------------------

  /** Return a clean reading object, or null if the data is not usable. */
  function sanitizeReading(candidate) {
    if (!candidate || typeof candidate !== 'object') return null;
    if (typeof candidate.temperature !== 'number' || !Number.isFinite(candidate.temperature)) return null;
    if (typeof candidate.humidity !== 'number' || !Number.isFinite(candidate.humidity)) return null;
    if (typeof candidate.timestamp !== 'string' || Number.isNaN(Date.parse(candidate.timestamp))) return null;
    return {
      timestamp: candidate.timestamp,
      temperature: candidate.temperature,
      humidity: candidate.humidity,
      source: VALID_SOURCES.indexOf(candidate.source) >= 0 ? candidate.source : 'simulated'
    };
  }

  /** Add a reading and keep only the newest `max` readings. */
  function appendReading(history, reading, max) {
    const limit = max || MAX_STORED_READINGS;
    return history.concat([reading]).slice(-limit);
  }

  function loadHistory() {
    const stored = loadJson(STORAGE_KEYS.history, []);
    if (!Array.isArray(stored)) return [];
    return stored.map(sanitizeReading).filter(Boolean).slice(-MAX_STORED_READINGS);
  }

  function saveHistory(history) {
    return saveJson(STORAGE_KEYS.history, history);
  }

  // ---------------------------------------------------------------------------
  // 6. Alert manager
  // ---------------------------------------------------------------------------
  //
  // Rules:
  //  - A new alert is created only when a condition STARTS or CHANGES
  //    (Normal -> Warning, Warning -> Critical, high -> low, ...).
  //  - The same ongoing condition does NOT create the same alert again.
  //  - When the reading is Normal again, the active alert is resolved.

  function buildAlertMessage(metric, result, value) {
    const info = METRICS[metric];
    const where = result.direction === 'high' ? 'above the maximum' : 'below the minimum';
    return info.label + ' is ' + value.toFixed(1) + ' ' + info.unit + ', ' + where + ' of ' + result.limit + ' ' + info.unit + '.';
  }

  function createAlertManager(maxLogEntries) {
    const maxLog = maxLogEntries || 30;
    const active = {}; // one active alert per metric: { temperature: {...}, humidity: {...} }
    let log = [];      // newest first
    let idCounter = 0;

    function makeEvent(type, alert, time, message) {
      idCounter += 1;
      return { id: idCounter, type: type, metric: alert.metric, level: alert.level, direction: alert.direction, message: message, time: time };
    }

    /**
     * Look at one new reading. Returns the list of NEW events
     * (types: 'raised', 'escalated', 'eased', 'resolved'). Empty list = nothing new.
     */
    function process(reading, evaluation) {
      const newEvents = [];

      Object.keys(METRICS).forEach(function (metric) {
        const result = evaluation[metric];
        const current = active[metric];
        const info = METRICS[metric];

        if (!result || result.status === 'unknown') return; // bad data: change nothing

        if (result.status === 'normal') {
          if (current) {
            delete active[metric];
            newEvents.push(makeEvent('resolved', current, reading.timestamp,
              info.label + ' is back to normal (' + reading[metric].toFixed(1) + ' ' + info.unit + ').'));
          }
          return;
        }

        // Same ongoing condition -> do not repeat the alert.
        if (current && current.level === result.status && current.direction === result.direction) return;

        let type = 'raised';
        if (current && current.direction === result.direction) {
          type = STATUS_RANK[result.status] > STATUS_RANK[current.level] ? 'escalated' : 'eased';
        }

        const alert = {
          metric: metric,
          level: result.status,
          direction: result.direction,
          message: buildAlertMessage(metric, result, reading[metric]),
          raisedAt: reading.timestamp
        };
        active[metric] = alert;
        newEvents.push(makeEvent(type, alert, reading.timestamp, alert.message));
      });

      newEvents.forEach(function (event) { log.unshift(event); });
      log = log.slice(0, maxLog);
      return newEvents;
    }

    return {
      process: process,
      getActive: function () { return Object.keys(active).map(function (metric) { return active[metric]; }); },
      getLog: function () { return log.slice(); },
      clearLog: function () { log = []; }
    };
  }

  // ---------------------------------------------------------------------------
  // 7. Public API
  // ---------------------------------------------------------------------------

  const api = {
    STORAGE_KEYS: STORAGE_KEYS,
    MAX_STORED_READINGS: MAX_STORED_READINGS,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    SETTING_FIELDS: SETTING_FIELDS,
    METRICS: METRICS,
    evaluateMetric: evaluateMetric,
    evaluateReading: evaluateReading,
    overallStatus: overallStatus,
    parseNumberInput: parseNumberInput,
    validateSettings: validateSettings,
    sanitizeStoredSettings: sanitizeStoredSettings,
    isStorageAvailable: isStorageAvailable,
    loadSettings: loadSettings,
    saveSettings: saveSettings,
    sanitizeReading: sanitizeReading,
    appendReading: appendReading,
    loadHistory: loadHistory,
    saveHistory: saveHistory,
    createAlertManager: createAlertManager
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api; // for Node tests
  root.MonitorLogic = api;
})(typeof window !== 'undefined' ? window : globalThis);
