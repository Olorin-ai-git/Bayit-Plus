# Boolean Query Syntax Guide for Multi-Entity Investigations

## Overview

The Multi-Entity Investigation System supports sophisticated Boolean logic expressions to define relationships and conditions between entities. This guide provides comprehensive documentation for constructing effective Boolean queries for autonomous investigations.

## Table of Contents

1. [Basic Concepts](#basic-concepts)
2. [Supported Operators](#supported-operators)
3. [Query Construction](#query-construction)
4. [Advanced Patterns](#advanced-patterns)
5. [Performance Considerations](#performance-considerations)
6. [Validation and Limits](#validation-and-limits)
7. [Best Practices](#best-practices)
8. [Common Examples](#common-examples)
9. [Troubleshooting](#troubleshooting)

## Basic Concepts

### What are Boolean Queries?

Boolean queries are logical expressions that combine entity identifiers using operators (AND, OR, NOT) to define investigation conditions. These queries determine which entity combinations should trigger investigation actions.

### Entity References

In Boolean queries, you reference entities by their unique identifiers. These identifiers must exactly match the entities defined in your investigation request.

**Example:**
```
USER_12345 AND TRANSACTION_67890
```

### Query Evaluation

Each entity in your Boolean expression evaluates to either `true` or `false` based on investigation results. The overall expression then evaluates according to Boolean logic rules.

## Supported Operators

### 1. AND Operator

The AND operator requires **both** conditions to be true.

**Syntax:** `entity1 AND entity2`

**Examples:**
```
USER_12345 AND DEVICE_ABC123
(USER_12345 AND TRANSACTION_67890) AND LOCATION_NYC
```

**Use Cases:**
- Investigating users who meet multiple criteria
- Correlating events that must occur together
- Ensuring all security checks pass

### 2. OR Operator

The OR operator requires **at least one** condition to be true.

**Syntax:** `entity1 OR entity2`

**Examples:**
```
STORE_999 OR STORE_888
USER_12345 OR (DEVICE_ABC123 AND LOCATION_NYC)
```

**Use Cases:**
- Investigating alternative scenarios
- Checking multiple possible sources
- Flexible entity matching

### 3. NOT Operator

The NOT operator **negates** a condition (true becomes false, false becomes true).

**Syntax:** `NOT entity1`

**Examples:**
```
USER_12345 AND NOT DEVICE_BLOCKED
(TRANSACTION_67890 OR TRANSACTION_67891) AND NOT FRAUD_FLAG
```

**Use Cases:**
- Excluding specific conditions
- Ensuring absence of risk factors
- Negative filtering

### 4. Parentheses for Grouping

Use parentheses to control operator precedence and group logical operations.

**Examples:**
```
(USER_12345 AND DEVICE_ABC) OR (USER_12345 AND DEVICE_DEF)
NOT (RISK_HIGH OR FRAUD_DETECTED)
((A AND B) OR C) AND NOT D
```

## Query Construction

### Basic Syntax Rules

1. **Case Sensitivity:** Operators are case-insensitive (`AND`, `and`, `And` all work)
2. **Whitespace:** Spaces around operators are optional but recommended
3. **Entity Names:** Must exactly match entity IDs in your request
4. **Parentheses:** Must be properly balanced

### Operator Precedence

When no parentheses are used, operators follow this precedence:
1. `NOT` (highest precedence)
2. `AND` 
3. `OR` (lowest precedence)

**Example:**
```
A OR B AND NOT C
# Evaluates as: A OR (B AND (NOT C))
```

**Recommended:** Always use parentheses for clarity:
```
A OR (B AND (NOT C))
```

### Valid Expression Examples

```
# Simple two-entity correlation
USER_12345 AND TRANSACTION_67890

# Complex multi-entity pattern
(USER_12345 AND DEVICE_ABC) OR (TRANSACTION_67890 AND STORE_999)

# Risk assessment with exclusions
(HIGH_VALUE_TXN AND UNUSUAL_LOCATION) AND NOT VERIFIED_USER

# Nested logical grouping
((A AND B) OR (C AND D)) AND NOT (E OR F)
```

### Invalid Expression Examples

```
# Missing entity references
AND USER_12345           # Cannot start with operator

# Consecutive operators
USER_12345 AND AND DEVICE_ABC    # Invalid syntax

# Unbalanced parentheses
(USER_12345 AND DEVICE_ABC       # Missing closing parenthesis

# Empty expressions
""                       # Empty query not allowed
```

## Advanced Patterns

### Complex Entity Relationships

**Financial Transaction Pattern:**
```
(USER_12345 AND MERCHANT_789) AND 
(HIGH_AMOUNT_TXN OR INTERNATIONAL_TXN) AND 
NOT VERIFIED_PAYMENT_METHOD
```

**Multi-Device Authentication:**
```
USER_12345 AND 
((DEVICE_MOBILE_123 AND LOCATION_HOME) OR 
 (DEVICE_LAPTOP_456 AND LOCATION_OFFICE)) AND
NOT SUSPICIOUS_LOGIN
```

**Fraud Detection Pattern:**
```
((VELOCITY_ANOMALY AND NEW_PAYEE) OR 
 (UNUSUAL_LOCATION AND HIGH_AMOUNT)) AND
NOT (VERIFIED_USER AND TRUSTED_DEVICE)
```

### Temporal Logic Patterns

While the Boolean parser doesn't directly support temporal operators, you can use entity naming conventions:

```
# Sequential transaction pattern
TXN_MORNING_001 AND TXN_AFTERNOON_002 AND TXN_EVENING_003

# Time-based risk assessment
(WEEKEND_ACTIVITY OR LATE_NIGHT_TXN) AND HIGH_AMOUNT AND NOT PREAUTHORIZED
```

### Hierarchical Entity Patterns

```
# Geographic hierarchy
(COUNTRY_US AND STATE_CA AND CITY_SF) OR 
(COUNTRY_UK AND REGION_LONDON)

# Organizational structure
(DEPARTMENT_FINANCE AND ROLE_MANAGER) OR 
(DEPARTMENT_IT AND CLEARANCE_HIGH)
```

## Performance Considerations

### Query Complexity Scoring

The system automatically scores query complexity based on:

- **Entity Count:** Number of unique entities (weight: 1.0 each)
- **AND Operators:** Boolean AND operations (weight: 2.0 each)
- **OR Operators:** Boolean OR operations (weight: 2.5 each)
- **NOT Operators:** Boolean NOT operations (weight: 1.5 each)
- **Nesting Depth:** Parentheses levels (weight: 3.0 per level)
- **Expression Length:** Character count (weight: 0.01 per character)

### Performance Guidelines

| Complexity Level | Score Range | Expected Time | Recommendations |
|------------------|-------------|---------------|-----------------|
| **Simple** | 0 - 10 | < 100ms | Optimal performance |
| **Moderate** | 11 - 25 | 100 - 500ms | Good performance, will be cached |
| **Complex** | 26 - 50 | 500ms - 2s | Consider simplification |
| **Excessive** | > 50 | > 2s | Requires optimization |

### Optimization Strategies

**1. Reduce Entity Count:**
```
# Instead of:
E1 AND E2 AND E3 AND E4 AND E5 AND E6 AND E7 AND E8 AND E9 AND E10

# Consider grouping:
(GROUP_A_ENTITIES AND GROUP_B_ENTITIES) OR CRITICAL_ENTITY
```

**2. Simplify Nesting:**
```
# Instead of:
((((A AND B) OR C) AND D) OR E)

# Use flatter structure:
(A AND B AND D) OR (C AND D) OR E
```

**3. Use Efficient Patterns:**
```
# More efficient:
USER_12345 AND (TXN_A OR TXN_B OR TXN_C)

# Less efficient:
(USER_12345 AND TXN_A) OR (USER_12345 AND TXN_B) OR (USER_12345 AND TXN_C)
```

## Validation and Limits

### System Limits

| Parameter | Default Limit | Description |
|-----------|---------------|-------------|
| **Max Entities** | 50 | Maximum entities per query |
| **Max Nesting Depth** | 10 | Maximum parentheses levels |
| **Max Operators** | 100 | Maximum AND/OR/NOT operators |
| **Max Expression Length** | 1000 characters | Maximum query string length |
| **Complexity Threshold** | 50.0 | Maximum complexity score |

### Validation Rules

1. **Balanced Parentheses:** All opening parentheses must have matching closing parentheses
2. **No Consecutive Operators:** Cannot have operators like `AND AND` or `OR NOT AND`
3. **No Leading/Trailing Operators:** Expression cannot start or end with AND/OR
4. **Entity References:** All referenced entities must exist in the investigation request
5. **Non-Empty Expression:** Query cannot be empty or contain only whitespace

### Error Handling

**Common Validation Errors:**

```json
{
  "validation_errors": [
    "Too many entities: 60 (max: 50)",
    "Query too complex: score 75.2 (max: 50.0)",
    "Unbalanced parentheses: missing closing parenthesis",
    "Consecutive operators detected (invalid syntax)"
  ],
  "complexity_metrics": {
    "entity_count": 60,
    "operator_count": 25,
    "nesting_depth": 5,
    "complexity_score": 75.2,
    "complexity_level": "excessive"
  }
}
```

## Best Practices

### 1. Start Simple

Begin with simple queries and gradually add complexity:

```
# Start with:
USER_12345 AND TRANSACTION_67890

# Then evolve to:
(USER_12345 AND TRANSACTION_67890) OR (USER_12345 AND DEVICE_ABC)

# Finally:
(USER_12345 AND (TRANSACTION_67890 OR DEVICE_ABC)) AND NOT FRAUD_FLAG
```

### 2. Use Clear Entity Names

Choose descriptive, consistent entity identifiers:

```
# Good:
USER_JOHN_DOE_12345 AND TXN_PURCHASE_67890

# Better:
HIGH_RISK_USER_12345 AND LARGE_AMOUNT_TXN_67890
```

### 3. Group Related Conditions

```
# Group by concern area:
(IDENTITY_CONCERNS AND DEVICE_CONCERNS) OR 
(TRANSACTION_CONCERNS AND LOCATION_CONCERNS)
```

### 4. Document Complex Queries

Add comments explaining complex logic:

```
# Risk assessment: High-value transaction from new location without device verification
(HIGH_VALUE_TXN AND NEW_LOCATION) AND NOT (VERIFIED_DEVICE OR TRUSTED_USER)
```

### 5. Test Incrementally

Build and test queries incrementally:

1. Test individual entity conditions
2. Add one operator at a time
3. Verify parentheses grouping
4. Check performance metrics

## Common Examples

### E-commerce Fraud Detection

```
# Suspicious purchase pattern
(HIGH_VALUE_PURCHASE AND NEW_CUSTOMER) OR
(MULTIPLE_FAILED_PAYMENTS AND UNUSUAL_LOCATION) AND
NOT (VERIFIED_ADDRESS AND TRUSTED_PAYMENT_METHOD)
```

### Account Security Monitoring

```
# Compromised account indicators
(LOGIN_FROM_NEW_LOCATION AND PASSWORD_CHANGE) OR
(MULTIPLE_FAILED_LOGINS AND SUSPICIOUS_USER_AGENT) AND
NOT VERIFIED_BY_2FA
```

### Financial Transaction Analysis

```
# Money laundering pattern detection
(RAPID_SUCCESSION_TRANSFERS AND ROUND_AMOUNTS) AND
(MULTIPLE_ACCOUNTS OR SHELL_COMPANIES) AND
NOT REGULATORY_COMPLIANCE_CHECK
```

### Multi-Channel Authentication

```
# Cross-platform verification
(MOBILE_APP_LOGIN OR WEB_PORTAL_LOGIN) AND
USER_AUTHENTICATED AND
NOT (DEVICE_FLAGGED OR LOCATION_BLOCKED)
```

### Supply Chain Monitoring

```
# Supplier risk assessment
(NEW_SUPPLIER OR CHANGED_BANK_DETAILS) AND
(HIGH_VALUE_TRANSACTION OR RUSH_ORDER) AND
NOT (VERIFIED_SUPPLIER AND COMPLIANCE_CLEARED)
```

## Troubleshooting

### Query Validation Failures

**Problem:** "Consecutive operators detected"
```
# Incorrect:
USER_12345 AND AND DEVICE_ABC

# Correct:
USER_12345 AND DEVICE_ABC
```

**Problem:** "Unbalanced parentheses"
```
# Incorrect:
(USER_12345 AND DEVICE_ABC

# Correct:
(USER_12345 AND DEVICE_ABC)
```

**Problem:** "Entity not found in investigation"
```
# Check that all referenced entities exist in your request:
{
  "entities": [
    {"entity_id": "USER_12345", "entity_type": "user"},
    {"entity_id": "DEVICE_ABC", "entity_type": "device"}
  ],
  "boolean_logic": "USER_12345 AND DEVICE_ABC"  // ✓ Both entities defined
}
```

### Performance Issues

**Problem:** Query timeout or slow response

**Solutions:**
1. **Reduce complexity:** Break complex queries into simpler parts
2. **Use fewer entities:** Focus on most critical entities
3. **Optimize nesting:** Reduce parentheses levels
4. **Cache frequently used queries:** Complex queries are automatically cached

### Logic Errors

**Problem:** Unexpected investigation results

**Debugging Steps:**
1. Test individual entity conditions
2. Verify operator precedence with parentheses
3. Check NOT operator placement
4. Validate entity naming consistency

### API Integration Issues

**Problem:** 400 Bad Request with validation errors

**Check:**
1. JSON formatting of boolean_logic field
2. Entity ID consistency between entities array and boolean_logic
3. Compliance with complexity limits
4. Proper escaping of special characters

## Advanced Features

### Query Caching

Complex queries (complexity score > 25 or > 10 entities) are automatically cached for improved performance on subsequent requests.

**Cache Behavior:**
- **TTL:** 1 hour for most queries
- **LRU Eviction:** Least recently used queries are removed first
- **Memory Limit:** 100MB maximum cache size
- **Warming:** Common patterns are pre-cached

### Rate Limiting

Query complexity affects rate limiting:

- **Simple queries:** Normal rate limits
- **Moderate queries:** 1.5x stricter rate limiting
- **Complex queries:** 2x stricter rate limiting  
- **Excessive queries:** 5x stricter rate limiting (if allowed)

### Monitoring and Analytics

The system provides query analytics:

```json
{
  "complexity_distribution": {
    "simple": 523,
    "moderate": 456, 
    "complex": 201,
    "excessive": 67
  },
  "avg_execution_time_ms": 2340.5,
  "cache_hit_rate": 0.76
}
```

## Getting Help

### API Documentation

Visit the interactive API documentation at:
- **Local Development:** `http://localhost:8090/docs`
- **Production:** Contact your system administrator

### Support Resources

1. **Query Validation Endpoint:** Test queries before full investigations
2. **Complexity Analysis:** Get detailed metrics for your queries  
3. **Performance Recommendations:** System provides optimization suggestions
4. **Error Details:** Comprehensive error messages with specific fixes

### Contact Information

For additional support with Boolean query construction:
- **Technical Documentation:** `/docs/technical/`
- **API Reference:** `/docs/api/`
- **Best Practices:** `/docs/guides/`

---

**Last Updated:** January 2025
**Version:** 2.1.0
**Compatibility:** Multi-Entity Investigation System v2.1+