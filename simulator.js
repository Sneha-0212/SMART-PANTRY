/**
 * simulator.js  (SMART PANTRY - Member 6: Refrigerator Monitoring)
 *
 * ALL READINGS FROM THIS FILE ARE SIMULATED. No real sensor is connected.
 *
 * What this file does:
 *   - makes believable temperature and humidity readings on a timer
 *   - start / stop controls
 *   - injectReading(): lets you push a manual test reading (even out-of-range)
 *
 * It has NO screen code. It only calls the functions you give it:
 *   onReading(reading)   -> a new reading is ready
 *   onError(error)       -> the sensor could not be read
 *   onStateChange(bool)  -> simulation started (true) or stopped (false)
 *
 * Loaded in the browser as: window.FridgeSimulator.createSimulator(...)
 */
(function (root) {
  'use strict';

  const SIMULATION_CONFIG = Object.freeze({
    intervalMs: 3000,        // time between readings
    baseTemperature: 3.5,    // °C the fridge "likes" to sit at (demo value)
    baseHumidity: 50,        // % the fridge "likes" to sit at (demo value)
    doorOpenChance: 0.06,    // chance per tick that a "door left open" spike happens
    // Allowed range for MANUAL test readings (wide on purpose, to test alerts).
    manualLimits: Object.freeze({
      temperature: Object.freeze({ min: -40, max: 60, label: 'Temperature', unit: '°C' }),
      humidity: Object.freeze({ min: 0, max: 100, label: 'Humidity', unit: '%' })
    })
  });

  // The "source" label saved with every reading.
  // When you connect a real sensor, change this to 'sensor'.
  const AUTOMATIC_READING_SOURCE = 'simulated';

  function roundToOneDecimal(number) {
    return Math.round(number * 10) / 10;
  }

  function clamp(number, min, max) {
    return Math.min(max, Math.max(min, number));
  }

  /**
   * Create a simulator.
   * options: { onReading, onError, onStateChange, intervalMs, random, now }
   * `random` and `now` can be replaced in tests to get predictable results.
   */
  function createSimulator(options) {
    const settings = options || {};
    const intervalMs = settings.intervalMs || SIMULATION_CONFIG.intervalMs;
    const random = settings.random || Math.random;
    const now = settings.now || function () { return new Date(); };
    const onReading = settings.onReading || function () {};
    const onError = settings.onError || function () {};
    const onStateChange = settings.onStateChange || function () {};

    // The fake fridge "memory": values drift slowly from one reading to the next.
    const fakeFridge = {
      temperature: SIMULATION_CONFIG.baseTemperature,
      humidity: SIMULATION_CONFIG.baseHumidity
    };

    let running = false;
    let timerId = null;
    let runId = 0; // changes on every start/stop so late results from an old run are ignored

    // -------------------------------------------------------------------------
    // Fake data generator
    // -------------------------------------------------------------------------
    function generateSimulatedValues() {
      // 1) Slowly move back toward the normal level, plus a little random noise.
      fakeFridge.temperature += (SIMULATION_CONFIG.baseTemperature - fakeFridge.temperature) * 0.25 + (random() - 0.5) * 0.6;
      fakeFridge.humidity += (SIMULATION_CONFIG.baseHumidity - fakeFridge.humidity) * 0.2 + (random() - 0.5) * 3;

      // 2) Sometimes pretend the door was left open: temperature and humidity jump up.
      if (random() < SIMULATION_CONFIG.doorOpenChance) {
        fakeFridge.temperature += 2 + random() * 3;
        fakeFridge.humidity += 6 + random() * 8;
      }

      // 3) Keep the fake values in a believable range.
      fakeFridge.temperature = clamp(fakeFridge.temperature, -5, 20);
      fakeFridge.humidity = clamp(fakeFridge.humidity, 10, 95);

      return { temperature: fakeFridge.temperature, humidity: fakeFridge.humidity };
    }

    // =========================================================================
    //  >>> THE ONE FUNCTION TO REPLACE FOR A REAL SENSOR (for example ESP32) <<<
    //
    //  It must return a Promise that gives { temperature: <°C>, humidity: <%> }.
    //  Example for an ESP32 that serves JSON at http://192.168.1.50/reading:
    //
    //    async function fetchLatestReading() {
    //      const response = await fetch('http://192.168.1.50/reading');
    //      if (!response.ok) throw new Error('Sensor replied with status ' + response.status);
    //      const data = await response.json();
    //      return { temperature: data.temperature, humidity: data.humidity };
    //    }
    //
    //  Then also: set AUTOMATIC_READING_SOURCE to 'sensor' and update the
    //  "SIMULATED DATA" labels in refrigerator_monitoring.html.
    // =========================================================================
    function fetchLatestReading() {
      return Promise.resolve(generateSimulatedValues());
    }

    // -------------------------------------------------------------------------
    // Turn raw values into a reading object
    // -------------------------------------------------------------------------
    function buildReading(values, source) {
      if (!values || !Number.isFinite(values.temperature) || !Number.isFinite(values.humidity)) {
        throw new Error('The sensor returned invalid values.');
      }
      return {
        timestamp: now().toISOString(),
        temperature: roundToOneDecimal(values.temperature),
        humidity: roundToOneDecimal(values.humidity),
        source: source
      };
    }

    // -------------------------------------------------------------------------
    // Timer controls
    // -------------------------------------------------------------------------
    function takeOneReading(myRunId) {
      return fetchLatestReading()
        .then(function (values) {
          if (!running || myRunId !== runId) return; // stopped meanwhile: ignore
          onReading(buildReading(values, AUTOMATIC_READING_SOURCE));
        })
        .catch(function (error) {
          onError(error);
        });
    }

    function start() {
      if (running) return;
      running = true;
      runId += 1;
      const myRunId = runId;
      takeOneReading(myRunId); // first reading right away
      timerId = setInterval(function () { takeOneReading(myRunId); }, intervalMs);
      onStateChange(true);
    }

    function stop() {
      if (!running) return;
      running = false;
      runId += 1;
      clearInterval(timerId);
      timerId = null;
      onStateChange(false);
    }

    // -------------------------------------------------------------------------
    // Manual test reading
    // -------------------------------------------------------------------------
    function parseManualValue(raw) {
      if (typeof raw === 'number') return raw;
      if (typeof raw !== 'string' || raw.trim() === '') return NaN;
      return Number(raw.trim());
    }

    /**
     * Push one manual test reading (works even when the simulation is stopped).
     * Returns { ok: true, reading } or { ok: false, error: 'message' }.
     */
    function injectReading(rawTemperature, rawHumidity) {
      const input = { temperature: parseManualValue(rawTemperature), humidity: parseManualValue(rawHumidity) };

      const metrics = Object.keys(SIMULATION_CONFIG.manualLimits);
      for (let i = 0; i < metrics.length; i += 1) {
        const rule = SIMULATION_CONFIG.manualLimits[metrics[i]];
        const value = input[metrics[i]];
        if (!Number.isFinite(value) || value < rule.min || value > rule.max) {
          return { ok: false, error: rule.label + ' must be a number between ' + rule.min + ' and ' + rule.max + ' ' + rule.unit + '.' };
        }
      }

      const reading = buildReading(input, 'manual-test');
      onReading(reading);
      return { ok: true, reading: reading };
    }

    return {
      start: start,
      stop: stop,
      isRunning: function () { return running; },
      injectReading: injectReading,
      getIntervalMs: function () { return intervalMs; }
    };
  }

  const api = { SIMULATION_CONFIG: SIMULATION_CONFIG, createSimulator: createSimulator };

  if (typeof module !== 'undefined' && module.exports) module.exports = api; // for Node tests
  root.FridgeSimulator = api;
})(typeof window !== 'undefined' ? window : globalThis);
