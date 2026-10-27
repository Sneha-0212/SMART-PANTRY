/**
 * Realistic seed data for initial demonstration.
 * Dates are calculated relative to today so the demo always showcases
 * Fresh, Expiring Soon, and Expired items dynamically.
 */
const getFormattedDate = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};
export const INITIAL_FOOD_ITEMS = [
  {
    id: 'food-001',
    name: 'Organic Spinach',
    category: 'Vegetables',
    quantity: 500,
    unit: 'g',
    dateAdded: getFormattedDate(-4),
    expiryDate: getFormattedDate(1) // Expiring soon (1 day left)
  },
  {
    id: 'food-002',
    name: 'Whole Milk',
    category: 'Dairy',
    quantity: 2,
    unit: 'litres',
    dateAdded: getFormattedDate(-7),
    expiryDate: getFormattedDate(-1) // Expired (1 day ago)
  },
  {
    id: 'food-003',
    name: 'Gala Apples',
    category: 'Fruits',
    quantity: 1.5,
    unit: 'kg',
    dateAdded: getFormattedDate(-2),
    expiryDate: getFormattedDate(6) // Fresh
  },
  {
    id: 'food-004',
    name: 'Basmati Rice',
    category: 'Grains',
    quantity: 5,
    unit: 'kg',
    dateAdded: getFormattedDate(-20),
    expiryDate: getFormattedDate(120) // Fresh
  },
  {
    id: 'food-005',
    name: 'Greek Yogurt',
    category: 'Dairy',
    quantity: 4,
    unit: 'pieces',
    dateAdded: getFormattedDate(-5),
    expiryDate: getFormattedDate(2) // Expiring soon (2 days left)
  },
  {
    id: 'food-006',
    name: 'Fresh Salmon Fillet',
    category: 'Meat & Seafood',
    quantity: 600,
    unit: 'g',
    dateAdded: getFormattedDate(-6),
    expiryDate: getFormattedDate(-2) // Expired
  },
  {
    id: 'food-007',
    name: 'Sourdough Bread',
    category: 'Bakery',
    quantity: 1,
    unit: 'pieces',
    dateAdded: getFormattedDate(-1),
    expiryDate: getFormattedDate(3) // Expiring soon (3 days left)
  }
];
export const FOOD_CATEGORIES = [
  'Vegetables',
  'Fruits',
  'Grains',
  'Dairy',
  'Meat & Seafood',
  'Bakery',
  'Other'
];
export const QUANTITY_UNITS = [
  'kg',
  'g',
  'litres',
  'ml',
  'pieces'
];