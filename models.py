"""
Food Inventory Data Models and Validation
Member 3: Backend/Logic Developer (Data and Date Tracking)
Smart Pantry Project
"""

import uuid
from datetime import datetime, timezone
from dataclasses import dataclass, asdict, field
from typing import Optional, Dict, Any, List


class PantryException(Exception):
    """Base exception for Smart Pantry domain errors."""
    pass


class ValidationError(PantryException):
    """Raised when data model validation fails."""
    pass


class ItemNotFoundError(PantryException):
    """Raised when an item with a given ID does not exist."""
    pass


class DuplicateIdError(PantryException):
    """Raised when attempting to insert an item with an existing ID."""
    pass


class FoodCategory:
    """Allowed food categories in the Smart Pantry."""
    FRUIT = "fruit"
    VEGETABLE = "vegetable"
    OTHER = "other"

    ALL = {FRUIT, VEGETABLE, OTHER}

    @classmethod
    def normalize(cls, category: str) -> str:
        """
        Normalizes category input to one of the standard categories.
        E.g., 'Fruits' -> 'fruit', 'VEG' -> 'vegetable', 'other food' -> 'other'.
        """
        if not category or not isinstance(category, str):
            raise ValidationError("Category must be a non-empty string.")
        
        cleaned = category.strip().lower()
        if cleaned in {"fruit", "fruits"}:
            return cls.FRUIT
        elif cleaned in {"vegetable", "vegetables", "veg"}:
            return cls.VEGETABLE
        elif cleaned in {"other", "other food", "dairy", "grain", "meat", "pantry", "beverage", "snack"}:
            return cls.OTHER
        else:
            raise ValidationError(
                f"Invalid category '{category}'. Must be 'fruit', 'vegetable', or 'other'."
            )


class FoodStatus:
    """Official status indicators for Smart Pantry items."""
    ON_TRACK = "On Track"
    USE_SOON = "Use Soon"
    CHECK_NOW = "Check Now"

    ALL = {ON_TRACK, USE_SOON, CHECK_NOW}


def generate_item_id() -> str:
    """
    Generates a unique, collision-resistant identifier for a food item.
    Format: item_YYYYMMDD_randomHex (e.g., item_20261028_a1b2c3d4)
    """
    now = datetime.now(timezone.utc)
    date_str = now.strftime("%Y%m%d")
    random_suffix = uuid.uuid4().hex[:8]
    return f"item_{date_str}_{random_suffix}"


def current_iso_timestamp() -> str:
    """Returns current date and time in standardized ISO-8601 UTC format."""
    return datetime.now(timezone.utc).isoformat()


def parse_date_string(date_str: Optional[str]) -> Optional[datetime]:
    """
    Safely parses an ISO date or YYYY-MM-DD date string into a datetime object.
    Returns None if date_str is None or empty.
    Raises ValidationError if format is invalid.
    """
    if not date_str:
        return None
    
    date_str = str(date_str).strip()
    if not date_str:
        return None

    formats = [
        "%Y-%m-%dT%H:%M:%S.%f%z",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%S.%fZ",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
    ]

    for fmt in formats:
        try:
            parsed = datetime.strptime(date_str.replace("Z", "+00:00"), fmt)
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            return parsed
        except ValueError:
            continue

    try:
        parsed = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed
    except ValueError:
        raise ValidationError(
            f"Invalid date format: '{date_str}'. Expected YYYY-MM-DD or ISO-8601 string."
        )


@dataclass
class FreshnessInfo:
    """
    Freshness information received from Member 5's AI freshness estimation module.
    """
    score: Optional[float] = None
    condition: Optional[str] = None
    estimated_days_remaining: Optional[float] = None
    assessed_at: Optional[str] = None
    notes: Optional[str] = None
    source: str = "Member 5 Freshness Estimation"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Optional[Dict[str, Any]]) -> Optional["FreshnessInfo"]:
        if not data:
            return None
        return cls(
            score=data.get("score"),
            condition=data.get("condition"),
            estimated_days_remaining=data.get("estimated_days_remaining") or data.get("estimatedDaysRemaining"),
            assessed_at=data.get("assessed_at") or data.get("assessedAt"),
            notes=data.get("notes"),
            source=data.get("source", "Member 5 Freshness Estimation"),
        )


@dataclass
class RefrigeratorData:
    """
    Environmental data received from Member 6's refrigerator monitoring module.
    """
    temperature_c: Optional[float] = None
    humidity_percent: Optional[float] = None
    last_logged_at: Optional[str] = None
    shelf_location: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Optional[Dict[str, Any]]) -> Optional["RefrigeratorData"]:
        if not data:
            return None
        return cls(
            temperature_c=data.get("temperature_c") or data.get("temperatureC"),
            humidity_percent=data.get("humidity_percent") or data.get("humidityPercent"),
            last_logged_at=data.get("last_logged_at") or data.get("lastLoggedAt"),
            shelf_location=data.get("shelf_location") or data.get("shelfLocation"),
        )


@dataclass
class FoodItem:
    """
    Core Food Inventory Model.
    Represents an item in the Smart Pantry with full date and freshness tracking.
    """
    name: str
    category: str
    quantity: float
    unit: str
    id: str = field(default_factory=generate_item_id)
    added_at: str = field(default_factory=current_iso_timestamp)
    updated_at: str = field(default_factory=current_iso_timestamp)
    purchase_date: Optional[str] = None
    package_date: Optional[str] = None
    confirmed_expiry_date: Optional[str] = None
    freshness_info: Optional[Dict[str, Any]] = None
    refrigerator_data: Optional[Dict[str, Any]] = None
    status: str = FoodStatus.ON_TRACK
    status_explanation: str = "Item recently added with no current warnings."

    def __post_init__(self):
        self.validate()

    def validate(self) -> None:
        if not self.id or not isinstance(self.id, str) or not self.id.strip():
            raise ValidationError("Item ID must be a non-empty string.")
        self.id = self.id.strip()

        if not self.name or not isinstance(self.name, str) or not self.name.strip():
            raise ValidationError("Food name cannot be empty.")
        self.name = self.name.strip()

        self.category = FoodCategory.normalize(self.category)

        try:
            self.quantity = float(self.quantity)
        except (ValueError, TypeError):
            raise ValidationError(f"Quantity must be a valid number, got {self.quantity}.")
        
        if self.quantity <= 0:
            raise ValidationError(f"Quantity must be greater than zero, got {self.quantity}.")

        if not self.unit or not isinstance(self.unit, str) or not self.unit.strip():
            raise ValidationError("Unit of measurement cannot be empty.")
        self.unit = self.unit.strip()

        parse_date_string(self.added_at)
        parse_date_string(self.updated_at)
        parse_date_string(self.purchase_date)
        parse_date_string(self.package_date)
        parse_date_string(self.confirmed_expiry_date)

        if self.status not in FoodStatus.ALL:
            raise ValidationError(f"Status '{self.status}' is invalid. Allowed: {list(FoodStatus.ALL)}")

        if not self.status_explanation or not isinstance(self.status_explanation, str):
            self.status_explanation = "Status calculated from current pantry data."

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "quantity": self.quantity,
            "unit": self.unit,
            "added_at": self.added_at,
            "updated_at": self.updated_at,
            "purchase_date": self.purchase_date,
            "package_date": self.package_date,
            "confirmed_expiry_date": self.confirmed_expiry_date,
            "freshness_info": self.freshness_info,
            "refrigerator_data": self.refrigerator_data,
            "status": self.status,
            "status_explanation": self.status_explanation,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "FoodItem":
        if not isinstance(data, dict):
            raise ValidationError("Input data must be a dictionary.")

        return cls(
            id=data.get("id") or generate_item_id(),
            name=data.get("name", ""),
            category=data.get("category", FoodCategory.OTHER),
            quantity=data.get("quantity", 1),
            unit=data.get("unit", "pcs"),
            added_at=data.get("added_at") or data.get("addedAt") or current_iso_timestamp(),
            updated_at=data.get("updated_at") or data.get("updatedAt") or current_iso_timestamp(),
            purchase_date=data.get("purchase_date") or data.get("purchaseDate"),
            package_date=data.get("package_date") or data.get("packageDate"),
            confirmed_expiry_date=data.get("confirmed_expiry_date") or data.get("confirmedExpiryDate"),
            freshness_info=data.get("freshness_info") or data.get("freshnessInfo"),
            refrigerator_data=data.get("refrigerator_data") or data.get("refrigeratorData"),
            status=data.get("status", FoodStatus.ON_TRACK),
            status_explanation=data.get("status_explanation") or data.get("statusExplanation", ""),
        )
