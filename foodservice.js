/**
 * Food Service Module
 * Handles inventory CRUD, status calculations, validation, and localStorage operations.
 * Designed to be seamlessly replaced with an API service for Member 3's backend.
 */
import { INITIAL_FOOD_ITEMS } from './sampleData';
const STORAGE_KEY = 'freshkeep_food_inventory';
/**
 * Calculates item status based on expiry date compared to today.
 * Criteria:
 * - Expired: diffInDays < 0
 * - Expiring Soon: 0 <= diffInDays <= 3
 * - Fresh: diffInDays > 3
 */
export const calculateExpiryStatus = (expiryDateStr) => {
  if (!expiryDateStr) return 'Fresh';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDateStr);
  expiry.setHours(0, 0, 0, 0);
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return 'Expired';
  } else if (diffDays <= 3) {
    return 'Expiring Soon';
  }
  return 'Fresh';
};
/**
 * Load items from localStorage or initialize with sample data
 */
export const getStoredInventory = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      saveInventory(INITIAL_FOOD_ITEMS);
      return INITIAL_FOOD_ITEMS;
    }
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to read from localStorage:', err);
    return INITIAL_FOOD_ITEMS;
  }
};
/**
 * Persist items to localStorage
 */
export const saveInventory = (items) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
};
/**
 * Calculate dashboard summary statistics
 */
export const calculateSummary = (items) => {
  let totalQuantity = 0;
  let expiringSoonCount = 0;
  let expiredCount = 0;
  items.forEach((item) => {
    totalQuantity += Number(item.quantity) || 0;
    const status = calculateExpiryStatus(item.expiryDate);
    if (status === 'Expired') {
      expiredCount++;
    } else if (status === 'Expiring Soon') {
      expiringSoonCount++;
    }
  });
  return {
    totalItems: items.length,
    totalQuantity: Math.round(totalQuantity * 100) / 100,
    expiringSoonCount,
    expiredCount
  };
};
/**
 * Form field validation logic
 */
export const validateFoodItem = (item) => {
  const errors = {};
  if (!item.name || !item.name.trim()) {
    errors.name = 'Food name is required';
  } else if (item.name.trim().length < 2) {
    errors.name = 'Food name must be at least 2 characters';
  }
  if (!item.category) {
    errors.category = 'Please select a category';
  }
  if (item.quantity === '' || item.quantity === null || item.quantity === undefined) {
    errors.quantity = 'Quantity is required';
  } else if (Number(item.quantity) <= 0) {
    errors.quantity = 'Quantity must be greater than zero';
  }
  if (!item.unit) {
    errors.unit = 'Please select a unit of measurement';
  }
  if (!item.dateAdded) {
    errors.dateAdded = 'Date added is required';
  }
  if (!item.expiryDate) {
    errors.expiryDate = 'Expiry date is required';
  } else if (item.dateAdded && item.expiryDate < item.dateAdded) {
    errors.expiryDate = 'Expiry date cannot be earlier than date added';
  }
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};