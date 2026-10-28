/**
 * Configurable Status Calculation Logic
 * Member 3: Backend/Logic Developer (Data and Date Tracking)
 * Smart Pantry Project
 */

import { FoodStatus, FoodCategory } from './FoodItem.js';

export const DEFAULT_STATUS_RULES = Object.freeze({
  useSoonDaysThreshold: 3,
  vegetableUnassessedCheckDays: 5,
  fruitUnassessedCheckDays: 4,
  otherUnassessedCheckDays: 14,
  freshnessScoreCheckNow: 40.0,
  freshnessScoreUseSoon: 70.0,
  freshnessDaysUseSoon: 2.0,
  maxSafeRefrigeratorTempC: 8.0,
  minSafeRefrigeratorTempC: 0.0
});

function parseDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export function calculateFoodStatus(item, rules = DEFAULT_STATUS_RULES, currentTime = new Date()) {
  const now = currentTime instanceof Date ? currentTime : new Date();

  const parsedAdded = parseDate(item.addedAt) || now;
  const parsedPurchase = parseDate(item.purchaseDate);
  const parsedPackage = parseDate(item.packageDate);
  const parsedExpiry = parseDate(item.confirmedExpiryDate);

  if (parsedPurchase && parsedExpiry && parsedPurchase > parsedExpiry) {
    return {
      status: FoodStatus.CHECK_NOW,
      explanation: `Conflicting dates: Purchase date (${item.purchaseDate}) is recorded after expiry date (${item.confirmedExpiryDate}). Please verify.`
    };
  }

  if (parsedPackage && parsedExpiry && parsedPackage > parsedExpiry) {
    return {
      status: FoodStatus.CHECK_NOW,
      explanation: `Conflicting dates: Packaging date (${item.packageDate}) is recorded after expiry date (${item.confirmedExpiryDate}). Please verify.`
    };
  }

  if (item.refrigeratorData && typeof item.refrigeratorData.temperatureC === 'number') {
    const temp = item.refrigeratorData.temperatureC;
    if (temp > rules.maxSafeRefrigeratorTempC) {
      return {
        status: FoodStatus.CHECK_NOW,
        explanation: `Temperature alert: Storage temperature (${temp.toFixed(1)}°C) exceeded safe threshold (${rules.maxSafeRefrigeratorTempC}°C). Check item condition.`
      };
    }
    if (temp < rules.minSafeRefrigeratorTempC) {
      return {
        status: FoodStatus.CHECK_NOW,
        explanation: `Freezing alert: Storage temperature (${temp.toFixed(1)}°C) dropped below freezing. Inspect for freeze damage.`
      };
    }
  }

  if (item.freshnessInfo) {
    const condition = (item.freshnessInfo.condition || '').toLowerCase();
    const score = item.freshnessInfo.score;
    const estDays = item.freshnessInfo.estimatedDaysRemaining;

    if (['spoiled', 'moldy', 'decayed', 'damaged', 'poor', 'wilting'].includes(condition)) {
      const notes = item.freshnessInfo.notes ? ` (${item.freshnessInfo.notes})` : '';
      return {
        status: FoodStatus.CHECK_NOW,
        explanation: `Freshness check required: AI assessment reported '${condition}'${notes}.`
      };
    }

    if (typeof score === 'number' && score < rules.freshnessScoreCheckNow) {
      return {
        status: FoodStatus.CHECK_NOW,
        explanation: `Freshness check required: Quality score is low (${Math.round(score)}/100).`
      };
    }

    if (typeof estDays === 'number' && estDays <= rules.freshnessDaysUseSoon) {
      return {
        status: FoodStatus.USE_SOON,
        explanation: `Use soon: AI freshness assessment estimates approximately ${estDays.toFixed(1)} day(s) of freshness remaining.`
      };
    }

    if (typeof score === 'number' && score <= rules.freshnessScoreUseSoon) {
      return {
        status: FoodStatus.USE_SOON,
        explanation: `Use soon: Freshness score (${Math.round(score)}/100) indicates the item is approaching peak ripeness.`
      };
    }

    if (['ripe', 'fair', 'consume_soon'].includes(condition)) {
      return {
        status: FoodStatus.USE_SOON,
        explanation: `Use soon: AI assessment noted condition is '${condition}'.`
      };
    }
  }

  if (parsedExpiry) {
    const diffMs = parsedExpiry.getTime() - now.getTime();
    const daysRemaining = diffMs / (1000 * 60 * 60 * 24);

    if (daysRemaining < 0) {
      const daysAgo = Math.abs(Math.floor(daysRemaining));
      return {
        status: FoodStatus.CHECK_NOW,
        explanation: `Expired: Confirmed expiry date (${item.confirmedExpiryDate}) passed ${daysAgo} day(s) ago. Check before using.`
      };
    } else if (daysRemaining <= rules.useSoonDaysThreshold) {
      const daysLeft = Math.max(0, Math.round(daysRemaining));
      return {
        status: FoodStatus.USE_SOON,
        explanation: `Use soon: Confirmed expiry date (${item.confirmedExpiryDate}) is in ${daysLeft} day(s).`
      };
    } else {
      const daysLeft = Math.round(daysRemaining);
      return {
        status: FoodStatus.ON_TRACK,
        explanation: `On Track: Confirmed expiry date (${item.confirmedExpiryDate}) is ${daysLeft} days away.`
      };
    }
  }

  const storageDays = Math.max(0, Math.floor((now.getTime() - parsedAdded.getTime()) / (1000 * 60 * 60 * 24)));

  if (item.category === FoodCategory.VEGETABLE) {
    if (storageDays >= rules.vegetableUnassessedCheckDays) {
      return {
        status: FoodStatus.CHECK_NOW,
        explanation: `Check freshness: Fresh vegetable stored for ${storageDays} days without expiry label or AI scan. Check for crispness.`
      };
    } else if (storageDays >= (rules.vegetableUnassessedCheckDays - 2)) {
      return {
        status: FoodStatus.USE_SOON,
        explanation: `Use soon: Fresh vegetable stored for ${storageDays} days. Recommended to consume while fresh.`
      };
    } else {
      return {
        status: FoodStatus.ON_TRACK,
        explanation: `On Track: Added ${storageDays} day(s) ago. Fresh vegetables do not require expiry dates.`
      };
    }
  } else if (item.category === FoodCategory.FRUIT) {
    if (storageDays >= rules.fruitUnassessedCheckDays) {
      return {
        status: FoodStatus.CHECK_NOW,
        explanation: `Check freshness: Fresh fruit stored for ${storageDays} days without expiry label or AI scan. Inspect for over-ripeness.`
      };
    } else if (storageDays >= (rules.fruitUnassessedCheckDays - 2)) {
      return {
        status: FoodStatus.USE_SOON,
        explanation: `Use soon: Fresh fruit stored for ${storageDays} days. Ideal to consume soon for best flavor.`
      };
    } else {
      return {
        status: FoodStatus.ON_TRACK,
        explanation: `On Track: Added ${storageDays} day(s) ago. Fresh fruits do not require expiry dates.`
      };
    }
  } else {
    if (storageDays >= rules.otherUnassessedCheckDays) {
      return {
        status: FoodStatus.CHECK_NOW,
        explanation: `Check item: Stored for ${storageDays} days without confirmed dates. Check packaging and quality.`
      };
    } else {
      return {
        status: FoodStatus.ON_TRACK,
        explanation: `On Track: Added ${storageDays} day(s) ago. No alerts or issues recorded.`
      };
    }
  }
}
