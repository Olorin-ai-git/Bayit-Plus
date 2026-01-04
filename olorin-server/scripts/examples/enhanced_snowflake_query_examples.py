#!/usr/bin/env python3
"""
Enhanced Snowflake Query Examples

Demonstrates the improved Snowflake query construction with comprehensive
evidence field collection for fraud investigations.
"""

import asyncio
import os
import sys
from typing import Any, Dict

# Add the project root to the path
sys.path.append(os.path.join(os.path.dirname(__file__), "../.."))

from app.service.agent.tools.snowflake_tool.query_builder import (
    SnowflakeQueryBuilder,
    get_recommended_query_for_entity,
)
from app.service.agent.tools.snowflake_tool.schema_constants import (
    build_safe_select_columns,
)
from app.service.agent.tools.snowflake_tool.snowflake_tool import (
    PRIORITY_EVIDENCE_FIELDS,
    REAL_COLUMNS,
    SnowflakeQueryTool,
)


def demonstrate_field_improvements():
    """Demonstrate the improved field coverage."""
    print("🔍 ENHANCED SNOWFLAKE QUERY IMPROVEMENTS")
    print("=" * 60)

    print(f"\n📊 EVIDENCE FIELD COVERAGE:")
    print(f"   Total available evidence fields: {len(REAL_COLUMNS)}")
    print(f"   Priority fields for fast queries: {len(PRIORITY_EVIDENCE_FIELDS)}")

    # Show field categories
    device_fields = [f for f in REAL_COLUMNS if "DEVICE" in f or f == "USER_AGENT"]
    risk_fields = [
        f
        for f in REAL_COLUMNS
        if any(keyword in f for keyword in ["SCORE", "FRAUD", "RISK"])
    ]
    payment_fields = [
        f
        for f in REAL_COLUMNS
        if any(keyword in f for keyword in ["CARD", "BIN", "PAYMENT"])
    ]
    user_fields = [
        f
        for f in REAL_COLUMNS
        if any(keyword in f for keyword in ["USER", "NAME", "EMAIL", "PHONE"])
    ]

    print(f"\n🎯 EVIDENCE CATEGORIES:")
    print(f"   Device Analysis: {len(device_fields)} fields")
    print(f"   Risk Assessment: {len(risk_fields)} fields")
    print(f"   Payment Analysis: {len(payment_fields)} fields")
    print(f"   User Identity: {len(user_fields)} fields")

    # Show some key fields
    print(f"\n🔑 KEY DEVICE FIELDS:")
    for field in device_fields[:5]:
        print(f"   • {field}")

    print(f"\n🚨 KEY RISK FIELDS:")
    for field in risk_fields[:5]:
        print(f"   • {field}")


def demonstrate_query_builder():
    """Demonstrate the comprehensive query builder."""
    print(f"\n🏗️ COMPREHENSIVE QUERY BUILDER")
    print("=" * 60)

    # Example 1: IP Investigation
    print(f"\n📍 IP INVESTIGATION EXAMPLE:")
    ip_query_info = SnowflakeQueryBuilder.build_investigation_query(
        entity_type="IP",
        entity_id="192.168.1.100",
        investigation_focus="comprehensive",
        date_range_days=7,
    )

    print(f"   Entity: IP = 192.168.1.100")
    print(f"   Focus: Comprehensive evidence collection")
    print(f"   Fields included: {ip_query_info['metadata']['field_count']}")
    print(
        f"   Evidence score: {ip_query_info['validation']['evidence_coverage_score']}"
    )
    print(
        f"   Performance: {ip_query_info['metadata']['performance_estimate']['performance_tier']}"
    )

    # Show part of the query
    query_preview = ip_query_info["query"][:200] + "..."
    print(f"   Query preview: {query_preview}")

    # Example 2: Device-Focused Investigation
    print(f"\n📱 DEVICE-FOCUSED INVESTIGATION:")
    device_query_info = SnowflakeQueryBuilder.build_investigation_query(
        entity_type="DEVICE_ID",
        entity_id="mobile_device_abc123",
        investigation_focus="device_focus",
        date_range_days=5,
    )

    print(f"   Entity: DEVICE_ID = mobile_device_abc123")
    print(f"   Focus: Device fingerprinting and analysis")
    print(f"   Fields included: {device_query_info['metadata']['field_count']}")
    print(
        f"   Device coverage: {device_query_info['validation']['coverage_by_category']['device_analysis']}"
    )

    # Example 3: Payment Analysis
    print(f"\n💳 PAYMENT METHOD INVESTIGATION:")
    payment_query_info = SnowflakeQueryBuilder.build_investigation_query(
        entity_type="CARD",
        entity_id="4111111111111111",
        investigation_focus="payment_analysis",
        date_range_days=14,
    )

    print(f"   Entity: CARD = 4111111111111111")
    print(f"   Focus: Payment method and card analysis")
    print(f"   Fields included: {payment_query_info['metadata']['field_count']}")
    print(
        f"   Payment coverage: {payment_query_info['validation']['coverage_by_category']['payment_analysis']}"
    )


def demonstrate_performance_optimization():
    """Demonstrate performance optimization features."""
    print(f"\n⚡ PERFORMANCE OPTIMIZATION")
    print("=" * 60)

    # Fast query example
    print(f"\n🏃 FAST QUERY (Minimal fields):")
    fast_query_info = SnowflakeQueryBuilder.build_investigation_query(
        entity_type="EMAIL",
        entity_id="suspect@example.com",
        investigation_focus="minimal",
        date_range_days=3,
        limit=500,
    )

    perf = fast_query_info["metadata"]["performance_estimate"]
    print(f"   Fields: {fast_query_info['metadata']['field_count']}")
    print(f"   Estimated time: {perf['estimated_execution_time_ms']}ms")
    print(f"   Performance tier: {perf['performance_tier']}")
    print(f"   Suggestions: {', '.join(perf['optimization_suggestions'])}")

    # Comprehensive query example
    print(f"\n🐌 COMPREHENSIVE QUERY (All evidence):")
    comprehensive_query_info = SnowflakeQueryBuilder.build_investigation_query(
        entity_type="EMAIL",
        entity_id="suspect@example.com",
        investigation_focus="comprehensive",
        date_range_days=30,
        limit=5000,
    )

    comp_perf = comprehensive_query_info["metadata"]["performance_estimate"]
    print(f"   Fields: {comprehensive_query_info['metadata']['field_count']}")
    print(f"   Estimated time: {comp_perf['estimated_execution_time_ms']}ms")
    print(f"   Performance tier: {comp_perf['performance_tier']}")
    print(f"   Suggestions: {', '.join(comp_perf['optimization_suggestions'][:2])}")


def demonstrate_query_validation():
    """Demonstrate query validation capabilities."""
    print(f"\n✅ QUERY VALIDATION & RECOMMENDATIONS")
    print("=" * 60)

    tool = SnowflakeQueryTool()

    # Example of incomplete query
    print(f"\n❌ INCOMPLETE QUERY EXAMPLE:")
    from app.service.agent.tools.snowflake_tool.schema_constants import (
        get_full_table_name,
    )

    incomplete_query = f"""
    SELECT TX_ID_KEY, EMAIL, PAID_AMOUNT_VALUE_IN_CURRENCY
    FROM {get_full_table_name()}
    WHERE IP = '10.0.0.1'
    """

    validation = tool.validate_query_fields(incomplete_query)
    print(f"   Valid: {validation['valid']}")
    print(f"   Missing critical fields: {len(validation['missing_critical_fields'])}")
    print(f"   Evidence score: {validation['total_evidence_score']}")
    print(f"   Key recommendations:")
    for rec in validation["recommendations"][:3]:
        print(f"     • {rec}")

    # Example of comprehensive query
    print(f"\n✅ COMPREHENSIVE QUERY EXAMPLE:")
    comprehensive_query = get_recommended_query_for_entity(
        entity_type="IP", entity_id="203.0.113.5", investigation_focus="comprehensive"
    )

    comp_validation = tool.validate_query_fields(comprehensive_query)
    print(f"   Valid: {comp_validation['valid']}")
    print(f"   Evidence score: {comp_validation['total_evidence_score']}")
    print(f"   Device coverage: {comp_validation['device_field_coverage']}")
    print(f"   Risk coverage: {comp_validation['risk_field_coverage']}")


def demonstrate_convenience_functions():
    """Demonstrate convenience functions for quick query generation."""
    print(f"\n🚀 CONVENIENCE FUNCTIONS")
    print("=" * 60)

    # Quick query generation
    print(f"\n⚡ QUICK QUERY GENERATION:")
    quick_query = get_recommended_query_for_entity(
        entity_type="USER_ID",
        entity_id="user_12345",
        investigation_focus="core_fraud",
        date_range_days=7,
    )

    print(f"   Generated query length: {len(quick_query)} characters")
    print(f"   Entity type: USER_ID")
    print(f"   Investigation focus: Core fraud detection")

    # Show first few lines of query
    query_lines = quick_query.strip().split("\n")[:5]
    print(f"   Query preview:")
    for line in query_lines:
        print(f"     {line.strip()}")

    # Tool integration example
    print(f"\n🔧 TOOL INTEGRATION:")
    tool = SnowflakeQueryTool()

    optimized_info = tool.get_optimized_investigation_query(
        entity_type="PHONE",
        entity_id="+1-555-123-4567",
        investigation_focus="user_profile",
        date_range_days=10,
    )

    print(f"   Method: get_optimized_investigation_query()")
    print(f"   Returns: Complete query info with metadata")
    print(
        f"   Evidence score: {optimized_info['validation']['evidence_coverage_score']}"
    )
    print(f"   Query complexity: {optimized_info['metadata']['query_complexity']}")


def main():
    """Run all demonstrations."""
    print("🎯 ENHANCED SNOWFLAKE QUERY SYSTEM DEMONSTRATION")
    print("=" * 80)
    print("This demonstrates the improved Snowflake query construction with")
    print("comprehensive evidence field collection for fraud investigations.")

    demonstrate_field_improvements()
    demonstrate_query_builder()
    demonstrate_performance_optimization()
    demonstrate_query_validation()
    demonstrate_convenience_functions()

    print(f"\n🎉 DEMONSTRATION COMPLETE")
    print("=" * 80)
    print("The enhanced system provides:")
    print("• Comprehensive evidence field collection (333+ columns)")
    print("• Intelligent query optimization and performance tuning")
    print("• Automated query validation and recommendations")
    print("• Specialized investigation focuses (device, payment, user, etc.)")
    print("• Better device fingerprinting with USER_AGENT and device fields")
    print("• Enhanced risk assessment with comprehensive risk scores")
    print("• Improved fraud detection with complete evidence collection")


if __name__ == "__main__":
    main()
