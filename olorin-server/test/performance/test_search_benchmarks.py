"""
Multi-Entity Search Performance Benchmarks

Comprehensive performance tests for multi-entity structured investigations.
Tests search performance, concurrent load handling, and scalability limits.
"""

import pytest
import asyncio
import time
import statistics
from concurrent.futures import ThreadPoolExecutor, as_completed
from unittest.mock import AsyncMock, patch, MagicMock

from app.models.multi_entity_investigation import BooleanQueryParser
from app.service.agent.multi_entity.investigation_orchestrator import get_multi_entity_orchestrator


class TestBooleanSearchPerformance:
    """Performance benchmarks for Boolean search operations"""
    
    def test_boolean_parser_performance_simple(self):
        """Benchmark simple Boolean expression parsing and evaluation"""
        parser = BooleanQueryParser(
            expression="user123 AND transaction456",
            entity_mapping={"user123": "user123", "transaction456": "transaction456"}
        )
        
        # Benchmark parsing performance
        parse_times = []
        for _ in range(1000):
            start_time = time.perf_counter()
            result = parser.parse()
            end_time = time.perf_counter()
            parse_times.append(end_time - start_time)
            assert result["valid"] is True
        
        avg_parse_time = statistics.mean(parse_times)
        max_parse_time = max(parse_times)
        
        # Performance requirements
        assert avg_parse_time < 0.001  # Average under 1ms
        assert max_parse_time < 0.005  # Max under 5ms
        
        print(f"Simple Boolean parsing - Avg: {avg_parse_time*1000:.3f}ms, Max: {max_parse_time*1000:.3f}ms")
    
    def test_boolean_parser_performance_complex(self):
        """Benchmark complex Boolean expression parsing and evaluation"""
        parser = BooleanQueryParser(
            expression="((user123 AND transaction456) OR (store789 AND merchant001)) AND ((location555 OR device666) AND (network777 OR logs888))",
            entity_mapping={
                "user123": "user123", "transaction456": "transaction456",
                "store789": "store789", "merchant001": "merchant001",
                "location555": "location555", "device666": "device666", 
                "network777": "network777", "logs888": "logs888"
            }
        )
        
        # Benchmark parsing performance
        parse_times = []
        for _ in range(500):
            start_time = time.perf_counter()
            result = parser.parse()
            end_time = time.perf_counter()
            parse_times.append(end_time - start_time)
            assert result["valid"] is True
        
        avg_parse_time = statistics.mean(parse_times)
        max_parse_time = max(parse_times)
        
        # Performance requirements for complex expressions
        assert avg_parse_time < 0.005  # Average under 5ms
        assert max_parse_time < 0.020  # Max under 20ms
        
        print(f"Complex Boolean parsing - Avg: {avg_parse_time*1000:.3f}ms, Max: {max_parse_time*1000:.3f}ms")
    
    def test_boolean_evaluation_performance(self):
        """Benchmark Boolean expression evaluation performance"""
        parser = BooleanQueryParser(
            expression="((user123 AND transaction456) OR (store789 AND merchant001)) AND location555",
            entity_mapping={
                "user123": "user123", "transaction456": "transaction456",
                "store789": "store789", "merchant001": "merchant001", 
                "location555": "location555"
            }
        )
        
        # Parse once
        parse_result = parser.parse()
        assert parse_result["valid"] is True
        
        # Prepare entity results
        entity_results = {
            "user123": True, "transaction456": False,
            "store789": True, "merchant001": True,
            "location555": True
        }
        
        # Benchmark evaluation performance
        eval_times = []
        for _ in range(2000):
            start_time = time.perf_counter()
            result = parser.evaluate(entity_results)
            end_time = time.perf_counter()
            eval_times.append(end_time - start_time)
            assert isinstance(result, bool)
        
        avg_eval_time = statistics.mean(eval_times)
        max_eval_time = max(eval_times)
        
        # Performance requirements for evaluation
        assert avg_eval_time < 0.0005  # Average under 0.5ms
        assert max_eval_time < 0.002   # Max under 2ms
        
        print(f"Boolean evaluation - Avg: {avg_eval_time*1000:.3f}ms, Max: {max_eval_time*1000:.3f}ms")
    
    def test_large_entity_set_performance(self):
        """Benchmark performance with large number of entities"""
        # Create expression with 50 entities
        entities = [f"entity_{i}" for i in range(50)]
        expression_parts = []
        
        # Create complex expression: (entity_0 AND entity_1) OR (entity_2 AND entity_3) OR ...
        for i in range(0, len(entities), 2):
            if i + 1 < len(entities):
                expression_parts.append(f"({entities[i]} AND {entities[i+1]})")
            else:
                expression_parts.append(entities[i])
        
        expression = " OR ".join(expression_parts)
        entity_mapping = {entity: entity for entity in entities}
        
        parser = BooleanQueryParser(
            expression=expression,
            entity_mapping=entity_mapping
        )
        
        # Benchmark parsing
        start_time = time.perf_counter()
        parse_result = parser.parse()
        parse_time = time.perf_counter() - start_time
        
        assert parse_result["valid"] is True
        assert parse_time < 0.1  # Should parse in under 100ms
        
        # Benchmark evaluation
        entity_results = {entity: i % 3 == 0 for i, entity in enumerate(entities)}
        
        eval_times = []
        for _ in range(100):
            start_time = time.perf_counter()
            result = parser.evaluate(entity_results)
            end_time = time.perf_counter()
            eval_times.append(end_time - start_time)
            assert isinstance(result, bool)
        
        avg_eval_time = statistics.mean(eval_times)
        
        # Should evaluate large expressions quickly
        assert avg_eval_time < 0.01  # Average under 10ms
        
        print(f"Large entity set (50 entities) - Parse: {parse_time*1000:.3f}ms, Eval Avg: {avg_eval_time*1000:.3f}ms")


class TestMultiEntityInvestigationPerformance:
    """Performance benchmarks for multi-entity investigation orchestration"""
    
    @pytest.mark.asyncio
    async def test_investigation_startup_performance(self):
        """Benchmark investigation startup time"""
        from app.models.multi_entity_investigation import (
            MultiEntityInvestigationRequest, EntityRelationship, RelationshipType
        )
        
        request = MultiEntityInvestigationRequest(
            investigation_id="perf_test_001",
            entities=[
                {"entity_id": "user_123", "entity_type": "user"},
                {"entity_id": "txn_456", "entity_type": "transaction_id"},
                {"entity_id": "store_789", "entity_type": "merchant"}
            ],
            relationships=[
                EntityRelationship(
                    source_entity_id="user_123",
                    target_entity_id="txn_456", 
                    relationship_type=RelationshipType.INITIATED,
                    strength=0.9
                )
            ],
            boolean_logic="user_123 AND txn_456",
            investigation_scope=["device", "location"]
        )
        
        with patch("app.service.agent.multi_entity.investigation_orchestrator.MultiEntityInvestigationCoordinator") as mock_coordinator:
            mock_instance = AsyncMock()
            mock_coordinator.return_value = mock_instance
            mock_instance.coordinate_multi_entity_investigation.return_value = {
                "investigation_id": "perf_test_001",
                "status": "completed",
                "entity_results": {},
                "cross_entity_analysis": None
            }
            
            orchestrator = get_multi_entity_orchestrator()
            
            # Benchmark startup times
            startup_times = []
            for _ in range(10):
                start_time = time.perf_counter()
                result = await orchestrator.start_multi_entity_investigation(request)
                end_time = time.perf_counter()
                startup_times.append(end_time - start_time)
                assert result is not None
            
            avg_startup_time = statistics.mean(startup_times)
            max_startup_time = max(startup_times)
            
            # Performance requirements
            assert avg_startup_time < 0.1   # Average under 100ms
            assert max_startup_time < 0.2   # Max under 200ms
            
            print(f"Investigation startup - Avg: {avg_startup_time*1000:.3f}ms, Max: {max_startup_time*1000:.3f}ms")
    
    def test_concurrent_investigation_performance(self):
        """Benchmark concurrent investigation handling"""
        from app.models.multi_entity_investigation import MultiEntityInvestigationRequest
        
        def create_test_request(index):
            return MultiEntityInvestigationRequest(
                investigation_id=f"concurrent_test_{index}",
                entities=[
                    {"entity_id": f"user_{index}", "entity_type": "user"},
                    {"entity_id": f"txn_{index}", "entity_type": "transaction_id"}
                ],
                boolean_logic=f"user_{index} AND txn_{index}",
                investigation_scope=["device"]
            )
        
        async def run_investigation(request):
            """Run single investigation"""
            with patch("app.service.agent.multi_entity.investigation_orchestrator.MultiEntityInvestigationCoordinator") as mock_coordinator:
                mock_instance = AsyncMock()
                mock_coordinator.return_value = mock_instance
                mock_instance.coordinate_multi_entity_investigation.return_value = {
                    "investigation_id": request.investigation_id,
                    "status": "completed"
                }
                
                orchestrator = get_multi_entity_orchestrator()
                start_time = time.perf_counter()
                result = await orchestrator.start_multi_entity_investigation(request)
                end_time = time.perf_counter()
                
                return end_time - start_time, result is not None
        
        async def run_concurrent_tests():
            """Run concurrent investigations"""
            requests = [create_test_request(i) for i in range(10)]
            
            # Run all investigations concurrently
            start_time = time.perf_counter()
            results = await asyncio.gather(*[run_investigation(req) for req in requests])
            total_time = time.perf_counter() - start_time
            
            # Analyze results
            individual_times = [time for time, success in results]
            success_count = sum(1 for time, success in results if success)
            
            avg_individual_time = statistics.mean(individual_times)
            max_individual_time = max(individual_times)
            
            # Performance requirements for concurrent execution
            assert total_time < 2.0  # Total time should be reasonable due to concurrency
            assert success_count == 10  # All should succeed
            assert avg_individual_time < 0.2  # Individual times should be reasonable
            
            print(f"Concurrent investigations (10) - Total: {total_time*1000:.3f}ms, Avg Individual: {avg_individual_time*1000:.3f}ms")
            print(f"Success rate: {success_count}/10")
            
            return total_time, avg_individual_time
        
        # Run the async test
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(run_concurrent_tests())
        finally:
            loop.close()


class TestMemoryAndResourcePerformance:
    """Memory usage and resource consumption benchmarks"""
    
    def test_memory_usage_large_expressions(self):
        """Test memory usage with large Boolean expressions"""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss
        
        # Create very large Boolean expression
        entities = [f"entity_{i}" for i in range(100)]
        expression = " AND ".join([f"({entity} OR {entity}_alt)" for entity in entities])
        entity_mapping = {}
        for entity in entities:
            entity_mapping[entity] = entity
            entity_mapping[f"{entity}_alt"] = f"{entity}_alt"
        
        parsers = []
        # Create multiple parsers to test memory accumulation
        for _ in range(10):
            parser = BooleanQueryParser(
                expression=expression,
                entity_mapping=entity_mapping.copy()
            )
            parse_result = parser.parse()
            assert parse_result["valid"] is True
            parsers.append(parser)
        
        final_memory = process.memory_info().rss
        memory_increase = final_memory - initial_memory
        
        # Memory increase should be reasonable (under 50MB for this test)
        assert memory_increase < 50 * 1024 * 1024  # 50MB
        
        print(f"Memory increase for large expressions: {memory_increase / (1024 * 1024):.2f}MB")
    
    def test_parser_cleanup_performance(self):
        """Test parser cleanup and garbage collection performance"""
        import gc
        
        # Create and destroy many parsers to test cleanup
        creation_times = []
        
        for i in range(100):
            start_time = time.perf_counter()
            
            parser = BooleanQueryParser(
                expression=f"entity_{i} AND entity_{i+1}",
                entity_mapping={f"entity_{i}": f"entity_{i}", f"entity_{i+1}": f"entity_{i+1}"}
            )
            parse_result = parser.parse()
            assert parse_result["valid"] is True
            
            # Evaluate to ensure full usage
            result = parser.evaluate({f"entity_{i}": True, f"entity_{i+1}": False})
            assert result is False
            
            end_time = time.perf_counter()
            creation_times.append(end_time - start_time)
            
            # Explicitly delete to test cleanup
            del parser
            
            # Force garbage collection every 10 iterations
            if i % 10 == 0:
                gc.collect()
        
        avg_creation_time = statistics.mean(creation_times)
        max_creation_time = max(creation_times)
        
        # Creation and cleanup should be fast and consistent
        assert avg_creation_time < 0.01   # Average under 10ms
        assert max_creation_time < 0.05   # Max under 50ms
        
        print(f"Parser creation/cleanup - Avg: {avg_creation_time*1000:.3f}ms, Max: {max_creation_time*1000:.3f}ms")


class TestScalabilityBenchmarks:
    """Scalability and stress test benchmarks"""
    
    def test_expression_complexity_scaling(self):
        """Test performance scaling with expression complexity"""
        complexity_results = []
        
        for depth in range(1, 11):  # Test nesting depths 1-10
            # Create nested expression: ((((a AND b) OR c) AND d) OR e) ...
            expression = "entity_0"
            entity_mapping = {"entity_0": "entity_0"}
            
            for i in range(1, depth + 1):
                entity = f"entity_{i}"
                entity_mapping[entity] = entity
                if i % 2 == 1:
                    expression = f"({expression} AND {entity})"
                else:
                    expression = f"({expression} OR {entity})"
            
            parser = BooleanQueryParser(
                expression=expression,
                entity_mapping=entity_mapping
            )
            
            # Benchmark parse time
            start_time = time.perf_counter()
            parse_result = parser.parse()
            parse_time = time.perf_counter() - start_time
            
            assert parse_result["valid"] is True
            
            # Benchmark evaluation time
            entity_results = {entity: i % 2 == 0 for i, entity in enumerate(entity_mapping.keys())}
            
            start_time = time.perf_counter()
            eval_result = parser.evaluate(entity_results)
            eval_time = time.perf_counter() - start_time
            
            assert isinstance(eval_result, bool)
            
            complexity_results.append({
                "depth": depth,
                "parse_time": parse_time,
                "eval_time": eval_time,
                "entities": len(entity_mapping)
            })
            
            # Performance should scale reasonably
            assert parse_time < depth * 0.01  # Should scale linearly or better
            assert eval_time < depth * 0.001  # Evaluation should be very fast
        
        print("Expression complexity scaling results:")
        for result in complexity_results:
            print(f"  Depth {result['depth']}: Parse {result['parse_time']*1000:.3f}ms, "
                  f"Eval {result['eval_time']*1000:.3f}ms, Entities {result['entities']}")
    
    def test_entity_count_scaling(self):
        """Test performance scaling with number of entities"""
        entity_counts = [5, 10, 20, 50, 100]
        scaling_results = []
        
        for count in entity_counts:
            entities = [f"entity_{i}" for i in range(count)]
            
            # Create OR expression with all entities
            expression = " OR ".join(entities)
            entity_mapping = {entity: entity for entity in entities}
            
            parser = BooleanQueryParser(
                expression=expression,
                entity_mapping=entity_mapping
            )
            
            # Benchmark parse time
            start_time = time.perf_counter()
            parse_result = parser.parse()
            parse_time = time.perf_counter() - start_time
            
            assert parse_result["valid"] is True
            
            # Benchmark evaluation time (multiple evaluations for accuracy)
            entity_results = {entity: i % 3 == 0 for i, entity in enumerate(entities)}
            
            eval_times = []
            for _ in range(50):
                start_time = time.perf_counter()
                eval_result = parser.evaluate(entity_results)
                end_time = time.perf_counter()
                eval_times.append(end_time - start_time)
                assert isinstance(eval_result, bool)
            
            avg_eval_time = statistics.mean(eval_times)
            
            scaling_results.append({
                "entity_count": count,
                "parse_time": parse_time,
                "avg_eval_time": avg_eval_time
            })
            
            # Performance should scale sub-linearly 
            assert parse_time < count * 0.001  # Should be better than linear
            assert avg_eval_time < count * 0.0001  # Evaluation should be very efficient
        
        print("Entity count scaling results:")
        for result in scaling_results:
            print(f"  {result['entity_count']} entities: Parse {result['parse_time']*1000:.3f}ms, "
                  f"Eval {result['avg_eval_time']*1000:.3f}ms")


if __name__ == "__main__":
    """Run performance benchmarks directly"""
    print("=" * 60)
    print("Multi-Entity Search Performance Benchmarks")
    print("=" * 60)
    
    # Run Boolean search benchmarks
    boolean_tests = TestBooleanSearchPerformance()
    print("\n--- Boolean Search Performance ---")
    boolean_tests.test_boolean_parser_performance_simple()
    boolean_tests.test_boolean_parser_performance_complex()
    boolean_tests.test_boolean_evaluation_performance()
    boolean_tests.test_large_entity_set_performance()
    
    # Run memory benchmarks
    memory_tests = TestMemoryAndResourcePerformance()
    print("\n--- Memory and Resource Performance ---")
    memory_tests.test_memory_usage_large_expressions()
    memory_tests.test_parser_cleanup_performance()
    
    # Run scalability benchmarks
    scalability_tests = TestScalabilityBenchmarks()
    print("\n--- Scalability Benchmarks ---")
    scalability_tests.test_expression_complexity_scaling()
    scalability_tests.test_entity_count_scaling()
    
    print("\n" + "=" * 60)
    print("Benchmark suite completed successfully!")
    print("=" * 60)