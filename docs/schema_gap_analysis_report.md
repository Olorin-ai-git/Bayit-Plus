# Transactions Enriched Schema Gap Analysis Report
**Generated:** 1762782892.9574077
**Source of Truth:** `Tx Table Schema.csv`

## Executive Summary

- **CSV Columns (Source of Truth):** 333
- **PostgreSQL Actual Columns:** 333
- **Common Columns:** 333
- **Missing in PostgreSQL:** 0
- **Extra in PostgreSQL:** 0
- **Type Mismatches:** 0
- **Type Warnings:** 36

## Type Warnings

These columns have compatible types but different precision/size (may need review):

| Column Name | CSV Type | PostgreSQL Type | Note |
|-------------|----------|-----------------|------|
| `COUNT_MAXMIND_MIN_FRAUD_ALERTS` | `NUMBER(18,0)` | `bigint` | ⚠️ Size/precision difference |
| `MAXMIND_MIN_FRAUD_ALERTS` | `ARRAY` | `jsonb` | ⚠️ Size/precision difference |
| `TRANSACTION_DETAILS_ADDITIONAL_DATA` | `OBJECT` | `jsonb` | ⚠️ Size/precision difference |
| `KYC_USER_AGE` | `NUMBER(19,6)` | `numeric` | ⚠️ Size/precision difference |
| `PARSED_USER_AGENT` | `OBJECT` | `jsonb` | ⚠️ Size/precision difference |
| `CART_BRANDS` | `ARRAY` | `jsonb` | ⚠️ Size/precision difference |
| `TRIGGERED_RULES` | `ARRAY` | `jsonb` | ⚠️ Size/precision difference |
| `DISPUTES` | `ARRAY` | `jsonb` | ⚠️ Size/precision difference |
| `COUNT_DISPUTES` | `NUMBER(18,0)` | `bigint` | ⚠️ Size/precision difference |
| `FRAUD_ALERTS` | `ARRAY` | `jsonb` | ⚠️ Size/precision difference |
| `PAYMENT_METHOD_DETAILS_ADDITIONAL_DATA` | `OBJECT` | `jsonb` | ⚠️ Size/precision difference |
| `COUNT_FRAUD_ALERTS` | `NUMBER(18,0)` | `bigint` | ⚠️ Size/precision difference |
| `MERCHANT_DECISIONS` | `ARRAY` | `jsonb` | ⚠️ Size/precision difference |
| `ALL_RECIPIENT_INFO` | `ARRAY` | `jsonb` | ⚠️ Size/precision difference |
| `TX_ADDITIONAL_DATA` | `OBJECT` | `jsonb` | ⚠️ Size/precision difference |
| `ALL_RECIPIENT_EMAILS` | `ARRAY` | `jsonb` | ⚠️ Size/precision difference |
| `ALL_RECIPIENT_EMAILS_NORMALIZED` | `ARRAY` | `jsonb` | ⚠️ Size/precision difference |
| `IS_SUSPICIOUS_AMOUNT` | `NUMBER(2,0)` | `smallint` | ⚠️ Size/precision difference |
| `CART_ITEMS_FULFILLMENT` | `ARRAY` | `jsonb` | ⚠️ Size/precision difference |
| `CART_SKUS` | `ARRAY` | `jsonb` | ⚠️ Size/precision difference |
| `CART_ITEMS_ARE_GIFTS` | `ARRAY` | `jsonb` | ⚠️ Size/precision difference |
| `SESSION_INFO_ADDITIONAL_DATA` | `OBJECT` | `jsonb` | ⚠️ Size/precision difference |
| `RECIPIENT_EMAIL_VALIDATION_ADDITIONAL_DATA` | `OBJECT` | `jsonb` | ⚠️ Size/precision difference |
| `CART_DELIVERY_METHODS` | `ARRAY` | `jsonb` | ⚠️ Size/precision difference |
| `HLR_ADDITIONAL_DATA` | `OBJECT` | `jsonb` | ⚠️ Size/precision difference |
| `CART_WITHOUT_FEE_ITEMS` | `ARRAY` | `jsonb` | ⚠️ Size/precision difference |
| `EMAIL_VALIDATION_ADDITIONAL_DATA` | `OBJECT` | `jsonb` | ⚠️ Size/precision difference |
| `PERSONAL_INFO_ADDITIONAL_DATA` | `OBJECT` | `jsonb` | ⚠️ Size/precision difference |
| `TABLE_RECORD_UPDATED_AT` | `VARCHAR(26)` | `character varying` | ⚠️ Size/precision difference |
| `COUNT_MERCHANT_DECISIONS` | `NUMBER(18,0)` | `bigint` | ⚠️ Size/precision difference |
| `TRIGGERED_LFS_RULES` | `ARRAY` | `jsonb` | ⚠️ Size/precision difference |
| `COUNT_NSURE_DECISIONS` | `NUMBER(18,0)` | `bigint` | ⚠️ Size/precision difference |
| `NSURE_DECISIONS` | `ARRAY` | `jsonb` | ⚠️ Size/precision difference |
| `CART_ITEMS_TYPES` | `ARRAY` | `jsonb` | ⚠️ Size/precision difference |
| `TABLE_RECORD_CREATED_AT` | `VARCHAR(26)` | `character varying` | ⚠️ Size/precision difference |
| `BIN_ADDITIONAL_DATA` | `OBJECT` | `jsonb` | ⚠️ Size/precision difference |

## Recommendations

### Critical Actions Required:

### Schema Synchronization:

- PostgreSQL and Snowflake schemas MUST match the CSV source of truth
- All three schemas should be kept in sync
- Use the CSV as the single source of truth for schema definitions
- Update migration scripts to reflect CSV schema

## Application Code Issues

### Known Column Name Mismatches in Code:

The following columns are referenced in application code but don't exist in the schema:

| Code Reference | Actual Column | Status |
|----------------|---------------|--------|
| `merchant_id` | `store_id` | ✅ Fixed - code updated to use `store_id` |
| `acquisition_channel` | `device_type` | ✅ Fixed - code updated to use `device_type` |

**Note:** These are application code issues, not schema issues. The schema is correct.

## Column Reference Guide

### Common Column Mappings:

| Logical Name | CSV Column | PostgreSQL Column | Notes |
|--------------|-----------|-------------------|-------|
| Merchant ID | `STORE_ID` | `store_id` | Use `STORE_ID`/`store_id` for merchant/store identifier |
| Channel | `DEVICE_TYPE` | `device_type` | Use `DEVICE_TYPE`/`device_type` for acquisition channel |
| Geo/Country | `IP_COUNTRY_CODE` | `ip_country_code` | Use `IP_COUNTRY_CODE`/`ip_country_code` for geographic data |

