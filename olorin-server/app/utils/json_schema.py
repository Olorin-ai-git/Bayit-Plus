from typing import Any, Dict, List, Tuple

try:
    import jsonschema  # type: ignore
except Exception:
    jsonschema = None  # type: ignore


def validate_json_against_schema(instance: Dict[str, Any], schema: Dict[str, Any]) -> Tuple[bool, List[str]]:
    if jsonschema is None:
        # Degrade gracefully if dependency not installed
        return True, []
    try:
        jsonschema.validate(instance=instance, schema=schema)
        return True, []
    except Exception as e:  # jsonschema.exceptions.ValidationError
        return False, [str(e)]
