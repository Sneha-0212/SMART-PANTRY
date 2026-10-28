/**
 * Inventory Management Logic (CRUD, Search, Filter, Summaries)
 * Member 3: Backend/Logic Developer (Data and Date Tracking)
 * Smart Pantry Project
 */

import {
  FoodItem,
  FoodStatus,
  FoodCategory,
  ValidationError,
  ItemNotFoundError,
  generateItemId
} from './FoodItem.js';
import { calculateFoodStatus, DEFAULT_STATUS_RULES } from './statusRules.js';
import { PantryStorage } from './pantryStorage.js';

export class SmartPantryManager {
  constructor(storage = new PantryStorage(), rules = DEFAULT_STATUS_RULES) {
    this.storage = storage;
    this.rules = rules;
  }

  addItem(itemData) {
    let item;
    if (itemData instanceof FoodItem) {
      item = itemData;
    } else if (itemData && typeof itemData === 'object') {
      const data = { ...itemData };
      if (!data.id) {
        data.id = generateItemId();
      }
      const nowIso = new Date().toISOString();
      if (!data.addedAt && !data.added_at) {
        data.addedAt = nowIso;
      }
      if (!data.updatedAt && !data.updated_at) {
        data.updatedAt = nowIso;
      }
      item = FoodItem.fromJSON(data);
    } else {
      throw new ValidationError('Item data must be an object or FoodItem instance.');
    }

    const { status, explanation } = calculateFoodStatus(item, this.rules);
    item.status = status;
    item.statusExplanation = explanation;

    this.storage.add(item);
    return item;
  }

  getAllItems() {
    return this.storage.getAll();
  }

  getItemById(id) {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Valid item ID is required.');
    }
    const item = this.storage.getById(id.trim());
    if (!item) {
      throw new ItemNotFoundError(`Food item with ID '${id}' was not found.`);
    }
    return item;
  }

  updateItem(id, updates) {
    const item = this.getItemById(id);

    if (!updates || typeof updates !== 'object') {
      throw new ValidationError('Updates must be provided as an object.');
    }

    if (updates.id && updates.id !== item.id) {
      throw new ValidationError('Item ID cannot be changed.');
    }
    if (updates.addedAt && updates.addedAt !== item.addedAt) {
      throw new ValidationError('Date added cannot be changed.');
    }

    if (updates.name !== undefined) {
      const name = String(updates.name).trim();
      if (!name) throw new ValidationError('Food name cannot be empty.');
      item.name = name;
    }

    if (updates.category !== undefined) {
      item.category = FoodCategory.normalize(updates.category);
    }

    if (updates.quantity !== undefined) {
      const qty = parseFloat(updates.quantity);
      if (isNaN(qty) || qty <= 0) {
        throw new ValidationError(`Quantity must be a positive number, received: ${updates.quantity}.`);
      }
      item.quantity = qty;
    }

    if (updates.unit !== undefined) {
      const unit = String(updates.unit).trim();
      if (!unit) throw new ValidationError('Unit cannot be empty.');
      item.unit = unit;
    }

    if (updates.purchaseDate !== undefined || updates.purchase_date !== undefined) {
      item.purchaseDate = updates.purchaseDate !== undefined ? updates.purchaseDate : updates.purchase_date;
    }

    if (updates.packageDate !== undefined || updates.package_date !== undefined) {
      item.packageDate = updates.packageDate !== undefined ? updates.packageDate : updates.package_date;
    }

    if (updates.confirmedExpiryDate !== undefined || updates.confirmed_expiry_date !== undefined) {
      item.confirmedExpiryDate = updates.confirmedExpiryDate !== undefined ? updates.confirmedExpiryDate : updates.confirmed_expiry_date;
    }

    if (updates.freshnessInfo !== undefined || updates.freshness_info !== undefined) {
      item.freshnessInfo = updates.freshnessInfo !== undefined ? updates.freshnessInfo : updates.freshness_info;
    }

    if (updates.refrigeratorData !== undefined || updates.refrigerator_data !== undefined) {
      item.refrigeratorData = updates.refrigeratorData !== undefined ? updates.refrigeratorData : updates.refrigerator_data;
    }

    item.validate();
    item.updatedAt = new Date().toISOString();

    const { status, explanation } = calculateFoodStatus(item, this.rules);
    item.status = status;
    item.statusExplanation = explanation;

    this.storage.update(item);
    return item;
  }

  deleteItem(id) {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Valid item ID is required.');
    }
    return this.storage.delete(id.trim());
  }

  searchAndFilterItems({
    query = null,
    category = null,
    status = null,
    sortBy = 'addedAt',
    sortOrder = 'desc'
  } = {}) {
    let items = this.storage.getAll();

    if (query && query.trim()) {
      const cleanQ = query.trim().toLowerCase();
      items = items.filter(it => it.name.toLowerCase().includes(cleanQ));
    }

    if (category && !['all', 'any'].includes(category.toLowerCase())) {
      const normCat = FoodCategory.normalize(category);
      items = items.filter(it => it.category === normCat);
    }

    if (status && !['all', 'any'].includes(status.toLowerCase())) {
      const cleanStatus = status.trim().toLowerCase();
      items = items.filter(it => it.status.toLowerCase() === cleanStatus);
    }

    items.sort((a, b) => {
      let valA, valB;

      if (sortBy === 'name') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else if (sortBy === 'quantity') {
        valA = a.quantity;
        valB = b.quantity;
      } else if (sortBy === 'status') {
        const order = { [FoodStatus.CHECK_NOW]: 0, [FoodStatus.USE_SOON]: 1, [FoodStatus.ON_TRACK]: 2 };
        valA = order[a.status] !== undefined ? order[a.status] : 3;
        valB = order[b.status] !== undefined ? order[b.status] : 3;
      } else if (sortBy === 'confirmedExpiryDate' || sortBy === 'expiry') {
        valA = a.confirmedExpiryDate || '9999-99-99';
        valB = b.confirmedExpiryDate || '9999-99-99';
      } else if (sortBy === 'updatedAt') {
        valA = a.updatedAt;
        valB = b.updatedAt;
      } else {
        valA = a.addedAt;
        valB = b.addedAt;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return items;
  }

  calculateAndUpdateStatus(id) {
    const item = this.getItemById(id);
    const { status, explanation } = calculateFoodStatus(item, this.rules);
    item.status = status;
    item.statusExplanation = explanation;
    item.updatedAt = new Date().toISOString();
    this.storage.update(item);
    return item;
  }

  recalculateAllStatuses() {
    const items = this.storage.getAll();
    for (const item of items) {
      const { status, explanation } = calculateFoodStatus(item, this.rules);
      item.status = status;
      item.statusExplanation = explanation;
      this.storage.update(item);
    }
    return items.length;
  }

  getInventorySummary() {
    const items = this.storage.getAll();

    const byStatus = { onTrack: 0, useSoon: 0, checkNow: 0 };
    const byCategory = { fruit: 0, vegetable: 0, other: 0 };
    const itemsNeedingAttention = [];

    for (const item of items) {
      if (item.status === FoodStatus.ON_TRACK) {
        byStatus.onTrack++;
      } else if (item.status === FoodStatus.USE_SOON) {
        byStatus.useSoon++;
        itemsNeedingAttention.push(item.toJSON());
      } else if (item.status === FoodStatus.CHECK_NOW) {
        byStatus.checkNow++;
        itemsNeedingAttention.push(item.toJSON());
      }

      if (byCategory[item.category] !== undefined) {
        byCategory[item.category]++;
      } else {
        byCategory.other++;
      }
    }

    const totalItems = items.length;
    const needsAttentionCount = byStatus.useSoon + byStatus.checkNow;

    const sortedRecent = [...items]
      .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
      .slice(0, 5)
      .map(it => it.toJSON());

    return {
      totalItems,
      byStatus,
      byCategory,
      needsAttentionCount,
      itemsNeedingAttention,
      recentlyAdded: sortedRecent,
      lastUpdated: new Date().toISOString()
    };
  }
}
