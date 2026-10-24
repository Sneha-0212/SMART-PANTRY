/**
 * ============================================================================
 * SMART PANTRY - DASHBOARD JAVASCRIPT (Member 1 Assignment)
 * Tagline: "Less Waste, More Taste."
 * 
 * Responsibilities:
 *  1. Main Dashboard overview, welcome greeting, and dynamic metrics
 *  2. "Use Soon" interactive priority cards with countdowns & category filtering
 *  3. Zero-waste kitchen tips rotation engine
 *  4. Sidebar navigation & smooth view switching (with teammate placeholders)
 *  5. Mobile drawer navigation controls (hamburger & backdrop)
 *  6. Simulated IoT fridge telemetry refresh
 *  7. Beginner-friendly, well-commented code
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================================================
  // SECTION 1: SAMPLE & SIMULATED PANTRY DATA
  // (Clearly labeled sample data for the dashboard overview)
  // ==========================================================================

  // [SAMPLE PANTRY DATA]: Items approaching expiration date
  const samplePantryItems = [
    {
      id: 1,
      name: "Baby Spinach",
      category: "Produce",
      emoji: "🥬",
      quantity: "1 bag (200g)",
      daysLeft: 1,
      freshnessPercent: 45,
      urgency: "critical", // 'critical' (1 day) or 'warning' (2-3 days)
      urgencyLabel: "Critical (1 Day Left)",
      location: "Crisper Drawer",
      storageTip: "Keep sealed with a paper towel to absorb moisture.",
      recipeIdea: "Spinach, Feta & Herb Breakfast Frittata",
      wasteWeightGrams: 200,
      used: false
    },
    {
      id: 2,
      name: "Organic Whole Milk",
      category: "Dairy",
      emoji: "🥛",
      quantity: "1 Gallon",
      daysLeft: 2,
      freshnessPercent: 60,
      urgency: "warning",
      urgencyLabel: "Expiring Soon (2 Days Left)",
      location: "Fridge Door",
      storageTip: "Move to middle shelf for colder, more stable temperature.",
      recipeIdea: "Creamy Oatmeal or Golden Milk Latte",
      wasteWeightGrams: 900,
      used: false
    },
    {
      id: 3,
      name: "Greek Yogurt (Plain)",
      category: "Dairy",
      emoji: "🥣",
      quantity: "500g Tub",
      daysLeft: 2,
      freshnessPercent: 55,
      urgency: "warning",
      urgencyLabel: "Expiring Soon (2 Days Left)",
      location: "Top Shelf",
      storageTip: "Smooth the top surface to minimize whey separation.",
      recipeIdea: "Berry Breakfast Parfait or Creamy Cucumber Tzatziki",
      wasteWeightGrams: 500,
      used: false
    },
    {
      id: 4,
      name: "Ripe Bananas",
      category: "Produce",
      emoji: "🍌",
      quantity: "4 pcs",
      daysLeft: 1,
      freshnessPercent: 40,
      urgency: "critical",
      urgencyLabel: "Critical (1 Day Left)",
      location: "Pantry Basket",
      storageTip: "Separate stems from bunch or freeze chunks for smoothies.",
      recipeIdea: "Quick 3-Ingredient Banana Oat Blender Pancakes",
      wasteWeightGrams: 450,
      used: false
    }
  ];

  // [SIMULATED IOT DATA]: Smart Fridge Telemetry
  let simulatedFridgeData = {
    temperature: "3.6°C",
    humidity: "62%",
    doorStatus: "Closed",
    hubStatus: "Connected",
    lastSynced: "Live IoT Sync"
  };

  // Rotating Zero-Waste Tips Catalog
  const zeroWasteTips = [
    "Wrap celery and leafy greens in damp paper towels to double their crisp shelf life in the crisper drawer.",
    "Freeze ripe bananas in chunks for effortless morning smoothies and natural baking sweetener.",
    "Store potatoes and onions in separate dark bins—onions release gas that causes potatoes to sprout prematurely.",
    "Store fresh asparagus and cilantro upright in a glass of shallow water like flowers inside the fridge door.",
    "Revive wilted carrots and celery by trimming ends and soaking them in an ice-water bath for 30 minutes.",
    "Turn stale sourdough bread into golden olive oil garlic croutons or Tuscan Pappa al Pomodoro soup."
  ];

  let currentTipIndex = 0;
  let currentCategoryFilter = 'all';
  let totalWasteSavedKg = 4.8;
  let totalDollarsSaved = 36.50;

  // View titles and subtitles for navigation header updates
  const viewMetadata = {
    dashboard: {
      title: "Dashboard Overview",
      subtitle: "Track freshness, reduce household waste, and eat healthier."
    },
    inventory: {
      title: "Food Inventory",
      subtitle: "Full tracking of all pantry, fridge, and freezer supplies."
    },
    recipes: {
      title: "Recipe Suggestions",
      subtitle: "Zero-waste meal ideas generated from your expiring ingredients."
    },
    freshness: {
      title: "AI Freshness Check",
      subtitle: "Computer vision estimation for produce shelf life and quality."
    },
    fridge: {
      title: "Fridge Monitoring",
      subtitle: "Live IoT hardware telemetry, humidity, and temperature monitoring."
    }
  };

  // ==========================================================================
  // SECTION 2: DOM ELEMENT SELECTORS
  // ==========================================================================
  const sidebar = document.getElementById('sidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
  const navButtons = document.querySelectorAll('.nav-btn');
  const appViews = document.querySelectorAll('.app-view');
  const pageHeadingTitle = document.getElementById('pageHeadingTitle');
  const pageHeadingSubtitle = document.getElementById('pageHeadingSubtitle');
  const currentDateBadge = document.getElementById('currentDateBadge');

  // Welcome section elements
  const welcomeGreeting = document.getElementById('welcomeGreeting');
  const welcomeExpiringHighlight = document.getElementById('welcomeExpiringHighlight');
  const dailyTipText = document.getElementById('dailyTipText');
  const btnNextTip = document.getElementById('btnNextTip');

  // Summary card metric displays
  const statTotalItems = document.getElementById('statTotalItems');
  const statAttentionItems = document.getElementById('statAttentionItems');
  const statFridgeTemp = document.getElementById('statFridgeTemp');
  const statFridgeHumidity = document.getElementById('statFridgeHumidity');
  const statDoorStatus = document.getElementById('statDoorStatus');
  const statWasteReduced = document.getElementById('statWasteReduced');
  const statDollarsSaved = document.getElementById('statDollarsSaved');

  // Use Soon section elements
  const useSoonContainer = document.getElementById('useSoonContainer');
  const filterButtons = document.querySelectorAll('.filter-btn');

  // Quick Action Buttons
  const btnRefreshDashboard = document.getElementById('btnRefreshDashboard');
  const refreshIcon = document.getElementById('refreshIcon');
  const btnQuickAddHeader = document.getElementById('btnQuickAddHeader');
  const promoViewTriggers = document.querySelectorAll('[data-view-trigger]');
  const backToDashboardButtons = document.querySelectorAll('[data-go-dashboard]');

  // Recipe Modal Elements
  const quickRecipeModal = document.getElementById('quickRecipeModal');
  const recipeModalTitle = document.getElementById('recipeModalTitle');
  const recipeModalBody = document.getElementById('recipeModalBody');
  const closeRecipeModalBtn = document.getElementById('closeRecipeModalBtn');
  const btnModalUnderstood = document.getElementById('btnModalUnderstood');

  // Toast container
  const toastContainer = document.getElementById('toastContainer');

  // ==========================================================================
  // SECTION 3: WELCOME SECTION & DYNAMIC GREETING
  // ==========================================================================

  function initWelcomeSection() {
    // Dynamic time-of-day greeting based on user's local time
    const now = new Date();
    const hours = now.getHours();
    let timeGreeting = "Good morning";
    if (hours >= 12 && hours < 17) {
      timeGreeting = "Good afternoon";
    } else if (hours >= 17) {
      timeGreeting = "Good evening";
    }

    if (welcomeGreeting) {
      welcomeGreeting.textContent = `${timeGreeting}, Chef 👋`;
    }

    // Dynamic date formatting (e.g., Saturday, Oct 24, 2026)
    if (currentDateBadge) {
      const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
      const dateStr = now.toLocaleDateString('en-US', options);
      currentDateBadge.innerHTML = `<span>📅 Today: ${dateStr}</span>`;
    }

    // Initialize daily tip
    updateDailyTip();
  }

  function updateDailyTip() {
    if (dailyTipText) {
      dailyTipText.textContent = zeroWasteTips[currentTipIndex];
    }
  }

  if (btnNextTip) {
    btnNextTip.addEventListener('click', () => {
      currentTipIndex = (currentTipIndex + 1) % zeroWasteTips.length;
      updateDailyTip();
    });
  }

  // ==========================================================================
  // SECTION 4: NAVIGATION & TEAMMATE PLACEHOLDER SWITCHING
  // ==========================================================================

  /**
   * Switches the active view in the dashboard single-page interface
   * @param {string} targetView - View ID ('dashboard', 'inventory', 'recipes', 'freshness', 'fridge')
   */
  function switchDashboardView(targetView) {
    // 1. Update active state on sidebar navigation buttons
    navButtons.forEach(btn => {
      const view = btn.getAttribute('data-view');
      if (view === targetView) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // 2. Toggle active visibility on corresponding view sections
    appViews.forEach(view => {
      if (view.id === `view-${targetView}`) {
        view.classList.add('active');
      } else {
        view.classList.remove('active');
      }
    });

    // 3. Update top header title and subtitle dynamically
    if (viewMetadata[targetView]) {
      if (pageHeadingTitle) pageHeadingTitle.textContent = viewMetadata[targetView].title;
      if (pageHeadingSubtitle) pageHeadingSubtitle.textContent = viewMetadata[targetView].subtitle;
    }

    // 4. Close mobile sidebar drawer if currently open
    closeMobileDrawer();

    // 5. Smooth scroll back to top of page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Bind click listeners on all sidebar buttons
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetView = btn.getAttribute('data-view');
      if (targetView) {
        switchDashboardView(targetView);
      }
    });
  });

  // Bind all "Back to Dashboard" buttons on teammate placeholder cards
  backToDashboardButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      switchDashboardView('dashboard');
    });
  });

  // Bind promo card buttons on dashboard
  promoViewTriggers.forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.getAttribute('data-view-trigger');
      if (view) {
        switchDashboardView(view);
      }
    });
  });

  // ==========================================================================
  // SECTION 5: MOBILE DRAWER CONTROLS
  // ==========================================================================

  function openMobileDrawer() {
    if (sidebar) sidebar.classList.add('open');
    if (sidebarBackdrop) sidebarBackdrop.classList.add('active');
  }

  function closeMobileDrawer() {
    if (sidebar) sidebar.classList.remove('open');
    if (sidebarBackdrop) sidebarBackdrop.classList.remove('active');
  }

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
      if (sidebar && sidebar.classList.contains('open')) {
        closeMobileDrawer();
      } else {
        openMobileDrawer();
      }
    });
  }

  if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeMobileDrawer);
  if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeMobileDrawer);

  // ==========================================================================
  // SECTION 6: "USE SOON" RENDERING & USER INTERACTIONS
  // ==========================================================================

  function renderUseSoonCards() {
    if (!useSoonContainer) return;
    useSoonContainer.innerHTML = '';

    const activeItems = samplePantryItems.filter(item => {
      if (currentCategoryFilter === 'all') return true;
      return item.category.toLowerCase() === currentCategoryFilter.toLowerCase();
    });

    if (activeItems.length === 0) {
      useSoonContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 32px; color: var(--gray-500); background: var(--gray-50); border-radius: var(--radius-md);">
          <div style="font-size: 2rem; margin-bottom: 8px;">🎉</div>
          <strong>No expiring items in this category!</strong>
          <p style="font-size: 0.8rem; margin-top: 4px;">All produce and groceries in this section are fresh.</p>
        </div>
      `;
      return;
    }

    activeItems.forEach(item => {
      const card = document.createElement('div');
      card.className = `food-card ${item.urgency} ${item.used ? 'used' : ''}`;
      card.id = `food-item-${item.id}`;

      card.innerHTML = `
        <div>
          <div class="food-card-top">
            <div class="food-info-left">
              <span class="food-emoji" aria-hidden="true">${item.emoji}</span>
              <div>
                <h4 class="food-name">${item.name}</h4>
                <span class="food-category">${item.category} &bull; ${item.quantity}</span>
              </div>
            </div>
            <span class="urgency-badge ${item.urgency}">
              ${item.urgency === 'critical' ? '⚠️' : '⏳'} ${item.urgencyLabel}
            </span>
          </div>

          <div class="freshness-meter">
            <div class="freshness-label-row">
              <span>Estimated Freshness</span>
              <span><strong>${item.freshnessPercent}%</strong></span>
            </div>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill ${item.urgency}" style="width: ${item.freshnessPercent}%;"></div>
            </div>
          </div>

          <div style="font-size: 0.74rem; color: var(--gray-600); margin-bottom: 12px; background: var(--white); padding: 6px 10px; border-radius: var(--radius-sm); border: 1px solid var(--gray-200);">
            💡 <strong>Tip:</strong> ${item.storageTip}
          </div>
        </div>

        <div class="food-card-footer">
          <span class="food-location">📍 ${item.location}</span>
          <div class="card-action-btns">
            <button class="btn-sm btn-recipe-trigger" data-id="${item.id}" data-name="${item.name}" data-recipe="${item.recipeIdea}">
              Recipe Idea
            </button>
            <button class="btn-sm btn-mark-used" data-id="${item.id}" data-name="${item.name}" ${item.used ? 'disabled' : ''}>
              ${item.used ? 'Consumed ✓' : 'Mark Used'}
            </button>
          </div>
        </div>
      `;

      useSoonContainer.appendChild(card);
    });

    // Bind action buttons on rendered cards
    bindCardActions();
  }

  function bindCardActions() {
    // "Mark Used" buttons
    const markButtons = useSoonContainer.querySelectorAll('.btn-mark-used');
    markButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'), 10);
        const name = btn.getAttribute('data-name');
        
        const target = samplePantryItems.find(i => i.id === id);
        if (target && !target.used) {
          target.used = true;
          
          // Increment sustainability impact metrics
          totalWasteSavedKg += (target.wasteWeightGrams / 1000);
          totalDollarsSaved += 2.80;

          showToast(`🎉 "${name}" consumed! You prevented ~${target.wasteWeightGrams}g of food waste.`);
          
          updateDashboardSummary();
          renderUseSoonCards();
        }
      });
    });

    // "Recipe Idea" modal popup
    const recipeButtons = useSoonContainer.querySelectorAll('.btn-recipe-trigger');
    recipeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.getAttribute('data-name');
        const recipe = btn.getAttribute('data-recipe');
        openRecipeModal(name, recipe);
      });
    });
  }

  // Filter Buttons handling
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategoryFilter = btn.getAttribute('data-filter');
      renderUseSoonCards();
    });
  });

  // ==========================================================================
  // SECTION 7: SUMMARY METRICS & TELEMETRY UPDATES
  // ==========================================================================

  function updateDashboardSummary() {
    const unconsumed = samplePantryItems.filter(i => !i.used);
    const criticalCount = unconsumed.filter(i => i.urgency === 'critical').length;
    const attentionCount = unconsumed.length;

    // Update Attention counter
    if (statAttentionItems) {
      statAttentionItems.textContent = attentionCount;
    }

    if (welcomeExpiringHighlight) {
      welcomeExpiringHighlight.textContent = `${attentionCount} items`;
    }

    // Update Waste Reduced numbers
    if (statWasteReduced) {
      statWasteReduced.textContent = `${totalWasteSavedKg.toFixed(1)} kg`;
    }
    if (statDollarsSaved) {
      statDollarsSaved.textContent = `~₹${totalDollarsSaved.toFixed(2)}`;
    }
    const stripTotalSaved = document.getElementById('stripTotalSaved');
    if (stripTotalSaved) {
      stripTotalSaved.textContent = `₹${totalDollarsSaved.toFixed(2)}`;
    }
  }

  // Quick Sync / Refresh simulated IoT and counters
  if (btnRefreshDashboard) {
    btnRefreshDashboard.addEventListener('click', () => {
      // Add spinning animation
      if (refreshIcon) {
        refreshIcon.classList.add('spin-anim');
        setTimeout(() => refreshIcon.classList.remove('spin-anim'), 700);
      }

      // Simulate slight realistic temperature fluctuation
      const temps = ["3.5°C", "3.6°C", "3.7°C", "3.4°C"];
      const randomTemp = temps[Math.floor(Math.random() * temps.length)];
      simulatedFridgeData.temperature = randomTemp;

      if (statFridgeTemp) statFridgeTemp.textContent = randomTemp;
      if (statFridgeHumidity) statFridgeHumidity.textContent = "62%";
      if (statDoorStatus) statDoorStatus.textContent = "Closed";

      showToast("⚡ Dashboard synced! IoT sensors & pantry countdowns up to date.");
    });
  }

  // Header Quick Add Button
  if (btnQuickAddHeader) {
    btnQuickAddHeader.addEventListener('click', () => {
      showToast("➕ Quick Add: Switched to Food Inventory placeholder for your teammate!");
      switchDashboardView('inventory');
    });
  }

  // ==========================================================================
  // SECTION 8: QUICK RECIPE MODAL POPUP
  // ==========================================================================

  function openRecipeModal(foodName, recipeTitle) {
    if (!quickRecipeModal) return;
    if (recipeModalTitle) recipeModalTitle.textContent = `Zero-Waste Recipe: ${recipeTitle}`;
    if (recipeModalBody) {
      recipeModalBody.innerHTML = `
        <div style="text-align: center; margin-bottom: 16px;">
          <span style="font-size: 3rem;">🍳</span>
        </div>
        <p style="font-size: 0.9rem; color: var(--gray-700); line-height: 1.5; margin-bottom: 14px;">
          You have <strong>${foodName}</strong> nearing its expiration date. Making <strong>${recipeTitle}</strong> takes only <strong>15–20 minutes</strong> and ensures nothing gets wasted!
        </p>
        <div style="background: var(--green-50); border: 1px solid var(--green-200); border-radius: var(--radius-md); padding: 12px 16px; font-size: 0.8rem; color: var(--green-900);">
          🌱 <em>Teammate Hook:</em> The full AI Recipe Suggestions feature is being developed by your recipes teammate in the <strong>Recipe Suggestions</strong> tab.
        </div>
      `;
    }
    quickRecipeModal.classList.add('active');
  }

  function closeRecipeModal() {
    if (quickRecipeModal) quickRecipeModal.classList.remove('active');
  }

  if (closeRecipeModalBtn) closeRecipeModalBtn.addEventListener('click', closeRecipeModal);
  if (btnModalUnderstood) btnModalUnderstood.addEventListener('click', closeRecipeModal);
  if (quickRecipeModal) {
    quickRecipeModal.addEventListener('click', (e) => {
      if (e.target === quickRecipeModal) closeRecipeModal();
    });
  }

  // ==========================================================================
  // SECTION 9: TOAST NOTIFICATION UTILITY
  // ==========================================================================

  function showToast(message) {
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>🌱</span> <span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // ==========================================================================
  // SECTION 10: TEAMMATE EXTENSION API HOOKS
  // (Exposes a global namespace window.SmartPantry for teammates)
  // ==========================================================================
  window.SmartPantry = {
    // 1. Hook for teammate building Food Inventory
    addFoodItem: function(newItem) {
      console.log("[SmartPantry Hook] New food item added:", newItem);
      showToast(`Added "${newItem.name || 'new item'}" to inventory.`);
    },

    // 2. Hook for teammate building AI Freshness Check
    analyzeVegetableImage: function(imageFile) {
      console.log("[SmartPantry Hook] Running AI freshness model on file:", imageFile);
    },

    // 3. Hook for teammate building Fridge IoT Telemetry
    updateFridgeTelemetry: function(telemetryData) {
      if (telemetryData.temperature && statFridgeTemp) {
        statFridgeTemp.textContent = telemetryData.temperature;
      }
      if (telemetryData.humidity && statFridgeHumidity) {
        statFridgeHumidity.textContent = telemetryData.humidity;
      }
      if (telemetryData.doorStatus && statDoorStatus) {
        statDoorStatus.textContent = telemetryData.doorStatus;
      }
      console.log("[SmartPantry Hook] Fridge telemetry updated:", telemetryData);
    },

    // Programmatic view switcher
    navigateTo: switchDashboardView
  };

  // ==========================================================================
  // INITIALIZATION CALLS
  // ==========================================================================
  initWelcomeSection();
  renderUseSoonCards();
  updateDashboardSummary();

  console.log("Smart Pantry Dashboard initialized successfully. 'Less Waste, More Taste.'");
});
