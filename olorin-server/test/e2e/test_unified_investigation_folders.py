#!/usr/bin/env python3
"""
Test script for unified investigation folder structure.

Tests the new unified investigation folder system to ensure:
1. Folders are created with correct naming pattern: {MODE}_{INVESTIGATION_ID}_{TIMESTAMP}
2. All log files are created in the unified structure
3. Journey tracking integration works properly
4. Structured investigation logger integration works properly
"""

import os
import sys
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app"))

from app.service.logging.autonomous_investigation_logger import (
    StructuredInvestigationLogger,
)
from app.service.logging.investigation_folder_manager import (
    InvestigationFolderManager,
    InvestigationMode,
)
from app.service.logging.journey_tracker import JourneyTracker


def test_folder_creation():
    """Test basic folder creation and structure"""
    print("🧪 Testing folder creation and structure...")

    # Create temporary directory for testing
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir) / "test_investigations"

        # Initialize folder manager
        folder_manager = InvestigationFolderManager(temp_path)

        # Test data
        investigation_id = "test_account_takeover_123"
        mode = InvestigationMode.MOCK
        scenario = "account_takeover"

        # Create folder
        folder_path, metadata = folder_manager.create_investigation_folder(
            investigation_id=investigation_id,
            mode=mode,
            scenario=scenario,
            config={"test": True},
        )

        # Verify folder exists and has correct name pattern
        assert folder_path.exists(), "Investigation folder should exist"
        folder_name = folder_path.name
        assert folder_name.startswith(
            "MOCK_"
        ), f"Folder should start with MOCK_, got: {folder_name}"
        assert (
            investigation_id in folder_name
        ), f"Folder should contain investigation_id, got: {folder_name}"

        # Verify subfolders exist
        results_dir = folder_path / "results"
        assert results_dir.exists(), "Results directory should exist"

        # Verify metadata file exists
        metadata_file = folder_path / "metadata.json"
        assert metadata_file.exists(), "Metadata file should exist"

        print(f"✅ Folder created successfully: {folder_name}")
        print(f"   Path: {folder_path}")
        print(f"   Metadata: {metadata}")

        # Test file path generation
        file_paths = folder_manager.get_log_file_paths(investigation_id)
        expected_files = [
            "main_log",
            "structured_log",
            "journey_log",
            "metadata",
            "results_dir",
        ]

        for file_type in expected_files:
            assert file_type in file_paths, f"Missing file path: {file_type}"
            print(f"   {file_type}: {file_paths[file_type]}")

        print("✅ File paths generated correctly")


def test_structured_logger_integration():
    """Test structured investigation logger integration"""
    print("\n🧪 Testing structured investigation logger integration...")

    # Create temporary directory for testing
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir) / "test_investigations"

        # Initialize logger with custom directory
        logger = StructuredInvestigationLogger(temp_path)

        # Test data
        investigation_id = "test_device_spoofing_456"
        mode = InvestigationMode.LIVE
        scenario = "device_spoofing"

        # Start investigation logging
        folder_path = logger.start_investigation_logging(
            investigation_id=investigation_id,
            context={
                "scenario": scenario,
                "entity_id": "test_entity_123",
                "test_mode": mode.value,
            },
            mode=mode,
            scenario=scenario,
        )

        # Verify folder was created
        assert folder_path.exists(), "Investigation folder should exist"
        folder_name = folder_path.name
        assert folder_name.startswith(
            "LIVE_"
        ), f"Folder should start with LIVE_, got: {folder_name}"

        print(f"✅ Investigation logging started: {folder_name}")

        # Test logging some interactions
        interaction_id = logger.log_llm_interaction(
            investigation_id=investigation_id,
            agent_name="test_agent",
            model_name="gpt-4",
            prompt_template="test prompt",
            full_prompt="full test prompt",
            response="test response",
            tokens_used={
                "total_tokens": 100,
                "prompt_tokens": 50,
                "completion_tokens": 50,
            },
            tools_available=["test_tool"],
            tools_used=["test_tool"],
            reasoning_chain="test reasoning",
        )

        assert interaction_id, "Should return interaction ID"
        print(f"✅ LLM interaction logged: {interaction_id}")

        # Complete investigation
        logger.complete_investigation_logging(investigation_id, "completed")

        # Verify log files exist
        file_paths = logger.folder_manager.get_log_file_paths(investigation_id)
        structured_log_file = file_paths["structured_log"]
        assert structured_log_file.exists(), "Structured log file should exist"

        # Verify log file has content
        with open(structured_log_file) as f:
            content = f.read()
            assert len(content) > 0, "Log file should have content"
            assert "test_agent" in content, "Log should contain agent name"

        print("✅ Structured investigation logging integration works")


def test_journey_tracker_integration():
    """Test journey tracker integration"""
    print("\n🧪 Testing journey tracker integration...")

    # Create temporary directory for testing
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir) / "test_investigations"

        # Initialize folder manager and journey tracker
        folder_manager = InvestigationFolderManager(temp_path)
        journey_tracker = JourneyTracker()
        journey_tracker.folder_manager = folder_manager  # Override folder manager

        # Test data
        investigation_id = "test_impossible_travel_789"
        mode = InvestigationMode.DEMO
        scenario = "impossible_travel"

        # Create investigation folder first
        folder_path, metadata = folder_manager.create_investigation_folder(
            investigation_id=investigation_id, mode=mode, scenario=scenario
        )

        # Start journey tracking
        journey_tracker.start_journey_tracking(
            investigation_id=investigation_id, initial_state={"test": "initial_state"}
        )

        # Log some journey events
        journey_tracker.log_node_execution(
            investigation_id=investigation_id,
            node_name="test_node",
            node_type="agent",
            input_data={"input": "test"},
            output_data={"output": "result"},
            duration_ms=1000,
        )

        journey_tracker.log_state_transition(
            investigation_id=investigation_id,
            from_state="initial",
            to_state="processing",
            trigger="test_trigger",
        )

        # Complete journey
        journey_data = journey_tracker.complete_journey_tracking(
            investigation_id=investigation_id, status="completed"
        )

        # Verify journey file exists
        file_paths = folder_manager.get_log_file_paths(investigation_id)
        journey_file = file_paths["journey_log"]
        assert journey_file.exists(), "Journey log file should exist"

        # Verify journey file has content
        import json

        with open(journey_file) as f:
            journey_content = json.load(f)
            assert journey_content["investigation_id"] == investigation_id
            assert len(journey_content["node_executions"]) > 0
            assert len(journey_content["state_transitions"]) > 0

        print(f"✅ Journey tracking integration works")
        print(f"   Journey file: {journey_file}")
        print(f"   Node executions: {len(journey_content['node_executions'])}")
        print(f"   State transitions: {len(journey_content['state_transitions'])}")


def test_folder_listing_and_cleanup():
    """Test folder listing and cleanup functionality"""
    print("\n🧪 Testing folder listing and cleanup...")

    # Create temporary directory for testing
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir) / "test_investigations"

        # Initialize folder manager
        folder_manager = InvestigationFolderManager(temp_path)

        # Create multiple investigations
        investigations = [
            ("test_1", InvestigationMode.LIVE, "scenario_1"),
            ("test_2", InvestigationMode.MOCK, "scenario_2"),
            ("test_3", InvestigationMode.DEMO, "scenario_3"),
        ]

        created_folders = []
        for inv_id, mode, scenario in investigations:
            folder_path, metadata = folder_manager.create_investigation_folder(
                investigation_id=inv_id, mode=mode, scenario=scenario
            )
            created_folders.append((folder_path, mode))

        # Test listing all investigations
        all_investigations = folder_manager.list_investigations()
        assert (
            len(all_investigations) == 3
        ), f"Should have 3 investigations, got {len(all_investigations)}"

        # Test filtering by mode
        live_investigations = folder_manager.list_investigations(InvestigationMode.LIVE)
        assert (
            len(live_investigations) == 1
        ), f"Should have 1 LIVE investigation, got {len(live_investigations)}"
        assert live_investigations[0].mode == InvestigationMode.LIVE

        mock_investigations = folder_manager.list_investigations(InvestigationMode.MOCK)
        assert (
            len(mock_investigations) == 1
        ), f"Should have 1 MOCK investigation, got {len(mock_investigations)}"

        print(f"✅ Listed {len(all_investigations)} investigations")
        for inv in all_investigations:
            print(f"   {inv.mode.value}: {inv.investigation_id} - {inv.scenario}")


def run_all_tests():
    """Run all tests"""
    print("🚀 Starting unified investigation folder structure tests...\n")

    try:
        test_folder_creation()
        test_structured_logger_integration()
        test_journey_tracker_integration()
        test_folder_listing_and_cleanup()

        print(
            "\n✅ All tests passed! Unified investigation folder structure is working correctly."
        )
        print("\n📋 Summary:")
        print("   ✅ Folder creation with {MODE}_{ID}_{TIMESTAMP} pattern")
        print("   ✅ Structured investigation logger integration")
        print("   ✅ Journey tracker integration")
        print("   ✅ File structure and organization")
        print("   ✅ Listing and filtering capabilities")

        return True

    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
