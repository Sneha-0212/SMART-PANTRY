# FreshKeep — Food Inventory Management (Frontend)
A clean, responsive, and modular Food Management dashboard built with React and Vite. This application enables users to track food inventory, monitor expiration dates dynamically, minimize food waste, and manage stock quantities.
## Key Features
- **Dynamic Expiry Status Calculation**: Real-time evaluation of freshness based on the current date:
  - **Fresh**: More than 3 days until expiration.
  - **Expiring Soon**: 0 to 3 days remaining.
  - **Expired**: Past expiration date (strictly excluded from "Expiring Soon").
- **Automatic Summary Metrics**: Real-time calculation of total items, available quantities, expiring soon items, and expired items.
- **Search & Category Filtering**: Instant search by food name and category filtering across Vegetables, Fruits, Grains, Dairy, Meat & Seafood, Bakery, and Other.
- **Add & Edit Modal Form**: Full client-side validation enforcing non-empty names, positive quantities, valid dates, and preventing expiry dates earlier than date added.
- **Safe Item Deletion**: Action confirmation dialog to prevent accidental removal.
- **Persistent Data**: Automatically synchronizes with `localStorage` for demo continuity.
---
## Installation & Running Locally
### Prerequisites
- Node.js (version 18 or newer)
- npm or pnpm
### Steps
1. Navigate into the project folder:
   ```bash
   cd food-management-app