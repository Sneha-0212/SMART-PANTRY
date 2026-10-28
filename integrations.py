"""
Teammate Integration Endpoints and Adapters
Member 3: Backend/Logic Developer (Data and Date Tracking)
Smart Pantry Project
"""

from typing import Dict, List, Any, Optional, Tuple
from models import (
    FoodItem,
    FoodStatus,
    FoodCategory,
    ValidationError,
    ItemNotFoundError,
    current_iso_timestamp,
    parse_date_string,
)
from inventory_manager import SmartPantryManager


class TeammateIntegrations:
    def __init__(self, manager: SmartPantryManager):
        self.manager = manager

    # MEMBER 1: Dashboard Inventory Summaries
    def get_dashboard_summary(self) -> Dict[str, Any]:
        summary = self.manager.get_inventory_summary()
        total = summary["total_items"]
        by_status = summary["by_status"]

        summary["percentages"] = {
            "on_track": round((by_status["on_track"] / total * 100), 1) if total > 0 else 0,
            "use_soon": round((by_status["use_soon"] / total * 100), 1) if total > 0 else 0,
            "check_now": round((by_status["check_now"] / total * 100), 1) if total > 0 else 0,
        }

        summary["alerts"] = {
            "has_urgent_items": by_status["check_now"] > 0,
            "urgent_count": by_status["check_now"],
            "warning_count": by_status["use_soon"],
        }

        return summary

    def get_items_by_status(self, status: str) -> List[Dict[str, Any]]:
        items = self.manager.search_and_filter_items(status=status)
        return [it.to_dict() for it in items]

    # MEMBER 2: Add, Edit, and Delete Food Forms
    def validate_food_form_input(self, form_data: Dict[str, Any]) -> Tuple[bool, List[str], Dict[str, Any]]:
        errors = []
        sanitized = {}

        name = form_data.get("name", "")
        if not isinstance(name, str) or not name.strip():
            errors.append("Food name is required.")
        else:
            sanitized["name"] = name.strip()

        category = form_data.get("category", "")
        try:
            sanitized["category"] = FoodCategory.normalize(str(category))
        except ValidationError as e:
            errors.append(str(e))

        quantity = form_data.get("quantity")
        try:
            qty_num = float(quantity)
            if qty_num <= 0:
                errors.append("Quantity must be greater than zero.")
            else:
                sanitized["quantity"] = qty_num
        except (ValueError, TypeError):
            errors.append("Quantity must be a valid number.")

        unit = form_data.get("unit", "")
        if not isinstance(unit, str) or not unit.strip():
            errors.append("Unit is required (e.g. pcs, kg, liters, bunch).")
        else:
            sanitized["unit"] = unit.strip()

        purchase_date = form_data.get("purchase_date") or form_data.get("purchaseDate")
        if purchase_date:
            try:
                parse_date_string(purchase_date)
                sanitized["purchase_date"] = str(purchase_date).strip()
            except ValidationError as e:
                errors.append(f"Purchase date error: {str(e)}")

        package_date = form_data.get("package_date") or form_data.get("packageDate")
        if package_date:
            try:
                parse_date_string(package_date)
                sanitized["package_date"] = str(package_date).strip()
            except ValidationError as e:
                errors.append(f"Package date error: {str(e)}")

        confirmed_expiry = form_data.get("confirmed_expiry_date") or form_data.get("confirmedExpiryDate")
        if confirmed_expiry:
            try:
                parse_date_string(confirmed_expiry)
                sanitized["confirmed_expiry_date"] = str(confirmed_expiry).strip()
            except ValidationError as e:
                errors.append(f"Expiry date error: {str(e)}")

        return len(errors) == 0, errors, sanitized

    def add_food_from_form(self, form_data: Dict[str, Any]) -> Dict[str, Any]:
        is_valid, errors, sanitized = self.validate_food_form_input(form_data)
        if not is_valid:
            raise ValidationError("; ".join(errors))
        created = self.manager.add_item(sanitized)
        return created.to_dict()

    def update_food_from_form(self, item_id: str, form_data: Dict[str, Any]) -> Dict[str, Any]:
        updated = self.manager.update_item(item_id, form_data)
        return updated.to_dict()

    def delete_food_from_action(self, item_id: str) -> Dict[str, Any]:
        deleted = self.manager.delete_item(item_id)
        return deleted.to_dict()

    def get_food_for_edit_form(self, item_id: str) -> Dict[str, Any]:
        item = self.manager.get_item_by_id(item_id)
        return item.to_dict()

    # MEMBER 4: Available Ingredients for Recipe Suggestions
    def get_available_ingredients(self) -> List[Dict[str, Any]]:
        items = self.manager.get_all_items()
        return [
            {
                "id": it.id,
                "name": it.name,
                "category": it.category,
                "quantity": it.quantity,
                "unit": it.unit,
                "status": it.status,
                "needs_expedited_use": it.status in {FoodStatus.USE_SOON, FoodStatus.CHECK_NOW},
            }
            for it in items
        ]

    def get_priority_ingredients_for_recipes(self) -> List[Dict[str, Any]]:
        return [ing for ing in self.get_available_ingredients() if ing["needs_expedited_use"]]

    def consume_ingredient_quantity(self, item_id: str, quantity_to_deduct: float) -> Optional[Dict[str, Any]]:
        if quantity_to_deduct <= 0:
            raise ValidationError("Quantity to deduct must be greater than zero.")
        
        item = self.manager.get_item_by_id(item_id)
        new_quantity = round(item.quantity - quantity_to_deduct, 3)

        if new_quantity <= 0:
            self.manager.delete_item(item_id)
            return None
        else:
            updated = self.manager.update_item(item_id, {"quantity": new_quantity})
            return updated.to_dict()

    # MEMBER 5: Confirmed OCR Dates & Freshness Assessment Results
    def apply_ocr_confirmed_expiry_date(
        self,
        item_id: str,
        confirmed_expiry_date: str,
        ocr_confidence: Optional[float] = None,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        parse_date_string(confirmed_expiry_date)
        updated = self.manager.update_item(item_id, {"confirmed_expiry_date": confirmed_expiry_date})
        return updated.to_dict()

    def apply_freshness_assessment(
        self,
        item_id: str,
        freshness_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        if not isinstance(freshness_data, dict):
            raise ValidationError("Freshness data must be a dictionary.")

        freshness_payload = {
            "score": freshness_data.get("score"),
            "condition": freshness_data.get("condition"),
            "estimated_days_remaining": freshness_data.get("estimated_days_remaining") or freshness_data.get("estimatedDaysRemaining"),
            "assessed_at": freshness_data.get("assessed_at") or freshness_data.get("assessedAt") or current_iso_timestamp(),
            "notes": freshness_data.get("notes", "Assessed by Member 5 AI Vision"),
            "source": freshness_data.get("source", "Member 5 Freshness Estimation"),
        }

        updated = self.manager.update_item(item_id, {"freshness_info": freshness_payload})
        return updated.to_dict()

    # MEMBER 6: Refrigerator Monitoring Information
    def apply_refrigerator_log(
        self,
        item_id: str,
        temperature_c: float,
        humidity_percent: Optional[float] = None,
        shelf_location: Optional[str] = None
    ) -> Dict[str, Any]:
        sensor_payload = {
            "temperature_c": float(temperature_c),
            "humidity_percent": float(humidity_percent) if humidity_percent is not None else None,
            "last_logged_at": current_iso_timestamp(),
            "shelf_location": shelf_location or "Main Shelf",
        }
        updated = self.manager.update_item(item_id, {"refrigerator_data": sensor_payload})
        return updated.to_dict()

    def apply_global_refrigerator_temperature(
        self,
        temperature_c: float,
        humidity_percent: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        flagged_items = []
        items = self.manager.get_all_items()
        
        for it in items:
            updated = self.apply_refrigerator_log(
                it.id,
                temperature_c=temperature_c,
                humidity_percent=humidity_percent,
                shelf_location=it.refrigerator_data.get("shelf_location") if it.refrigerator_data else None
            )
            if updated["status"] == FoodStatus.CHECK_NOW:
                flagged_items.append(updated)

        return flagged_items
