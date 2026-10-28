/**
 * Teammate Integration Endpoints and Adapters (JavaScript / Browser)
 * Member 3: Backend/Logic Developer (Data and Date Tracking)
 * Smart Pantry Project
 */

import { FoodStatus, FoodCategory, ValidationError } from './FoodItem.js';

export class TeamIntegrations {
  constructor(manager) {
    this.manager = manager;
  }

  getDashboardSummary() {
    const summary = this.manager.getInventorySummary();
    const total = summary.totalItems;
    const { onTrack, useSoon, checkNow } = summary.byStatus;

    return {
      ...summary,
      percentages: {
        onTrack: total > 0 ? Number(((onTrack / total) * 100).toFixed(1)) : 0,
        useSoon: total > 0 ? Number(((useSoon / total) * 100).toFixed(1)) : 0,
        checkNow: total > 0 ? Number(((checkNow / total) * 100).toFixed(1)) : 0
      },
      alerts: {
        hasUrgentItems: checkNow > 0,
        urgentCount: checkNow,
        warningCount: useSoon
      }
    };
  }

  getItemsByStatus(status) {
    const items = this.manager.searchAndFilterItems({ status });
    return items.map(it => it.toJSON());
  }

  validateFoodFormInput(formData = {}) {
    const errors = [];
    const sanitized = {};

    const name = formData.name ? String(formData.name).trim() : '';
    if (!name) {
      errors.push('Food name is required.');
    } else {
      sanitized.name = name;
    }

    try {
      sanitized.category = FoodCategory.normalize(formData.category);
    } catch (e) {
      errors.push(e.message);
    }

    const qty = parseFloat(formData.quantity);
    if (isNaN(qty) || qty <= 0) {
      errors.push('Quantity must be a positive number.');
    } else {
      sanitized.quantity = qty;
    }

    const unit = formData.unit ? String(formData.unit).trim() : '';
    if (!unit) {
      errors.push('Unit is required (e.g. pcs, kg, liters, bunch).');
    } else {
      sanitized.unit = unit;
    }

    const purchaseDate = formData.purchaseDate || formData.purchase_date;
    if (purchaseDate) {
      const d = new Date(purchaseDate);
      if (isNaN(d.getTime())) {
        errors.push('Purchase date format is invalid.');
      } else {
        sanitized.purchaseDate = String(purchaseDate).trim();
      }
    }

    const packageDate = formData.packageDate || formData.package_date;
    if (packageDate) {
      const d = new Date(packageDate);
      if (isNaN(d.getTime())) {
        errors.push('Packaging date format is invalid.');
      } else {
        sanitized.packageDate = String(packageDate).trim();
      }
    }

    const confirmedExpiryDate = formData.confirmedExpiryDate || formData.confirmed_expiry_date;
    if (confirmedExpiryDate) {
      const d = new Date(confirmedExpiryDate);
      if (isNaN(d.getTime())) {
        errors.push('Expiry date format is invalid.');
      } else {
        sanitized.confirmedExpiryDate = String(confirmedExpiryDate).trim();
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: sanitized
    };
  }

  addFoodFromForm(formData) {
    const { isValid, errors, sanitizedData } = this.validateFoodFormInput(formData);
    if (!isValid) {
      throw new ValidationError(errors.join('; '));
    }
    const created = this.manager.addItem(sanitizedData);
    return created.toJSON();
  }

  updateFoodFromForm(id, formData) {
    const updated = this.manager.updateItem(id, formData);
    return updated.toJSON();
  }

  deleteFoodFromAction(id) {
    const deleted = this.manager.deleteItem(id);
    return deleted.toJSON();
  }

  getFoodForEditForm(id) {
    const item = this.manager.getItemById(id);
    return item.toJSON();
  }

  getAvailableIngredients() {
    const items = this.manager.getAllItems();
    return items.map(it => ({
      id: it.id,
      name: it.name,
      category: it.category,
      quantity: it.quantity,
      unit: it.unit,
      status: it.status,
      needsExpeditedUse: [FoodStatus.USE_SOON, FoodStatus.CHECK_NOW].includes(it.status)
    }));
  }

  getPriorityIngredientsForRecipes() {
    const all = this.getAvailableIngredients();
    return all.filter(ing => ing.needsExpeditedUse);
  }

  consumeIngredientQuantity(id, quantityToDeduct) {
    const qty = parseFloat(quantityToDeduct);
    if (isNaN(qty) || qty <= 0) {
      throw new ValidationError('Quantity to deduct must be greater than zero.');
    }

    const item = this.manager.getItemById(id);
    const newQty = Number((item.quantity - qty).toFixed(3));

    if (newQty <= 0) {
      this.manager.deleteItem(id);
      return null;
    } else {
      const updated = this.manager.updateItem(id, { quantity: newQty });
      return updated.toJSON();
    }
  }

  applyOcrConfirmedExpiryDate(id, confirmedExpiryDate) {
    const d = new Date(confirmedExpiryDate);
    if (isNaN(d.getTime())) {
      throw new ValidationError('Invalid OCR confirmed date string.');
    }

    const updated = this.manager.updateItem(id, {
      confirmedExpiryDate: String(confirmedExpiryDate).trim()
    });
    return updated.toJSON();
  }

  applyFreshnessAssessment(id, freshnessData) {
    if (!freshnessData || typeof freshnessData !== 'object') {
      throw new ValidationError('Freshness data must be an object.');
    }

    const payload = {
      score: freshnessData.score !== undefined ? Number(freshnessData.score) : null,
      condition: freshnessData.condition || null,
      estimatedDaysRemaining: freshnessData.estimatedDaysRemaining !== undefined ? Number(freshnessData.estimatedDaysRemaining) : null,
      assessedAt: freshnessData.assessedAt || new Date().toISOString(),
      notes: freshnessData.notes || 'Assessed by Member 5 AI Vision',
      source: freshnessData.source || 'Member 5 Freshness Estimation'
    };

    const updated = this.manager.updateItem(id, { freshnessInfo: payload });
    return updated.toJSON();
  }

  applyRefrigeratorLog(id, temperatureC, humidityPercent = null, shelfLocation = null) {
    const temp = parseFloat(temperatureC);
    if (isNaN(temp)) {
      throw new ValidationError('Refrigerator temperature must be a valid number.');
    }

    const payload = {
      temperatureC: temp,
      humidityPercent: humidityPercent !== null ? parseFloat(humidityPercent) : null,
      lastLoggedAt: new Date().toISOString(),
      shelfLocation: shelfLocation || 'Main Shelf'
    };

    const updated = this.manager.updateItem(id, { refrigeratorData: payload });
    return updated.toJSON();
  }

  applyGlobalRefrigeratorTemperature(temperatureC, humidityPercent = null) {
    const temp = parseFloat(temperatureC);
    const flaggedItems = [];
    const items = this.manager.getAllItems();

    for (const it of items) {
      const updated = this.applyRefrigeratorLog(
        it.id,
        temp,
        humidityPercent,
        it.refrigeratorData ? it.refrigeratorData.shelfLocation : null
      );
      if (updated.status === FoodStatus.CHECK_NOW) {
        flaggedItems.push(updated);
      }
    }

    return flaggedItems;
  }
}
