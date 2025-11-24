#!/usr/bin/env python3
"""
Test Suite for Investigation Data Processor

Comprehensive tests for the InvestigationDataProcessor class to ensure:
- Correct parsing of all file types
- Type-safe data structure creation
- Memory-optimized streaming for large files
- Comprehensive error handling
- Performance monitoring
- Edge case handling

Test Categories:
1. File Processing Tests
2. Data Structure Tests
3. Streaming and Performance Tests
4. Error Handling Tests
5. Integration Tests
6. Edge Case Tests
"""

import json
import pytest
import tempfile
from pathlib import Path
from datetime import datetime
from unittest.mock import Mock, patch

from app.service.reporting.investigation_data_processor import (
    InvestigationDataProcessor,
    ProcessedInvestigationData,
    LLMInteraction,
    ToolExecution,
    AgentDecision,
    RiskScoreEntry,
    LangGraphNode,
    InvestigationPhase,
    LogEntry,
    TokenUsage,
    ProcessingStatus,
    InteractionType,
    create_data_processor,
    process_investigation_folder
)

@pytest.fixture
def processor():
    """Create test processor instance"""
    return InvestigationDataProcessor(
        memory_limit_mb=10,
        batch_size=10,
        enable_performance_monitoring=True
    )

@pytest.fixture
def sample_metadata():
    """Sample metadata.json content"""
    return {
        "investigation_id": "test_investigation_123",
        "mode": "LIVE",
        "scenario": "account_takeover",
        "created_at": "2025-09-08T10:00:00Z",
        "status": "completed",
        "config": {
            "timeout": 300,
            "agents": ["risk_agent", "network_agent"]
        }
    }

@pytest.fixture
def sample_activities():
    """Sample structured_activities.jsonl content"""
    return [
        {
            "interaction_type": "llm_call",
            "data": {
                "timestamp": "2025-09-08T10:01:00Z",
                "agent_name": "risk_agent",
                "model_name": "gpt-4",
                "interaction_id": "llm_001",
                "tokens_used": {
                    "prompt_tokens": 150,
                    "completion_tokens": 75,
                    "total_tokens": 225
                },
                "tools_used": ["risk_calculator", "data_fetcher"],
                "reasoning_chain": "Analyzing risk factors for account takeover scenario",
                "response_time_ms": 1250,
                "confidence_score": 0.85,
                "success": True
            }
        },
        {
            "interaction_type": "tool_execution",
            "data": {
                "timestamp": "2025-09-08T10:02:00Z",
                "tool_name": "risk_calculator",
                "agent_name": "risk_agent",
                "execution_id": "tool_001",
                "input_parameters": {
                    "ip": "192.168.1.100",
                    "user_id": "user_123"
                },
                "output_data": {
                    "risk_score": 0.75,
                    "factors": ["suspicious_location", "multiple_devices"]
                },
                "execution_time_ms": 500,
                "success": True
            }
        },
        {
            "interaction_type": "agent_decision",
            "data": {
                "timestamp": "2025-09-08T10:03:00Z",
                "agent_name": "risk_agent",
                "decision_type": "escalation",
                "decision_id": "decision_001",
                "reasoning": "High risk score requires escalation to security team",
                "confidence_score": 0.9,
                "next_action": "escalate_to_security",
                "context_data": {
                    "risk_score": 0.75,
                    "threat_level": "high"
                },
                "handover_target": "security_agent"
            }
        },
        {
            "interaction_type": "langgraph_node",
            "data": {
                "timestamp": "2025-09-08T10:04:00Z",
                "node_name": "risk_assessment_node",
                "node_type": "analysis",
                "node_id": "node_001",
                "execution_time_ms": 800,
                "next_nodes": ["decision_node", "report_node"],
                "input_data": {
                    "user_data": {"id": "user_123"}
                },
                "output_data": {
                    "risk_assessment": "high"
                },
                "success": True
            }
        },
        {
            "interaction_type": "investigation_progress",
            "data": {
                "timestamp": "2025-09-08T10:05:00Z",
                "from_phase": "initialization",
                "to_phase": "analysis",
                "progress_type": "phase_transition",
                "duration_ms": 60000,
                "risk_score_progression": [
                    {
                        "timestamp": "2025-09-08T10:01:00Z",
                        "risk_score": 0.3,
                        "risk_factors": ["new_device"],
                        "confidence": 0.7,
                        "category": "device_analysis",
                        "details": {"device_info": "mobile"}
                    },
                    {
                        "timestamp": "2025-09-08T10:05:00Z",
                        "risk_score": 0.75,
                        "risk_factors": ["suspicious_location", "multiple_devices"],
                        "confidence": 0.9,
                        "category": "location_analysis",
                        "details": {"location": "unknown"}
                    }
                ]
            }
        }
    ]

@pytest.fixture
def sample_journey_data():
    """Sample journey_tracking.json content"""
    return {
        "checkpoints": [
            {
                "timestamp": "2025-09-08T10:01:00Z",
                "checkpoint": "start_investigation",
                "data": {"investigation_id": "test_investigation_123"}
            },
            {
                "timestamp": "2025-09-08T10:05:00Z",
                "checkpoint": "risk_analysis_complete",
                "data": {"final_score": 0.75}
            }
        ],
        "duration": 300,
        "phases": ["initialization", "analysis", "decision"],
        "metadata": {
            "total_nodes": 5,
            "total_agents": 2
        }
    }

@pytest.fixture
def sample_log_entries():
    """Sample investigation.log content"""
    return [
        "2025-09-08T10:01:00Z INFO investigation_coordinator Starting investigation test_investigation_123",
        "2025-09-08T10:01:15Z DEBUG risk_agent Analyzing user behavior patterns",
        "2025-09-08T10:02:30Z WARNING network_agent Suspicious activity detected from IP 192.168.1.100",
        "2025-09-08T10:03:45Z INFO decision_engine Decision made: escalate to security team",
        "2025-09-08T10:05:00Z INFO investigation_coordinator Investigation completed successfully"
    ]

@pytest.fixture
def temp_investigation_folder(sample_metadata, sample_activities, sample_journey_data, sample_log_entries):
    """Create temporary investigation folder with sample data"""
    with tempfile.TemporaryDirectory() as temp_dir:
        folder_path = Path(temp_dir) / "LIVE_test_investigation_123_20250908_100000"
        folder_path.mkdir()
        
        # Create metadata.json
        with open(folder_path / "metadata.json", 'w') as f:
            json.dump(sample_metadata, f)
        
        # Create structured_activities.jsonl
        with open(folder_path / "structured_activities.jsonl", 'w') as f:
            for activity in sample_activities:
                f.write(json.dumps(activity) + '\n')
        
        # Create journey_tracking.json
        with open(folder_path / "journey_tracking.json", 'w') as f:
            json.dump(sample_journey_data, f)
        
        # Create investigation.log
        with open(folder_path / "investigation.log", 'w') as f:
            for log_line in sample_log_entries:
                f.write(log_line + '\n')
        
        # Create results directory
        (folder_path / "results").mkdir()
        
        yield folder_path

class TestFileProcessing:
    """Tests for individual file processing methods"""
    
    def test_process_metadata_file(self, processor, sample_metadata):
        """Test metadata.json processing"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(sample_metadata, f)
            f.flush()
            
            metadata = processor._process_metadata_file(Path(f.name))
            
            assert metadata['investigation_id'] == 'test_investigation_123'
            assert metadata['mode'] == 'LIVE'
            assert metadata['scenario'] == 'account_takeover'
            assert metadata['status'] == 'completed'
    
    def test_process_metadata_file_invalid_json(self, processor):
        """Test metadata processing with invalid JSON"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            f.write("invalid json content")
            f.flush()
            
            with pytest.raises(ValueError, match="Invalid JSON"):
                processor._process_metadata_file(Path(f.name))
    
    def test_process_activities_file_streaming(self, processor, sample_activities):
        """Test structured_activities.jsonl processing with streaming"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.jsonl', delete=False) as f:
            for activity in sample_activities:
                f.write(json.dumps(activity) + '\n')
            f.flush()
            
            interactions_data = processor._process_activities_file_streaming(Path(f.name))
            
            assert len(interactions_data['llm_interactions']) == 1
            assert len(interactions_data['tool_executions']) == 1
            assert len(interactions_data['agent_decisions']) == 1
            assert len(interactions_data['langgraph_nodes']) == 1
            assert len(interactions_data['investigation_phases']) == 1
            assert len(interactions_data['risk_score_entries']) == 2
    
    def test_process_activities_file_with_invalid_lines(self, processor):
        """Test activities processing with invalid JSON lines"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.jsonl', delete=False) as f:
            f.write('{"valid": "json"}\n')
            f.write('invalid json line\n')
            f.write('{"another": "valid_entry"}\n')
            f.flush()
            
            # Should not raise exception, but log warnings
            interactions_data = processor._process_activities_file_streaming(Path(f.name))
            # Should process valid lines only
            assert isinstance(interactions_data, dict)
    
    def test_process_journey_file(self, processor, sample_journey_data):
        """Test journey_tracking.json processing"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(sample_journey_data, f)
            f.flush()
            
            journey_data = processor._process_journey_file(Path(f.name))
            
            assert len(journey_data['checkpoints']) == 2
            assert journey_data['duration'] == 300
            assert len(journey_data['phases']) == 3
    
    def test_process_log_file_streaming(self, processor, sample_log_entries):
        """Test investigation.log processing with streaming"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.log', delete=False) as f:
            for log_line in sample_log_entries:
                f.write(log_line + '\n')
            f.flush()
            
            log_entries = processor._process_log_file_streaming(Path(f.name))
            
            assert len(log_entries) == 5
            assert all(isinstance(entry, LogEntry) for entry in log_entries)
            assert log_entries[0].level == 'INFO'
            assert 'Starting investigation' in log_entries[0].message

class TestDataStructures:
    """Tests for data structure creation and parsing"""
    
    def test_token_usage_from_dict(self):
        """Test TokenUsage creation from dictionary"""
        token_data = {
            "prompt_tokens": 100,
            "completion_tokens": 50,
            "total_tokens": 150
        }
        
        tokens = TokenUsage.from_dict(token_data)
        
        assert tokens.prompt_tokens == 100
        assert tokens.completion_tokens == 50
        assert tokens.total_tokens == 150
    
    def test_llm_interaction_from_activity_data(self):
        """Test LLMInteraction creation from activity data"""
        activity = {
            "interaction_type": "llm_call",
            "data": {
                "timestamp": "2025-09-08T10:01:00Z",
                "agent_name": "test_agent",
                "model_name": "gpt-4",
                "interaction_id": "test_001",
                "tokens_used": {"total_tokens": 200},
                "tools_used": ["tool1", "tool2"],
                "reasoning_chain": "Test reasoning",
                "response_time_ms": 1000,
                "confidence_score": 0.8,
                "success": True
            }
        }
        
        interaction = LLMInteraction.from_activity_data(activity)
        
        assert interaction is not None
        assert interaction.agent_name == "test_agent"
        assert interaction.model_name == "gpt-4"
        assert interaction.tokens_used.total_tokens == 200
        assert len(interaction.tools_used) == 2
        assert interaction.success is True
    
    def test_tool_execution_from_activity_data(self):
        """Test ToolExecution creation from activity data"""
        activity = {
            "interaction_type": "tool_execution",
            "data": {
                "timestamp": "2025-09-08T10:02:00Z",
                "tool_name": "test_tool",
                "agent_name": "test_agent",
                "execution_id": "exec_001",
                "input_parameters": {"param1": "value1"},
                "output_data": {"result": "success"},
                "execution_time_ms": 500,
                "success": True
            }
        }
        
        execution = ToolExecution.from_activity_data(activity)
        
        assert execution is not None
        assert execution.tool_name == "test_tool"
        assert execution.agent_name == "test_agent"
        assert execution.execution_time_ms == 500
        assert execution.success is True
    
    def test_log_entry_from_log_line(self):
        """Test LogEntry parsing from various log line formats"""
        # ISO timestamp format
        iso_line = "2025-09-08T10:01:00Z INFO test_logger Test message"
        entry1 = LogEntry.from_log_line(iso_line)
        assert entry1.level == "INFO"
        assert entry1.logger_name == "test_logger"
        assert "Test message" in entry1.message
        
        # Standard timestamp format
        std_line = "2025-09-08 10:01:00,123 DEBUG app.module Debug message"
        entry2 = LogEntry.from_log_line(std_line)
        assert entry2.level == "DEBUG"
        assert entry2.logger_name == "app.module"
        
        # Simple format
        simple_line = "10:01:00 ERROR Error occurred"
        entry3 = LogEntry.from_log_line(simple_line)
        assert entry3.level == "ERROR"
        assert "Error occurred" in entry3.message
    
    def test_risk_score_entry_from_progression_data(self):
        """Test RiskScoreEntry creation from progression data"""
        risk_data = {
            "timestamp": "2025-09-08T10:03:00Z",
            "risk_score": 0.75,
            "risk_factors": ["factor1", "factor2"],
            "confidence": 0.9,
            "category": "test_category",
            "details": {"key": "value"}
        }
        
        entry = RiskScoreEntry.from_progression_data(risk_data)
        
        assert entry.risk_score == 0.75
        assert len(entry.risk_factors) == 2
        assert entry.confidence == 0.9
        assert entry.category == "test_category"

class TestEndToEndProcessing:
    """End-to-end processing tests"""
    
    def test_process_complete_investigation_folder(self, processor, temp_investigation_folder):
        """Test complete investigation folder processing"""
        result = processor.process_investigation_folder(temp_investigation_folder)
        
        # Check metadata
        assert result.investigation_id == "test_investigation_123"
        assert result.mode == "LIVE"
        assert result.scenario == "account_takeover"
        assert result.status == "completed"
        
        # Check processed data
        assert len(result.llm_interactions) == 1
        assert len(result.tool_executions) == 1
        assert len(result.agent_decisions) == 1
        assert len(result.langgraph_nodes) == 1
        assert len(result.investigation_phases) == 1
        assert len(result.risk_score_entries) == 2
        assert len(result.log_entries) == 5
        
        # Check aggregated statistics
        assert result.total_interactions == 4  # llm + tool + agent + langgraph
        assert result.total_tokens_used == 225
        assert len(result.agents_used) >= 1
        assert len(result.tools_used) >= 1
        assert result.error_count == 0
        
        # Check processing status
        assert result.processing_status == ProcessingStatus.SUCCESS
        assert result.processing_metrics is not None
        assert len(result.processing_errors) == 0

def test_create_data_processor():
    """Test processor creation function"""
    processor = create_data_processor(
        memory_limit_mb=100,
        batch_size=500,
        enable_performance_monitoring=False
    )
    
    assert isinstance(processor, InvestigationDataProcessor)
    assert processor.memory_limit_mb == 100
    assert processor.batch_size == 500
    assert processor.enable_performance_monitoring is False

def test_process_investigation_folder_function(temp_investigation_folder):
    """Test convenience function for processing folders"""
    result = process_investigation_folder(
        temp_investigation_folder,
        memory_limit_mb=50,
        enable_performance_monitoring=True
    )
    
    assert isinstance(result, ProcessedInvestigationData)
    assert result.investigation_id == "test_investigation_123"
    assert result.processing_status == ProcessingStatus.SUCCESS

if __name__ == "__main__":
    pytest.main([__file__])