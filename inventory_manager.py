"""
Inventory Management Engine
Member 3: Backend/Logic Developer (Data and Date Tracking)
Smart Pantry Project
"""

from typing import Dict, List, Optional, Any, Union
from models import (
    FoodItem,
    FoodStatus,
    FoodCategory,
    ValidationError,
    ItemNotFoundError,
    generate_item_id,
    current_iso_timestamp,
)
from rules import StatusRuleConfig, DEFAULT_STATUS_RULES, calculate_food_status
from storage import PantryStorage


class SmartPantryManager:
    def __init__(
        self,
        storage: Optional[PantryStorage] = None,
        rules: Optional[StatusRuleConfig] = None
    ):
        self.storage = storage if storage is not None else PantryStorage()
        self.rules = rules if rules is not None else DEFAULT_STATUS_RULES

    def add_item(self, item_data: Union[FoodItem, Dict[str, Any]]) -> FoodItem:
        if isinstance(item_data, FoodItem):
            item = item_data
        elif isinstance(item_data, dict):
            data = dict(item_data)
            if not data.get("id"):
                data["id"] = generate_item_id()
                
            now_iso = current_iso_timestamp()
            if not data.get("added_at") and not data.get("addedAt"):
                data["added_at"] = now_iso
            if not data.get("updated_at") and not data.get("updatedAt"):
                data["updated_at"] = now_iso

            item = FoodItem.from_dict(data)
        else:
            raise ValidationError("Item data must be a FoodItem instance or a dictionary.")

        status, explanation = calculate_food_status(item, self.rules)
        item.status = status
        item.status_explanation = explanation

        self.storage.add(item)
        return item

    def get_all_items(self) -> List[FoodItem]:
        return self.storage.get_all()

    def get_item_by_id(self, item_id: str) -> FoodItem:
        if not item_id or not isinstance(item_id, str):
            raise ValidationError("A valid string item ID is required.")
        
        item = self.storage.get_by_id(item_id.strip())
        if not item:
            raise ItemNotFoundError(f"Food item with ID '{item_id}' does not exist.")
        return item

    def update_item(self, item_id: str, updates: Dict[str, Any]) -> FoodItem:
        item = self.get_item_by_id(item_id)

        if not isinstance(updates, dict):
            raise ValidationError("Updates must be provided as a dictionary.")

        if "id" in updates and updates["id"] != item.id:
            raise ValidationError("Item ID is immutable and cannot be altered.")
        if "added_at" in updates and updates["added_at"] != item.added_at:
            raise ValidationError("Date added is immutable and cannot be altered.")

        if "name" in updates:
            new_name = str(updates["name"]).strip()
            if not new_name:
                raise ValidationError("Food name cannot be empty.")
            item.name = new_name

        if "category" in updates:
            item.category = FoodCategory.normalize(updates["category"])

        if "quantity" in updates:
            try:
                new_qty = float(updates["quantity"])
            except (ValueError, TypeError):
                raise ValidationError(f"Invalid quantity: {updates['quantity']}.")
            if new_qty <= 0:
                raise ValidationError(f"Quantity must be greater than zero, got {new_qty}.")
            item.quantity = new_qty

        if "unit" in updates:
            new_unit = str(updates["unit"]).strip()
            if not new_unit:
                raise ValidationError("Unit of measurement cannot be empty.")
            item.unit = new_unit

        if "purchase_date" in updates or "purchaseDate" in updates:
            item.purchase_date = updates.get("purchase_date", updates.get("purchaseDate"))

        if "package_date" in updates or "packageDate" in updates:
            item.package_date = updates.get("package_date", updates.get("packageDate"))

        if "confirmed_expiry_date" in updates or "confirmedExpiryDate" in updates:
            item.confirmed_expiry_date = updates.get(
                "confirmed_expiry_date", updates.get("confirmedExpiryDate")
            )

        if "freshness_info" in updates or "freshnessInfo" in updates:
            item.freshness_info = updates.get("freshness_info", updates.get("freshnessInfo"))

        if "refrigerator_data" in updates or "refrigeratorData" in updates:
            item.refrigerator_data = updates.get(
                "refrigerator_data", updates.get("refrigeratorData")
            )

        item.validate()
        item.updated_at = current_iso_timestamp()

        status, explanation = calculate_food_status(item, self.rules)
        item.status = status
        item.status_explanation = explanation

        self.storage.update(item)
        return item

    def delete_item(self, item_id: str) -> FoodItem:
        if not item_id or not isinstance(item_id, str):
            raise ValidationError("A valid string item ID is required.")
        return self.storage.delete(item_id.strip())

    def search_and_filter_items(
        self,
        query: Optional[str] = None,
        category: Optional[str] = None,
        status: Optional[str] = None,
        sort_by: str = "added_at",
        reverse: bool = False
    ) -> List[FoodItem]:
        items = self.storage.get_all()

        if query and query.strip():
            clean_q = query.strip().lower()
            items = [it for it in items if clean_q in it.name.lower()]

        if category and category.lower() not in {"all", "any"}:
            norm_cat = FoodCategory.normalize(category)
            items = [it for it in items if it.category == norm_cat]

        if status and status.lower() not in {"all", "any"}:
            clean_status = status.strip()
            items = [it for it in items if it.status.lower() == clean_status.lower()]

        def sort_key(it: FoodItem):
            if sort_by == "name":
                return it.name.lower()
            elif sort_by == "quantity":
                return it.quantity
            elif sort_by == "status":
                order = {FoodStatus.CHECK_NOW: 0, FoodStatus.USE_SOON: 1, FoodStatus.ON_TRACK: 2}
                return order.get(it.status, 3)
            elif sort_by in {"confirmed_expiry_date", "expiry"}:
                return it.confirmed_expiry_date or "9999-99-99"
            elif sort_by == "updated_at":
                return it.updated_at
            else:
                return it.added_at

        items.sort(key=sort_key, reverse=reverse)
        return items

    def calculate_and_update_status(self, item_id: str) -> FoodItem:
        item = self.get_item_by_id(item_id)
        status, explanation = calculate_food_status(item, self.rules)
        item.status = status
        item.status_explanation = explanation
        item.updated_at = current_iso_timestamp()
        self.storage.update(item)
        return item

    def recalculate_all_statuses(self) -> int:
        items = self.storage.get_all()
        for item in items:
            status, explanation = calculate_food_status(item, self.rules)
            item.status = status
            item.status_explanation = explanation
            self.storage.update(item)
        return len(items)

    def get_inventory_summary(self) -> Dict[str, Any]:
        items = self.storage.get_all()

        by_status = {"on_track": 0, "use_soon": 0, "check_now": 0}
        by_category = {"fruit": 0, "vegetable": 0, "other": 0}
        items_needing_attention = []

        for item in items:
            if item.status == FoodStatus.ON_TRACK:
                by_status["on_track"] += 1
            elif item.status == FoodStatus.USE_SOON:
                by_status["use_soon"] += 1
                items_needing_attention.append(item.to_dict())
            elif item.status == FoodStatus.CHECK_NOW:
                by_status["check_now"] += 1
                items_needing_attention.append(item.to_dict())

            if item.category in by_category:
                by_category[item.category] += 1
            else:
                by_category["other"] += 1

        total_items = len(items)
        needs_attention_count = by_status["use_soon"] + by_status["check_now"]

        sorted_recent = sorted(items, key=lambda x: x.added_at, reverse=True)[:5]
        recently_added = [it.to_dict() for it in sorted_recent]

        return {
            "total_items": total_items,
            "by_status": by_status,
            "by_category": by_category,
            "needs_attention_count": needs_attention_count,
            "items_needing_attention": items_needing_attention,
            "recently_added": recently_added,
            "last_updated": current_iso_timestamp(),
        }
