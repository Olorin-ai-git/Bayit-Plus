#!/usr/bin/env python3
"""
Quick Investigation Launcher

A streamlined, user-friendly launcher for running quick investigation scenarios
without complex configuration. Provides simple commands and intuitive interface
for common investigation tasks.

Features:
- Simple command interface
- Quick scenario shortcuts
- Interactive mode selection
- Real-time progress display
- Instant results summary
- Easy report access

Usage:
    # Quick account takeover check
    python quick_investigation_launcher.py account-takeover user_12345

    # Interactive mode
    python quick_investigation_launcher.py --interactive

    # Quick batch of common scenarios
    python quick_investigation_launcher.py --quick-batch

    # Live investigation with approval
    python quick_investigation_launcher.py payment-fraud user_67890 --live

Author: Gil Klainert
Created: 2025-09-08
Version: 1.0.0
"""

import asyncio
import argparse
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional

# Add parent directories to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "olorin-server"))

from app.service.logging import get_bridge_logger
logger = get_bridge_logger(__name__)

# Import scenario runners
from scenario_investigation_runner import ScenarioInvestigationRunner
from batch_investigation_runner import BatchInvestigationRunner, BatchInvestigationConfig


class QuickInvestigationLauncher:
    """Quick and easy investigation launcher."""
    
    def __init__(self):
        self.scenario_runner = ScenarioInvestigationRunner()
        self.shortcuts = self._setup_shortcuts()
        
    def _setup_shortcuts(self) -> Dict[str, str]:
        """Setup quick scenario shortcuts."""
        return {
            # Common fraud scenarios
            "takeover": "account-takeover",
            "ato": "account-takeover", 
            "payment": "payment-fraud",
            "fraud": "payment-fraud",
            "identity": "identity-fraud",
            "id": "identity-fraud",
            "brute": "authentication-brute-force",
            "bruteforce": "authentication-brute-force",
            "travel": "impossible-travel",
            "impossible": "impossible-travel",
            "stuffing": "credential-stuffing",
            "creds": "credential-stuffing",
            "laundering": "money-laundering",
            "aml": "money-laundering",
            "device": "device-spoofing",
            "spoof": "device-spoofing",
            
            # Risk level shortcuts
            "low": "low-risk-check",
            "med": "medium-risk-check", 
            "high": "high-risk-check",
            "crit": "critical-risk-check",
            
            # Special shortcuts
            "demo": "account-takeover",  # Use account-takeover for demo
            "test": "device-spoofing",   # Use device-spoofing for test (quick scenario)
            "quick": "device-spoofing"   # Use device-spoofing for quick check
        }
    
    async def run_quick_investigation(
        self,
        scenario_shortcut: str,
        entity_id: str,
        mode: str = "mock",
        verbose: bool = False
    ) -> Dict[str, Any]:
        """Run a quick investigation with simplified interface."""
        
        # Resolve scenario shortcut
        scenario_id = self.shortcuts.get(scenario_shortcut, scenario_shortcut)
        
        # Special handling for risk-level shortcuts
        if scenario_shortcut in ["low", "med", "high", "crit"]:
            scenario_id = "account-takeover"  # Default scenario for risk checks
            risk_level = {
                "low": "low", 
                "med": "medium",
                "high": "high", 
                "crit": "critical"
            }[scenario_shortcut]
        else:
            risk_level = None
        
        print(f"\n🚀 Quick Investigation Launcher")
        print("=" * 40)
        print(f"🎯 Scenario: {scenario_id}")
        print(f"👤 Entity: {entity_id}")
        print(f"🎮 Mode: {mode.upper()}")
        
        if mode == "live":
            print(f"\n🚨💰 LIVE MODE - Real API costs apply!")
            response = input("Continue? (y/N): ")
            if response.lower() != 'y':
                print("❌ Cancelled.")
                return {}
        
        print(f"\n⏳ Starting investigation...")
        start_time = time.time()
        
        try:
            # Run the investigation
            if risk_level:
                result = await self.scenario_runner.run_custom_scenario(
                    entity_id=entity_id,
                    scenario_type="account_takeover",
                    risk_level=risk_level,
                    mode=mode
                )
            else:
                result = await self.scenario_runner.run_scenario(
                    scenario_id=scenario_id,
                    entity_id=entity_id,
                    mode=mode,
                    verbose=verbose
                )
            
            execution_time = time.time() - start_time
            
            # Display quick results
            self._display_quick_results(result, execution_time)
            
            return result
            
        except Exception as e:
            print(f"\n❌ Investigation failed: {e}")
            if verbose:
                logger.exception("Investigation error details")
            raise
    
    async def run_interactive_mode(self):
        """Run interactive investigation selection."""
        
        print(f"\n🎛️  Interactive Investigation Mode")
        print("=" * 40)
        
        # List available scenarios
        print(f"\n📋 Available Scenarios:")
        scenarios = list(self.scenario_runner.scenarios.keys())
        for i, scenario in enumerate(scenarios, 1):
            template = self.scenario_runner.scenarios[scenario]
            print(f"  {i}. {scenario} ({template.risk_level} risk)")
        
        print(f"\n🔗 Quick Shortcuts:")
        shortcuts_display = []
        for shortcut, full_name in list(self.shortcuts.items())[:8]:
            shortcuts_display.append(f"{shortcut}→{full_name}")
        print(f"  {', '.join(shortcuts_display)}")
        
        # Get user selection
        while True:
            selection = input(f"\n🔍 Enter scenario number, name, or shortcut: ").strip()
            
            if selection.isdigit():
                idx = int(selection) - 1
                if 0 <= idx < len(scenarios):
                    scenario_id = scenarios[idx]
                    break
            elif selection in scenarios:
                scenario_id = selection
                break
            elif selection in self.shortcuts:
                scenario_id = self.shortcuts[selection]
                if scenario_id in scenarios:
                    break
            
            print(f"❌ Invalid selection: {selection}")
        
        # Get entity ID
        entity_id = input(f"👤 Enter entity ID (or press Enter for auto-generate): ").strip()
        if not entity_id:
            entity_id = f"interactive_{int(time.time())}"
        
        # Get mode
        mode = input(f"🎮 Mode - (m)ock or (l)ive? [m]: ").strip().lower()
        mode = "live" if mode in ["l", "live"] else "mock"
        
        # Run investigation
        return await self.run_quick_investigation(scenario_id, entity_id, mode, verbose=True)
    
    async def run_quick_batch(self, mode: str = "mock", count: int = 3) -> Dict[str, Any]:
        """Run a quick batch of common scenarios."""
        
        print(f"\n🎯 Quick Batch Investigation")
        print("=" * 40)
        print(f"🎮 Mode: {mode.upper()}")
        print(f"📊 Scenarios: {count} common fraud scenarios")
        
        # Select most common scenarios
        common_scenarios = [
            "account-takeover",
            "payment-fraud", 
            "authentication-brute-force"
        ][:count]
        
        # Configure batch runner
        config = BatchInvestigationConfig(
            scenarios=common_scenarios,
            mode=mode,
            concurrent_workers=min(3, count),
            timeout_per_investigation=180,  # Shorter timeout for quick batch
            generate_html_report=True,
            verbose=True
        )
        
        # Run batch
        batch_runner = BatchInvestigationRunner(config)
        result = await batch_runner.run_batch_investigations()
        
        return result
    
    def _display_quick_results(self, result: Dict[str, Any], execution_time: float):
        """Display quick results summary."""
        
        print(f"\n✅ Investigation Completed!")
        print("=" * 40)
        print(f"⏱️  Execution Time: {execution_time:.1f} seconds")
        
        # Extract key information
        summary = result.get("investigation_summary", {})
        risk = result.get("risk_assessment", {})
        validation = result.get("validation", {})
        
        # Risk assessment
        risk_score = risk.get("risk_score", 0)
        risk_level = risk.get("risk_level", "unknown")
        
        risk_indicator = "🟢" if risk_score < 0.3 else "🟡" if risk_score < 0.7 else "🔴"
        print(f"{risk_indicator} Risk Score: {risk_score:.2f} ({risk_level})")
        
        # Indicators found
        indicators_found = risk.get("indicators_found", [])
        indicators_expected = risk.get("indicators_expected", [])
        
        if indicators_found:
            print(f"🎯 Key Findings:")
            for indicator in indicators_found[:3]:  # Show top 3
                print(f"  • {indicator}")
        
        # Performance metrics
        success_rate = validation.get("success_rate", 0)
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        # Mode-specific information
        technical = result.get("technical_details", {})
        metrics = technical.get("execution_metrics", {})
        
        if summary.get("execution_mode") == "live":
            cost = metrics.get("estimated_cost", 0)
            tokens = metrics.get("tokens_used", 0)
            print(f"💰 Cost: ${cost:.4f}")
            print(f"🎫 Tokens: {tokens:,}")
        
        # Recommendations
        recommendations = risk.get("recommendations", [])
        if recommendations:
            print(f"\n💡 Recommendations:")
            for rec in recommendations[:2]:  # Show top 2
                print(f"  • {rec}")
        
        print("=" * 40)
    
    def list_shortcuts(self):
        """List all available shortcuts."""
        
        print(f"\n🔗 Quick Investigation Shortcuts")
        print("=" * 50)
        
        categories = {
            "Fraud Scenarios": [
                ("takeover, ato", "Account takeover investigation"),
                ("payment, fraud", "Payment fraud analysis"),
                ("identity, id", "Identity fraud detection"),
                ("brute, bruteforce", "Brute force attack analysis"),
                ("travel, impossible", "Impossible travel detection"),
                ("stuffing, creds", "Credential stuffing analysis"),
                ("laundering, aml", "Money laundering investigation"),
                ("device, spoof", "Device spoofing detection")
            ],
            "Risk Levels": [
                ("low", "Low risk assessment"),
                ("med", "Medium risk assessment"), 
                ("high", "High risk assessment"),
                ("crit", "Critical risk assessment")
            ],
            "Special": [
                ("demo", "Demo investigation"),
                ("test", "Test investigation"),
                ("quick", "Quick security check")
            ]
        }
        
        for category, shortcuts in categories.items():
            print(f"\n📋 {category}:")
            for shortcut, description in shortcuts:
                print(f"  {shortcut:<15} → {description}")
        
        print(f"\n💡 Usage Examples:")
        print(f"  python quick_investigation_launcher.py takeover user_123")
        print(f"  python quick_investigation_launcher.py payment user_456 --live")
        print(f"  python quick_investigation_launcher.py high user_789")


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Quick Investigation Launcher",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Quick Examples:
    # Account takeover check
    python quick_investigation_launcher.py takeover user_123
    
    # Payment fraud with live APIs (costs money!)
    python quick_investigation_launcher.py payment user_456 --live
    
    # High risk assessment
    python quick_investigation_launcher.py high user_789
    
    # Interactive mode
    python quick_investigation_launcher.py --interactive
    
    # Quick batch test
    python quick_investigation_launcher.py --quick-batch
    
    # List all shortcuts
    python quick_investigation_launcher.py --shortcuts
        """
    )
    
    # Positional arguments for quick usage
    parser.add_argument(
        "scenario",
        nargs="?",
        help="Scenario shortcut or full name (use --shortcuts to list all)"
    )
    
    parser.add_argument(
        "entity_id", 
        nargs="?",
        help="Entity ID to investigate (auto-generated if not provided)"
    )
    
    # Mode options
    parser.add_argument(
        "--live",
        action="store_true",
        help="Use live mode (costs money - requires approval)"
    )
    
    parser.add_argument(
        "--mock", 
        action="store_true",
        help="Use mock mode (default)"
    )
    
    # Special modes
    parser.add_argument(
        "--interactive",
        action="store_true",
        help="Run in interactive mode"
    )
    
    parser.add_argument(
        "--quick-batch",
        action="store_true",
        help="Run quick batch of common scenarios"
    )
    
    parser.add_argument(
        "--batch-count",
        type=int,
        default=3,
        help="Number of scenarios for quick batch (default: 3)"
    )
    
    # Utility options
    parser.add_argument(
        "--shortcuts",
        action="store_true",
        help="List all available shortcuts"
    )
    
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose output"
    )
    
    args = parser.parse_args()
    
    # Initialize launcher
    launcher = QuickInvestigationLauncher()
    
    try:
        if args.shortcuts:
            launcher.list_shortcuts()
            return
        
        if args.interactive:
            print("🎛️  Starting interactive mode...")
            asyncio.run(launcher.run_interactive_mode())
            return
        
        if args.quick_batch:
            mode = "live" if args.live else "mock"
            print("🎯 Starting quick batch...")
            asyncio.run(launcher.run_quick_batch(mode, args.batch_count))
            return
        
        if not args.scenario:
            print("❌ Error: Scenario required (use --interactive or --shortcuts for help)")
            parser.print_help()
            sys.exit(1)
        
        # Generate entity ID if not provided
        entity_id = args.entity_id or f"quick_{int(time.time())}"
        
        # Determine mode
        mode = "live" if args.live else "mock"
        
        # Run quick investigation
        print(f"🚀 Launching quick investigation...")
        result = asyncio.run(launcher.run_quick_investigation(
            args.scenario,
            entity_id,
            mode,
            args.verbose
        ))
        
        print(f"\n✅ Quick investigation completed!")
        
    except KeyboardInterrupt:
        print(f"\n⚠️  Investigation cancelled by user.")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Quick investigation failed: {e}")
        print(f"\n❌ Quick investigation failed: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()