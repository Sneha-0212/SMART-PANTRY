/**
 * Client Storage and Persistence Layer (localStorage + In-Memory Fallback)
 * Member 3: Backend/Logic Developer (Data and Date Tracking)
 * Smart Pantry Project
 */

import { FoodItem, DuplicateIdError, ItemNotFoundError } from './FoodItem.js';

const STORAGE_KEY = 'smart_pantry_inventory_v1';

export class PantryStorage {
  constructor(storageKey = STORAGE_KEY) {
    this.storageKey = storageKey;
    this.memoryStore = new Map();
    this.hasLocalStorage = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    this.load();
  }

  load() {
    this.memoryStore.clear();

    if (this.hasLocalStorage) {
      try {
        const raw = window.localStorage.getItem(this.storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            for (const itemData of parsed) {
              const item = FoodItem.fromJSON(itemData);
              this.memoryStore.set(item.id, item);
            }
          }
        }
      } catch (err) {
        console.warn('Could not read from localStorage, using memory storage:', err);
      }
    }
  }

  save() {
    if (this.hasLocalStorage) {
      try {
        const arrayData = Array.from(this.memoryStore.values()).map(it => it.toJSON());
        window.localStorage.setItem(this.storageKey, JSON.stringify(arrayData));
      } catch (err) {
        console.warn('Could not write to localStorage:', err);
      }
    }
  }

  add(item) {
    if (this.memoryStore.has(item.id)) {
      throw new DuplicateIdError(`Item with ID '${item.id}' already exists.`);
    }
    this.memoryStore.set(item.id, item);
    this.save();
    return item;
  }

  getAll() {
    return Array.from(this.memoryStore.values());
  }

  getById(id) {
    return this.memoryStore.get(id) || null;
  }

  update(item) {
    if (!this.memoryStore.has(item.id)) {
      throw new ItemNotFoundError(`Cannot update: Item with ID '${item.id}' was not found.`);
    }
    this.memoryStore.set(item.id, item);
    this.save();
    return item;
  }

  delete(id) {
    if (!this.memoryStore.has(id)) {
      throw new ItemNotFoundError(`Cannot delete: Item with ID '${id}' was not found.`);
    }
    const deleted = this.memoryStore.get(id);
    this.memoryStore.delete(id);
    this.save();
    return deleted;
  }

  clear() {
    this.memoryStore.clear();
    this.save();
  }

  count() {
    return this.memoryStore.size;
  }
}
