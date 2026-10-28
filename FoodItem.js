/**
 * Food Inventory Data Model and Validation
 * Member 3: Backend/Logic Developer (Data and Date Tracking)
 * Smart Pantry Project
 */

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ItemNotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ItemNotFoundError';
  }
}

export class DuplicateIdError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DuplicateIdError';
  }
}

export const FoodCategory = Object.freeze({
  FRUIT: 'fruit',
  VEGETABLE: 'vegetable',
  OTHER: 'other',

  normalize(category) {
    if (!category || typeof category !== 'string') {
      throw new ValidationError('Category must be a non-empty string.');
    }
    const cleaned = category.trim().toLowerCase();
    if (cleaned === 'fruit' || cleaned === 'fruits') {
      return this.FRUIT;
    } else if (cleaned === 'vegetable' || cleaned === 'vegetables' || cleaned === 'veg') {
      return this.VEGETABLE;
    } else if (['other', 'other food', 'dairy', 'grain', 'meat', 'pantry', 'beverage', 'snack'].includes(cleaned)) {
      return this.OTHER;
    } else {
      throw new ValidationError(`Invalid category '${category}'. Must be 'fruit', 'vegetable', or 'other'.`);
    }
  }
});

export const FoodStatus = Object.freeze({
  ON_TRACK: 'On Track',
  USE_SOON: 'Use Soon',
  CHECK_NOW: 'Check Now'
});

export function generateItemId() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  return `item_${dateStr}_${randomSuffix}`;
}

export class FoodItem {
  constructor({
    name,
    category,
    quantity,
    unit,
    id = null,
    addedAt = null,
    updatedAt = null,
    purchaseDate = null,
    packageDate = null,
    confirmedExpiryDate = null,
    freshnessInfo = null,
    refrigeratorData = null,
    status = FoodStatus.ON_TRACK,
    statusExplanation = 'Item recently added with no current warnings.'
  }) {
    const nowIso = new Date().toISOString();

    this.id = id ? String(id).trim() : generateItemId();
    this.name = name ? String(name).trim() : '';
    this.category = FoodCategory.normalize(category);
    this.quantity = parseFloat(quantity);
    this.unit = unit ? String(unit).trim() : '';
    this.addedAt = addedAt ? String(addedAt).trim() : nowIso;
    this.updatedAt = updatedAt ? String(updatedAt).trim() : nowIso;
    this.purchaseDate = purchaseDate ? String(purchaseDate).trim() : null;
    this.packageDate = packageDate ? String(packageDate).trim() : null;
    this.confirmedExpiryDate = confirmedExpiryDate ? String(confirmedExpiryDate).trim() : null;
    this.freshnessInfo = freshnessInfo ? { ...freshnessInfo } : null;
    this.refrigeratorData = refrigeratorData ? { ...refrigeratorData } : null;
    this.status = status;
    this.statusExplanation = statusExplanation;

    this.validate();
  }

  validate() {
    if (!this.id) throw new ValidationError('Food item ID cannot be empty.');
    if (!this.name) throw new ValidationError('Food name cannot be empty.');
    if (isNaN(this.quantity) || this.quantity <= 0) {
      throw new ValidationError(`Quantity must be a positive number, received: ${this.quantity}.`);
    }
    if (!this.unit) throw new ValidationError('Unit of measurement cannot be empty.');
    if (![FoodStatus.ON_TRACK, FoodStatus.USE_SOON, FoodStatus.CHECK_NOW].includes(this.status)) {
      throw new ValidationError(`Invalid status '${this.status}'. Allowed: On Track, Use Soon, Check Now.`);
    }
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      category: this.category,
      quantity: this.quantity,
      unit: this.unit,
      addedAt: this.addedAt,
      updatedAt: this.updatedAt,
      purchaseDate: this.purchaseDate,
      packageDate: this.packageDate,
      confirmedExpiryDate: this.confirmedExpiryDate,
      freshnessInfo: this.freshnessInfo,
      refrigeratorData: this.refrigeratorData,
      status: this.status,
      statusExplanation: this.statusExplanation
    };
  }

  static fromJSON(json) {
    if (!json || typeof json !== 'object') {
      throw new ValidationError('Input JSON must be an object.');
    }
    return new FoodItem({
      id: json.id,
      name: json.name,
      category: json.category,
      quantity: json.quantity,
      unit: json.unit,
      addedAt: json.addedAt || json.added_at,
      updatedAt: json.updatedAt || json.updated_at,
      purchaseDate: json.purchaseDate || json.purchase_date,
      packageDate: json.packageDate || json.package_date,
      confirmedExpiryDate: json.confirmedExpiryDate || json.confirmed_expiry_date,
      freshnessInfo: json.freshnessInfo || json.freshness_info,
      refrigeratorData: json.refrigeratorData || json.refrigerator_data,
      status: json.status,
      statusExplanation: json.statusExplanation || json.status_explanation
    });
  }
}
