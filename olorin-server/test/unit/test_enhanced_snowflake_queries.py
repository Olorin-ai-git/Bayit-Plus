"""
Test Enhanced Snowflake Query Construction

Tests the improved Snowflake query building with comprehensive evidence fields.
"""

import pytest
from unittest.mock import Mock, patch
from app.service.agent.tools.snowflake_tool.snowflake_tool import SnowflakeQueryTool, REAL_COLUMNS, PRIORITY_EVIDENCE_FIELDS
from app.service.agent.tools.snowflake_tool.query_builder import SnowflakeQueryBuilder, get_recommended_query_for_entity
from app.service.agent.tools.snowflake_tool.schema_constants import (
    TX_ID_KEY, MODEL_SCORE, IS_FRAUD_TX, DEVICE_ID, USER_AGENT,
    IP, IP_COUNTRY_CODE, MAXMIND_RISK_SCORE, CARD_BRAND, BIN
)


class TestEnhancedSnowflakeQueries:
    """Test enhanced Snowflake query construction and validation."""

    def test_comprehensive_field_coverage(self):
        """Test that REAL_COLUMNS includes all critical evidence fields."""
        print("\n🔍 Testing comprehensive field coverage...")

        # Critical fields that must be included
        critical_fields = [
            TX_ID_KEY, MODEL_SCORE, IS_FRAUD_TX, DEVICE_ID, USER_AGENT,
            IP, IP_COUNTRY_CODE, MAXMIND_RISK_SCORE
        ]

        missing_fields = [field for field in critical_fields if field not in REAL_COLUMNS]

        assert len(missing_fields) == 0, f"Missing critical fields: {missing_fields}"

        print(f"   ✅ All {len(critical_fields)} critical fields present")
        print(f"   ✅ Total evidence fields available: {len(REAL_COLUMNS)}")

        # Verify field categories are well represented
        device_fields = [f for f in REAL_COLUMNS if 'DEVICE' in f or f == USER_AGENT]
        risk_fields = [f for f in REAL_COLUMNS if any(keyword in f for keyword in ['SCORE', 'FRAUD', 'RISK'])]
        payment_fields = [f for f in REAL_COLUMNS if any(keyword in f for keyword in ['CARD', 'BIN', 'PAYMENT'])]

        assert len(device_fields) >= 5, f"Insufficient device fields: {len(device_fields)}"
        assert len(risk_fields) >= 3, f"Insufficient risk fields: {len(risk_fields)}"
        assert len(payment_fields) >= 3, f"Insufficient payment fields: {len(payment_fields)}"

        print(f"   ✅ Device fields: {len(device_fields)}")
        print(f"   ✅ Risk fields: {len(risk_fields)}")
        print(f"   ✅ Payment fields: {len(payment_fields)}")

    def test_priority_fields_selection(self):
        """Test that priority fields include the most critical evidence."""
        print("\n🎯 Testing priority field selection...")

        # Most critical fields for initial investigation
        must_have_priority = [TX_ID_KEY, MODEL_SCORE, IS_FRAUD_TX, DEVICE_ID, IP]

        missing_priority = [field for field in must_have_priority if field not in PRIORITY_EVIDENCE_FIELDS]

        assert len(missing_priority) == 0, f"Missing priority fields: {missing_priority}"
        assert len(PRIORITY_EVIDENCE_FIELDS) < len(REAL_COLUMNS), "Priority fields should be subset of all fields"

        print(f"   ✅ Priority fields: {len(PRIORITY_EVIDENCE_FIELDS)}/{len(REAL_COLUMNS)}")
        print(f"   ✅ All critical fields in priority set")

    def test_query_builder_comprehensive_query(self):
        """Test query builder generates comprehensive queries."""
        print("\n🏗️ Testing comprehensive query generation...")

        query_info = SnowflakeQueryBuilder.build_investigation_query(
            entity_type="IP",
            entity_id="192.168.1.100",
            investigation_focus="comprehensive",
            date_range_days=7
        )

        query = query_info["query"]
        metadata = query_info["metadata"]
        validation = query_info["validation"]

        # Verify query structure
        assert "SELECT" in query.upper()
        assert "TRANSACTIONS_ENRICHED" in query
        assert "192.168.1.100" in query
        assert "TX_DATETIME" in query
        assert "ORDER BY TX_DATETIME DESC" in query

        # Verify comprehensive field inclusion
        critical_fields_in_query = sum(1 for field in [TX_ID_KEY, MODEL_SCORE, DEVICE_ID, USER_AGENT] if field in query)
        assert critical_fields_in_query >= 3, f"Not enough critical fields in query: {critical_fields_in_query}"

        # Verify metadata
        assert metadata["entity_type"] == "IP"
        assert metadata["entity_id"] == "192.168.1.100"
        assert metadata["investigation_focus"] == "comprehensive"
        assert metadata["field_count"] > 20, f"Comprehensive query should have many fields: {metadata['field_count']}"

        # Verify validation
        assert validation["evidence_coverage_score"] > 0.7, f"Low evidence coverage: {validation['evidence_coverage_score']}"

        print(f"   ✅ Query includes {metadata['field_count']} evidence fields")
        print(f"   ✅ Evidence coverage: {validation['evidence_coverage_score']}")
        print(f"   ✅ Performance tier: {metadata['performance_estimate']['performance_tier']}")

    def test_query_builder_different_focuses(self):
        """Test different investigation focus options."""
        print("\n🎨 Testing different investigation focuses...")

        focuses = ["minimal", "core_fraud", "device_focus", "payment_analysis", "comprehensive"]

        for focus in focuses:
            query_info = SnowflakeQueryBuilder.build_investigation_query(
                entity_type="EMAIL",
                entity_id="test@example.com",
                investigation_focus=focus,
                date_range_days=3
            )

            query = query_info["query"]
            metadata = query_info["metadata"]

            # Basic query validation
            assert "SELECT" in query.upper()
            assert "test@example.com" in query
            assert metadata["investigation_focus"] == focus

            field_count = metadata["field_count"]

            # Verify field counts make sense
            if focus == "minimal":
                assert field_count < 15, f"Minimal should have few fields: {field_count}"
            elif focus == "comprehensive":
                assert field_count > 25, f"Comprehensive should have many fields: {field_count}"

            print(f"   ✅ {focus}: {field_count} fields, {metadata['query_complexity']} complexity")

    def test_entity_type_specific_queries(self):
        """Test queries for different entity types."""
        print("\n🎭 Testing entity-specific queries...")

        entity_tests = [
            ("IP", "10.0.0.1"),
            ("EMAIL", "user@test.com"),
            ("DEVICE_ID", "device_123"),
            ("USER_ID", "user_456"),
            ("CARD", "4111111111111111")
        ]

        for entity_type, entity_id in entity_tests:
            query_info = SnowflakeQueryBuilder.build_investigation_query(
                entity_type=entity_type,
                entity_id=entity_id,
                investigation_focus="core_fraud"
            )

            query = query_info["query"]

            # Verify entity-specific WHERE clause
            assert entity_id in query, f"Entity ID not found in {entity_type} query"

            if entity_type == "IP":
                assert f"IP = '{entity_id}'" in query
            elif entity_type == "EMAIL":
                assert f"EMAIL" in query and entity_id in query
            elif entity_type == "DEVICE_ID":
                assert f"DEVICE_ID = '{entity_id}'" in query

            print(f"   ✅ {entity_type} query generated successfully")

    def test_snowflake_tool_query_validation(self):
        """Test SnowflakeQueryTool query validation."""
        print("\n✅ Testing query validation functionality...")

        tool = SnowflakeQueryTool()

        # Test comprehensive query validation
        comprehensive_query = f"""
        SELECT {TX_ID_KEY}, {MODEL_SCORE}, {IS_FRAUD_TX}, {DEVICE_ID},
               {USER_AGENT}, {IP}, {IP_COUNTRY_CODE}, {MAXMIND_RISK_SCORE}
        FROM TRANSACTIONS_ENRICHED
        WHERE IP = '192.168.1.1'
        """

        validation = tool.validate_query_fields(comprehensive_query)

        assert validation["valid"] == True, f"Comprehensive query should be valid: {validation}"
        assert len(validation["missing_critical_fields"]) == 0, f"Should have no missing fields: {validation['missing_critical_fields']}"
        assert validation["total_evidence_score"] > 0.8, f"Should have high evidence score: {validation['total_evidence_score']}"

        # Test minimal query validation
        minimal_query = f"SELECT {TX_ID_KEY} FROM TRANSACTIONS_ENRICHED WHERE IP = '1.1.1.1'"

        minimal_validation = tool.validate_query_fields(minimal_query)

        assert minimal_validation["valid"] == False, "Minimal query should be flagged as incomplete"
        assert len(minimal_validation["missing_critical_fields"]) > 0, "Should identify missing critical fields"
        assert len(minimal_validation["recommendations"]) > 0, "Should provide recommendations"

        print(f"   ✅ Comprehensive query validation: {validation['total_evidence_score']}")
        print(f"   ✅ Missing field detection working")
        print(f"   ✅ Recommendations generated: {len(minimal_validation['recommendations'])}")

    def test_get_recommended_query_convenience_function(self):
        """Test the convenience function for getting recommended queries."""
        print("\n🚀 Testing convenience function...")

        query = get_recommended_query_for_entity(
            entity_type="IP",
            entity_id="203.0.113.1",
            investigation_focus="comprehensive",
            date_range_days=14
        )

        # Verify basic query structure
        assert "SELECT" in query.upper()
        assert "TRANSACTIONS_ENRICHED" in query
        assert "203.0.113.1" in query
        assert "DATEADD(day, -14" in query

        # Verify comprehensive field inclusion
        evidence_fields_count = sum(1 for field in [TX_ID_KEY, MODEL_SCORE, DEVICE_ID, USER_AGENT, CARD_BRAND] if field in query)
        assert evidence_fields_count >= 4, f"Should include multiple evidence fields: {evidence_fields_count}"

        print(f"   ✅ Generated comprehensive query successfully")
        print(f"   ✅ Query length: {len(query)} characters")

    def test_optimized_investigation_query_method(self):
        """Test the optimized investigation query method on SnowflakeQueryTool."""
        print("\n⚡ Testing optimized investigation query method...")

        tool = SnowflakeQueryTool()

        query_info = tool.get_optimized_investigation_query(
            entity_type="DEVICE_ID",
            entity_id="mobile_device_789",
            investigation_focus="device_focus",
            date_range_days=5
        )

        # Verify structure
        assert "query" in query_info
        assert "metadata" in query_info
        assert "validation" in query_info

        query = query_info["query"]
        metadata = query_info["metadata"]

        # Verify device-focused query
        assert "mobile_device_789" in query
        assert "DEVICE_ID" in query
        assert metadata["investigation_focus"] == "device_focus"

        print(f"   ✅ Generated device-focused investigation query")
        print(f"   ✅ Evidence coverage: {query_info['validation']['evidence_coverage_score']}")

    def test_performance_optimization_suggestions(self):
        """Test performance optimization suggestions."""
        print("\n🏃 Testing performance optimization...")

        # Test high-performance query
        fast_query_info = SnowflakeQueryBuilder.build_investigation_query(
            entity_type="IP",
            entity_id="1.2.3.4",
            investigation_focus="minimal",
            date_range_days=1,
            limit=100
        )

        fast_perf = fast_query_info["metadata"]["performance_estimate"]
        assert fast_perf["performance_tier"] == "fast", f"Should be fast: {fast_perf['performance_tier']}"

        # Test slower query
        slow_query_info = SnowflakeQueryBuilder.build_investigation_query(
            entity_type="IP",
            entity_id="1.2.3.4",
            investigation_focus="comprehensive",
            date_range_days=30,
            limit=10000
        )

        slow_perf = slow_query_info["metadata"]["performance_estimate"]
        assert len(slow_perf["optimization_suggestions"]) > 0, "Should provide optimization suggestions"

        print(f"   ✅ Fast query tier: {fast_perf['performance_tier']}")
        print(f"   ✅ Optimization suggestions provided for complex queries")


if __name__ == "__main__":
    test = TestEnhancedSnowflakeQueries()

    test.test_comprehensive_field_coverage()
    test.test_priority_fields_selection()
    test.test_query_builder_comprehensive_query()
    test.test_query_builder_different_focuses()
    test.test_entity_type_specific_queries()
    test.test_snowflake_tool_query_validation()
    test.test_get_recommended_query_convenience_function()
    test.test_optimized_investigation_query_method()
    test.test_performance_optimization_suggestions()

    print("\n🎉 All enhanced Snowflake query tests passed!")