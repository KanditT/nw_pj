"""Rule-based validation engine for quality inspections."""
from app.models.rule import InspectionRule
from app.models.inspection import QualityInspection


def _evaluate_condition(condition: dict, item: dict) -> bool:
    parameter = condition.get("parameter")
    operator = condition.get("operator", "eq")
    value = condition.get("value")
    min_v = condition.get("min")
    max_v = condition.get("max")

    actual = item.get("actual_value")
    if parameter and item.get("parameter") != parameter:
        return True  # rule doesn't apply to this item

    if actual is None:
        return True  # no reading yet, skip

    try:
        actual = float(actual)
    except (TypeError, ValueError):
        return True

    if operator == "between":
        return min_v is not None and max_v is not None and min_v <= actual <= max_v
    elif operator == "gt":
        return actual > float(value)
    elif operator == "gte":
        return actual >= float(value)
    elif operator == "lt":
        return actual < float(value)
    elif operator == "lte":
        return actual <= float(value)
    elif operator == "eq":
        return actual == float(value)
    elif operator == "neq":
        return actual != float(value)
    return True


async def validate_inspection(
    inspection: QualityInspection,
    rules: list[InspectionRule],
) -> dict:
    violations = []
    warnings = []

    items_data = [
        {
            "parameter": i.parameter,
            "actual_value": i.actual_value,
            "min_value": i.min_value,
            "max_value": i.max_value,
        }
        for i in (inspection.items or [])
    ]

    for rule in rules:
        if not rule.is_active:
            continue
        if rule.item_code and rule.item_code != inspection.item_code:
            continue
        if rule.inspection_type and rule.inspection_type != inspection.inspection_type:
            continue

        conditions = rule.conditions
        if isinstance(conditions, list):
            condition_list = conditions
        else:
            condition_list = [conditions]

        for condition in condition_list:
            for item in items_data:
                passed = _evaluate_condition(condition, item)
                if not passed:
                    entry = {
                        "rule": rule.name,
                        "parameter": item["parameter"],
                        "actual_value": item["actual_value"],
                        "condition": condition,
                    }
                    if rule.severity == "critical":
                        violations.append(entry)
                    else:
                        warnings.append(entry)

    return {
        "passed": len(violations) == 0,
        "violations": violations,
        "warnings": warnings,
    }
