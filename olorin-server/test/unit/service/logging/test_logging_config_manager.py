"""
Unit tests for LoggingConfigManager

Tests configuration loading from multiple sources, priority resolution,
validation, and YAML file management.

Author: Gil Klainert
Date: 2025-01-04
Plan: /docs/plans/2025-01-04-unified-logging-system-plan.md
"""

import pytest
import os
import yaml
import tempfile
import argparse
from pathlib import Path
from unittest.mock import patch, Mock

from app.service.logging.logging_config_manager import (
    LoggingConfigManager,
    LoggingConfig,
)
from app.service.logging.unified_logging_core import LogFormat, LogOutput


@pytest.fixture
def temp_config_dir():
    """Create temporary directory for configuration files"""
    temp_dir = tempfile.mkdtemp()
    yield Path(temp_dir)
    
    # Cleanup
    import shutil
    shutil.rmtree(temp_dir)


@pytest.fixture
def sample_yaml_config():
    """Sample YAML configuration for testing"""
    return {
        'unified_logging': {
            'log_level': 'INFO',
            'log_format': 'json',
            'log_outputs': ['console', 'file'],
            'async_logging': True,
            'buffer_size': 2000,
            'lazy_initialization': False,
            'suppress_noisy_loggers': True,
            'performance_monitoring': False,
            'file_path': 'logs/custom_server.log',
            'max_file_size': 20971520,
            'backup_count': 10,
        }
    }


@pytest.fixture
def sample_args():
    """Sample command-line arguments for testing"""
    args = argparse.Namespace()
    args.log_level = 'DEBUG'
    args.log_format = 'structured'
    args.log_output = 'console,json_file'
    args.async_logging = True
    args.buffer_size = 3000
    args.suppress_noisy = False
    args.performance_monitoring = True
    return args


class TestLoggingConfig:
    """Test cases for LoggingConfig dataclass"""
    
    def test_default_values(self):
        """Test default configuration values"""
        config = LoggingConfig()
        
        assert config.log_level == "WARNING"
        assert config.log_format == LogFormat.HUMAN
        assert config.log_outputs == [LogOutput.CONSOLE]
        assert config.async_logging is False
        assert config.buffer_size == 1000
        assert config.lazy_initialization is True
        assert config.suppress_noisy_loggers is True
        assert config.performance_monitoring is True
    
    def test_to_dict_conversion(self):
        """Test conversion to dictionary"""
        config = LoggingConfig(
            log_level="INFO",
            log_format=LogFormat.JSON,
            log_outputs=[LogOutput.CONSOLE, LogOutput.FILE],
            async_logging=True
        )
        
        config_dict = config.to_dict()
        
        assert config_dict['log_level'] == 'INFO'
        assert config_dict['log_format'] == 'json'
        assert config_dict['log_outputs'] == ['console', 'file']
        assert config_dict['async_logging'] is True


class TestLoggingConfigManager:
    """Test cases for LoggingConfigManager class"""
    
    def test_initialization(self):
        """Test configuration manager initialization"""
        manager = LoggingConfigManager()
        
        assert manager._config_file_path == "config/logging_config.yaml"
        assert manager._cached_config is None
        
        # Test custom config path
        manager_custom = LoggingConfigManager("custom/path/config.yaml")
        assert manager_custom._config_file_path == "custom/path/config.yaml"
    
    def test_load_default_configuration(self):
        """Test loading default configuration when no sources available"""
        manager = LoggingConfigManager("nonexistent/config.yaml")
        
        # Mock environment to be empty
        with patch.dict(os.environ, {}, clear=True):
            config = manager.load_configuration()
        
        # Should return default configuration
        assert config.log_level == "WARNING"
        assert config.log_format == LogFormat.HUMAN
        assert config.log_outputs == [LogOutput.CONSOLE]
        assert config.async_logging is False
    
    def test_load_yaml_configuration(self, temp_config_dir, sample_yaml_config):
        """Test loading configuration from YAML file"""
        config_file = temp_config_dir / "test_config.yaml"
        
        with open(config_file, 'w') as f:
            yaml.dump(sample_yaml_config, f)
        
        manager = LoggingConfigManager(str(config_file))
        
        with patch.dict(os.environ, {}, clear=True):
            config = manager.load_configuration()
        
        assert config.log_level == "INFO"
        assert config.log_format == LogFormat.JSON
        assert LogOutput.CONSOLE in config.log_outputs
        assert LogOutput.FILE in config.log_outputs
        assert config.async_logging is True
        assert config.buffer_size == 2000
        assert config.lazy_initialization is False
    
    def test_load_environment_configuration(self):
        """Test loading configuration from environment variables"""
        env_vars = {
            'OLORIN_LOG_LEVEL': 'DEBUG',
            'OLORIN_LOG_FORMAT': 'structured',
            'OLORIN_LOG_OUTPUT': 'console,json_file',
            'OLORIN_LOG_ASYNC': 'true',
            'OLORIN_LOG_BUFFER_SIZE': '1500',
            'OLORIN_LOG_LAZY_INIT': 'false',
            'OLORIN_LOG_SUPPRESS_NOISY': 'false',
            'OLORIN_LOG_PERFORMANCE': 'true',
        }
        
        manager = LoggingConfigManager("nonexistent/config.yaml")
        
        with patch.dict(os.environ, env_vars, clear=True):
            config = manager.load_configuration()
        
        assert config.log_level == "DEBUG"
        assert config.log_format == LogFormat.STRUCTURED
        assert LogOutput.CONSOLE in config.log_outputs
        assert LogOutput.JSON_FILE in config.log_outputs
        assert config.async_logging is True
        assert config.buffer_size == 1500
        assert config.lazy_initialization is False
        assert config.suppress_noisy_loggers is False
        assert config.performance_monitoring is True
    
    def test_load_args_configuration(self, sample_args):
        """Test loading configuration from command-line arguments"""
        manager = LoggingConfigManager("nonexistent/config.yaml")
        
        with patch.dict(os.environ, {}, clear=True):
            config = manager.load_configuration(args=sample_args)
        
        assert config.log_level == "DEBUG"
        assert config.log_format == LogFormat.STRUCTURED
        assert LogOutput.CONSOLE in config.log_outputs
        assert LogOutput.JSON_FILE in config.log_outputs
        assert config.async_logging is True
        assert config.buffer_size == 3000
        assert config.suppress_noisy_loggers is False
        assert config.performance_monitoring is True
    
    def test_configuration_priority(self, temp_config_dir, sample_yaml_config, sample_args):
        """Test configuration source priority (args > env > yaml > defaults)"""
        # Setup YAML config
        config_file = temp_config_dir / "priority_test.yaml"
        with open(config_file, 'w') as f:
            yaml.dump(sample_yaml_config, f)
        
        # Setup environment variables (should override YAML)
        env_vars = {
            'OLORIN_LOG_LEVEL': 'ERROR',  # Different from YAML (INFO)
            'OLORIN_LOG_FORMAT': 'human',  # Different from YAML (json)
        }
        
        # Args should override everything
        sample_args.log_level = 'CRITICAL'  # Should override env and YAML
        
        manager = LoggingConfigManager(str(config_file))
        
        with patch.dict(os.environ, env_vars, clear=True):
            config = manager.load_configuration(args=sample_args)
        
        # Args should take priority
        assert config.log_level == "CRITICAL"
        
        # Env should override YAML where args don't specify
        assert config.log_format == LogFormat.STRUCTURED  # From args
        
        # YAML values should be used where env and args don't specify
        assert config.buffer_size == 3000  # From args
    
    def test_configuration_caching(self):
        """Test configuration caching behavior"""
        manager = LoggingConfigManager("nonexistent/config.yaml")
        
        with patch.dict(os.environ, {}, clear=True):
            config1 = manager.load_configuration()
            config2 = manager.load_configuration()  # Should use cached version
        
        # Should return same instance (cached)
        assert config1 is config2
        
        # Test force reload
        config3 = manager.load_configuration(force_reload=True)
        assert config3 is not config1  # New instance
    
    def test_env_value_conversion(self):
        """Test environment variable value type conversion"""
        manager = LoggingConfigManager()
        
        # Test boolean conversion
        assert manager._convert_env_value('async_logging', 'true') is True
        assert manager._convert_env_value('async_logging', '1') is True
        assert manager._convert_env_value('async_logging', 'false') is False
        assert manager._convert_env_value('async_logging', '0') is False
        
        # Test integer conversion
        assert manager._convert_env_value('buffer_size', '2000') == 2000
        assert manager._convert_env_value('buffer_size', 'invalid') is None
        
        # Test float conversion
        assert manager._convert_env_value('flush_interval', '5.5') == 5.5
        assert manager._convert_env_value('flush_interval', 'invalid') is None
        
        # Test enum conversion
        assert manager._convert_env_value('log_format', 'json') == LogFormat.JSON
        assert manager._convert_env_value('log_format', 'invalid') is None
        
        # Test list conversion
        outputs = manager._convert_env_value('log_outputs', 'console,file,json_file')
        assert LogOutput.CONSOLE in outputs
        assert LogOutput.FILE in outputs
        assert LogOutput.JSON_FILE in outputs
        
        # Test string conversion (default)
        assert manager._convert_env_value('file_path', '/custom/path') == '/custom/path'
    
    def test_configuration_validation(self):
        """Test configuration validation"""
        manager = LoggingConfigManager("nonexistent/config.yaml")
        
        # Create config with invalid values
        config = LoggingConfig(
            log_level="INVALID",
            log_outputs=[],
            buffer_size=-100,
            max_file_size=-1,
            backup_count=-5
        )
        
        manager._validate_configuration(config)
        
        # Should correct invalid values
        assert config.log_level == "WARNING"  # Corrected from INVALID
        assert config.log_outputs == [LogOutput.CONSOLE]  # Default added
        assert config.buffer_size == 1000  # Corrected from -100
        assert config.max_file_size == 10 * 1024 * 1024  # Corrected from -1
        assert config.backup_count == 5  # Corrected from -5
    
    def test_command_line_parser(self):
        """Test enhanced command-line argument parser"""
        manager = LoggingConfigManager()
        parser = manager.get_enhanced_command_line_parser()
        
        # Test with various arguments
        test_args = [
            '--log-level', 'DEBUG',
            '--log-format', 'json',
            '--log-output', 'console,file',
            '--async-logging',
            '--buffer-size', '2000',
            '--suppress-noisy',
            '--performance-monitoring'
        ]
        
        args = parser.parse_args(test_args)
        
        assert args.log_level == 'DEBUG'
        assert args.log_format == 'json'
        assert args.log_output == 'console,file'
        assert args.async_logging is True
        assert args.buffer_size == 2000
        assert args.suppress_noisy is True
        assert args.performance_monitoring is True
    
    def test_yaml_config_update(self, temp_config_dir):
        """Test updating YAML configuration file"""
        config_file = temp_config_dir / "update_test.yaml"
        
        manager = LoggingConfigManager(str(config_file))
        
        config = LoggingConfig(
            log_level="INFO",
            log_format=LogFormat.JSON,
            async_logging=True,
            buffer_size=2000
        )
        
        # Update YAML file
        success = manager.update_yaml_config_file(config)
        assert success is True
        assert config_file.exists()
        
        # Read back and verify
        with open(config_file, 'r') as f:
            yaml_data = yaml.safe_load(f)
        
        unified_config = yaml_data['unified_logging']
        assert unified_config['log_level'] == 'INFO'
        assert unified_config['log_format'] == 'json'
        assert unified_config['async_logging'] is True
        assert unified_config['buffer_size'] == 2000
    
    def test_cache_management(self):
        """Test configuration cache management"""
        manager = LoggingConfigManager("nonexistent/config.yaml")
        
        # Load configuration (should be cached)
        with patch.dict(os.environ, {}, clear=True):
            config1 = manager.load_configuration()
        
        assert manager._cached_config is not None
        
        # Clear cache
        manager.clear_cache()
        assert manager._cached_config is None
        
        # Load again (should create new instance)
        with patch.dict(os.environ, {}, clear=True):
            config2 = manager.load_configuration()
        
        assert config1 is not config2
    
    def test_configuration_summary(self):
        """Test configuration summary generation"""
        env_vars = {
            'OLORIN_LOG_LEVEL': 'INFO',
            'OLORIN_LOG_FORMAT': 'json',
        }
        
        manager = LoggingConfigManager("test/config.yaml")
        
        with patch.dict(os.environ, env_vars, clear=True):
            config = manager.load_configuration()
            summary = manager.get_configuration_summary()
        
        assert 'configuration' in summary
        assert 'sources' in summary
        assert 'validation_status' in summary
        
        assert summary['configuration']['log_level'] == 'INFO'
        assert summary['sources']['config_file'] == 'test/config.yaml'
        assert 'OLORIN_LOG_LEVEL' in summary['sources']['environment_variables']
        assert summary['validation_status'] == 'valid'
    
    def test_yaml_error_handling(self, temp_config_dir):
        """Test handling of invalid YAML files"""
        config_file = temp_config_dir / "invalid.yaml"
        
        # Create invalid YAML file
        with open(config_file, 'w') as f:
            f.write("invalid: yaml: content: [unclosed")
        
        manager = LoggingConfigManager(str(config_file))
        
        # Should handle error gracefully and return default config
        with patch.dict(os.environ, {}, clear=True):
            config = manager.load_configuration()
        
        # Should fall back to defaults
        assert config.log_level == "WARNING"
        assert config.log_format == LogFormat.HUMAN


class TestIntegration:
    """Integration test cases"""
    
    def test_full_configuration_flow(self, temp_config_dir):
        """Test complete configuration flow with all sources"""
        # Create YAML config
        yaml_config = {
            'unified_logging': {
                'log_level': 'INFO',
                'log_format': 'json',
                'async_logging': True,
                'buffer_size': 1500,
            }
        }
        
        config_file = temp_config_dir / "full_test.yaml"
        with open(config_file, 'w') as f:
            yaml.dump(yaml_config, f)
        
        # Environment variables (should override YAML)
        env_vars = {
            'OLORIN_LOG_LEVEL': 'DEBUG',
            'OLORIN_LOG_OUTPUT': 'console,file',
        }
        
        # Command-line args (should override everything)
        args = argparse.Namespace()
        args.log_level = 'ERROR'
        args.log_format = 'structured'
        
        manager = LoggingConfigManager(str(config_file))
        
        with patch.dict(os.environ, env_vars, clear=True):
            config = manager.load_configuration(args=args)
        
        # Verify priority resolution
        assert config.log_level == "ERROR"  # From args (highest priority)
        assert config.log_format == LogFormat.STRUCTURED  # From args
        assert LogOutput.CONSOLE in config.log_outputs  # From env
        assert LogOutput.FILE in config.log_outputs  # From env
        assert config.async_logging is True  # From YAML
        assert config.buffer_size == 1500  # From YAML


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])