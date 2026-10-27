import React, { useState, useEffect } from 'react';
import { FOOD_CATEGORIES, QUANTITY_UNITS } from '../services/sampleData';
import { validateFoodItem } from '../services/foodService';
export const FoodItemModal = ({ isOpen, mode, initialData, onSave, onClose }) => {
  const getTodayString = () => new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    name: '',
    category: 'Vegetables',
    quantity: '',
    unit: 'kg',
    dateAdded: getTodayString(),
    expiryDate: ''
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  useEffect(() => {
    if (initialData && mode === 'edit') {
      setFormData({
        name: initialData.name || '',
        category: initialData.category || 'Vegetables',
        quantity: initialData.quantity !== undefined ? initialData.quantity : '',
        unit: initialData.unit || 'kg',
        dateAdded: initialData.dateAdded || getTodayString(),
        expiryDate: initialData.expiryDate || ''
      });
    } else {
      setFormData({
        name: '',
        category: 'Vegetables',
        quantity: '',
        unit: 'kg',
        dateAdded: getTodayString(),
        expiryDate: ''
      });
    }
    setErrors({});
    setTouched({});
  }, [initialData, mode, isOpen]);
  if (!isOpen) return null;
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };
  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const validation = validateFoodItem(formData);
    if (validation.errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: validation.errors[field] }));
    }
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    const validation = validateFoodItem(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      setTouched({
        name: true,
        category: true,
        quantity: true,
        unit: true,
        dateAdded: true,
        expiryDate: true
      });
      return;
    }
    onSave({
      ...formData,
      quantity: Number(formData.quantity)
    });
  };
  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{mode === 'edit' ? 'Edit Food Item' : 'Add New Food Item'}</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {/* Food Name */}
            <div className="form-group">
              <label htmlFor="name">
                Food Name <span className="req">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="e.g. Honeycrisp Apples, Almond Milk"
                value={formData.name}
                onChange={handleChange}
                onBlur={() => handleBlur('name')}
                className={errors.name ? 'input-error' : ''}
                autoFocus
              />
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>
            {/* Category */}
            <div className="form-group">
              <label htmlFor="category">
                Category <span className="req">*</span>
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                onBlur={() => handleBlur('category')}
                className={errors.category ? 'input-error' : ''}
              >
                {FOOD_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {errors.category && <span className="error-text">{errors.category}</span>}
            </div>
            {/* Quantity and Unit */}
            <div className="form-row">
              <div className="form-group flex-1">
                <label htmlFor="quantity">
                  Quantity <span className="req">*</span>
                </label>
                <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  step="any"
                  min="0.01"
                  placeholder="e.g. 2.5"
                  value={formData.quantity}
                  onChange={handleChange}
                  onBlur={() => handleBlur('quantity')}
                  className={errors.quantity ? 'input-error' : ''}
                />
                {errors.quantity && <span className="error-text">{errors.quantity}</span>}
              </div>
              <div className="form-group flex-1">
                <label htmlFor="unit">
                  Unit <span className="req">*</span>
                </label>
                <select
                  id="unit"
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                  onBlur={() => handleBlur('unit')}
                  className={errors.unit ? 'input-error' : ''}
                >
                  {QUANTITY_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
                {errors.unit && <span className="error-text">{errors.unit}</span>}
              </div>
            </div>
            {/* Date Added and Expiry Date */}
            <div className="form-row">
              <div className="form-group flex-1">
                <label htmlFor="dateAdded">
                  Date Added <span className="req">*</span>
                </label>
                <input
                  id="dateAdded"
                  name="dateAdded"
                  type="date"
                  value={formData.dateAdded}
                  onChange={handleChange}
                  onBlur={() => handleBlur('dateAdded')}
                  className={errors.dateAdded ? 'input-error' : ''}
                />
                {errors.dateAdded && <span className="error-text">{errors.dateAdded}</span>}
              </div>
              <div className="form-group flex-1">
                <label htmlFor="expiryDate">
                  Expiry Date <span className="req">*</span>
                </label>
                <input
                  id="expiryDate"
                  name="expiryDate"
                  type="date"
                  value={formData.expiryDate}
                  onChange={handleChange}
                  onBlur={() => handleBlur('expiryDate')}
                  className={errors.expiryDate ? 'input-error' : ''}
                />
                {errors.expiryDate && <span className="error-text">{errors.expiryDate}</span>}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {mode === 'edit' ? 'Save Changes' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};