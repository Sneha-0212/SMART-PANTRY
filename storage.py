"""
Data Persistence Layer
Member 3: Backend/Logic Developer (Data and Date Tracking)
Smart Pantry Project
"""

import json
import os
from typing import Dict, List, Optional
from models import FoodItem, ItemNotFoundError, DuplicateIdError


class PantryStorage:
    def __init__(self, file_path: Optional[str] = None):
        self.file_path = file_path
        self._items: Dict[str, FoodItem] = {}

        if self.file_path:
            self._ensure_storage_dir()
            self._load()

    def _ensure_storage_dir(self) -> None:
        if not self.file_path:
            return
        directory = os.path.dirname(os.path.abspath(self.file_path))
        if directory and not os.path.exists(directory):
            os.makedirs(directory, exist_ok=True)

    def _load(self) -> None:
        if not self.file_path or not os.path.exists(self.file_path):
            return

        try:
            with open(self.file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    self._items = {}
                    for item_dict in data:
                        item = FoodItem.from_dict(item_dict)
                        self._items[item.id] = item
        except (json.JSONDecodeError, OSError):
            self._items = {}

    def _save(self) -> None:
        if not self.file_path:
            return

        self._ensure_storage_dir()
        temp_path = f"{self.file_path}.tmp"
        serializable_list = [item.to_dict() for item in self._items.values()]

        with open(temp_path, "w", encoding="utf-8") as f:
            json.dump(serializable_list, f, indent=2, ensure_ascii=False)

        os.replace(temp_path, self.file_path)

    def add(self, item: FoodItem) -> FoodItem:
        if item.id in self._items:
            raise DuplicateIdError(f"Item with ID '{item.id}' already exists in storage.")
        
        self._items[item.id] = item
        self._save()
        return item

    def get_all(self) -> List[FoodItem]:
        return list(self._items.values())

    def get_by_id(self, item_id: str) -> Optional[FoodItem]:
        return self._items.get(item_id)

    def update(self, item: FoodItem) -> FoodItem:
        if item.id not in self._items:
            raise ItemNotFoundError(f"Cannot update: Item with ID '{item.id}' was not found.")
        
        self._items[item.id] = item
        self._save()
        return item

    def delete(self, item_id: str) -> FoodItem:
        if item_id not in self._items:
            raise ItemNotFoundError(f"Cannot delete: Item with ID '{item_id}' was not found.")
        
        deleted = self._items.pop(item_id)
        self._save()
        return deleted

    def count(self) -> int:
        return len(self._items)

    def clear(self) -> None:
        self._items.clear()
        self._save()
