import React from 'react';
import { IconBox, IconScale, IconClockAlert, IconAlertCircle } from './Icons';
export const SummaryCards = ({ summary }) => {
  const cards = [
    {
      label: 'Total Food Items',
      value: summary.totalItems,
      unitLabel: 'items in pantry',
      icon: <IconBox />,
      colorType: 'primary'
    },
    {
      label: 'Total Available Quantity',
      value: summary.totalQuantity,
      unitLabel: 'cumulative units',
      icon: <IconScale />,
      colorType: 'highlight'
    },
    {
      label: 'Items Expiring Soon',
      value: summary.expiringSoonCount,
      unitLabel: 'within 3 days',
      icon: <IconClockAlert />,
      colorType: 'warning'
    },
    {
      label: 'Expired Items',
      value: summary.expiredCount,
      unitLabel: 'needs disposal/action',
      icon: <IconAlertCircle />,
      colorType: 'danger'
    }
  ];
  return (
    <section className="summary-grid" aria-label="Inventory summary statistics">
      {cards.map((card, idx) => (
        <div key={idx} className={`summary-card card-${card.colorType}`}>
          <div className="card-header">
            <span className="card-label">{card.label}</span>
            <div className="card-icon">{card.icon}</div>
          </div>
          <div className="card-value">{card.value}</div>
          <div className="card-unit">{card.unitLabel}</div>
        </div>
      ))}
    </section>
  );
};