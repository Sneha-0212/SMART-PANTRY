"""
Configurable Status Calculation Logic
Member 3: Backend/Logic Developer (Data and Date Tracking)
Smart Pantry Project
"""

from datetime import datetime, timezone
from dataclasses import dataclass
from typing import Tuple, Optional
from models import FoodItem, FoodStatus, FoodCategory, parse_date_string


@dataclass
class StatusRuleConfig:
    use_soon_days_threshold: int = 3
    vegetable_unassessed_check_days: int = 5
    fruit_unassessed_check_days: int = 4
    other_unassessed_check_days: int = 14
    freshness_score_check_now: float = 40.0
    freshness_score_use_soon: float = 70.0
    freshness_days_use_soon: float = 2.0
    max_safe_refrigerator_temp_c: float = 8.0
    min_safe_refrigerator_temp_c: float = 0.0


DEFAULT_STATUS_RULES = StatusRuleConfig()


def calculate_food_status(
    item: FoodItem,
    rules: StatusRuleConfig = DEFAULT_STATUS_RULES,
    current_time: Optional[datetime] = None
) -> Tuple[str, str]:
    now = current_time or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    parsed_added = parse_date_string(item.added_at) or now
    parsed_purchase = parse_date_string(item.purchase_date)
    parsed_package = parse_date_string(item.package_date)
    parsed_expiry = parse_date_string(item.confirmed_expiry_date)

    if parsed_purchase and parsed_expiry and parsed_purchase > parsed_expiry:
        return (
            FoodStatus.CHECK_NOW,
            f"Conflicting dates: Purchase date ({item.purchase_date}) is after confirmed expiry date ({item.confirmed_expiry_date}). Verify packaging."
        )

    if parsed_package and parsed_expiry and parsed_package > parsed_expiry:
        return (
            FoodStatus.CHECK_NOW,
            f"Conflicting dates: Packaging date ({item.package_date}) is after confirmed expiry date ({item.confirmed_expiry_date}). Verify packaging."
        )

    if item.refrigerator_data:
        temp = item.refrigerator_data.get("temperature_c")
        if temp is not None:
            if temp > rules.max_safe_refrigerator_temp_c:
                return (
                    FoodStatus.CHECK_NOW,
                    f"Temperature alert: Storage temperature ({temp:.1f}°C) exceeded safe pantry threshold ({rules.max_safe_refrigerator_temp_c}°C). Check item condition."
                )
            if temp < rules.min_safe_refrigerator_temp_c:
                return (
                    FoodStatus.CHECK_NOW,
                    f"Freezing alert: Storage temperature ({temp:.1f}°C) dropped below freezing. Check for freeze damage."
                )

    if item.freshness_info:
        condition = (item.freshness_info.get("condition") or "").lower()
        score = item.freshness_info.get("score")
        est_days = item.freshness_info.get("estimated_days_remaining")

        if condition in {"spoiled", "moldy", "decayed", "damaged", "poor", "wilting"}:
            notes = item.freshness_info.get("notes") or "visual degradation detected"
            return (
                FoodStatus.CHECK_NOW,
                f"Freshness check required: AI assessment reported '{condition}' ({notes})."
            )

        if score is not None and score < rules.freshness_score_check_now:
            return (
                FoodStatus.CHECK_NOW,
                f"Freshness check required: Quality score is low ({score:.0f}/100)."
            )

        if est_days is not None and est_days <= rules.freshness_days_use_soon:
            return (
                FoodStatus.USE_SOON,
                f"Use soon: AI freshness assessment estimates approximately {est_days:.1f} days of freshness remaining."
            )

        if score is not None and score <= rules.freshness_score_use_soon:
            return (
                FoodStatus.USE_SOON,
                f"Use soon: Freshness score ({score:.0f}/100) indicates the item is approaching peak ripeness."
            )

        if condition in {"ripe", "fair", "consume_soon"}:
            return (
                FoodStatus.USE_SOON,
                f"Use soon: AI assessment noted condition is '{condition}'."
            )

    if parsed_expiry:
        diff = parsed_expiry - now
        days_remaining = diff.total_seconds() / 86400.0

        if days_remaining < 0:
            days_ago = abs(int(days_remaining))
            return (
                FoodStatus.CHECK_NOW,
                f"Expired: Confirmed expiry date ({item.confirmed_expiry_date}) passed {days_ago} day(s) ago. Check before using."
            )
        elif days_remaining <= rules.use_soon_days_threshold:
            days_left = max(0, int(round(days_remaining)))
            return (
                FoodStatus.USE_SOON,
                f"Use soon: Confirmed expiry date ({item.confirmed_expiry_date}) is in {days_left} day(s)."
            )
        else:
            days_left = int(round(days_remaining))
            return (
                FoodStatus.ON_TRACK,
                f"On Track: Confirmed expiry date ({item.confirmed_expiry_date}) is {days_left} days away."
            )

    storage_duration = now - parsed_added
    storage_days = max(0, storage_duration.days)

    if item.category == FoodCategory.VEGETABLE:
        if storage_days >= rules.vegetable_unassessed_check_days:
            return (
                FoodStatus.CHECK_NOW,
                f"Check freshness: Fresh vegetable stored for {storage_days} days without expiry label or AI scan. Check for crispness."
            )
        elif storage_days >= (rules.vegetable_unassessed_check_days - 2):
            return (
                FoodStatus.USE_SOON,
                f"Use soon: Fresh vegetable stored for {storage_days} days. Recommended to consume while fresh."
            )
        else:
            return (
                FoodStatus.ON_TRACK,
                f"On Track: Added {storage_days} day(s) ago. Fresh vegetables do not require expiry dates."
            )

    elif item.category == FoodCategory.FRUIT:
        if storage_days >= rules.fruit_unassessed_check_days:
            return (
                FoodStatus.CHECK_NOW,
                f"Check freshness: Fresh fruit stored for {storage_days} days without expiry label or AI scan. Inspect for over-ripeness."
            )
        elif storage_days >= (rules.fruit_unassessed_check_days - 2):
            return (
                FoodStatus.USE_SOON,
                f"Use soon: Fresh fruit stored for {storage_days} days. Ideal to consume soon for best flavor."
            )
        else:
            return (
                FoodStatus.ON_TRACK,
                f"On Track: Added {storage_days} day(s) ago. Fresh fruits do not require expiry dates."
            )

    else:
        if storage_days >= rules.other_unassessed_check_days:
            return (
                FoodStatus.CHECK_NOW,
                f"Check item: Stored for {storage_days} days without confirmed dates. Check packaging and quality."
            )
        else:
            return (
                FoodStatus.ON_TRACK,
                f"On Track: Added {storage_days} day(s) ago. No alerts or issues recorded."
            )
