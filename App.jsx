import React, { useState, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { SummaryCards } from './components/SummaryCards';
import { InventoryTable } from './components/InventoryTable';
import { FoodItemModal } from './components/FoodItemModal';
import { DeleteModal } from './components/DeleteModal';
import { 
  getStoredInventory, 
  saveInventory, 
  calculateSummary 
} from './services/foodService';
export function App() {
  const [inventory, setInventory] = useState(() => getStoredInventory());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState('add'); // 'add' | 'edit'
  const [activeItem, setActiveItem] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  // Synchronize state and localStorage
  const updateInventoryState = (newItems) => {
    setInventory(newItems);
    saveInventory(newItems);
  };
  // Summary statistics
  const summary = useMemo(() => calculateSummary(inventory), [inventory]);
  // Filtered Items (Search & Category)
  const filteredItems = useMemo(() => {
    return inventory.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [inventory, searchQuery, selectedCategory]);
  // Handlers
  const handleOpenAdd = () => {
    setFormMode('add');
    setActiveItem(null);
    setIsFormModalOpen(true);
  };
  const handleOpenEdit = (item) => {
    setFormMode('edit');
    setActiveItem(item);
    setIsFormModalOpen(true);
  };
  const handleSaveItem = (itemData) => {
    if (formMode === 'add') {
      const newItem = {
        ...itemData,
        id: `food-${Date.now()}`
      };
      updateInventoryState([newItem, ...inventory]);
    } else if (formMode === 'edit' && activeItem) {
      const updatedList = inventory.map((item) =>
        item.id === activeItem.id ? { ...itemData, id: activeItem.id } : item
      );
      updateInventoryState(updatedList);
    }
    setIsFormModalOpen(false);
    setActiveItem(null);
  };
  const handleOpenDelete = (item) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };
  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    const updatedList = inventory.filter((item) => item.id !== itemToDelete.id);
    updateInventoryState(updatedList);
    setIsDeleteModalOpen(false);
    setItemToDelete(null);
  };
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
  };
  return (
    <div className="app-shell">
      <Navbar onOpenAddModal={handleOpenAdd} />
      <main className="main-content">
        <SummaryCards summary={summary} />
        <InventoryTable
          items={filteredItems}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          onEditItem={handleOpenEdit}
          onDeleteItem={handleOpenDelete}
          onResetFilters={handleResetFilters}
        />
      </main>
      <FoodItemModal
        isOpen={isFormModalOpen}
        mode={formMode}
        initialData={activeItem}
        onSave={handleSaveItem}
        onClose={() => setIsFormModalOpen(false)}
      />
      <DeleteModal
        isOpen={isDeleteModalOpen}
        item={itemToDelete}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setItemToDelete(null);
        }}
      />
    </div>
  );
}
export default App;