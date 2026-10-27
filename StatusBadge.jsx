import React from 'react';
export const StatusBadge = ({ status }) => {
  const getBadgeClass = () => {
    switch (status) {
      case 'Expired':
        return 'badge-expired';
      case 'Expiring Soon':
        return 'badge-expiring';
      case 'Fresh':
      default:
        return 'badge-fresh';
    }
  };
  return (
    <span className={`status-badge ${getBadgeClass()}`}>
      <span className="badge-dot" />
      {status}
    </span>
  );
};