import React from 'react';
import { IconLeaf, IconPlus } from './Icons';
export const Navbar = ({ onOpenAddModal }) => {
  return (
    <header className="navbar-container">
      <div className="navbar-content">
        <div className="brand-section">
          <div className="brand-logo">
            <IconLeaf />
          </div>
          <div>
            <h1 className="brand-title">Food Inventory Manager</h1>
            <p className="brand-subtitle">
              Monitor freshness, reduce waste, and manage your kitchen inventory seamlessly.
            </p>
          </div>
        </div>
        <button 
          className="btn-primary" 
          onClick={onOpenAddModal}
          aria-label="Add new food item"
        >
          <IconPlus />
          <span>Add Food Item</span>
        </button>
      </div>
    </header>
  );
};