"""
Enhanced Splunk Tool

Advanced Splunk query tool with validation, retry logic, caching, and monitoring.
Built on the enhanced tool framework for improved reliability and observability.
"""

import os
import re
from typing import Any, Dict, List, Optional, Set
from datetime import datetime, timedelta

from fastapi import HTTPException
from pydantic import BaseModel, Field, validator

from ..enhanced_tool_base import (
from app.service.logging import get_bridge_logger

    EnhancedToolBase,
    ToolConfig,
    ToolResult,
    ValidationLevel,
    RetryStrategy,
    CacheStrategy,
    ToolValidationError
)
from app.service.agent.ato_agents.splunk_agent.client import SplunkClient
from app.service.config import get_settings_for_env
from app.utils.firebase_secrets import get_app_secret

logger = get_bridge_logger(__name__)


class SplunkQueryInput(BaseModel):
    """Input model for Splunk queries with validation"""
    
    query: str = Field(..., description="The complete SPL search query to execute")
    max_results: int = Field(1000, description="Maximum number of results to return", ge=1, le=10000)
    timeout_seconds: int = Field(300, description="Query timeout in seconds", ge=1, le=3600)
    earliest_time: Optional[str] = Field(None, description="Earliest time for search (e.g., '-1d', '2023-01-01')")
    latest_time: Optional[str] = Field(None, description="Latest time for search (e.g., 'now', '2023-01-02')")
    search_mode: str = Field("normal", description="Search mode: normal, fast, smart, verbose")
    enable_preview: bool = Field(False, description="Enable search preview for faster results")
    
    @validator('query')
    def validate_query(cls, v):
        """Validate SPL query syntax"""
        if not v.strip():
            raise ValueError("Query cannot be empty")
        
        # Basic SPL validation
        v = v.strip()
        
        # Check for dangerous commands (security validation)
        dangerous_commands = ['delete', 'outputcsv', 'outputlookup', 'script', 'rest']
        query_lower = v.lower()
        for cmd in dangerous_commands:
            if f'| {cmd}' in query_lower or f'|{cmd}' in query_lower:
                raise ValueError(f"Dangerous command '{cmd}' not allowed in queries")
        
        return v
    
    @validator('search_mode')
    def validate_search_mode(cls, v):
        """Validate search mode"""
        valid_modes = ['normal', 'fast', 'smart', 'verbose']
        if v not in valid_modes:
            raise ValueError(f"Search mode must be one of: {valid_modes}")
        return v


class EnhancedSplunkTool(EnhancedToolBase):
    """
    Enhanced Splunk query tool with advanced capabilities.
    
    Features:
    - SPL query syntax validation
    - Connection pooling and retry logic
    - Intelligent caching with query fingerprinting
    - Performance monitoring and slow query detection
    - Automatic query optimization suggestions
    - Security validation and dangerous command blocking
    - Result size limiting and pagination support
    - Time range validation and optimization
    """
    
    def __init__(
        self,
        host: str = "ip.adhoc.rest.splunk.olorin.com",
        port: int = 443,
        username: str = "ged_temp_credentials",
        max_concurrent_queries: int = 5,
        slow_query_threshold_seconds: float = 30.0,
        enable_query_optimization: bool = True
    ):
        """Initialize enhanced Splunk tool"""
        
        # Create enhanced tool configuration
        config = ToolConfig(
            name="enhanced_splunk_tool",
            version="2.0.0",
            timeout_seconds=300,
            max_retries=3,
            validation_level=ValidationLevel.STRICT,
            input_schema={
                'required': ['query'],
                'properties': {
                    'query': {'type': 'string', 'minLength': 1},
                    'max_results': {'type': 'integer', 'minimum': 1, 'maximum': 10000},
                    'timeout_seconds': {'type': 'integer', 'minimum': 1, 'maximum': 3600}
                }
            },
            output_schema={
                'required_fields': ['results', 'query_info']
            },
            retry_strategy=RetryStrategy.EXPONENTIAL_BACKOFF,
            retry_delay_base=2.0,
            retry_delay_max=30.0,
            retry_on_exceptions=[ConnectionError, TimeoutError, HTTPException],
            cache_strategy=CacheStrategy.CONTENT_HASH,
            cache_ttl_seconds=900,  # 15 minutes
            cache_key_prefix="splunk_",
            enable_metrics=True,
            enable_tracing=True,
            custom_params={
                'max_concurrent_queries': max_concurrent_queries,
                'slow_query_threshold': slow_query_threshold_seconds,
                'enable_optimization': enable_query_optimization
            }
        )
        
        super().__init__(config)
        
        # Splunk connection parameters
        self.host = host
        self.port = port
        self.username = username
        self.max_concurrent_queries = max_concurrent_queries
        self.slow_query_threshold = slow_query_threshold_seconds
        self.enable_query_optimization = enable_query_optimization
        
        # Connection pool (simplified - could use actual connection pooling)
        self.active_connections = 0
        self.connection_semaphore = None
        
        # Query optimization patterns
        self.optimization_patterns = {
            'add_time_index': r'^search\s+(?!index=)',
            'missing_stats_by': r'\|\s*stats\s+[^|]*(?<!by\s\w+)$',
            'inefficient_regex': r'regex\s+',
            'missing_fields': r'^search\s+[^|]*(?!\|\s*fields)',
        }
    
    async def _execute_impl(self, input_data: Dict[str, Any], context: Optional[Dict[str, Any]] = None) -> Any:
        """Execute Splunk query with enhanced capabilities"""
        
        # Parse and validate input
        try:
            query_input = SplunkQueryInput(**input_data)
        except Exception as e:
            raise ToolValidationError(f"Input validation failed: {str(e)}")
        
        # Query optimization
        if self.enable_query_optimization:
            optimized_query = await self._optimize_query(query_input.query)
            if optimized_query != query_input.query:
                self.logger.info(f"Query optimized: {query_input.query[:50]}... -> {optimized_query[:50]}...")
                query_input.query = optimized_query
        
        # Prepare execution context
        execution_context = {
            'query_hash': self._calculate_query_hash(query_input),
            'execution_id': context.get('execution_id', 'unknown') if context else 'unknown',
            'start_time': datetime.now(),
            'user_context': context.get('user_context', {}) if context else {}
        }
        
        # Execute query with connection management
        try:
            # Acquire connection semaphore
            if not self.connection_semaphore:
                import asyncio
                self.connection_semaphore = asyncio.Semaphore(self.max_concurrent_queries)
            
            async with self.connection_semaphore:
                self.active_connections += 1
                
                try:
                    result = await self._execute_splunk_query(query_input, execution_context)
                    
                    # Post-process results
                    processed_result = await self._post_process_results(result, query_input, execution_context)
                    
                    return processed_result
                    
                finally:
                    self.active_connections -= 1
        
        except Exception as e:
            # Enhanced error handling
            error_context = {
                'query': query_input.query[:200] + "..." if len(query_input.query) > 200 else query_input.query,
                'execution_context': execution_context,
                'active_connections': self.active_connections
            }
            
            self.logger.error(f"Splunk query execution failed: {str(e)}", extra=error_context)
            raise
    
    async def _execute_splunk_query(
        self, 
        query_input: SplunkQueryInput, 
        execution_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute the actual Splunk query"""
        
        # Check for demo/test mode
        if os.getenv("OLORIN_USE_DEMO_DATA", "false").lower() == "true":
            # Return demo data for testing
            from app.mock.demo_splunk_data import (
                network_splunk_data,
                device_splunk_data,
                location_splunk_data,
                logs_splunk_data
            )
            
            # Parse query to determine what type of data to return
            query_lower = query_input.query.lower()
            if "device" in query_lower or "fuzzy_device" in query_lower:
                demo_results = device_splunk_data
            elif "network" in query_lower or "ip_address" in query_lower or "isp" in query_lower:
                demo_results = network_splunk_data
            elif "location" in query_lower or "city" in query_lower or "geo" in query_lower:
                demo_results = location_splunk_data
            elif "log" in query_lower or "transaction" in query_lower or "login" in query_lower:
                demo_results = logs_splunk_data
            else:
                # Default to logs data if query type unclear
                demo_results = logs_splunk_data
            
            # Return enhanced results format for demo data
            return {
                'results': demo_results,
                'query_info': {
                    'original_query': query_input.query,
                    'execution_time_seconds': 0.1,
                    'result_count': len(demo_results),
                    'search_params': {
                        'count': query_input.max_results,
                        'timeout': query_input.timeout_seconds,
                        'search_mode': query_input.search_mode
                    },
                    'query_hash': execution_context['query_hash'],
                    'execution_id': execution_context['execution_id']
                },
                'performance': {
                    'was_cached': False,
                    'query_optimization_applied': False,
                    'connection_reused': False,
                    'slow_query_threshold_exceeded': False
                },
                'metadata': {
                    'demo_mode': True,
                    'data_source': 'mock_splunk_data'
                }
            }
        
        settings = get_settings_for_env()
        
        # Get credentials
        if settings.splunk_username and settings.splunk_password:
            username = settings.splunk_username
            password = settings.splunk_password
        else:
            username = self.username
            password = get_app_secret("olorin/splunk_password")
        
        # Create Splunk client
        client = SplunkClient(
            host=settings.splunk_host or self.host,
            port=self.port,
            username=username,
            password=password
        )
        
        try:
            # Connect to Splunk
            await client.connect()
            
            # Prepare search parameters
            search_params = {
                'count': query_input.max_results,
                'timeout': query_input.timeout_seconds,
                'search_mode': query_input.search_mode,
                'preview': query_input.enable_preview
            }
            
            # Add time range if specified
            if query_input.earliest_time:
                search_params['earliest_time'] = query_input.earliest_time
            if query_input.latest_time:
                search_params['latest_time'] = query_input.latest_time
            
            # Execute search
            query_start_time = datetime.now()
            results = await client.search(query_input.query, **search_params)
            query_execution_time = (datetime.now() - query_start_time).total_seconds()
            
            # Check for slow queries
            if query_execution_time > self.slow_query_threshold:
                self.logger.warning(
                    f"Slow query detected: {query_execution_time:.2f}s > {self.slow_query_threshold}s",
                    extra={'query': query_input.query[:100], 'execution_time': query_execution_time}
                )
            
            # Enhance results with metadata
            enhanced_results = {
                'results': results,
                'query_info': {
                    'original_query': query_input.query,
                    'execution_time_seconds': query_execution_time,
                    'result_count': len(results) if isinstance(results, list) else 0,
                    'search_params': search_params,
                    'query_hash': execution_context['query_hash'],
                    'execution_id': execution_context['execution_id']
                },
                'performance': {
                    'was_cached': False,
                    'query_optimization_applied': self.enable_query_optimization,
                    'connection_reused': True,  # Simplified - could track actual reuse
                    'slow_query_threshold_exceeded': query_execution_time > self.slow_query_threshold
                }
            }
            
            return enhanced_results
            
        except Exception as e:
            error_type = type(e).__name__
            
            # Enhanced error context
            if "timeout" in str(e).lower():
                raise TimeoutError(f"Splunk query timed out after {query_input.timeout_seconds}s: {str(e)}")
            elif "connection" in str(e).lower():
                raise ConnectionError(f"Splunk connection failed: {str(e)}")
            else:
                raise HTTPException(status_code=500, detail=f"Splunk query failed ({error_type}): {str(e)}")
        
        finally:
            # Clean disconnect
            try:
                await client.disconnect()
            except Exception as e:
                self.logger.debug(f"Splunk disconnect warning: {str(e)}")
    
    async def _post_process_results(
        self,
        results: Dict[str, Any],
        query_input: SplunkQueryInput,
        execution_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Post-process query results"""
        
        # Extract results data
        query_results = results.get('results', [])
        
        # Add processing metadata
        results['processing'] = {
            'processed_at': datetime.now().isoformat(),
            'result_truncated': len(query_results) >= query_input.max_results,
            'suggested_optimizations': await self._analyze_query_for_optimizations(query_input.query)
        }
        
        # Data quality checks
        if query_results:
            results['data_quality'] = {
                'has_results': True,
                'result_consistency': self._check_result_consistency(query_results),
                'field_coverage': self._analyze_field_coverage(query_results),
                'estimated_total_matches': self._estimate_total_matches(query_results, query_input)
            }
        else:
            results['data_quality'] = {
                'has_results': False,
                'empty_result_analysis': await self._analyze_empty_results(query_input.query)
            }
        
        return results
    
    async def _optimize_query(self, query: str) -> str:
        """Apply query optimizations"""
        optimized = query
        
        # Add index specification if missing
        if re.match(self.optimization_patterns['add_time_index'], query, re.IGNORECASE):
            if not re.search(r'index\s*=', query, re.IGNORECASE):
                # Suggest adding index (but don't automatically add without knowing the right index)
                self.logger.info("Query optimization: Consider adding 'index=<your_index>' for better performance")
        
        # Optimize regex usage
        if re.search(self.optimization_patterns['inefficient_regex'], query, re.IGNORECASE):
            # Simple optimization: suggest using search terms instead of regex where possible
            self.logger.info("Query optimization: Consider using search terms instead of regex for better performance")
        
        # Add fields command if missing
        if not re.search(r'\|\s*fields\s+', query, re.IGNORECASE):
            if len(query.split('|')) > 1:  # Multi-command query
                self.logger.info("Query optimization: Consider adding '| fields <specific_fields>' to reduce data transfer")
        
        return optimized
    
    async def _analyze_query_for_optimizations(self, query: str) -> List[str]:
        """Analyze query for potential optimizations"""
        suggestions = []
        
        # Time range optimization
        if not re.search(r'earliest\s*=', query, re.IGNORECASE):
            suggestions.append("Consider adding time range constraints with 'earliest=' and 'latest=' for better performance")
        
        # Index specification
        if not re.search(r'index\s*=', query, re.IGNORECASE):
            suggestions.append("Specify target index(es) with 'index=' to improve search performance")
        
        # Field extraction
        if '|' in query and not re.search(r'\|\s*fields\s+', query, re.IGNORECASE):
            suggestions.append("Use '| fields <field_list>' to reduce data transfer and improve performance")
        
        # Stats optimization
        if re.search(r'\|\s*stats\s+', query, re.IGNORECASE):
            if not re.search(r'\|\s*stats\s+.*\s+by\s+', query, re.IGNORECASE):
                suggestions.append("Consider using 'by' clause in stats command for better aggregation")
        
        # Search efficiency
        if query.strip().startswith('search '):
            if '*' in query[:50]:  # Wildcard in first 50 chars
                suggestions.append("Avoid leading wildcards in search terms for better performance")
        
        return suggestions
    
    def _check_result_consistency(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Check consistency of query results"""
        if not results:
            return {'consistent': True, 'issues': []}
        
        issues = []
        
        # Check field consistency across results
        if len(results) > 1:
            first_fields = set(results[0].keys())
            for i, result in enumerate(results[1:], 1):
                result_fields = set(result.keys())
                if result_fields != first_fields:
                    missing = first_fields - result_fields
                    extra = result_fields - first_fields
                    if missing or extra:
                        issues.append(f"Result {i}: field mismatch (missing: {missing}, extra: {extra})")
        
        # Check for null/empty values
        null_counts = {}
        for result in results:
            for field, value in result.items():
                if value is None or value == '':
                    null_counts[field] = null_counts.get(field, 0) + 1
        
        high_null_fields = {
            field: count for field, count in null_counts.items()
            if count / len(results) > 0.5  # More than 50% null
        }
        
        if high_null_fields:
            issues.append(f"High null/empty rates in fields: {high_null_fields}")
        
        return {
            'consistent': len(issues) == 0,
            'issues': issues,
            'null_field_counts': null_counts
        }
    
    def _analyze_field_coverage(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze field coverage in results"""
        if not results:
            return {}
        
        field_stats = {}
        total_results = len(results)
        
        for result in results:
            for field, value in result.items():
                if field not in field_stats:
                    field_stats[field] = {'present': 0, 'null': 0, 'empty': 0}
                
                if value is not None and value != '':
                    field_stats[field]['present'] += 1
                elif value is None:
                    field_stats[field]['null'] += 1
                else:
                    field_stats[field]['empty'] += 1
        
        # Calculate coverage percentages
        coverage_analysis = {}
        for field, stats in field_stats.items():
            coverage_analysis[field] = {
                'coverage_percent': (stats['present'] / total_results) * 100,
                'null_percent': (stats['null'] / total_results) * 100,
                'empty_percent': (stats['empty'] / total_results) * 100
            }
        
        return coverage_analysis
    
    def _estimate_total_matches(self, results: List[Dict[str, Any]], query_input: SplunkQueryInput) -> Optional[int]:
        """Estimate total matches for the query"""
        result_count = len(results)
        
        if result_count < query_input.max_results:
            # We got fewer results than requested, so this is likely the total
            return result_count
        else:
            # We hit the limit, so there are likely more results
            # This is a simple estimation - real implementation might use Splunk's count estimation
            return f"{result_count}+ (limited by max_results)"
    
    async def _analyze_empty_results(self, query: str) -> Dict[str, Any]:
        """Analyze why a query returned empty results"""
        analysis = {
            'possible_causes': [],
            'suggestions': []
        }
        
        # Time range too restrictive
        if re.search(r'earliest\s*=.*latest\s*=', query, re.IGNORECASE):
            analysis['possible_causes'].append("Time range might be too restrictive")
            analysis['suggestions'].append("Try expanding the time range")
        
        # Too specific search terms
        if len(re.findall(r'\w+\s*=\s*["\']?[^"\s]+["\']?', query)) > 3:
            analysis['possible_causes'].append("Search criteria might be too specific")
            analysis['suggestions'].append("Try broadening search terms")
        
        # Wrong index
        if re.search(r'index\s*=', query, re.IGNORECASE):
            analysis['possible_causes'].append("Data might not exist in specified index")
            analysis['suggestions'].append("Verify correct index is being searched")
        
        return analysis
    
    def _calculate_query_hash(self, query_input: SplunkQueryInput) -> str:
        """Calculate hash for query caching"""
        import hashlib
        
        # Include relevant parameters in hash
        hash_content = {
            'query': query_input.query.strip(),
            'max_results': query_input.max_results,
            'earliest_time': query_input.earliest_time,
            'latest_time': query_input.latest_time,
            'search_mode': query_input.search_mode
        }
        
        hash_string = str(sorted(hash_content.items()))
        return hashlib.sha256(hash_string.encode()).hexdigest()[:16]
    
    async def _validate_input_custom(self, input_data: Dict[str, Any]) -> None:
        """Custom input validation for Splunk queries"""
        
        # Validate query input using Pydantic model
        try:
            SplunkQueryInput(**input_data)
        except Exception as e:
            raise ToolValidationError(f"Splunk input validation failed: {str(e)}")
        
        # Additional security validations
        query = input_data.get('query', '').lower()
        
        # Block potentially dangerous operations
        dangerous_patterns = [
            r'\|\s*delete\b',
            r'\|\s*script\b',
            r'\|\s*rest\b.*delete',
            r'outputcsv.*mode\s*=\s*append',
            r'sendemail',
        ]
        
        for pattern in dangerous_patterns:
            if re.search(pattern, query, re.IGNORECASE):
                raise ToolValidationError(f"Query contains potentially dangerous operation: {pattern}")
        
        # Validate time range format
        earliest = input_data.get('earliest_time')
        latest = input_data.get('latest_time')
        
        if earliest:
            if not self._is_valid_time_format(earliest):
                raise ToolValidationError(f"Invalid earliest_time format: {earliest}")
        
        if latest:
            if not self._is_valid_time_format(latest):
                raise ToolValidationError(f"Invalid latest_time format: {latest}")
    
    def _is_valid_time_format(self, time_str: str) -> bool:
        """Validate Splunk time format"""
        # Common Splunk time formats
        valid_patterns = [
            r'^-\d+[smhdw]$',  # Relative time: -1d, -2h, etc.
            r'^\d{4}-\d{2}-\d{2}$',  # Date: 2023-01-01
            r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$',  # ISO datetime
            r'^now$',  # Special keyword
            r'^@[dhmwy]$',  # Snap to time: @d, @h, etc.
            r'^\d+$',  # Epoch time
        ]
        
        return any(re.match(pattern, time_str, re.IGNORECASE) for pattern in valid_patterns)
    
    async def _validate_output_custom(self, result: Any) -> None:
        """Custom output validation"""
        if not isinstance(result, dict):
            raise ToolValidationError("Splunk tool must return a dictionary")
        
        required_fields = ['results', 'query_info']
        for field in required_fields:
            if field not in result:
                raise ToolValidationError(f"Required output field missing: {field}")
        
        # Validate results structure
        results = result.get('results')
        if not isinstance(results, (list, dict)):
            raise ToolValidationError("Results must be a list or dictionary")
    
    async def health_check(self) -> bool:
        """Perform health check on Splunk connection"""
        try:
            # Simple connectivity test
            test_query = {
                'query': '| makeresults count=1 | eval test="health_check"',
                'max_results': 1,
                'timeout_seconds': 30
            }
            
            result = await self._execute_impl(test_query)
            return result is not None and 'results' in result
            
        except Exception as e:
            self.logger.error(f"Splunk health check failed: {str(e)}")
            return False
    
    def get_tool_info(self) -> Dict[str, Any]:
        """Get tool information and statistics"""
        base_info = self.get_health_status()
        
        # Add Splunk-specific information
        base_info.update({
            'splunk_connection': {
                'host': self.host,
                'port': self.port,
                'username': self.username,
                'active_connections': self.active_connections,
                'max_concurrent_queries': self.max_concurrent_queries
            },
            'query_optimization': {
                'enabled': self.enable_query_optimization,
                'slow_query_threshold_seconds': self.slow_query_threshold
            },
            'capabilities': [
                'SPL query execution',
                'Query optimization',
                'Result caching',
                'Performance monitoring',
                'Security validation',
                'Connection pooling',
                'Retry logic',
                'Health checking'
            ]
        })
        
        return base_info