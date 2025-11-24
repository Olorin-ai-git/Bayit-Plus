#!/usr/bin/env python3
"""
Minimal direct Snowflake query - uses only snowflake-connector-python.
No app dependencies.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load .env
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(env_path, override=True)

try:
    import snowflake.connector
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.backends import default_backend
except ImportError as e:
    print(f"❌ Missing dependency: {e}")
    print("   Install with: poetry add snowflake-connector-python cryptography")
    sys.exit(1)

# Get config
database = os.getenv('SNOWFLAKE_DATABASE', 'DBT')
schema = os.getenv('SNOWFLAKE_SCHEMA', 'DBT_PROD')
table = os.getenv('SNOWFLAKE_TRANSACTIONS_TABLE', 'TXS')
account = os.getenv('SNOWFLAKE_ACCOUNT', '').replace('https://', '').replace('.snowflakecomputing.com', '')
user = os.getenv('SNOWFLAKE_USER', '')
warehouse = os.getenv('SNOWFLAKE_WAREHOUSE', '')
role = os.getenv('SNOWFLAKE_ROLE', 'PUBLIC')
auth_method = os.getenv('SNOWFLAKE_AUTH_METHOD', 'private_key').lower()

full_table_name = f"{database}.{schema}.{table}"
ip_address = "38.252.156.103"

print("\n" + "="*80)
print("🔍 DIRECT SNOWFLAKE QUERY - IP: 38.252.156.103")
print("="*80)
print(f"\n📋 Configuration:")
print(f"   Account: {account}")
print(f"   User: {user}")
print(f"   Table: {full_table_name}")
print(f"   Auth: {auth_method}")

# Build queries
count_query = f"SELECT COUNT(*) as total_count FROM {full_table_name} WHERE IP = '{ip_address}'"

query = f"""
SELECT
    TX_ID_KEY,
    EMAIL,
    IP,
    PAID_AMOUNT_VALUE_IN_CURRENCY,
    PAID_AMOUNT_CURRENCY,
    TX_DATETIME,
    PAYMENT_METHOD,
    CARD_BRAND,
    DEVICE_ID,
    USER_AGENT,
    IP_COUNTRY_CODE,
    IS_FRAUD_TX,
    MODEL_SCORE,
    NSURE_LAST_DECISION as MODEL_DECISION
FROM {full_table_name}
WHERE IP = '{ip_address}'
ORDER BY TX_DATETIME DESC
LIMIT 2000
"""

print(f"\n🔍 Query:")
print("-"*80)
print(query.strip())
print("-"*80)

# Connect
print(f"\n🔗 Connecting to Snowflake...")
conn_params = {
    'account': account,
    'user': user,
    'warehouse': warehouse,
    'database': database,
    'schema': schema,
    'role': role,
}

if auth_method == 'private_key':
    private_key_path = os.getenv('SNOWFLAKE_PRIVATE_KEY_PATH', 'rsa_key.p8')
    key_path = Path(private_key_path)
    if not key_path.is_absolute():
        key_path = Path(__file__).parent.parent.parent.parent / private_key_path
    
    print(f"   Loading private key: {key_path}")
    with open(key_path, 'rb') as key_file:
        p_key = serialization.load_pem_private_key(
            key_file.read(),
            password=None,
            backend=default_backend()
        )
    
    pkb = p_key.private_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    
    conn_params['private_key'] = pkb
    conn_params['authenticator'] = 'SNOWFLAKE_JWT'
else:
    conn_params['password'] = os.getenv('SNOWFLAKE_PASSWORD', '')

connection = snowflake.connector.connect(**conn_params)
cursor = connection.cursor()

print("   ✅ Connected!")

# Count
print(f"\n📊 Running count query...")
cursor.execute(count_query)
count_result = cursor.fetchone()
total_count = count_result[0] if count_result else 0
print(f"   ✅ Total: {total_count}")

# Main query
print(f"\n📊 Running main query (LIMIT 2000)...")
cursor.execute(query)
columns = [desc[0] for desc in cursor.description]
transactions = cursor.fetchall()

print(f"   ✅ Returned: {len(transactions)} transactions")

if transactions:
    print(f"\n📋 First 5 Transactions:")
    print("="*80)
    for i, tx in enumerate(transactions[:5], 1):
        tx_dict = dict(zip(columns, tx))
        print(f"\n   Transaction {i}:")
        print(f"      TX_ID_KEY: {tx_dict.get('TX_ID_KEY')}")
        print(f"      EMAIL: {tx_dict.get('EMAIL')}")
        print(f"      IP: {tx_dict.get('IP')}")
        print(f"      TX_DATETIME: {tx_dict.get('TX_DATETIME')}")
        print(f"      AMOUNT: {tx_dict.get('PAID_AMOUNT_VALUE_IN_CURRENCY')} {tx_dict.get('PAID_AMOUNT_CURRENCY')}")
        print(f"      MODEL_SCORE: {tx_dict.get('MODEL_SCORE')}")
        print(f"      IS_FRAUD_TX: {tx_dict.get('IS_FRAUD_TX')}")
        print(f"      DECISION: {tx_dict.get('MODEL_DECISION')}")
    
    if len(transactions) > 5:
        print(f"\n   ... and {len(transactions) - 5} more transactions")

cursor.close()
connection.close()

print(f"\n" + "="*80)
print(f"✅ Complete! Total: {total_count} | Returned: {len(transactions)}")
print("="*80)

