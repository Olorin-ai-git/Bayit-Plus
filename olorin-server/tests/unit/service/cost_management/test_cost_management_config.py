"""
Unit Tests for Cost Management Configuration Validation.

Tests configuration loading, validation, and integration with system components.
NO MOCK DATA - Uses real configuration files and settings.

Author: Gil Klainert
Date: 2025-09-07
Plan: /docs/plans/2025-09-07-api-cost-management-system-plan.md
"""

import pytest
import yaml
from pathlib import Path
from typing import Dict, Any

# Configuration file path
CONFIG_PATH = Path(__file__).parent.parent.parent.parent.parent / "config" / "cost_management_config.yaml"


class TestCostManagementConfigValidation:
    """Test suite for cost management configuration validation."""

    @pytest.fixture
    def config_data(self):
        """Load configuration data from YAML file."""
        assert CONFIG_PATH.exists(), f"Configuration file not found: {CONFIG_PATH}"
        
        with open(CONFIG_PATH, 'r') as f:
            config = yaml.safe_load(f)
        
        return config

    def test_configuration_file_structure(self, config_data):
        """Test that configuration file has proper structure."""
        # Top-level sections
        required_sections = [
            'credit_monitor',
            'model_fallback', 
            'circuit_breaker',
            'cost_optimization',
            'cost_tracking',
            'integration',
            'logging',
            'emergency',
            'development'
        ]
        
        for section in required_sections:
            assert section in config_data, f"Missing required configuration section: {section}"

    def test_credit_monitor_configuration(self, config_data):
        """Test credit monitor configuration validation."""
        credit_config = config_data['credit_monitor']
        
        # API configuration
        assert 'api_timeout_seconds' in credit_config
        assert isinstance(credit_config['api_timeout_seconds'], (int, float))
        assert credit_config['api_timeout_seconds'] > 0
        
        assert 'cache_duration_minutes' in credit_config
        assert isinstance(credit_config['cache_duration_minutes'], (int, float))
        assert credit_config['cache_duration_minutes'] > 0
        
        # Budget limits
        budget_limits = credit_config['budget_limits']
        required_budget_periods = ['daily', 'weekly', 'monthly', 'minimum_balance']
        
        for period in required_budget_periods:
            assert period in budget_limits, f"Missing budget period: {period}"
            assert isinstance(budget_limits[period], (int, float))
            assert budget_limits[period] > 0
        
        # Budget hierarchy validation
        assert budget_limits['daily'] < budget_limits['weekly']
        assert budget_limits['weekly'] < budget_limits['monthly']
        assert budget_limits['minimum_balance'] < budget_limits['daily']
        
        # Alert thresholds
        alert_thresholds = credit_config['alert_thresholds']
        assert 'warning' in alert_thresholds
        assert 'critical' in alert_thresholds
        assert 0 < alert_thresholds['warning'] < 1
        assert 0 < alert_thresholds['critical'] < 1
        assert alert_thresholds['warning'] < alert_thresholds['critical']
        
        # Model costs
        model_costs = credit_config['model_costs']
        required_models = [
            'claude-opus-4-1-20250805',
            'claude-3-opus-20240229',
            'claude-3-sonnet-20240229',
            'claude-3-haiku-20240307'
        ]
        
        for model in required_models:
            assert model in model_costs, f"Missing model cost configuration: {model}"
            model_cost = model_costs[model]
            assert 'input' in model_cost
            assert 'output' in model_cost
            assert isinstance(model_cost['input'], (int, float))
            assert isinstance(model_cost['output'], (int, float))
            assert model_cost['input'] > 0
            assert model_cost['output'] > 0

    def test_model_fallback_configuration(self, config_data):
        """Test model fallback configuration validation."""
        fallback_config = config_data['model_fallback']
        
        # Model tiers
        model_tiers = fallback_config['model_tiers']
        required_tiers = ['premium', 'standard', 'efficient']
        
        for tier in required_tiers:
            assert tier in model_tiers, f"Missing model tier: {tier}"
            tier_config = model_tiers[tier]
            
            assert 'models' in tier_config
            assert isinstance(tier_config['models'], list)
            assert len(tier_config['models']) > 0
            
            assert 'max_tokens' in tier_config
            assert isinstance(tier_config['max_tokens'], int)
            assert tier_config['max_tokens'] > 0
            
            assert 'quality_score' in tier_config
            assert isinstance(tier_config['quality_score'], (int, float))
            assert 0 <= tier_config['quality_score'] <= 1
            
            assert 'suitable_for' in tier_config
            assert isinstance(tier_config['suitable_for'], list)
        
        # Task complexity mapping
        task_complexity = fallback_config['task_complexity']
        
        # Agent-specific tasks
        agent_tasks = [
            'device_analysis', 'location_analysis', 'network_analysis',
            'logs_analysis', 'risk_assessment'
        ]
        
        for task in agent_tasks:
            assert task in task_complexity, f"Missing agent task complexity: {task}"
            assert task_complexity[task] in ['simple', 'moderate', 'complex', 'critical']
        
        # Investigation types
        investigation_types = [
            'device_spoofing', 'impossible_travel', 'synthetic_identity',
            'account_takeover', 'first_party_fraud', 'money_laundering',
            'social_engineering', 'insider_fraud'
        ]
        
        for inv_type in investigation_types:
            assert inv_type in task_complexity, f"Missing investigation type complexity: {inv_type}"
            assert task_complexity[inv_type] in ['simple', 'moderate', 'complex', 'critical']

    def test_circuit_breaker_configuration(self, config_data):
        """Test circuit breaker configuration validation."""
        circuit_config = config_data['circuit_breaker']
        
        # Default configuration
        default_config = circuit_config['default_config']
        required_default_params = [
            'failure_threshold', 'recovery_timeout_seconds', 'success_threshold',
            'request_timeout_seconds', 'sliding_window_size', 'minimum_requests',
            'failure_rate_threshold', 'slow_request_threshold_seconds',
            'slow_request_rate_threshold'
        ]
        
        for param in required_default_params:
            assert param in default_config, f"Missing circuit breaker parameter: {param}"
            assert isinstance(default_config[param], (int, float))
            assert default_config[param] > 0
        
        # Service-specific breakers
        breakers = circuit_config['breakers']
        required_breakers = ['anthropic_api', 'investigation_agent', 'risk_assessment']
        
        for breaker_name in required_breakers:
            assert breaker_name in breakers, f"Missing circuit breaker configuration: {breaker_name}"
            breaker_config = breakers[breaker_name]
            
            # Should have at least failure_threshold and recovery_timeout
            assert 'failure_threshold' in breaker_config
            assert 'recovery_timeout_seconds' in breaker_config

    def test_cost_optimization_configuration(self, config_data):
        """Test cost optimization configuration validation."""
        opt_config = config_data['cost_optimization']
        
        # Global settings
        assert 'optimization_enabled' in opt_config
        assert isinstance(opt_config['optimization_enabled'], bool)
        
        # Active strategies
        active_strategies = opt_config['active_strategies']
        expected_strategies = [
            'batch_requests', 'cache_responses', 'token_compression',
            'model_downgrade', 'request_deduplication'
        ]
        
        for strategy in expected_strategies:
            assert strategy in active_strategies, f"Missing optimization strategy: {strategy}"
        
        # Cache settings
        cache_settings = opt_config['cache_settings']
        cache_params = ['enabled', 'max_entries', 'default_ttl_seconds', 'cleanup_interval_minutes']
        
        for param in cache_params:
            assert param in cache_settings, f"Missing cache parameter: {param}"
        
        assert isinstance(cache_settings['enabled'], bool)
        assert isinstance(cache_settings['max_entries'], int)
        assert cache_settings['max_entries'] > 0
        
        # Budget limits
        budget_limits = opt_config['budget_limits']
        budget_periods = ['hourly', 'daily', 'weekly', 'monthly']
        
        for period in budget_periods:
            assert period in budget_limits, f"Missing budget period: {period}"
            assert isinstance(budget_limits[period], (int, float))
            assert budget_limits[period] > 0

    def test_cost_tracking_configuration(self, config_data):
        """Test cost tracking configuration validation."""
        tracking_config = config_data['cost_tracking']
        
        # Update intervals
        update_intervals = tracking_config['update_intervals']
        required_intervals = [
            'credit_balance', 'usage_summary', 'budget_alerts', 'performance_metrics'
        ]
        
        for interval in required_intervals:
            assert interval in update_intervals, f"Missing update interval: {interval}"
            assert isinstance(update_intervals[interval], int)
            assert update_intervals[interval] > 0
        
        # WebSocket integration
        websocket_config = tracking_config['websocket']
        assert 'enabled' in websocket_config
        assert isinstance(websocket_config['enabled'], bool)
        
        assert 'broadcast_updates' in websocket_config
        assert isinstance(websocket_config['broadcast_updates'], bool)
        
        update_channels = websocket_config['update_channels']
        expected_channels = ['cost_alerts', 'budget_status', 'optimization_stats']
        
        for channel in expected_channels:
            assert channel in update_channels, f"Missing update channel: {channel}"

    def test_integration_configuration(self, config_data):
        """Test integration configuration validation."""
        integration_config = config_data['integration']
        
        # FastAPI integration
        fastapi_config = integration_config['fastapi']
        fastapi_params = [
            'add_middleware', 'track_endpoint_costs', 'add_cost_headers'
        ]
        
        for param in fastapi_params:
            assert param in fastapi_config, f"Missing FastAPI parameter: {param}"
            assert isinstance(fastapi_config[param], bool)
        
        # Agents integration
        agents_config = integration_config['agents']
        agent_params = [
            'wrap_llm_calls', 'track_agent_costs', 'enable_fallback'
        ]
        
        for param in agent_params:
            assert param in agents_config, f"Missing agents parameter: {param}"
            assert isinstance(agents_config[param], bool)

    def test_logging_configuration(self, config_data):
        """Test logging configuration validation."""
        logging_config = config_data['logging']
        
        # Cost management logging
        cost_logging = logging_config['cost_management']
        logging_params = ['level', 'format', 'outputs']
        
        for param in logging_params:
            assert param in cost_logging, f"Missing logging parameter: {param}"
        
        assert cost_logging['level'] in ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
        assert cost_logging['format'] in ['structured', 'simple']
        assert isinstance(cost_logging['outputs'], list)
        
        # Component-specific logging
        components = logging_config['components']
        required_components = [
            'credit_monitor', 'model_fallback', 'circuit_breaker',
            'cost_optimization', 'cost_tracking'
        ]
        
        for component in required_components:
            assert component in components, f"Missing component logging: {component}"
            assert components[component] in ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']

    def test_emergency_configuration(self, config_data):
        """Test emergency configuration validation."""
        emergency_config = config_data['emergency']
        
        # Emergency settings
        assert 'low_credit_threshold' in emergency_config
        assert isinstance(emergency_config['low_credit_threshold'], (int, float))
        assert emergency_config['low_credit_threshold'] > 0
        
        assert 'emergency_model' in emergency_config
        assert isinstance(emergency_config['emergency_model'], str)
        
        assert 'disable_non_critical' in emergency_config
        assert isinstance(emergency_config['disable_non_critical'], bool)
        
        # Fallback actions
        fallback_actions = emergency_config['fallback_actions']
        expected_actions = [
            'enable_economy_mode', 'disable_caching_writes',
            'prioritize_critical_only', 'send_admin_alerts'
        ]
        
        for action in expected_actions:
            assert action in fallback_actions, f"Missing fallback action: {action}"

    def test_configuration_value_ranges(self, config_data):
        """Test that configuration values are within reasonable ranges."""
        
        # Credit monitor timeouts should be reasonable
        credit_config = config_data['credit_monitor']
        assert 1 <= credit_config['api_timeout_seconds'] <= 300  # 1s to 5 minutes
        assert 1 <= credit_config['cache_duration_minutes'] <= 60  # 1 minute to 1 hour
        
        # Budget limits should be reasonable
        budget_limits = credit_config['budget_limits']
        assert 10 <= budget_limits['daily'] <= 10000  # $10 to $10K per day
        assert budget_limits['daily'] <= budget_limits['weekly'] <= 50000  # Up to $50K per week
        assert budget_limits['weekly'] <= budget_limits['monthly'] <= 200000  # Up to $200K per month
        
        # Model costs should be within expected ranges (per 1K tokens)
        model_costs = credit_config['model_costs']
        for model, costs in model_costs.items():
            assert 0.0001 <= costs['input'] <= 1.0  # $0.0001 to $1 per 1K input tokens
            assert 0.0001 <= costs['output'] <= 2.0  # $0.0001 to $2 per 1K output tokens

    def test_model_cost_hierarchy(self, config_data):
        """Test that model costs follow expected hierarchy."""
        model_costs = config_data['credit_monitor']['model_costs']
        
        # Extract costs for comparison
        opus_4_costs = model_costs['claude-opus-4-1-20250805']
        opus_3_costs = model_costs['claude-3-opus-20240229'] 
        sonnet_costs = model_costs['claude-3-sonnet-20240229']
        haiku_costs = model_costs['claude-3-haiku-20240307']
        
        # Output token costs should follow: Opus > Sonnet > Haiku
        assert opus_4_costs['output'] >= opus_3_costs['output']  # Opus 4.1 >= Opus 3
        assert opus_3_costs['output'] > sonnet_costs['output']   # Opus > Sonnet
        assert sonnet_costs['output'] > haiku_costs['output']    # Sonnet > Haiku
        
        # Input token costs should follow same pattern
        assert opus_4_costs['input'] >= opus_3_costs['input']
        assert opus_3_costs['input'] > sonnet_costs['input']
        assert sonnet_costs['input'] > haiku_costs['input']

    def test_circuit_breaker_parameter_relationships(self, config_data):
        """Test circuit breaker parameter relationships are logical."""
        circuit_config = config_data['circuit_breaker']
        default_config = circuit_config['default_config']
        
        # Thresholds should be logical
        assert default_config['success_threshold'] <= default_config['failure_threshold']
        assert 0 < default_config['failure_rate_threshold'] <= 1
        assert 0 < default_config['slow_request_rate_threshold'] <= 1
        
        # Timeouts should be reasonable
        assert default_config['request_timeout_seconds'] > 0
        assert default_config['recovery_timeout_seconds'] > default_config['request_timeout_seconds']
        
        # Window sizes should be reasonable
        assert default_config['sliding_window_size'] >= default_config['minimum_requests']

    def test_budget_period_consistency(self, config_data):
        """Test budget period consistency across components."""
        
        # Credit monitor budget limits
        credit_budgets = config_data['credit_monitor']['budget_limits']
        
        # Cost optimization budget limits
        opt_budgets = config_data['cost_optimization']['budget_limits']
        
        # Should have consistent daily values
        assert credit_budgets['daily'] == opt_budgets['daily']
        assert credit_budgets['weekly'] == opt_budgets['weekly'] 
        assert credit_budgets['monthly'] == opt_budgets['monthly']

    def test_task_complexity_completeness(self, config_data):
        """Test that all investigation types have complexity mappings."""
        task_complexity = config_data['model_fallback']['task_complexity']
        
        # All complexity levels should be represented
        complexity_levels = set(task_complexity.values())
        expected_levels = {'simple', 'moderate', 'complex', 'critical'}
        assert complexity_levels >= expected_levels, f"Missing complexity levels: {expected_levels - complexity_levels}"
        
        # Critical investigations should use appropriate complexity
        critical_investigations = [
            'synthetic_identity', 'money_laundering', 'first_party_fraud',
            'insider_fraud', 'risk_assessment'
        ]
        
        for investigation in critical_investigations:
            if investigation in task_complexity:
                assert task_complexity[investigation] in ['complex', 'critical'], f"{investigation} should be complex/critical"

    def test_emergency_configuration_consistency(self, config_data):
        """Test emergency configuration is consistent with other settings."""
        emergency_config = config_data['emergency']
        credit_config = config_data['credit_monitor']
        
        # Emergency threshold should be less than minimum balance
        assert emergency_config['low_credit_threshold'] < credit_config['budget_limits']['minimum_balance']
        
        # Emergency model should exist in model costs
        emergency_model = emergency_config['emergency_model']
        model_costs = credit_config['model_costs']
        assert emergency_model in model_costs, f"Emergency model {emergency_model} not in model costs"
        
        # Recovery threshold should be reasonable
        recovery_config = emergency_config['recovery']
        assert recovery_config['auto_resume_threshold'] > emergency_config['low_credit_threshold']

    def test_development_configuration(self, config_data):
        """Test development configuration for testing and debugging."""
        dev_config = config_data['development']
        
        # Development mode flag
        assert 'dev_mode' in dev_config
        assert isinstance(dev_config['dev_mode'], bool)
        
        # Testing configuration
        testing_config = dev_config['testing']
        assert 'use_test_budgets' in testing_config
        assert isinstance(testing_config['use_test_budgets'], bool)
        
        if 'test_budget_limits' in testing_config:
            test_budgets = testing_config['test_budget_limits']
            # Test budgets should be lower than production
            prod_budgets = config_data['credit_monitor']['budget_limits']
            
            for period in ['daily', 'weekly', 'monthly']:
                if period in test_budgets:
                    assert test_budgets[period] < prod_budgets[period], f"Test {period} budget should be lower than production"


class TestConfigurationIntegration:
    """Test configuration integration with system components."""

    @pytest.fixture
    def config_data(self):
        """Load configuration data."""
        with open(CONFIG_PATH, 'r') as f:
            return yaml.safe_load(f)

    def test_configuration_loading_performance(self, config_data):
        """Test configuration loading performance."""
        import time
        
        # Should load quickly
        start_time = time.perf_counter()
        
        for _ in range(100):
            with open(CONFIG_PATH, 'r') as f:
                yaml.safe_load(f)
        
        end_time = time.perf_counter()
        avg_load_time = (end_time - start_time) / 100
        
        # Configuration loading should be fast
        assert avg_load_time < 0.01, f"Configuration loading too slow: {avg_load_time:.4f}s per load"

    def test_configuration_file_size(self):
        """Test configuration file size is reasonable."""
        file_size = CONFIG_PATH.stat().st_size
        
        # Configuration file should not be too large
        assert file_size < 50 * 1024, f"Configuration file too large: {file_size} bytes"
        
        # Should not be empty
        assert file_size > 1000, f"Configuration file too small: {file_size} bytes"

    def test_yaml_syntax_validation(self):
        """Test YAML syntax is valid."""
        try:
            with open(CONFIG_PATH, 'r') as f:
                yaml.safe_load(f)
        except yaml.YAMLError as e:
            pytest.fail(f"Invalid YAML syntax in configuration file: {e}")

    def test_configuration_documentation(self, config_data):
        """Test that configuration is properly documented."""
        # Check for comments/documentation in the original file
        with open(CONFIG_PATH, 'r') as f:
            content = f.read()
        
        # Should have comments explaining major sections
        assert '# ' in content, "Configuration file should have comments for documentation"
        
        # Should have author and date information
        assert 'Author:' in content, "Configuration should have author information"
        assert 'Date:' in content, "Configuration should have date information"
        assert 'Plan:' in content, "Configuration should reference the implementation plan"