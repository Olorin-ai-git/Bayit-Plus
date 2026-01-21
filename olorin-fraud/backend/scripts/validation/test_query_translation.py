#!/usr/bin/env python3
"""
Test query translation from Snowflake to PostgreSQL syntax.
"""

from app.service.agent.tools.database_tool.query_translator import QueryTranslator

# Test query with Snowflake syntax (3-part table name and date functions)
snowflake_query = """
SELECT *
FROM fraud_analytics.public.transactions_enriched
WHERE TX_DATETIME >= DATEADD(hour, -24, CURRENT_TIMESTAMP())
"""

print("=" * 80)
print("Query Translation Test")
print("=" * 80)

print("\n📝 Original Snowflake Query:")
print(snowflake_query)

translator = QueryTranslator()
translated = translator.translate(snowflake_query)

print("\n✅ Translated PostgreSQL Query:")
print(translated)

print("\n📊 Translation Stats:")
stats = translator.get_stats()
if stats["last_translation"]:
    print(f"   Rules applied: {stats['last_translation']['rules_applied']}")
    print(f"   Original length: {stats['last_translation']['original_length']}")
    print(f"   Translated length: {stats['last_translation']['translated_length']}")
else:
    print("   No translation stats available")

print("\n" + "=" * 80)
