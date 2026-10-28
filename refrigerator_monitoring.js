/**
 * refrigerator_monitoring.js  (SMART PANTRY - Member 6: Refrigerator Monitoring)
 *
 * This is the SCREEN code. It connects everything together:
 *   MonitorLogic     (js/monitor_logic.js)      -> status checks, alerts, settings, storage
 *   FridgeSimulator  (js/simulator.js)          -> simulated readings
 *   InventoryAdapter (js/inventory_adapter.js)  -> Use Soon / Check Now counts
 *   Chart.js                                    -> the two line charts
 *
 * All readings are SIMULATED. Thresholds are demo values, not food-safety standards.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Settings for this screen
  // ---------------------------------------------------------------------------
  const CHART_POINTS = 30;   // how many readings the charts show
  const TABLE_ROWS = 10;     // how many readings the table shows

  const STATUS_LABELS = { normal: 'Normal', warning: 'Warning', critical: 'Critical', unknown: 'No data' };
  const EVENT_LABELS = { raised: 'Raised', escalated: 'Escalated', eased: 'Eased', resolved: 'Resolved' };
  const SOURCE_LABELS = { 'simulated': 'Simulated', 'manual-test': 'Manual test', 'sensor': 'Sensor' };

  const Logic = window.MonitorLogic;
  const SimulatorTools = window.FridgeSimulator;
  const Inventory = window.InventoryAdapter;

  // Everything that changes while the page runs lives here.
  const state = {
    settings: null,
    history: [],
    latestReading: null,
    alertManager: Logic.createAlertManager(30),
    simulator: null,
    charts: { temperature: null, humidity: null },
    chartLibraryMissing: typeof window.Chart === 'undefined'
  };

  const els = {}; // filled by cacheElements()

  // ---------------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------------
  function cacheElements() {
    [
      'lastUpdated', 'simIndicator', 'storageNotice', 'alertAnnouncer',
      'tempCard', 'tempValue', 'tempBadge', 'tempDetail', 'tempLimits',
      'humidityCard', 'humidityValue', 'humidityBadge', 'humidityDetail', 'humidityLimits',
      'startSimBtn', 'stopSimBtn', 'simNote',
      'injectForm', 'injectTemp', 'injectHumidity', 'injectMessage',
      'chartsUnavailable', 'chartsEmpty', 'chartsArea', 'tempChart', 'humidityChart',
      'activeAlerts', 'alertLog', 'clearAlertLogBtn',
      'historyEmpty', 'tableWrap', 'readingsBody', 'clearHistoryBtn',
      'inventorySource', 'inventoryMessage', 'useSoonCount', 'useSoonNames',
      'checkNowCount', 'checkNowNames', 'refreshInventoryBtn',
      'settingsForm', 'settingsMessage', 'restoreDefaultsBtn'
    ].forEach(function (id) { els[id] = document.getElementById(id); });
  }

  function formatTime(isoText) {
    const date = new Date(isoText);
    if (Number.isNaN(date.getTime())) return '--';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function formatDateTime(isoText) {
    const date = new Date(isoText);
    if (Number.isNaN(date.getTime())) return '--';
    return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'medium' });
  }

  /** Make an element with optional class and text. Text is set safely (no HTML injection). */
  function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function setBadge(badgeElement, status) {
    badgeElement.className = 'badge badge-' + status;
    badgeElement.textContent = STATUS_LABELS[status] || STATUS_LABELS.unknown;
  }

  function showStorageNotice() {
    els.storageNotice.hidden = false;
  }

  // ---------------------------------------------------------------------------
  // Metric cards (temperature + humidity)
  // ---------------------------------------------------------------------------
  const METRIC_CARDS = [
    { metric: 'temperature', card: 'tempCard', value: 'tempValue', badge: 'tempBadge', detail: 'tempDetail', limits: 'tempLimits' },
    { metric: 'humidity', card: 'humidityCard', value: 'humidityValue', badge: 'humidityBadge', detail: 'humidityDetail', limits: 'humidityLimits' }
  ];

  function describeDirection(result) {
    if (result.status === 'normal') return 'Within the normal range';
    if (result.direction === 'high') return 'Above the maximum of ' + result.limit;
    if (result.direction === 'low') return 'Below the minimum of ' + result.limit;
    return '';
  }

  function renderLimits() {
    const s = state.settings;
    els.tempLimits.textContent = s.tempMin + ' to ' + s.tempMax + ' °C (Critical at ' + s.tempCriticalMargin + ' °C beyond a limit)';
    els.humidityLimits.textContent = s.humidityMin + ' to ' + s.humidityMax + ' % (Critical at ' + s.humidityCriticalMargin + ' % beyond a limit)';
  }

  function renderMetricCards(reading, evaluation) {
    METRIC_CARDS.forEach(function (config) {
      const result = evaluation[config.metric];
      els[config.value].textContent = reading[config.metric].toFixed(1);
      setBadge(els[config.badge], result.status);
      els[config.detail].textContent = describeDirection(result);
      els[config.card].className = 'card metric-card metric-card-' + result.status;
    });
  }

  function renderLastUpdated(isoText) {
    els.lastUpdated.textContent = formatDateTime(isoText);
    els.lastUpdated.setAttribute('datetime', isoText);
  }

  // ---------------------------------------------------------------------------
  // Alerts panel
  // ---------------------------------------------------------------------------
  function buildAlertTitle(alert) {
    const info = Logic.METRICS[alert.metric];
    const levelText = alert.level === 'critical' ? 'Critical' : 'Warning';
    return levelText + ': ' + info.label + ' too ' + alert.direction;
  }

  function renderAlerts() {
    // Active alerts
    els.activeAlerts.textContent = '';
    const active = state.alertManager.getActive();
    if (active.length === 0) {
      const message = state.latestReading
        ? 'No active alerts. Temperature and humidity are within the limits.'
        : 'Waiting for the first reading.';
      els.activeAlerts.appendChild(makeElement('li', 'empty-state', message));
    } else {
      active.forEach(function (alert) {
        const item = makeElement('li', 'alert-item alert-' + alert.level);
        item.appendChild(makeElement('p', 'alert-title', buildAlertTitle(alert)));
        item.appendChild(makeElement('p', 'alert-text', alert.message));
        item.appendChild(makeElement('p', 'alert-time', 'Since ' + formatTime(alert.raisedAt)));
        els.activeAlerts.appendChild(item);
      });
    }

    // Alert log (newest first)
    els.alertLog.textContent = '';
    const log = state.alertManager.getLog();
    if (log.length === 0) {
      els.alertLog.appendChild(makeElement('li', 'empty-state', 'The alert log is empty.'));
    } else {
      log.forEach(function (event) {
        const styleName = event.type === 'resolved' ? 'normal' : event.level;
        const item = makeElement('li', 'alert-item alert-' + styleName);
        item.appendChild(makeElement('p', 'alert-title', EVENT_LABELS[event.type] + ' at ' + formatTime(event.time)));
        item.appendChild(makeElement('p', 'alert-text', event.message));
        els.alertLog.appendChild(item);
      });
    }
  }

  /** Tell screen readers about NEW alert events only (not the whole list again). */
  function announceEvents(events) {
    if (events.length === 0) return;
    els.alertAnnouncer.textContent = events.map(function (event) {
      return EVENT_LABELS[event.type] + ': ' + event.message;
    }).join(' ');
  }

  // ---------------------------------------------------------------------------
  // History: table + charts
  // ---------------------------------------------------------------------------
  function renderTable() {
    const hasData = state.history.length > 0;
    els.historyEmpty.hidden = hasData;
    els.tableWrap.hidden = !hasData;
    els.readingsBody.textContent = '';

    state.history.slice(-TABLE_ROWS).reverse().forEach(function (reading) {
      const status = Logic.overallStatus(Logic.evaluateReading(reading, state.settings));
      const row = document.createElement('tr');
      row.appendChild(makeElement('td', '', formatTime(reading.timestamp)));
      row.appendChild(makeElement('td', '', reading.temperature.toFixed(1)));
      row.appendChild(makeElement('td', '', reading.humidity.toFixed(1)));

      const statusCell = document.createElement('td');
      statusCell.appendChild(makeElement('span', 'badge badge-' + status, STATUS_LABELS[status]));
      row.appendChild(statusCell);

      row.appendChild(makeElement('td', '', SOURCE_LABELS[reading.source] || 'Simulated'));
      els.readingsBody.appendChild(row);
    });
  }

  function createLineChart(canvas, label, color, axisTitle) {
    return new window.Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          { label: label, data: [], borderColor: color, backgroundColor: color, borderWidth: 2, pointRadius: 2, tension: 0.25 },
          { label: 'Minimum limit', data: [], borderColor: '#92400e', borderDash: [6, 4], borderWidth: 1.5, pointRadius: 0 },
          { label: 'Maximum limit', data: [], borderColor: '#991b1b', borderDash: [6, 4], borderWidth: 1.5, pointRadius: 0 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false, // keep motion minimal
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: { ticks: { maxTicksLimit: 6, maxRotation: 0 } },
          y: { title: { display: true, text: axisTitle } }
        },
        plugins: { legend: { position: 'bottom' } }
      }
    });
  }

  function setupCharts() {
    if (state.chartLibraryMissing) {
      els.chartsUnavailable.hidden = false;
      return;
    }
    state.charts.temperature = createLineChart(els.tempChart, 'Temperature (°C)', '#166534', '°C');
    state.charts.humidity = createLineChart(els.humidityChart, 'Humidity (%)', '#0e7490', '%');
  }

  function updateOneChart(chart, metric, recent, minValue, maxValue) {
    chart.data.labels = recent.map(function (reading) { return formatTime(reading.timestamp); });
    chart.data.datasets[0].data = recent.map(function (reading) { return reading[metric]; });
    chart.data.datasets[1].data = recent.map(function () { return minValue; });
    chart.data.datasets[2].data = recent.map(function () { return maxValue; });
    chart.update('none');
  }

  function renderCharts() {
    const hasData = state.history.length > 0;
    els.chartsEmpty.hidden = hasData || state.chartLibraryMissing;
    els.chartsArea.hidden = !hasData || state.chartLibraryMissing;
    if (!hasData || state.chartLibraryMissing) return;

    const recent = state.history.slice(-CHART_POINTS);
    const s = state.settings;
    updateOneChart(state.charts.temperature, 'temperature', recent, s.tempMin, s.tempMax);
    updateOneChart(state.charts.humidity, 'humidity', recent, s.humidityMin, s.humidityMax);
  }

  function renderHistoryViews() {
    renderTable();
    renderCharts();
  }

  // ---------------------------------------------------------------------------
  // Handling a new reading (from the simulator or a manual test)
  // ---------------------------------------------------------------------------
  /**
   * save = true  -> new reading: add it to history and save it
   * save = false -> re-check the latest reading after settings changed (history untouched)
   */
  function applyReading(reading, save) {
    const isFirstReading = state.latestReading === null;
    state.latestReading = reading;

    const evaluation = Logic.evaluateReading(reading, state.settings);
    const newEvents = state.alertManager.process(reading, evaluation);

    renderMetricCards(reading, evaluation);
    renderLastUpdated(reading.timestamp);
    if (newEvents.length > 0 || !save || isFirstReading) {
      renderAlerts();           // redraw only when something changed
      announceEvents(newEvents);
    }

    if (save) {
      state.history = Logic.appendReading(state.history, reading, Logic.MAX_STORED_READINGS);
      if (!Logic.saveHistory(state.history).ok) showStorageNotice();
      renderHistoryViews();
    }
  }

  function handleNewReading(reading) {
    applyReading(reading, true);
  }

  function handleSimulatorError(error) {
    els.simNote.textContent = 'Could not get a reading: ' + (error && error.message ? error.message : 'unknown problem') + '. Trying again on the next tick.';
  }

  // ---------------------------------------------------------------------------
  // Simulator controls
  // ---------------------------------------------------------------------------
  function renderSimulationState(isRunning) {
    els.simIndicator.textContent = isRunning ? 'SIMULATION: running' : 'SIMULATION: stopped';
    els.simIndicator.className = 'sim-pill ' + (isRunning ? 'sim-pill-running' : 'sim-pill-stopped');
    els.startSimBtn.disabled = isRunning;
    els.stopSimBtn.disabled = !isRunning;
    els.simNote.textContent = isRunning ? '' : 'Simulation stopped. The values above are the last reading received.';
  }

  function setInjectMessage(text, kind) {
    els.injectMessage.textContent = text;
    els.injectMessage.className = 'form-message' + (kind ? ' form-message-' + kind : '');
  }

  function injectFromInputs() {
    const result = state.simulator.injectReading(els.injectTemp.value, els.injectHumidity.value);
    if (!result.ok) {
      setInjectMessage(result.error, 'error');
      return;
    }
    setInjectMessage('Test reading sent: ' + result.reading.temperature.toFixed(1) + ' °C, ' + result.reading.humidity.toFixed(1) + ' %.', 'success');
  }

  // ---------------------------------------------------------------------------
  // Settings form
  // ---------------------------------------------------------------------------
  function fillSettingsForm(settings) {
    Object.keys(Logic.SETTING_FIELDS).forEach(function (name) {
      document.getElementById(name).value = settings[name];
    });
  }

  function readSettingsForm() {
    const raw = {};
    Object.keys(Logic.SETTING_FIELDS).forEach(function (name) {
      raw[name] = document.getElementById(name).value;
    });
    return raw;
  }

  function showFieldErrors(errors) {
    Object.keys(Logic.SETTING_FIELDS).forEach(function (name) {
      const input = document.getElementById(name);
      const message = errors[name] || '';
      document.getElementById(name + '-error').textContent = message;
      if (message) {
        input.setAttribute('aria-invalid', 'true');
      } else {
        input.removeAttribute('aria-invalid');
      }
    });
  }

  function setSettingsMessage(text, kind) {
    els.settingsMessage.textContent = text;
    els.settingsMessage.className = 'form-message form-message-' + kind;
  }

  /** After settings change: redraw limits, badges, alerts, table and charts. */
  function applyNewSettings() {
    renderLimits();
    if (state.latestReading) applyReading(state.latestReading, false);
    renderHistoryViews();
  }

  function handleSettingsSubmit(event) {
    event.preventDefault();
    const result = Logic.validateSettings(readSettingsForm());
    showFieldErrors(result.errors);

    if (!result.isValid) {
      setSettingsMessage('Settings were not saved. Please fix the fields marked below.', 'error');
      const firstBadField = Object.keys(Logic.SETTING_FIELDS).filter(function (name) { return result.errors[name]; })[0];
      if (firstBadField) document.getElementById(firstBadField).focus();
      return;
    }

    state.settings = result.values;
    const saved = Logic.saveSettings(result.values);
    if (saved.ok) {
      setSettingsMessage('Settings saved.', 'success');
    } else {
      showStorageNotice();
      setSettingsMessage('Settings are in use now, but could not be saved in this browser (storage unavailable or full).', 'warning');
    }
    applyNewSettings();
  }

  function handleRestoreDefaults() {
    state.settings = Object.assign({}, Logic.DEFAULT_SETTINGS);
    fillSettingsForm(state.settings);
    showFieldErrors({});
    const saved = Logic.saveSettings(state.settings);
    if (saved.ok) {
      setSettingsMessage('Default settings restored.', 'success');
    } else {
      showStorageNotice();
      setSettingsMessage('Default settings are in use now, but could not be saved in this browser.', 'warning');
    }
    applyNewSettings();
  }

  // ---------------------------------------------------------------------------
  // Inventory insights
  // ---------------------------------------------------------------------------
  function renderNameList(listElement, names) {
    listElement.textContent = '';
    names.forEach(function (name) { listElement.appendChild(makeElement('li', '', name)); });
  }

  function renderInventory() {
    let insights = null;
    try {
      insights = Inventory.getInventoryInsights();
    } catch (error) {
      insights = null; // the adapter must never break the page
    }

    if (!insights) {
      els.useSoonCount.textContent = '--';
      els.checkNowCount.textContent = '--';
      renderNameList(els.useSoonNames, []);
      renderNameList(els.checkNowNames, []);
      els.inventorySource.textContent = 'Inventory data is not available right now.';
      els.inventoryMessage.textContent = 'Inventory insights could not be loaded. Please try Refresh inventory later.';
      els.inventoryMessage.hidden = false;
      return;
    }

    els.useSoonCount.textContent = insights.useSoon.count;
    els.checkNowCount.textContent = insights.checkNow.count;
    renderNameList(els.useSoonNames, insights.useSoon.names);
    renderNameList(els.checkNowNames, insights.checkNow.names);

    els.inventorySource.textContent = insights.sourceType === 'shared'
      ? 'Source: shared inventory'
      : 'SAMPLE DATA: integration with the shared inventory is not complete yet';
    els.inventoryMessage.textContent = insights.message || '';
    els.inventoryMessage.hidden = !insights.message;
  }

  // ---------------------------------------------------------------------------
  // Start-up
  // ---------------------------------------------------------------------------
  function bindEvents() {
    els.startSimBtn.addEventListener('click', function () { state.simulator.start(); });
    els.stopSimBtn.addEventListener('click', function () { state.simulator.stop(); });

    els.injectForm.addEventListener('submit', function (event) {
      event.preventDefault();
      injectFromInputs();
    });
    document.querySelectorAll('.preset-btn').forEach(function (button) {
      button.addEventListener('click', function () {
        els.injectTemp.value = button.getAttribute('data-temp');
        els.injectHumidity.value = button.getAttribute('data-humidity');
        injectFromInputs();
      });
    });

    els.settingsForm.addEventListener('submit', handleSettingsSubmit);
    els.restoreDefaultsBtn.addEventListener('click', handleRestoreDefaults);

    els.clearAlertLogBtn.addEventListener('click', function () {
      state.alertManager.clearLog();
      renderAlerts();
    });

    els.clearHistoryBtn.addEventListener('click', function () {
      if (!window.confirm('Clear all saved readings? This cannot be undone.')) return;
      state.history = [];
      Logic.saveHistory(state.history);
      renderHistoryViews();
    });

    els.refreshInventoryBtn.addEventListener('click', renderInventory);
    // If another tab (for example Food Management) changes the inventory, refresh the counts.
    window.addEventListener('storage', function (event) {
      if (event.key === Inventory.INVENTORY_CONFIG.storageKey) renderInventory();
    });
  }

  function init() {
    cacheElements();

    if (!Logic.isStorageAvailable()) showStorageNotice();
    state.settings = Logic.loadSettings();
    state.history = Logic.loadHistory();

    fillSettingsForm(state.settings);
    renderLimits();
    setupCharts();
    renderHistoryViews();
    renderAlerts();
    renderInventory();

    state.simulator = SimulatorTools.createSimulator({
      onReading: handleNewReading,
      onError: handleSimulatorError,
      onStateChange: renderSimulationState
    });
    bindEvents();
    renderSimulationState(false);
    state.simulator.start();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
