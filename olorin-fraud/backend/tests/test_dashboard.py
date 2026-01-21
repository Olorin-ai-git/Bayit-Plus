#!/usr/bin/env python3
"""
Interactive Test Dashboard
Provides an overview of the organized test structure and easy test execution
"""
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Dict, List

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))


class TestDashboard:
    """Interactive dashboard for test organization and execution."""

    def __init__(self):
        self.test_root = Path(__file__).parent
        self.categories = {
            "structured": {
                "description": "Structured investigation tests",
                "files": [],
                "featured_command": "poetry run python tests/structured/run_all_scenarios.py",
            },
            "patterns": {
                "description": "Pattern-specific tests",
                "files": [],
                "featured_command": "poetry run pytest tests/patterns/ -v",
            },
            "tools": {
                "description": "Tool integration tests",
                "files": [],
                "featured_command": "poetry run python tests/tools/multi_tool_demo.py",
            },
            "integration": {
                "description": "End-to-end integration tests",
                "files": [],
                "featured_command": "poetry run pytest tests/integration/ -v",
            },
            "performance": {
                "description": "Performance benchmark tests",
                "files": [],
                "featured_command": "poetry run pytest tests/performance/ -v",
            },
            "unit": {
                "description": "Unit tests",
                "files": [],
                "featured_command": "poetry run pytest tests/unit/ -v",
            },
        }
        self.scan_test_structure()

    def scan_test_structure(self):
        """Scan the test directories to populate file lists."""
        for category in self.categories.keys():
            category_path = self.test_root / category
            if category_path.exists():
                test_files = list(category_path.glob("*.py"))
                test_files = [f for f in test_files if f.name != "__init__.py"]
                self.categories[category]["files"] = sorted(
                    [f.name for f in test_files]
                )

    def display_structure(self):
        """Display the organized test structure."""
        print("=" * 80)
        print("🧪 OLORIN TEST DASHBOARD")
        print("=" * 80)
        print()
        print("📁 Organized Test Structure:")
        print()

        total_files = 0

        for category, info in self.categories.items():
            file_count = len(info["files"])
            total_files += file_count

            print(f"  📂 {category.upper()}/")
            print(f"     {info['description']}")
            print(f"     Files: {file_count}")

            if info["files"]:
                for file in info["files"][:3]:  # Show first 3 files
                    print(f"       - {file}")
                if len(info["files"]) > 3:
                    print(f"       ... and {len(info['files']) - 3} more")
            else:
                print(f"       (No test files found)")

            print()

        print(f"📊 Total Test Files: {total_files}")
        print()

    def display_featured_commands(self):
        """Display featured commands for each category."""
        print("🚀 Featured Test Commands:")
        print("=" * 50)

        for category, info in self.categories.items():
            if info["files"]:  # Only show if category has files
                print(f"\n🔹 {category.upper()}")
                print(f"   {info['featured_command']}")

        print(f"\n🔹 ALL TESTS")
        print(f"   poetry run pytest tests/ -v --cov=app")
        print()

    def display_structured_scenarios(self):
        """Display available structured investigation scenarios."""
        print("🔍 Structured Investigation Scenarios:")
        print("=" * 50)

        scenarios = [
            "1. Device Spoofing - Detects fake device fingerprints",
            "2. Account Takeover (ATO) - Identifies unauthorized access",
            "3. Location Anomaly - Flags geographic inconsistencies",
            "4. Velocity Abuse - Catches rapid request patterns",
            "5. Credential Stuffing - Detects automated login attempts",
            "6. Payment Fraud - Identifies suspicious transactions",
            "7. Identity Theft - Validates user identity claims",
            "8. Bot Detection - Distinguishes bots from humans",
            "9. Multi-Account Fraud - Links related fraudulent accounts",
            "10. Session Hijacking - Detects stolen sessions",
        ]

        for scenario in scenarios:
            print(f"   {scenario}")

        print()
        print("Run all scenarios:")
        print("   poetry run python tests/structured/run_all_scenarios.py")
        print()
        print("Run specific scenarios (e.g., 1, 3, 5):")
        print(
            "   poetry run python tests/structured/run_all_scenarios.py --scenarios 1 3 5"
        )
        print()

    def display_tool_integration(self):
        """Display available tool integrations."""
        print("🛠️  Multi-Tool Integration Tests:")
        print("=" * 50)

        tools = [
            "Splunk - Log analysis and correlation",
            "Snowflake - Data warehouse queries",
            "SumoLogic - Security event monitoring",
            "Parallel Execution - All tools run concurrently",
            "Result Correlation - Cross-tool validation",
        ]

        for tool in tools:
            print(f"   • {tool}")

        print()
        print("Run multi-tool demo:")
        print("   poetry run python tests/tools/multi_tool_demo.py")
        print()
        print("Run LLM tool interaction:")
        print("   poetry run python tests/tools/llm_tool_interaction_demo.py")
        print()

    def show_quick_start(self):
        """Display quick start commands."""
        print("⚡ Quick Start Commands:")
        print("=" * 50)

        quick_commands = [
            (
                "Run all structured scenarios",
                "poetry run python tests/structured/run_all_scenarios.py",
            ),
            (
                "Run enhanced structured test",
                "poetry run python tests/structured/enhanced_structured_investigation_test.py",
            ),
            (
                "Test multi-tool integration",
                "poetry run python tests/tools/multi_tool_demo.py",
            ),
            ("Run OpenAI pattern tests", "poetry run pytest tests/patterns/ -v"),
            (
                "Run all tests with coverage",
                "poetry run pytest tests/ -v --cov=app --cov-report=html",
            ),
        ]

        for description, command in quick_commands:
            print(f"\n🔸 {description}:")
            print(f"   {command}")

        print()

    def interactive_menu(self):
        """Display interactive menu for test execution."""
        while True:
            print("\n" + "=" * 80)
            print("🎛️  INTERACTIVE TEST MENU")
            print("=" * 80)

            menu_options = [
                "1. Run all structured scenarios",
                "2. Run specific structured scenario",
                "3. Test multi-tool integration",
                "4. Run pattern tests",
                "5. Run all tests with coverage",
                "6. Show test structure",
                "7. Show structured scenarios",
                "8. Show tool integrations",
                "0. Exit",
            ]

            for option in menu_options:
                print(f"   {option}")

            try:
                choice = input(f"\nSelect option (0-8): ").strip()

                if choice == "0":
                    print("👋 Goodbye!")
                    break
                elif choice == "1":
                    self.run_command(
                        "poetry run python tests/structured/run_all_scenarios.py"
                    )
                elif choice == "2":
                    scenario_id = input("Enter scenario ID (1-10): ").strip()
                    if scenario_id.isdigit() and 1 <= int(scenario_id) <= 10:
                        self.run_command(
                            f"poetry run python tests/structured/run_all_scenarios.py --scenarios {scenario_id}"
                        )
                    else:
                        print("❌ Invalid scenario ID")
                elif choice == "3":
                    self.run_command("poetry run python tests/tools/multi_tool_demo.py")
                elif choice == "4":
                    self.run_command("poetry run pytest tests/patterns/ -v")
                elif choice == "5":
                    self.run_command("poetry run pytest tests/ -v --cov=app")
                elif choice == "6":
                    self.display_structure()
                elif choice == "7":
                    self.display_structured_scenarios()
                elif choice == "8":
                    self.display_tool_integration()
                else:
                    print("❌ Invalid choice")

            except KeyboardInterrupt:
                print("\n👋 Goodbye!")
                break
            except Exception as e:
                print(f"❌ Error: {e}")

    def run_command(self, command: str):
        """Execute a test command."""
        print(f"\n🚀 Executing: {command}")
        print("-" * 50)

        try:
            # Change to the olorin-server directory
            os.chdir(self.test_root.parent)

            # Run the command
            result = subprocess.run(command.split(), capture_output=True, text=True)

            if result.stdout:
                print(result.stdout)
            if result.stderr:
                print("STDERR:", result.stderr)

            print(f"\n✅ Command completed with return code: {result.returncode}")

        except Exception as e:
            print(f"❌ Error executing command: {e}")

        input("\nPress Enter to continue...")


def main():
    """Main function."""
    dashboard = TestDashboard()

    # Show structure overview
    dashboard.display_structure()
    dashboard.display_featured_commands()
    dashboard.display_structured_scenarios()
    dashboard.display_tool_integration()
    dashboard.show_quick_start()

    # Ask if user wants interactive mode
    try:
        response = input("🎛️  Start interactive menu? (y/N): ").strip().lower()
        if response in ["y", "yes"]:
            dashboard.interactive_menu()
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")


if __name__ == "__main__":
    main()
