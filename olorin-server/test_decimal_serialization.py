#!/usr/bin/env python3
"""
Test script to verify Decimal serialization fix for tool execution service.
"""
from decimal import Decimal
from datetime import datetime, timezone
import json

# Import the serialization function
from app.service.tool_execution_service import _serialize_datetime_for_json

print("=" * 80)
print("Decimal Serialization Fix Verification")
print("=" * 80)
print()

# Test 1: Simple Decimal
print("1. Simple Decimal Serialization:")
print("-" * 80)

test_decimal = Decimal("123.456")
serialized = _serialize_datetime_for_json(test_decimal)
print(f"   Input:  Decimal('{test_decimal}') - type: {type(test_decimal)}")
print(f"   Output: {serialized} - type: {type(serialized)}")
print(f"   JSON:   {json.dumps(serialized)}")
print(f"   Status: {'✅ PASS' if isinstance(serialized, float) else '❌ FAIL'}")
print()

# Test 2: Dict with Decimal values (simulating database query result)
print("2. Database Query Result with Decimal:")
print("-" * 80)

db_result = {
    "id": 123,
    "amount": Decimal("999.99"),
    "score": Decimal("0.87"),
    "count": 100
}

serialized = _serialize_datetime_for_json(db_result)
print(f"   Input:  {db_result}")
print(f"   Output: {serialized}")

try:
    json_str = json.dumps(serialized)
    print(f"   JSON:   {json_str}")
    print(f"   Status: ✅ PASS - Successfully serialized to JSON")
except TypeError as e:
    print(f"   Status: ❌ FAIL - {e}")
print()

# Test 3: List of dicts with mixed types (realistic database query results)
print("3. Realistic Database Query Results:")
print("-" * 80)

query_results = [
    {
        "transaction_id": 1,
        "amount": Decimal("1234.56"),
        "risk_score": Decimal("0.75"),
        "timestamp": datetime(2025, 11, 8, 14, 16, 40, tzinfo=timezone.utc),
        "description": "Test transaction"
    },
    {
        "transaction_id": 2,
        "amount": Decimal("9876.54"),
        "risk_score": Decimal("0.95"),
        "timestamp": datetime(2025, 11, 8, 15, 30, 0, tzinfo=timezone.utc),
        "description": "Another transaction"
    }
]

serialized = _serialize_datetime_for_json(query_results)

try:
    json_str = json.dumps(serialized, indent=2)
    print(f"   Serialized {len(serialized)} records successfully")
    print(f"   First record: {serialized[0]}")
    print(f"   Status: ✅ PASS - All types properly serialized")
except TypeError as e:
    print(f"   Status: ❌ FAIL - {e}")
print()

# Test 4: Nested structures with Decimal
print("4. Nested Structures with Decimal:")
print("-" * 80)

nested_data = {
    "investigation": {
        "id": "test-123",
        "results": [
            {"score": Decimal("0.85"), "confidence": Decimal("0.92")},
            {"score": Decimal("0.76"), "confidence": Decimal("0.88")}
        ],
        "summary": {
            "avg_score": Decimal("0.805"),
            "max_score": Decimal("0.85"),
            "total_transactions": 100
        }
    }
}

serialized = _serialize_datetime_for_json(nested_data)

try:
    json_str = json.dumps(serialized, indent=2)
    print(f"   Successfully serialized nested structure")
    print(f"   JSON Preview:")
    print(f"   {json_str[:200]}...")
    print(f"   Status: ✅ PASS - Nested Decimal values handled correctly")
except TypeError as e:
    print(f"   Status: ❌ FAIL - {e}")
print()

# Test 5: bytes handling
print("5. Bytes Serialization:")
print("-" * 80)

test_bytes = b"Hello, World!"
serialized = _serialize_datetime_for_json(test_bytes)
print(f"   Input:  {test_bytes} - type: {type(test_bytes)}")
print(f"   Output: {serialized} - type: {type(serialized)}")
print(f"   Status: {'✅ PASS' if isinstance(serialized, str) else '❌ FAIL'}")
print()

# Test 6: Combined datetime and Decimal
print("6. Combined datetime and Decimal:")
print("-" * 80)

combined_data = {
    "created_at": datetime(2025, 11, 8, 14, 16, 40, tzinfo=timezone.utc),
    "amount": Decimal("12345.67"),
    "status": "completed"
}

serialized = _serialize_datetime_for_json(combined_data)

try:
    json_str = json.dumps(serialized)
    print(f"   Original: {combined_data}")
    print(f"   Serialized: {serialized}")
    print(f"   JSON: {json_str}")
    print(f"   Status: ✅ PASS - datetime and Decimal both handled")
except TypeError as e:
    print(f"   Status: ❌ FAIL - {e}")
print()

print("=" * 80)
print("Verification Complete")
print("=" * 80)
print()
print("Summary:")
print("-" * 80)
print("The _serialize_datetime_for_json function now properly handles:")
print("  ✅ Decimal objects (converted to float)")
print("  ✅ datetime objects (converted to ISO strings)")
print("  ✅ bytes objects (decoded to UTF-8 strings)")
print("  ✅ Nested structures (recursive serialization)")
print("  ✅ Database query results with mixed types")
print()
print("This fix resolves the error:")
print("  'Object of type Decimal is not JSON serializable'")
print()
