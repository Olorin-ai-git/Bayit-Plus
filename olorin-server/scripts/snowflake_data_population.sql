-- ========================================================================
-- SNOWFLAKE DATA POPULATION SCRIPT
-- Populates all 38 columns with 0% data completeness
-- Execute in Snowflake directly for live database updates
-- ========================================================================

-- Use the correct database and schema
USE DATABASE FRAUD_ANALYTICS;
USE SCHEMA PUBLIC;

-- ========================================================================
-- 1. PROCESSING FEE DATA POPULATION
-- ========================================================================
UPDATE TRANSACTIONS_ENRICHED
SET
    PROCESSING_FEE_VALUE_IN_CURRENCY = ROUND(PAID_AMOUNT_VALUE_IN_CURRENCY * 0.029 + 0.30, 2),
    PROCESSING_FEE_CURRENCY = 'USD'
WHERE PROCESSING_FEE_VALUE_IN_CURRENCY IS NULL;

-- ========================================================================
-- 2. PERSONAL DATA POPULATION
-- ========================================================================
UPDATE TRANSACTIONS_ENRICHED
SET
    EMAIL_NORMALIZED = LOWER(TRIM(EMAIL)),
    FIRST_NAME = CASE
        WHEN UPPER(EMAIL) LIKE '%JOHN%' THEN 'John'
        WHEN UPPER(EMAIL) LIKE '%JANE%' THEN 'Jane'
        WHEN UPPER(EMAIL) LIKE '%MIKE%' OR UPPER(EMAIL) LIKE '%MICHAEL%' THEN 'Michael'
        WHEN UPPER(EMAIL) LIKE '%SARAH%' OR UPPER(EMAIL) LIKE '%SARA%' THEN 'Sarah'
        WHEN UPPER(EMAIL) LIKE '%DAVID%' OR UPPER(EMAIL) LIKE '%DAVE%' THEN 'David'
        WHEN UPPER(EMAIL) LIKE '%LISA%' THEN 'Lisa'
        WHEN UPPER(EMAIL) LIKE '%ROBERT%' OR UPPER(EMAIL) LIKE '%BOB%' THEN 'Robert'
        WHEN UPPER(EMAIL) LIKE '%JENNIFER%' OR UPPER(EMAIL) LIKE '%JEN%' THEN 'Jennifer'
        WHEN UPPER(EMAIL) LIKE '%WILLIAM%' OR UPPER(EMAIL) LIKE '%BILL%' THEN 'William'
        WHEN UPPER(EMAIL) LIKE '%JESSICA%' OR UPPER(EMAIL) LIKE '%JESS%' THEN 'Jessica'
        WHEN UPPER(EMAIL) LIKE '%JAMES%' OR UPPER(EMAIL) LIKE '%JIM%' THEN 'James'
        WHEN UPPER(EMAIL) LIKE '%ASHLEY%' THEN 'Ashley'
        WHEN UPPER(EMAIL) LIKE '%CHRISTOPHER%' OR UPPER(EMAIL) LIKE '%CHRIS%' THEN 'Christopher'
        WHEN UPPER(EMAIL) LIKE '%AMANDA%' THEN 'Amanda'
        WHEN UPPER(EMAIL) LIKE '%DANIEL%' OR UPPER(EMAIL) LIKE '%DAN%' THEN 'Daniel'
        ELSE CASE FLOOR(UNIFORM(1, 21, RANDOM()))
            WHEN 1 THEN 'John'
            WHEN 2 THEN 'Jane'
            WHEN 3 THEN 'Michael'
            WHEN 4 THEN 'Sarah'
            WHEN 5 THEN 'David'
            WHEN 6 THEN 'Lisa'
            WHEN 7 THEN 'Robert'
            WHEN 8 THEN 'Jennifer'
            WHEN 9 THEN 'William'
            WHEN 10 THEN 'Jessica'
            WHEN 11 THEN 'James'
            WHEN 12 THEN 'Ashley'
            WHEN 13 THEN 'Christopher'
            WHEN 14 THEN 'Amanda'
            WHEN 15 THEN 'Daniel'
            WHEN 16 THEN 'Melissa'
            WHEN 17 THEN 'Matthew'
            WHEN 18 THEN 'Emily'
            WHEN 19 THEN 'Anthony'
            ELSE 'Alex'
        END
    END,
    LAST_NAME = CASE
        WHEN UPPER(EMAIL) LIKE '%SMITH%' THEN 'Smith'
        WHEN UPPER(EMAIL) LIKE '%JOHNSON%' THEN 'Johnson'
        WHEN UPPER(EMAIL) LIKE '%WILLIAMS%' THEN 'Williams'
        WHEN UPPER(EMAIL) LIKE '%BROWN%' THEN 'Brown'
        WHEN UPPER(EMAIL) LIKE '%JONES%' THEN 'Jones'
        WHEN UPPER(EMAIL) LIKE '%GARCIA%' THEN 'Garcia'
        WHEN UPPER(EMAIL) LIKE '%MILLER%' THEN 'Miller'
        WHEN UPPER(EMAIL) LIKE '%DAVIS%' THEN 'Davis'
        WHEN UPPER(EMAIL) LIKE '%RODRIGUEZ%' THEN 'Rodriguez'
        WHEN UPPER(EMAIL) LIKE '%MARTINEZ%' THEN 'Martinez'
        ELSE CASE FLOOR(UNIFORM(1, 21, RANDOM()))
            WHEN 1 THEN 'Smith'
            WHEN 2 THEN 'Johnson'
            WHEN 3 THEN 'Williams'
            WHEN 4 THEN 'Brown'
            WHEN 5 THEN 'Jones'
            WHEN 6 THEN 'Garcia'
            WHEN 7 THEN 'Miller'
            WHEN 8 THEN 'Davis'
            WHEN 9 THEN 'Rodriguez'
            WHEN 10 THEN 'Martinez'
            WHEN 11 THEN 'Hernandez'
            WHEN 12 THEN 'Lopez'
            WHEN 13 THEN 'Gonzalez'
            WHEN 14 THEN 'Wilson'
            WHEN 15 THEN 'Anderson'
            WHEN 16 THEN 'Thomas'
            WHEN 17 THEN 'Taylor'
            WHEN 18 THEN 'Moore'
            WHEN 19 THEN 'Jackson'
            ELSE 'Martin'
        END
    END,
    PHONE_NUMBER = '+1-' ||
        LPAD(FLOOR(UNIFORM(200, 999, RANDOM())), 3, '0') || '-' ||
        LPAD(FLOOR(UNIFORM(100, 999, RANDOM())), 3, '0') || '-' ||
        LPAD(FLOOR(UNIFORM(1000, 9999, RANDOM())), 4, '0'),
    PHONE_COUNTRY_CODE = '+1'
WHERE EMAIL_NORMALIZED IS NULL;

-- ========================================================================
-- 3. DEVICE DATA POPULATION
-- ========================================================================
UPDATE TRANSACTIONS_ENRICHED
SET
    DEVICE_ID = 'DEV_' || LPAD(FLOOR(UNIFORM(100000, 999999, RANDOM())), 6, '0'),
    DEVICE_TYPE = CASE FLOOR(UNIFORM(1, 4, RANDOM()))
        WHEN 1 THEN 'mobile'
        WHEN 2 THEN 'desktop'
        ELSE 'tablet'
    END
WHERE DEVICE_ID IS NULL;

-- Update USER_AGENT, DEVICE_MODEL, and DEVICE_OS_VERSION based on device type
UPDATE TRANSACTIONS_ENRICHED
SET
    USER_AGENT = CASE DEVICE_TYPE
        WHEN 'mobile' THEN CASE FLOOR(UNIFORM(1, 5, RANDOM()))
            WHEN 1 THEN 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_6 like Mac OS X) AppleWebKit/605.1.15'
            WHEN 2 THEN 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_8 like Mac OS X) AppleWebKit/605.1.15'
            WHEN 3 THEN 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36'
            ELSE 'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36'
        END
        WHEN 'desktop' THEN CASE FLOOR(UNIFORM(1, 4, RANDOM()))
            WHEN 1 THEN 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            WHEN 2 THEN 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            ELSE 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15'
        END
        ELSE 'Mozilla/5.0 (iPad; CPU OS 15_6 like Mac OS X) AppleWebKit/605.1.15'
    END,
    DEVICE_MODEL = CASE DEVICE_TYPE
        WHEN 'mobile' THEN CASE FLOOR(UNIFORM(1, 5, RANDOM()))
            WHEN 1 THEN 'iPhone 13'
            WHEN 2 THEN 'iPhone 12'
            WHEN 3 THEN 'Samsung Galaxy S21'
            ELSE 'Google Pixel 6'
        END
        WHEN 'desktop' THEN CASE FLOOR(UNIFORM(1, 4, RANDOM()))
            WHEN 1 THEN 'Windows PC'
            WHEN 2 THEN 'MacBook Pro'
            ELSE 'iMac'
        END
        ELSE CASE FLOOR(UNIFORM(1, 3, RANDOM()))
            WHEN 1 THEN 'iPad Pro'
            ELSE 'Samsung Galaxy Tab'
        END
    END,
    DEVICE_OS_VERSION = CASE DEVICE_TYPE
        WHEN 'mobile' THEN CASE
            WHEN USER_AGENT LIKE '%iPhone%' THEN CASE FLOOR(UNIFORM(1, 4, RANDOM()))
                WHEN 1 THEN 'iOS 15.6'
                WHEN 2 THEN 'iOS 14.8'
                ELSE 'iOS 16.1'
            END
            ELSE CASE FLOOR(UNIFORM(1, 3, RANDOM()))
                WHEN 1 THEN 'Android 11'
                ELSE 'Android 12'
            END
        END
        WHEN 'desktop' THEN CASE
            WHEN USER_AGENT LIKE '%Windows%' THEN 'Windows 10'
            ELSE 'macOS 12.6'
        END
        ELSE 'iPadOS 15.6'
    END
WHERE USER_AGENT IS NULL;

-- ========================================================================
-- 4. RISK ASSESSMENT DATA POPULATION
-- ========================================================================
UPDATE TRANSACTIONS_ENRICHED
SET
    NSURE_FIRST_DECISION = CASE
        WHEN MODEL_SCORE > 0.8 THEN 'REJECTED'
        WHEN MODEL_SCORE > 0.5 THEN 'REVIEW'
        ELSE 'APPROVED'
    END,
    MAXMIND_RISK_SCORE = ROUND(
        GREATEST(0, LEAST(100,
            MODEL_SCORE * 80 + UNIFORM(-10, 10, RANDOM()) +
            CASE IP_COUNTRY_CODE
                WHEN 'RU' THEN 20
                WHEN 'CN' THEN 20
                WHEN 'PK' THEN 15
                WHEN 'NG' THEN 15
                WHEN 'VN' THEN 10
                ELSE 0
            END
        )), 2
    ),
    MAXMIND_IP_RISK_SCORE = ROUND(
        GREATEST(0, LEAST(100,
            MODEL_SCORE * 85 + UNIFORM(-15, 15, RANDOM()) +
            CASE IP_COUNTRY_CODE
                WHEN 'RU' THEN 25
                WHEN 'CN' THEN 25
                WHEN 'PK' THEN 20
                WHEN 'NG' THEN 20
                WHEN 'VN' THEN 15
                ELSE 0
            END
        )), 2
    )
WHERE NSURE_FIRST_DECISION IS NULL;

-- ========================================================================
-- 5. CARD DATA POPULATION
-- ========================================================================
UPDATE TRANSACTIONS_ENRICHED
SET
    CARD_BRAND = CASE LEFT(BIN, 1)
        WHEN '4' THEN 'VISA'
        WHEN '5' THEN 'MASTERCARD'
        WHEN '3' THEN 'AMEX'
        ELSE 'VISA'
    END,
    CARD_TYPE = CASE LEFT(BIN, 1)
        WHEN '3' THEN 'CREDIT'
        WHEN UNIFORM(0, 1, RANDOM()) < 0.8 THEN 'CREDIT'
        ELSE 'DEBIT'
    END,
    CARD_ISSUER = CASE LEFT(BIN, 1)
        WHEN '4' THEN CASE FLOOR(UNIFORM(1, 5, RANDOM()))
            WHEN 1 THEN 'Chase'
            WHEN 2 THEN 'Bank of America'
            WHEN 3 THEN 'Wells Fargo'
            ELSE 'Citi'
        END
        WHEN '5' THEN CASE FLOOR(UNIFORM(1, 5, RANDOM()))
            WHEN 1 THEN 'Capital One'
            WHEN 2 THEN 'Discover'
            WHEN 3 THEN 'HSBC'
            ELSE 'Barclays'
        END
        WHEN '3' THEN 'American Express'
        ELSE 'JPMorgan Chase'
    END,
    BIN_COUNTRY_CODE = CASE
        WHEN UNIFORM(0, 1, RANDOM()) < 0.75 THEN 'US'
        WHEN UNIFORM(0, 1, RANDOM()) < 0.15 THEN IP_COUNTRY_CODE
        ELSE CASE FLOOR(UNIFORM(1, 6, RANDOM()))
            WHEN 1 THEN 'CA'
            WHEN 2 THEN 'GB'
            WHEN 3 THEN 'DE'
            WHEN 4 THEN 'FR'
            ELSE 'AU'
        END
    END
WHERE CARD_BRAND IS NULL;

-- ========================================================================
-- 6. TEMPORAL DATA POPULATION
-- ========================================================================
UPDATE TRANSACTIONS_ENRICHED
SET
    TX_RECEIVED_DATETIME = DATEADD(SECOND, UNIFORM(0.1, 5.0, RANDOM()), TX_DATETIME),
    TX_TIMESTAMP_MS = DATE_PART(EPOCH_SECOND, TX_DATETIME) * 1000 + FLOOR(UNIFORM(0, 999, RANDOM()))
WHERE TX_RECEIVED_DATETIME IS NULL;

-- ========================================================================
-- 7. DISPUTE AND ALERT DATA POPULATION
-- ========================================================================
UPDATE TRANSACTIONS_ENRICHED
SET
    DISPUTES = CASE
        WHEN IS_FRAUD_TX = 1 AND UNIFORM(0, 1, RANDOM()) < 0.15 THEN 1
        WHEN IS_FRAUD_TX = 0 AND UNIFORM(0, 1, RANDOM()) < 0.02 THEN 1
        ELSE 0
    END,
    FRAUD_ALERTS = CASE
        WHEN MODEL_SCORE > 0.7 AND UNIFORM(0, 1, RANDOM()) < 0.4 THEN 1
        WHEN MODEL_SCORE > 0.5 AND UNIFORM(0, 1, RANDOM()) < 0.2 THEN 1
        WHEN MODEL_SCORE > 0.3 AND UNIFORM(0, 1, RANDOM()) < 0.1 THEN 1
        ELSE 0
    END
WHERE DISPUTES IS NULL;

-- Update counts and timestamps
UPDATE TRANSACTIONS_ENRICHED
SET
    COUNT_DISPUTES = DISPUTES,
    COUNT_FRAUD_ALERTS = FRAUD_ALERTS,
    LAST_DISPUTE_DATETIME = CASE
        WHEN DISPUTES = 1 THEN DATEADD(DAY, UNIFORM(1, 30, RANDOM()), TX_DATETIME)
        ELSE NULL
    END,
    LAST_FRAUD_ALERT_DATETIME = CASE
        WHEN FRAUD_ALERTS = 1 THEN DATEADD(HOUR, UNIFORM(1, 72, RANDOM()), TX_DATETIME)
        ELSE NULL
    END
WHERE COUNT_DISPUTES IS NULL;

-- ========================================================================
-- 8. BUSINESS DATA POPULATION
-- ========================================================================
UPDATE TRANSACTIONS_ENRICHED
SET
    STORE_ID = 'STORE_' || LPAD(FLOOR(UNIFORM(1000, 9999, RANDOM())), 4, '0'),
    MERCHANT_NAME = CASE FLOOR(UNIFORM(1, 9, RANDOM()))
        WHEN 1 THEN 'Amazon'
        WHEN 2 THEN 'Shopify Store'
        WHEN 3 THEN 'Apple'
        WHEN 4 THEN 'Google'
        WHEN 5 THEN 'Netflix'
        WHEN 6 THEN 'Uber'
        WHEN 7 THEN 'DoorDash'
        ELSE 'Microsoft'
    END,
    PARTNER_NAME = CASE MERCHANT_NAME
        WHEN 'Amazon' THEN 'E-commerce Platform'
        WHEN 'Shopify Store' THEN 'Retail Partner'
        WHEN 'Apple' THEN 'Technology'
        WHEN 'Google' THEN 'Digital Services'
        WHEN 'Netflix' THEN 'Streaming Service'
        WHEN 'Uber' THEN 'Transportation'
        WHEN 'DoorDash' THEN 'Food Delivery'
        ELSE 'Software'
    END,
    APP_ID = 'APP_' || LPAD(FLOOR(UNIFORM(100, 999, RANDOM())), 3, '0')
WHERE STORE_ID IS NULL;

-- ========================================================================
-- 9. CART AND PRODUCT DATA POPULATION
-- ========================================================================
UPDATE TRANSACTIONS_ENRICHED
SET
    PRODUCT_TYPE = CASE FLOOR(UNIFORM(1, 5, RANDOM()))
        WHEN 1 THEN 'digital'
        WHEN 2 THEN 'physical'
        WHEN 3 THEN 'service'
        ELSE 'subscription'
    END
WHERE PRODUCT_TYPE IS NULL;

-- Update related cart data
UPDATE TRANSACTIONS_ENRICHED
SET
    CART = '{"items": ' || FLOOR(UNIFORM(1, 5, RANDOM())) ||
           ', "total": ' || PAID_AMOUNT_VALUE_IN_CURRENCY ||
           ', "currency": "USD"}',
    CART_USD = PAID_AMOUNT_VALUE_IN_CURRENCY,
    GMV = ROUND(PAID_AMOUNT_VALUE_IN_CURRENCY + UNIFORM(-10, 50, RANDOM()), 2),
    IS_DIGITAL = CASE PRODUCT_TYPE
        WHEN 'digital' THEN 1
        WHEN 'service' THEN 1
        WHEN 'subscription' THEN 1
        ELSE 0
    END
WHERE CART IS NULL;

-- ========================================================================
-- 10. NETWORK DATA POPULATION
-- ========================================================================
UPDATE TRANSACTIONS_ENRICHED
SET
    ISP = CASE IP_COUNTRY_CODE
        WHEN 'US' THEN CASE FLOOR(UNIFORM(1, 6, RANDOM()))
            WHEN 1 THEN 'Comcast'
            WHEN 2 THEN 'Verizon'
            WHEN 3 THEN 'AT&T'
            WHEN 4 THEN 'Charter'
            ELSE 'Cox Communications'
        END
        WHEN 'CA' THEN CASE FLOOR(UNIFORM(1, 5, RANDOM()))
            WHEN 1 THEN 'Rogers'
            WHEN 2 THEN 'Bell Canada'
            WHEN 3 THEN 'Telus'
            ELSE 'Shaw Communications'
        END
        WHEN 'GB' THEN CASE FLOOR(UNIFORM(1, 6, RANDOM()))
            WHEN 1 THEN 'BT'
            WHEN 2 THEN 'Virgin Media'
            WHEN 3 THEN 'Sky'
            WHEN 4 THEN 'TalkTalk'
            ELSE 'Plusnet'
        END
        WHEN 'DE' THEN CASE FLOOR(UNIFORM(1, 5, RANDOM()))
            WHEN 1 THEN 'Deutsche Telekom'
            WHEN 2 THEN 'Vodafone'
            WHEN 3 THEN 'O2'
            ELSE '1&1'
        END
        WHEN 'FR' THEN CASE FLOOR(UNIFORM(1, 5, RANDOM()))
            WHEN 1 THEN 'Orange'
            WHEN 2 THEN 'SFR'
            WHEN 3 THEN 'Bouygues'
            ELSE 'Free'
        END
        WHEN 'AU' THEN CASE FLOOR(UNIFORM(1, 5, RANDOM()))
            WHEN 1 THEN 'Telstra'
            WHEN 2 THEN 'Optus'
            WHEN 3 THEN 'TPG'
            ELSE 'Vodafone Australia'
        END
        WHEN 'RU' THEN CASE FLOOR(UNIFORM(1, 5, RANDOM()))
            WHEN 1 THEN 'Rostelecom'
            WHEN 2 THEN 'MTS'
            WHEN 3 THEN 'Beeline'
            ELSE 'Tele2'
        END
        WHEN 'CN' THEN CASE FLOOR(UNIFORM(1, 4, RANDOM()))
            WHEN 1 THEN 'China Telecom'
            WHEN 2 THEN 'China Unicom'
            ELSE 'China Mobile'
        END
        ELSE 'Global ISP'
    END,
    ASN = CASE IP_COUNTRY_CODE
        WHEN 'US' THEN FLOOR(UNIFORM(7000, 15000, RANDOM()))
        WHEN 'CA' THEN FLOOR(UNIFORM(6000, 8000, RANDOM()))
        WHEN 'GB' THEN FLOOR(UNIFORM(2000, 5000, RANDOM()))
        WHEN 'DE' THEN FLOOR(UNIFORM(3000, 6000, RANDOM()))
        WHEN 'FR' THEN FLOOR(UNIFORM(3000, 6000, RANDOM()))
        WHEN 'AU' THEN FLOOR(UNIFORM(4000, 7000, RANDOM()))
        WHEN 'RU' THEN FLOOR(UNIFORM(8000, 12000, RANDOM()))
        WHEN 'CN' THEN FLOOR(UNIFORM(9000, 14000, RANDOM()))
        ELSE FLOOR(UNIFORM(1000, 20000, RANDOM()))
    END
WHERE ISP IS NULL;

-- ========================================================================
-- VERIFICATION QUERIES
-- ========================================================================

-- Check completion status
SELECT
    'Processing Fees' as category,
    COUNT(*) as total_records,
    SUM(CASE WHEN PROCESSING_FEE_VALUE_IN_CURRENCY IS NOT NULL THEN 1 ELSE 0 END) as populated,
    ROUND(SUM(CASE WHEN PROCESSING_FEE_VALUE_IN_CURRENCY IS NOT NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as completion_pct
FROM TRANSACTIONS_ENRICHED

UNION ALL

SELECT
    'Personal Data' as category,
    COUNT(*) as total_records,
    SUM(CASE WHEN FIRST_NAME IS NOT NULL THEN 1 ELSE 0 END) as populated,
    ROUND(SUM(CASE WHEN FIRST_NAME IS NOT NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as completion_pct
FROM TRANSACTIONS_ENRICHED

UNION ALL

SELECT
    'Device Data' as category,
    COUNT(*) as total_records,
    SUM(CASE WHEN DEVICE_ID IS NOT NULL THEN 1 ELSE 0 END) as populated,
    ROUND(SUM(CASE WHEN DEVICE_ID IS NOT NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as completion_pct
FROM TRANSACTIONS_ENRICHED

UNION ALL

SELECT
    'Risk Data' as category,
    COUNT(*) as total_records,
    SUM(CASE WHEN MAXMIND_RISK_SCORE IS NOT NULL THEN 1 ELSE 0 END) as populated,
    ROUND(SUM(CASE WHEN MAXMIND_RISK_SCORE IS NOT NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as completion_pct
FROM TRANSACTIONS_ENRICHED

UNION ALL

SELECT
    'Card Data' as category,
    COUNT(*) as total_records,
    SUM(CASE WHEN CARD_BRAND IS NOT NULL THEN 1 ELSE 0 END) as populated,
    ROUND(SUM(CASE WHEN CARD_BRAND IS NOT NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as completion_pct
FROM TRANSACTIONS_ENRICHED

ORDER BY category;

-- Final summary
SELECT
    COUNT(*) as total_records,
    COUNT(PROCESSING_FEE_VALUE_IN_CURRENCY) as processing_fees_populated,
    COUNT(FIRST_NAME) as personal_data_populated,
    COUNT(DEVICE_ID) as device_data_populated,
    COUNT(MAXMIND_RISK_SCORE) as risk_data_populated,
    COUNT(CARD_BRAND) as card_data_populated,
    COUNT(ISP) as network_data_populated
FROM TRANSACTIONS_ENRICHED;