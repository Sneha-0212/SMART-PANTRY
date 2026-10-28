"""
Comprehensive Automated Unit Tests
Member 3: Backend/Logic Developer (Data and Date Tracking)
Smart Pantry Project
"""

import os
import tempfile
import unittest
from datetime import datetime, timezone, timedelta

from models import (
    FoodItem,
    FoodStatus,
    FoodCategory,
    ValidationError,
    ItemNotFoundError,
    DuplicateIdError,
)
from rules import StatusRuleConfig, calculate_food_status
from storage import PantryStorage
from inventory_manager import SmartPantryManager
from integrations import TeammateIntegrations


class TestFoodItemModel(unittest.TestCase):
    def test_valid_item_creation(self):
        item = FoodItem(name="Tomato", category="vegetable", quantity=5.0, unit="pcs")
        self.assertTrue(item.id.startswith("item_"))
        self.assertEqual(item.name, "Tomato")
        self.assertEqual(item.category, FoodCategory.VEGETABLE)
        self.assertEqual(item.quantity, 5.0)
        self.assertEqual(item.unit, "pcs")
        self.assertIsNotNone(item.added_at)
        self.assertIsNotNone(item.updated_at)
        self.assertIsNone(item.confirmed_expiry_date)

    def test_invalid_quantity_rejected(self):
        with self.assertRaises(ValidationError):
            FoodItem(name="Apple", category="fruit", quantity=0, unit="pcs")
        with self.assertRaises(ValidationError):
            FoodItem(name="Apple", category="fruit", quantity=-2.5, unit="pcs")

    def test_empty_name_rejected(self):
        with self.assertRaises(ValidationError):
            FoodItem(name="   ", category="fruit", quantity=1, unit="pcs")

    def test_invalid_category_rejected(self):
        with self.assertRaises(ValidationError):
            FoodItem(name="Bread", category="electronics", quantity=1, unit="pcs")

    def test_category_normalization(self):
        item = FoodItem(name="Orange", category="Fruits", quantity=3, unit="pcs")
        self.assertEqual(item.category, "fruit")


class TestStatusCalculation(unittest.TestCase):
    def setUp(self):
        self.rules = StatusRuleConfig(
            use_soon_days_threshold=3,
            vegetable_unassessed_check_days=5,
            fruit_unassessed_check_days=4,
        )
        self.now = datetime(2026, 10, 28, 12, 0, 0, tzinfo=timezone.utc)

    def test_vegetable_without_expiry_date_is_on_track_initially(self):
        item = FoodItem(
            name="Fresh Spinach",
            category="vegetable",
            quantity=1,
            unit="bunch",
            added_at=(self.now - timedelta(days=1)).isoformat(),
            confirmed_expiry_date=None,
        )
        status, explanation = calculate_food_status(item, self.rules, current_time=self.now)
        self.assertEqual(status, FoodStatus.ON_TRACK)
        self.assertIn("Fresh vegetables do not require expiry dates", explanation)

    def test_vegetable_unassessed_stored_too_long_triggers_check_now(self):
        item = FoodItem(
            name="Cabbage",
            category="vegetable",
            quantity=1,
            unit="head",
            added_at=(self.now - timedelta(days=6)).isoformat(),
            confirmed_expiry_date=None,
        )
        status, explanation = calculate_food_status(item, self.rules, current_time=self.now)
        self.assertEqual(status, FoodStatus.CHECK_NOW)
        self.assertIn("Check freshness", explanation)

    def test_confirmed_expiry_future_is_on_track(self):
        item = FoodItem(
            name="Almond Milk",
            category="other",
            quantity=1,
            unit="carton",
            confirmed_expiry_date=(self.now + timedelta(days=10)).strftime("%Y-%m-%d"),
        )
        status, explanation = calculate_food_status(item, self.rules, current_time=self.now)
        self.assertEqual(status, FoodStatus.ON_TRACK)

    def test_confirmed_expiry_within_threshold_triggers_use_soon(self):
        item = FoodItem(
            name="Almond Milk",
            category="other",
            quantity=1,
            unit="carton",
            confirmed_expiry_date=(self.now + timedelta(days=2)).strftime("%Y-%m-%d"),
        )
        status, explanation = calculate_food_status(item, self.rules, current_time=self.now)
        self.assertEqual(status, FoodStatus.USE_SOON)

    def test_confirmed_expiry_past_triggers_check_now(self):
        item = FoodItem(
            name="Greek Yogurt",
            category="other",
            quantity=1,
            unit="tub",
            confirmed_expiry_date=(self.now - timedelta(days=2)).strftime("%Y-%m-%d"),
        )
        status, explanation = calculate_food_status(item, self.rules, current_time=self.now)
        self.assertEqual(status, FoodStatus.CHECK_NOW)

    def test_conflicting_dates_trigger_check_now(self):
        item = FoodItem(
            name="Cheddar Cheese",
            category="other",
            quantity=1,
            unit="block",
            purchase_date="2026-10-30",
            confirmed_expiry_date="2026-10-25",
        )
        status, explanation = calculate_food_status(item, self.rules, current_time=self.now)
        self.assertEqual(status, FoodStatus.CHECK_NOW)
        self.assertIn("Conflicting dates", explanation)

    def test_ai_freshness_integration(self):
        item = FoodItem(
            name="Bananas",
            category="fruit",
            quantity=4,
            unit="pcs",
            freshness_info={"score": 60, "condition": "ripe", "estimated_days_remaining": 1.5}
        )
        status, _ = calculate_food_status(item, self.rules, current_time=self.now)
        self.assertEqual(status, FoodStatus.USE_SOON)

    def test_refrigerator_temp_alert(self):
        item = FoodItem(
            name="Butter",
            category="other",
            quantity=1,
            unit="pack",
            refrigerator_data={"temperature_c": 12.5}
        )
        status, explanation = calculate_food_status(item, self.rules, current_time=self.now)
        self.assertEqual(status, FoodStatus.CHECK_NOW)
        self.assertIn("Temperature alert", explanation)


class TestInventoryCRUDAndPersistence(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.storage_file = os.path.join(self.temp_dir.name, "test_pantry.json")
        self.storage = PantryStorage(self.storage_file)
        self.manager = SmartPantryManager(storage=self.storage)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_crud_cycle(self):
        # 1. Add
        item = self.manager.add_item({"name": "Cucumber", "category": "vegetable", "quantity": 2, "unit": "pcs"})
        self.assertEqual(len(self.manager.get_all_items()), 1)

        # 2. Get by ID
        retrieved = self.manager.get_item_by_id(item.id)
        self.assertEqual(retrieved.name, "Cucumber")

        # 3. Update
        updated = self.manager.update_item(item.id, {"quantity": 5})
        self.assertEqual(updated.quantity, 5.0)

        # 4. Search
        search_res = self.manager.search_and_filter_items(query="cucum")
        self.assertEqual(len(search_res), 1)

        # 5. Delete
        self.manager.delete_item(item.id)
        self.assertEqual(len(self.manager.get_all_items()), 0)

    def test_persistence_reload(self):
        self.manager.add_item({"name": "Flour", "category": "other", "quantity": 1, "unit": "kg"})
        reloaded = SmartPantryManager(storage=PantryStorage(self.storage_file))
        self.assertEqual(len(reloaded.get_all_items()), 1)
        self.assertEqual(reloaded.get_all_items()[0].name, "Flour")


class TestTeammateIntegrations(unittest.TestCase):
    def setUp(self):
        self.manager = SmartPantryManager(storage=PantryStorage(None))
        self.integrations = TeammateIntegrations(self.manager)

    def test_all_integrations(self):
        # Member 2 Add
        item = self.integrations.add_food_from_form({
            "name": "Milk", "category": "other", "quantity": 1, "unit": "bottle"
        })
        # Member 1 Summary
        summary = self.integrations.get_dashboard_summary()
        self.assertEqual(summary["total_items"], 1)

        # Member 4 Recipe & Deduct
        ing = self.integrations.get_available_ingredients()
        self.assertEqual(len(ing), 1)
        self.integrations.consume_ingredient_quantity(item["id"], 0.5)
        self.assertEqual(self.manager.get_item_by_id(item["id"]).quantity, 0.5)

        # Member 5 OCR
        ocr_upd = self.integrations.apply_ocr_confirmed_expiry_date(item["id"], "2026-11-20")
        self.assertEqual(ocr_upd["confirmed_expiry_date"], "2026-11-20")

        # Member 6 Fridge Alert
        alert_upd = self.integrations.apply_refrigerator_log(item["id"], temperature_c=12.0)
        self.assertEqual(alert_upd["status"], FoodStatus.CHECK_NOW)


if __name__ == "__main__":
    unittest.main()
