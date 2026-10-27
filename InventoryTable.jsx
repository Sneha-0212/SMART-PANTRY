import React from 'react';
import { StatusBadge } from './StatusBadge';
import { IconSearch, IconEdit, IconTrash } from './Icons';
import { calculateExpiryStatus } from '../services/foodService';
import { FOOD_CATEGORIES } from '../services/sampleData';
export const InventoryTable = ({
  items,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  onEditItem,
  onDeleteItem,
  onResetFilters
}) => {
  return (
    <section className="inventory-section">
      {/* Controls: Search and Filters */}
      <div className="table-controls">
        <div className="search-box">
          <IconSearch />
          <input
            type="text"
            placeholder="Search by food name..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search food inventory"
          />
          {searchQuery && (
            <button 
              className="clear-search-btn" 
              onClick={() => onSearchChange('')}
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>
        <div className="filter-group">
          <label htmlFor="category-filter" className="filter-label">Filter Category:</label>
          <select
            id="category-filter"
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="category-select"
          >
            <option value="All">All Categories</option>
            {FOOD_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>
      {/* Table Container */}
      <div className="table-wrapper">
        {items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🍽️</div>
            <h3>No food items found</h3>
            <p>We couldn't find any inventory matching your search or category filter.</p>
            <button className="btn-secondary" onClick={onResetFilters}>
              Reset Filters
            </button>
          </div>
        ) : (
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Food Name</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Date Added</th>
                <th>Expiry Date</th>
                <th>Status</th>
                <th className="actions-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const status = calculateExpiryStatus(item.expiryDate);
                return (
                  <tr key={item.id} className="table-row">
                    <td className="food-name-cell">
                      <strong>{item.name}</strong>
                    </td>
                    <td>
                      <span className="category-pill">{item.category}</span>
                    </td>
                    <td>
                      <span className="quantity-text">
                        {item.quantity} <span className="unit-label">{item.unit}</span>
                      </span>
                    </td>
                    <td className="date-cell">{item.dateAdded}</td>
                    <td className="date-cell">{item.expiryDate}</td>
                    <td>
                      <StatusBadge status={status} />
                    </td>
                    <td className="actions-cell">
                      <button
                        className="action-btn edit-btn"
                        onClick={() => onEditItem(item)}
                        title={`Edit ${item.name}`}
                        aria-label={`Edit ${item.name}`}
                      >
                        <IconEdit />
                        <span>Edit</span>
                      </button>
                      <button
                        className="action-btn delete-btn"
                        onClick={() => onDeleteItem(item)}
                        title={`Delete ${item.name}`}
                        aria-label={`Delete ${item.name}`}
                      >
                        <IconTrash />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
};