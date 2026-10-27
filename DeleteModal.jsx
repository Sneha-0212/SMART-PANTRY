import React from 'react';
import { IconTrash } from './Icons';
export const DeleteModal = ({ isOpen, item, onConfirm, onCancel }) => {
  if (!isOpen || !item) return null;
  return (
    <div className="modal-backdrop" onClick={onCancel} role="dialog" aria-modal="true">
      <div className="modal-content modal-danger" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="danger-icon-wrapper">
            <IconTrash />
          </div>
          <h2>Delete Food Item</h2>
        </div>
        <div className="modal-body">
          <p>
            Are you sure you want to remove <strong>"{item.name}"</strong> ({item.quantity} {item.unit}) from your inventory?
          </p>
          <p className="danger-note">This action cannot be undone.</p>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn-danger" onClick={onConfirm}>
            Yes, Delete Item
          </button>
        </div>
      </div>
    </div>
  );
};