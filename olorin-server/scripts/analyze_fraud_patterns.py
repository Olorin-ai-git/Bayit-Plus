#!/usr/bin/env python3
"""
Fraud Pattern Analyzer
Compares fraud entities vs clean entities to find distinguishing patterns
"""

import sys
import os
from datetime import datetime, timedelta
from pathlib import Path
import json

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

try:
    import snowflake.connector
    from statistics import mean, median, stdev
except ImportError as e:
    print(f"ERROR: {e}")
    sys.exit(1)

# Connection details
account = os.getenv('SNOWFLAKE_ACCOUNT', '').replace('.snowflakecomputing.com', '').replace('https://', '')
user = os.getenv('SNOWFLAKE_USER')
database = 'DBT'
schema = 'DBT_PROD'
table = 'TXS'
warehouse = os.getenv('SNOWFLAKE_WAREHOUSE', 'manual_review_agent_wh')
private_key_path = os.getenv('SNOWFLAKE_PRIVATE_KEY_PATH', '/Users/olorin/Documents/rsa_key.p8')

print(f"")
print(f"╔{'═'*78}╗")
print(f"║{'FRAUD PATTERN ANALYZER':^78}║")
print(f"╚{'═'*78}╝")
print(f"")

# Connect to Snowflake
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization

with open(private_key_path, "rb") as key_file:
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

conn = snowflake.connector.connect(
    user=user,
    account=account,
    private_key=pkb,
    warehouse=warehouse,
    database=database,
    schema=schema
)

print(f"✅ Connected to Snowflake")
print(f"")

# Define time window (6 months ago, 24H)
now = datetime.now()
window_end = now - timedelta(days=180)
window_start = window_end - timedelta(hours=24)

print(f"📅 Analysis Window: {window_start.date()} to {window_end.date()}")
print(f"")

# Known fraud entities
fraud_entities = [
    'steviefonseca999@gmail.com',
    'isaiah.pankey@hercrentals.com',
    'preetithakur3128@gmail.com',
    'martin1zareba@gmail.com',
    'trailer.snooty.8q@icloud.com',
    'Cdloomis52@yahoo.com',
    'geravillay@gmail.com',
    'phoebiezschomler0709@gmail.com',
    'a.huynh73@outlook.com',
    'mccrorymartin271@gmail.com'
]

# Entities selected by analyzer (clean)
clean_entities = [
    'veronic19781219@gmail.com',
    'halfrhythm123@gmail.com',
    'vargaeditt559@gmail.com',
    'tamasdaniel2007@gmail.com',
    'fehervariistvanne0909@gmail.com'
]

def analyze_entity_group(entity_list, label):
    """Analyze patterns for a group of entities"""
    
    entity_str = "', '".join(entity_list)
    
    query = f"""
    SELECT 
        EMAIL,
        COUNT(*) as tx_count,
        SUM(CASE WHEN IS_FRAUD_TX = 1 THEN 1 ELSE 0 END) as fraud_count,
        
        -- Transaction amounts
        AVG(PAID_AMOUNT_VALUE_IN_CURRENCY) as avg_amount,
        MEDIAN(PAID_AMOUNT_VALUE_IN_CURRENCY) as median_amount,
        MIN(PAID_AMOUNT_VALUE_IN_CURRENCY) as min_amount,
        MAX(PAID_AMOUNT_VALUE_IN_CURRENCY) as max_amount,
        STDDEV(PAID_AMOUNT_VALUE_IN_CURRENCY) as stddev_amount,
        SUM(PAID_AMOUNT_VALUE_IN_CURRENCY) as total_amount,
        
        -- MODEL_SCORE analysis
        AVG(MODEL_SCORE) as avg_model_score,
        MEDIAN(MODEL_SCORE) as median_model_score,
        MIN(MODEL_SCORE) as min_model_score,
        MAX(MODEL_SCORE) as max_model_score,
        STDDEV(MODEL_SCORE) as stddev_model_score,
        
        -- Risk weighted value (analyzer's metric)
        SUM(MODEL_SCORE * PAID_AMOUNT_VALUE_IN_CURRENCY) as total_risk_weighted,
        AVG(MODEL_SCORE * PAID_AMOUNT_VALUE_IN_CURRENCY) as avg_risk_weighted,
        
        -- Temporal patterns
        MIN(TX_DATETIME) as first_tx,
        MAX(TX_DATETIME) as last_tx,
        DATEDIFF(minute, MIN(TX_DATETIME), MAX(TX_DATETIME)) as time_span_minutes,
        
        -- Velocity (txs per hour)
        CASE 
            WHEN DATEDIFF(minute, MIN(TX_DATETIME), MAX(TX_DATETIME)) > 0 
            THEN COUNT(*) / (DATEDIFF(minute, MIN(TX_DATETIME), MAX(TX_DATETIME)) / 60.0)
            ELSE COUNT(*)
        END as tx_velocity_per_hour,
        
        -- Device/Location diversity
        COUNT(DISTINCT DEVICE_ID) as unique_devices,
        COUNT(DISTINCT IP) as unique_ips,
        COUNT(DISTINCT IP_COUNTRY_CODE) as unique_countries,
        
        -- Merchant diversity
        COUNT(DISTINCT MERCHANT_NAME) as unique_merchants,
        
        -- Time of day pattern
        AVG(HOUR(TX_DATETIME)) as avg_hour_of_day,
        
        -- Approval/rejection patterns
        SUM(CASE WHEN UPPER(NSURE_LAST_DECISION) = 'APPROVED' THEN 1 ELSE 0 END) as approved_count,
        SUM(CASE WHEN UPPER(NSURE_LAST_DECISION) = 'REJECTED' THEN 1 ELSE 0 END) as rejected_count
        
    FROM {database}.{schema}.{table}
    WHERE TX_DATETIME >= '{window_start.isoformat()}'
      AND TX_DATETIME < '{window_end.isoformat()}'
      AND EMAIL IN ('{entity_str}')
    GROUP BY EMAIL
    ORDER BY fraud_count DESC, tx_count DESC
    """
    
    cursor = conn.cursor()
    cursor.execute(query)
    results = cursor.fetchall()
    columns = [desc[0] for desc in cursor.description]
    cursor.close()
    
    # Convert to list of dicts
    entities_data = []
    for row in results:
        entity_dict = dict(zip(columns, row))
        entities_data.append(entity_dict)
    
    return entities_data

# Analyze both groups
print(f"🔍 Analyzing {len(fraud_entities)} fraud entities...")
fraud_data = analyze_entity_group(fraud_entities, "FRAUD")

print(f"🔍 Analyzing {len(clean_entities)} clean entities...")
clean_data = analyze_entity_group(clean_entities, "CLEAN")

print(f"")
print(f"{'='*80}")
print(f"PATTERN ANALYSIS RESULTS")
print(f"{'='*80}")
print(f"")

# Helper function to compute stats
def compute_stats(data, field):
    values = [d[field] for d in data if d.get(field) is not None]
    if not values:
        return None
    
    return {
        'mean': mean(values),
        'median': median(values),
        'min': min(values),
        'max': max(values),
        'stddev': stdev(values) if len(values) > 1 else 0
    }

# Compare patterns
patterns = {
    'transaction_count': 'TX_COUNT',
    'avg_amount': 'AVG_AMOUNT',
    'total_amount': 'TOTAL_AMOUNT',
    'avg_model_score': 'AVG_MODEL_SCORE',
    'median_model_score': 'MEDIAN_MODEL_SCORE',
    'max_model_score': 'MAX_MODEL_SCORE',
    'avg_risk_weighted': 'AVG_RISK_WEIGHTED',
    'total_risk_weighted': 'TOTAL_RISK_WEIGHTED',
    'tx_velocity_per_hour': 'TX_VELOCITY_PER_HOUR',
    'unique_devices': 'UNIQUE_DEVICES',
    'unique_ips': 'UNIQUE_IPS',
    'unique_merchants': 'UNIQUE_MERCHANTS',
    'unique_countries': 'UNIQUE_COUNTRIES'
}

print(f"")
print(f"╔{'═'*78}╗")
print(f"║{'FRAUD vs CLEAN ENTITY PATTERNS':^78}║")
print(f"╚{'═'*78}╝")
print(f"")

comparison_results = {}

for pattern_name, field in patterns.items():
    fraud_stats = compute_stats(fraud_data, field)
    clean_stats = compute_stats(clean_data, field)
    
    if fraud_stats and clean_stats:
        fraud_mean = fraud_stats['mean']
        clean_mean = clean_stats['mean']
        
        if clean_mean > 0:
            diff_pct = ((fraud_mean - clean_mean) / clean_mean) * 100
        else:
            diff_pct = 0
        
        comparison_results[pattern_name] = {
            'fraud': fraud_stats,
            'clean': clean_stats,
            'diff_pct': diff_pct
        }
        
        indicator = "🔴" if abs(diff_pct) > 30 else "🟡" if abs(diff_pct) > 10 else "🟢"
        
        print(f"{indicator} {pattern_name.upper().replace('_', ' ')}:")
        print(f"   Fraud: mean={fraud_mean:.2f}, median={fraud_stats['median']:.2f}, min={fraud_stats['min']:.2f}, max={fraud_stats['max']:.2f}")
        print(f"   Clean: mean={clean_mean:.2f}, median={clean_stats['median']:.2f}, min={clean_stats['min']:.2f}, max={clean_stats['max']:.2f}")
        print(f"   Difference: {diff_pct:+.1f}% {'(FRAUD HIGHER)' if diff_pct > 0 else '(CLEAN HIGHER)'}")
        print(f"")

# Detailed entity comparison
print(f"")
print(f"╔{'═'*78}╗")
print(f"║{'TOP FRAUD ENTITIES - DETAILED VIEW':^78}║")
print(f"╚{'═'*78}╝")
print(f"")

for i, entity in enumerate(fraud_data[:5], 1):
    print(f"{i}. {entity['EMAIL']}")
    print(f"   Transactions: {entity['TX_COUNT']} ({entity['FRAUD_COUNT']} fraud)")
    print(f"   Amounts: avg=${entity['AVG_AMOUNT']:.2f}, total=${entity['TOTAL_AMOUNT']:.2f}")
    print(f"   MODEL_SCORE: avg={entity['AVG_MODEL_SCORE']:.3f}, max={entity['MAX_MODEL_SCORE']:.3f}")
    print(f"   Risk Weighted: total={entity['TOTAL_RISK_WEIGHTED']:.2f}, avg={entity['AVG_RISK_WEIGHTED']:.2f}")
    print(f"   Velocity: {entity['TX_VELOCITY_PER_HOUR']:.2f} txs/hour")
    print(f"   Diversity: {entity['UNIQUE_DEVICES']} devices, {entity['UNIQUE_IPS']} IPs, {entity['UNIQUE_MERCHANTS']} merchants")
    print(f"")

print(f"")
print(f"╔{'═'*78}╗")
print(f"║{'TOP CLEAN ENTITIES - DETAILED VIEW':^78}║")
print(f"╚{'═'*78}╝")
print(f"")

for i, entity in enumerate(clean_data[:5], 1):
    print(f"{i}. {entity['EMAIL']}")
    print(f"   Transactions: {entity['TX_COUNT']} ({entity['FRAUD_COUNT']} fraud)")
    print(f"   Amounts: avg=${entity['AVG_AMOUNT']:.2f}, total=${entity['TOTAL_AMOUNT']:.2f}")
    print(f"   MODEL_SCORE: avg={entity['AVG_MODEL_SCORE']:.3f}, max={entity['MAX_MODEL_SCORE']:.3f}")
    print(f"   Risk Weighted: total={entity['TOTAL_RISK_WEIGHTED']:.2f}, avg={entity['AVG_RISK_WEIGHTED']:.2f}")
    print(f"   Velocity: {entity['TX_VELOCITY_PER_HOUR']:.2f} txs/hour")
    print(f"   Diversity: {entity['UNIQUE_DEVICES']} devices, {entity['UNIQUE_IPS']} IPs, {entity['UNIQUE_MERCHANTS']} merchants")
    print(f"")

# Find the MOST distinguishing patterns
print(f"")
print(f"╔{'═'*78}╗")
print(f"║{'🎯 MOST DISTINGUISHING PATTERNS (>30% difference)':^78}║")
print(f"╚{'═'*78}╝")
print(f"")

distinguishing = [(k, v['diff_pct']) for k, v in comparison_results.items() if abs(v['diff_pct']) > 30]
distinguishing.sort(key=lambda x: abs(x[1]), reverse=True)

for pattern, diff in distinguishing:
    direction = "HIGHER in fraud" if diff > 0 else "LOWER in fraud"
    print(f"  • {pattern.upper().replace('_', ' ')}: {diff:+.1f}% ({direction})")

# Generate recommended analyzer query
print(f"")
print(f"╔{'═'*78}╗")
print(f"║{'💡 RECOMMENDED ANALYZER MODIFICATIONS':^78}║")
print(f"╚{'═'*78}╝")
print(f"")

print(f"Based on pattern analysis, consider these ranking strategies:")
print(f"")

# Strategy 1: Pure MODEL_SCORE
fraud_avg_model = comparison_results.get('avg_model_score', {}).get('fraud', {}).get('mean', 0)
clean_avg_model = comparison_results.get('avg_model_score', {}).get('clean', {}).get('mean', 0)
print(f"1. PURE MODEL_SCORE (if fraud has higher avg score):")
print(f"   ORDER BY AVG(MODEL_SCORE) DESC")
print(f"   Fraud avg: {fraud_avg_model:.3f}, Clean avg: {clean_avg_model:.3f}")
print(f"")

# Strategy 2: Velocity-based
fraud_velocity = comparison_results.get('tx_velocity_per_hour', {}).get('fraud', {}).get('mean', 0)
clean_velocity = comparison_results.get('tx_velocity_per_hour', {}).get('clean', {}).get('mean', 0)
print(f"2. VELOCITY-BASED (transaction rate):")
print(f"   ORDER BY (COUNT(*) / time_span_hours) DESC")
print(f"   Fraud velocity: {fraud_velocity:.2f} txs/hr, Clean: {clean_velocity:.2f} txs/hr")
print(f"")

# Strategy 3: Weighted combination
print(f"3. WEIGHTED COMBINATION:")
print(f"   ORDER BY (")
print(f"     AVG(MODEL_SCORE) * 0.4 +")
print(f"     (COUNT(*) / NULLIF(time_span_hours, 0)) * 0.3 +")
print(f"     COUNT(DISTINCT DEVICE_ID) * 0.2 +")
print(f"     (COUNT(*) / NULLIF(total_amount, 0)) * 0.1")
print(f"   ) DESC")
print(f"")

# Save detailed results
output_file = 'fraud_pattern_analysis.json'
with open(output_file, 'w') as f:
    json.dump({
        'fraud_entities': fraud_data,
        'clean_entities': clean_data,
        'comparison': comparison_results,
        'distinguishing_patterns': distinguishing,
        'window': {
            'start': window_start.isoformat(),
            'end': window_end.isoformat()
        }
    }, f, indent=2, default=str)

print(f"")
print(f"📄 Detailed analysis saved to: {output_file}")

conn.close()
print(f"")
print(f"✅ Analysis complete!")
print(f"")

