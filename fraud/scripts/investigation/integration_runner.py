#!/usr/bin/env python3
"""
Investigation Scenario Integration Runner

This script integrates the new investigation scenario templates with the existing
Olorin structured investigation infrastructure. It acts as a bridge between the
new scenario system and the existing bash orchestration scripts.

Features:
- Integrates with run-structured-investigation.sh
- Uses existing unified_structured_test_runner.py 
- Provides scenario-based configuration for existing infrastructure
- Maintains compatibility with existing monitoring and reporting
- Adds scenario template capabilities to existing system

Usage:
    # Run via existing bash script with scenario templates
    python integration_runner.py --scenario account-takeover --generate-bash-args

    # Generate configuration for existing scripts
    python integration_runner.py --scenario payment-fraud --output-config

Author: Gil Klainert
Created: 2025-09-08
Version: 1.0.0
"""

import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional

# Add parent directories to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "olorin-server"))

from app.service.logging import get_bridge_logger
logger = get_bridge_logger(__name__)

# Import scenario templates
from scenario_investigation_runner import ScenarioInvestigationRunner, InvestigationScenarioTemplate


class InvestigationIntegrationRunner:
    """Integrates scenario templates with existing Olorin infrastructure."""
    
    def __init__(self):
        self.scenario_runner = ScenarioInvestigationRunner()
        self.olorin_root = Path(__file__).parent.parent.parent
        self.bash_script = self.olorin_root / "olorin-server" / "scripts" / "run-structured-investigation.sh"
        self.test_runner = self.olorin_root / "olorin-server" / "scripts" / "testing" / "unified_structured_test_runner.py"
        
    def generate_bash_args_for_scenario(
        self, 
        scenario_id: str,
        entity_id: Optional[str] = None,
        mode: str = "mock",
        **kwargs
    ) -> List[str]:
        """Generate bash script arguments for a specific scenario."""
        
        if scenario_id not in self.scenario_runner.scenarios:
            available = ", ".join(self.scenario_runner.scenarios.keys())
            raise ValueError(f"Unknown scenario: {scenario_id}. Available: {available}")
        
        template = self.scenario_runner.scenarios[scenario_id]
        
        # Map our scenario IDs to existing bash script scenario names
        scenario_mapping = {
            "account-takeover": "account_takeover",
            "payment-fraud": "velocity_fraud",  # Map to closest existing
            "identity-fraud": "synthetic_identity",  # Map to closest existing
            "authentication-brute-force": "account_takeover",  # Similar pattern
            "impossible-travel": "location_impossible_travel",  # Direct match
            "credential-stuffing": "account_takeover",  # Similar pattern
            "money-laundering": "money_laundering",  # Direct match
            "device-spoofing": "device_spoofing",  # Direct match
            "ip-anomaly-detection": "ip_anomaly_detection"  # New IP-based scenario
        }
        
        mapped_scenario = scenario_mapping.get(scenario_id, "device_spoofing")
        
        # Build arguments for the bash script
        args = []
        
        # Scenario selection
        args.extend(["--scenario", mapped_scenario])
        
        # Mode
        args.extend(["--mode", mode])
        
        # Entity investigation if provided
        if entity_id:
            args.extend(["--entity-id", entity_id])
            args.extend(["--entity-type", "user_id"])  # Default type
        
        # Enhanced monitoring based on scenario complexity
        if template.risk_level in ["high", "critical"]:
            args.extend(["--show-all"])  # Full monitoring for high risk
            args.extend(["--verbose"])
        else:
            args.extend(["--show-websocket", "--show-llm"])  # Basic monitoring
        
        # Timeout based on expected duration
        timeout = template.expected_duration_minutes * 60 + 60  # Add buffer
        args.extend(["--timeout", str(timeout)])
        
        # Always generate HTML report
        args.extend(["--html-report"])
        
        # Concurrent execution for faster results
        args.extend(["--concurrent", "2"])
        
        return args
    
    def run_scenario_via_bash(
        self, 
        scenario_id: str,
        entity_id: Optional[str] = None,
        mode: str = "mock",
        **kwargs
    ) -> subprocess.CompletedProcess:
        """Run a scenario using the existing bash orchestration script."""
        
        print(f"\n🔗 Integrating scenario '{scenario_id}' with existing Olorin infrastructure")
        print("=" * 70)
        
        # Generate bash arguments
        bash_args = self.generate_bash_args_for_scenario(
            scenario_id, entity_id, mode, **kwargs
        )
        
        # Build full command
        cmd = [str(self.bash_script)] + bash_args
        
        print(f"🚀 Executing: {' '.join(cmd)}")
        print(f"📂 Working directory: {self.olorin_root}")
        print()
        
        # Execute the bash script
        try:
            result = subprocess.run(
                cmd,
                cwd=str(self.olorin_root),
                capture_output=False,  # Let output stream directly
                text=True,
                timeout=kwargs.get('timeout', 600)
            )
            
            if result.returncode == 0:
                print(f"\n✅ Scenario '{scenario_id}' completed successfully via existing infrastructure")
            else:
                print(f"\n❌ Scenario '{scenario_id}' failed with exit code: {result.returncode}")
            
            return result
            
        except subprocess.TimeoutExpired:
            print(f"\n⏰ Scenario '{scenario_id}' timed out")
            raise
        except Exception as e:
            print(f"\n💥 Error executing scenario '{scenario_id}': {e}")
            raise
    
    def generate_config_for_existing_scripts(
        self, 
        scenario_id: str,
        output_file: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate configuration file for existing scripts."""
        
        if scenario_id not in self.scenario_runner.scenarios:
            available = ", ".join(self.scenario_runner.scenarios.keys())
            raise ValueError(f"Unknown scenario: {scenario_id}. Available: {available}")
        
        template = self.scenario_runner.scenarios[scenario_id]
        
        # Generate configuration
        config = {
            "scenario_template": {
                "id": scenario_id,
                "name": template.name,
                "description": template.description,
                "risk_level": template.risk_level,
                "expected_duration_minutes": template.expected_duration_minutes,
                "expected_indicators": template.expected_indicators
            },
            "bash_script_args": self.generate_bash_args_for_scenario(scenario_id),
            "unified_runner_config": {
                "scenario_type": template.scenario_type,
                "mode": "mock",
                "timeout": template.expected_duration_minutes * 60 + 60,
                "monitoring": {
                    "websocket": True,
                    "llm": template.risk_level in ["high", "critical"],
                    "agents": template.risk_level in ["high", "critical"],
                    "verbose": template.risk_level in ["high", "critical"]
                }
            },
            "integration_notes": {
                "generated_at": datetime.now().isoformat(),
                "compatible_with": [
                    "run-structured-investigation.sh",
                    "unified_structured_test_runner.py",
                    "test_structured_investigation.sh"
                ],
                "usage": [
                    f"./olorin-server/scripts/run-structured-investigation.sh {' '.join(self.generate_bash_args_for_scenario(scenario_id))}",
                    f"python integration_runner.py --run-scenario {scenario_id}"
                ]
            }
        }
        
        # Save to file if requested
        if output_file:
            output_path = Path(output_file)
            output_path.parent.mkdir(exist_ok=True)
            
            with open(output_path, 'w') as f:
                json.dump(config, f, indent=2, default=str)
            
            print(f"📄 Configuration saved to: {output_path}")
        
        return config
    
    def run_all_scenarios_via_bash(
        self, 
        mode: str = "mock",
        concurrent: int = 1
    ) -> Dict[str, Any]:
        """Run all scenarios using existing infrastructure."""
        
        print(f"\n🎯 Running all {len(self.scenario_runner.scenarios)} scenarios via existing infrastructure")
        print("=" * 80)
        
        results = {}
        
        for scenario_id in self.scenario_runner.scenarios.keys():
            print(f"\n📋 Running scenario: {scenario_id}")
            print("-" * 50)
            
            try:
                start_time = time.time()
                
                result = self.run_scenario_via_bash(
                    scenario_id,
                    mode=mode,
                    timeout=600
                )
                
                execution_time = time.time() - start_time
                
                results[scenario_id] = {
                    "status": "completed" if result.returncode == 0 else "failed",
                    "execution_time": execution_time,
                    "exit_code": result.returncode,
                    "timestamp": datetime.now().isoformat()
                }
                
            except Exception as e:
                logger.error(f"Scenario {scenario_id} failed: {e}")
                results[scenario_id] = {
                    "status": "error",
                    "error": str(e),
                    "timestamp": datetime.now().isoformat()
                }
        
        # Summary
        completed = sum(1 for r in results.values() if r.get("status") == "completed")
        failed = len(results) - completed
        
        print(f"\n📊 BATCH RESULTS SUMMARY")
        print("=" * 30)
        print(f"✅ Completed: {completed}/{len(results)}")
        print(f"❌ Failed: {failed}/{len(results)}")
        print(f"📈 Success Rate: {(completed/len(results)*100):.1f}%")
        
        return results
    
    def validate_existing_infrastructure(self) -> Dict[str, bool]:
        """Validate that existing infrastructure is available."""
        
        print("🔍 Validating existing Olorin infrastructure...")
        
        validation = {}
        
        # Check bash script
        validation["bash_script"] = self.bash_script.exists()
        if validation["bash_script"]:
            print(f"✅ Found bash script: {self.bash_script}")
        else:
            print(f"❌ Missing bash script: {self.bash_script}")
        
        # Check unified test runner
        validation["unified_runner"] = self.test_runner.exists()
        if validation["unified_runner"]:
            print(f"✅ Found unified runner: {self.test_runner}")
        else:
            print(f"❌ Missing unified runner: {self.test_runner}")
        
        # Check if bash script is executable
        validation["bash_executable"] = os.access(self.bash_script, os.X_OK) if self.bash_script.exists() else False
        if validation["bash_executable"]:
            print("✅ Bash script is executable")
        else:
            print("❌ Bash script is not executable")
        
        # Check Poetry availability
        try:
            result = subprocess.run(["poetry", "--version"], capture_output=True, timeout=10)
            validation["poetry"] = result.returncode == 0
        except:
            validation["poetry"] = False
        
        if validation["poetry"]:
            print("✅ Poetry is available")
        else:
            print("❌ Poetry is not available")
        
        # Overall status
        all_valid = all(validation.values())
        
        if all_valid:
            print("✅ All infrastructure components are available")
        else:
            missing = [k for k, v in validation.items() if not v]
            print(f"❌ Missing components: {', '.join(missing)}")
        
        return validation


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Investigation Scenario Integration Runner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Integration Examples:
    # Run scenario via existing bash infrastructure
    python integration_runner.py --run-scenario account-takeover --mode mock
    
    # Generate configuration for existing scripts  
    python integration_runner.py --scenario payment-fraud --output-config scenario_config.json
    
    # Generate bash arguments for manual execution
    python integration_runner.py --scenario device-spoofing --generate-bash-args
    
    # Run all scenarios via existing infrastructure
    python integration_runner.py --run-all-scenarios --mode mock
    
    # Validate existing infrastructure
    python integration_runner.py --validate
        """
    )
    
    # Main actions
    parser.add_argument(
        "--run-scenario",
        type=str,
        help="Run specific scenario via existing bash infrastructure"
    )
    
    parser.add_argument(
        "--run-all-scenarios",
        action="store_true",
        help="Run all scenarios via existing infrastructure"
    )
    
    parser.add_argument(
        "--generate-bash-args",
        type=str,
        help="Generate bash script arguments for scenario"
    )
    
    parser.add_argument(
        "--output-config",
        type=str,
        help="Generate configuration file for existing scripts"
    )
    
    parser.add_argument(
        "--validate",
        action="store_true",
        help="Validate existing infrastructure components"
    )
    
    # Parameters
    parser.add_argument(
        "--entity-id",
        type=str,
        help="Entity ID to investigate"
    )
    
    parser.add_argument(
        "--mode",
        choices=["mock", "live"],
        default="mock",
        help="Investigation mode (default: mock)"
    )
    
    parser.add_argument(
        "--timeout",
        type=int,
        default=600,
        help="Timeout in seconds (default: 600)"
    )
    
    # Legacy compatibility
    parser.add_argument(
        "--scenario",
        type=str,
        help="Scenario for configuration generation (legacy)"
    )
    
    args = parser.parse_args()
    
    # Initialize integration runner
    integration_runner = InvestigationIntegrationRunner()
    
    try:
        if args.validate:
            validation = integration_runner.validate_existing_infrastructure()
            if not all(validation.values()):
                sys.exit(1)
        
        elif args.run_scenario:
            result = integration_runner.run_scenario_via_bash(
                args.run_scenario,
                entity_id=args.entity_id,
                mode=args.mode,
                timeout=args.timeout
            )
            sys.exit(result.returncode)
        
        elif args.run_all_scenarios:
            results = integration_runner.run_all_scenarios_via_bash(
                mode=args.mode
            )
            # Exit with failure if any scenario failed
            failed = sum(1 for r in results.values() if r.get("status") != "completed")
            sys.exit(1 if failed > 0 else 0)
        
        elif args.generate_bash_args:
            bash_args = integration_runner.generate_bash_args_for_scenario(
                args.generate_bash_args,
                entity_id=args.entity_id,
                mode=args.mode
            )
            print(f"Bash arguments for scenario '{args.generate_bash_args}':")
            print(" ".join(bash_args))
        
        elif args.scenario and args.output_config:
            config = integration_runner.generate_config_for_existing_scripts(
                args.scenario,
                args.output_config
            )
            print("Configuration generated successfully!")
        
        else:
            print("❌ Error: Must specify an action (--run-scenario, --validate, etc.)")
            parser.print_help()
            sys.exit(1)
    
    except Exception as e:
        logger.error(f"Integration runner failed: {e}")
        print(f"\n❌ Integration runner failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()