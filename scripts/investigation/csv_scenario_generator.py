#!/usr/bin/env python3
"""
CSV Scenario Generator

Generates CSV files with investigation scenarios for batch processing.
Creates realistic test data based on different fraud patterns and risk profiles.

Features:
- Generate CSV files for batch investigations
- Multiple scenario types and risk levels
- Realistic entity data patterns
- Configurable dataset sizes
- Export formats: CSV, JSON
- Data validation and quality checks

Usage:
    # Generate 100 mixed scenarios
    python csv_scenario_generator.py --count 100 --output scenarios.csv

    # Generate specific scenario types
    python csv_scenario_generator.py --scenario-types account-takeover,payment-fraud --count 50

    # Generate risk-stratified dataset
    python csv_scenario_generator.py --risk-distribution low:20,medium:50,high:25,critical:5 --count 1000

    # Generate with custom parameters
    python csv_scenario_generator.py --template custom_template.json --output custom_scenarios.csv

Author: Gil Klainert
Created: 2025-09-08
Version: 1.0.0
"""

import argparse
import csv
import json
import random
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field

# Add parent directories to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "olorin-server"))

from app.service.logging import get_bridge_logger
logger = get_bridge_logger(__name__)

# Import existing scenario infrastructure
try:
    from olorin_server.tests.fixtures.real_investigation_scenarios import (
        RealScenarioGenerator,
        get_scenario_by_type
    )
except ImportError:
    # Fallback for direct execution
    try:
        sys.path.insert(0, str(Path(__file__).parent.parent.parent / "olorin-server" / "tests" / "fixtures"))
        from real_investigation_scenarios import RealScenarioGenerator, get_scenario_by_type
    except ImportError:
        print("⚠️  Warning: Real investigation scenarios not available. Using basic generator.")
        
        class BasicScenarioGenerator:
            def generate_real_user_data(self, risk_profile="normal"):
                return {
                    "user_id": f"basic_user_{int(time.time())}",
                    "email": f"test_{int(time.time())}@example.com",
                    "risk_profile": risk_profile
                }
        
        RealScenarioGenerator = BasicScenarioGenerator
        
        def get_scenario_by_type(scenario_type, risk_level):
            class BasicScenario:
                def __init__(self):
                    self.user_data = {
                        "user_id": f"basic_{scenario_type}_{int(time.time())}",
                        "email": f"test_{int(time.time())}@example.com"
                    }
                    self.expected_indicators = [f"Basic indicator for {scenario_type}"]
            return BasicScenario()


@dataclass
class ScenarioGenerationConfig:
    """Configuration for scenario generation."""
    
    total_count: int = 100
    scenario_types: List[str] = field(default_factory=list)
    risk_distribution: Dict[str, float] = field(default_factory=dict)
    output_file: str = "generated_scenarios.csv"
    output_format: str = "csv"  # csv, json, both
    include_metadata: bool = True
    validate_output: bool = True
    custom_template: Optional[str] = None
    

class CSVScenarioGenerator:
    """Generates CSV files with investigation scenarios."""
    
    def __init__(self, config: ScenarioGenerationConfig):
        self.config = config
        self.generator = RealScenarioGenerator()
        self.scenario_types = self._get_scenario_types()
        self.risk_levels = ["low", "medium", "high", "critical"]
        
    def _get_scenario_types(self) -> List[str]:
        """Get available scenario types."""
        return [
            "account_takeover",
            "payment_fraud", 
            "identity_fraud",
            "authentication_brute_force",
            "authentication_impossible_travel",
            "authentication_credential_stuffing",
            "money_laundering",
            "device_spoofing"
        ]
    
    def generate_scenarios(self) -> List[Dict[str, Any]]:
        """Generate investigation scenarios based on configuration."""
        
        print(f"\n📊 Generating {self.config.total_count} investigation scenarios")
        print("=" * 60)
        
        scenarios = []
        scenario_distribution = self._calculate_scenario_distribution()
        risk_distribution = self._calculate_risk_distribution()
        
        print(f"📋 Scenario Distribution:")
        for scenario_type, count in scenario_distribution.items():
            print(f"  • {scenario_type}: {count}")
        
        print(f"\n⚠️  Risk Distribution:")
        for risk_level, count in risk_distribution.items():
            print(f"  • {risk_level}: {count}")
        
        print(f"\n⏳ Generating scenarios...")
        
        # Generate scenarios based on distribution
        scenario_counter = 0
        
        for scenario_type, scenario_count in scenario_distribution.items():
            for i in range(scenario_count):
                # Select risk level based on distribution
                risk_level = self._select_risk_level_for_scenario(scenario_type, risk_distribution)
                
                # Generate scenario
                scenario_data = self._generate_single_scenario(
                    scenario_type, 
                    risk_level, 
                    scenario_counter
                )
                
                scenarios.append(scenario_data)
                scenario_counter += 1
                
                # Progress indicator
                if scenario_counter % 50 == 0:
                    print(f"  Generated {scenario_counter}/{self.config.total_count} scenarios...")
        
        print(f"✅ Generated {len(scenarios)} scenarios")
        
        # Shuffle to randomize order
        random.shuffle(scenarios)
        
        # Validate if requested
        if self.config.validate_output:
            self._validate_scenarios(scenarios)
        
        return scenarios
    
    def _calculate_scenario_distribution(self) -> Dict[str, int]:
        """Calculate how many scenarios of each type to generate."""
        
        if self.config.scenario_types:
            # Use specified scenario types
            types = self.config.scenario_types
        else:
            # Use all available scenario types
            types = self.scenario_types
        
        # Distribute count evenly across scenario types
        base_count = self.config.total_count // len(types)
        remainder = self.config.total_count % len(types)
        
        distribution = {}
        for i, scenario_type in enumerate(types):
            distribution[scenario_type] = base_count + (1 if i < remainder else 0)
        
        return distribution
    
    def _calculate_risk_distribution(self) -> Dict[str, int]:
        """Calculate risk level distribution."""
        
        if self.config.risk_distribution:
            # Use specified distribution
            distribution = {}
            total_percent = sum(self.config.risk_distribution.values())
            
            for risk_level, percent in self.config.risk_distribution.items():
                count = int((percent / total_percent) * self.config.total_count)
                distribution[risk_level] = count
        else:
            # Default distribution: more medium/high risk scenarios for testing
            distribution = {
                "low": int(self.config.total_count * 0.15),      # 15%
                "medium": int(self.config.total_count * 0.35),   # 35%
                "high": int(self.config.total_count * 0.35),     # 35%
                "critical": int(self.config.total_count * 0.15)   # 15%
            }
        
        return distribution
    
    def _select_risk_level_for_scenario(
        self, 
        scenario_type: str, 
        risk_distribution: Dict[str, int]
    ) -> str:
        """Select appropriate risk level for a scenario type."""
        
        # Some scenarios are more likely to be high risk
        high_risk_scenarios = [
            "money_laundering",
            "identity_fraud", 
            "authentication_credential_stuffing"
        ]
        
        medium_risk_scenarios = [
            "payment_fraud",
            "authentication_brute_force",
            "authentication_impossible_travel"
        ]
        
        if scenario_type in high_risk_scenarios:
            # Bias toward higher risk levels
            return random.choices(
                self.risk_levels,
                weights=[0.1, 0.2, 0.4, 0.3],  # low, medium, high, critical
                k=1
            )[0]
        elif scenario_type in medium_risk_scenarios:
            # Bias toward medium/high risk
            return random.choices(
                self.risk_levels,
                weights=[0.15, 0.4, 0.35, 0.1],  # low, medium, high, critical
                k=1
            )[0]
        else:
            # Even distribution
            return random.choice(self.risk_levels)
    
    def _generate_single_scenario(
        self,
        scenario_type: str, 
        risk_level: str,
        index: int
    ) -> Dict[str, Any]:
        """Generate a single investigation scenario."""
        
        # Generate base scenario using existing generator
        scenario = get_scenario_by_type(scenario_type, risk_level)
        
        # Extract relevant data for CSV
        timestamp = datetime.now() - timedelta(days=random.randint(0, 30))
        
        scenario_data = {
            "scenario_id": f"{scenario_type}_{index}_{int(time.time())}",
            "entity_id": scenario.user_data.get("user_id", f"entity_{index}_{int(time.time())}"),
            "scenario_type": scenario_type,
            "risk_level": risk_level,
            "timestamp": timestamp.isoformat(),
            
            # User data
            "user_email": scenario.user_data.get("email", f"test{index}@example.com"),
            "user_phone": scenario.user_data.get("phone", f"+1415555{random.randint(1000, 9999)}"),
            "ip": scenario.user_data.get("ip", f"192.0.2.{random.randint(1, 254)}"),
            "account_age_days": self._calculate_account_age(scenario.user_data.get("account_created")),
            
            # Risk indicators
            "failed_login_attempts": scenario.user_data.get("failed_login_attempts", 0),
            "device_changes_24h": scenario.user_data.get("device_changes_24h", 0),
            "ip_country_mismatch": scenario.user_data.get("ip_country_mismatch", False),
            "velocity_spike": scenario.user_data.get("velocity_spike", False),
            
            # Device information
            "browser": scenario.user_data.get("device_fingerprint", {}).get("browser", "Chrome"),
            "os": scenario.user_data.get("device_fingerprint", {}).get("os", "Windows"),
            "screen_resolution": scenario.user_data.get("device_fingerprint", {}).get("screen_resolution", "1920x1080"),
            
            # Expected outcomes
            "expected_risk_score": self._calculate_expected_risk_score(risk_level),
            "expected_indicators": "|".join(scenario.expected_indicators[:5]),  # Top 5 indicators
            
            # Metadata (if enabled)
        }
        
        if self.config.include_metadata:
            scenario_data.update({
                "generated_at": datetime.now().isoformat(),
                "generator_version": "1.0.0",
                "data_source": "real_patterns",
                "validation_status": "pending"
            })
        
        return scenario_data
    
    def _calculate_account_age(self, account_created: Optional[str]) -> int:
        """Calculate account age in days."""
        if not account_created:
            return random.randint(1, 365)
        
        try:
            created_date = datetime.fromisoformat(account_created.replace('Z', '+00:00'))
            age = (datetime.now(created_date.tzinfo) - created_date).days
            return max(0, age)
        except:
            return random.randint(1, 365)
    
    def _calculate_expected_risk_score(self, risk_level: str) -> float:
        """Calculate expected risk score based on risk level."""
        risk_score_ranges = {
            "low": (0.0, 0.3),
            "medium": (0.3, 0.6),
            "high": (0.6, 0.85),
            "critical": (0.85, 1.0)
        }
        
        min_score, max_score = risk_score_ranges.get(risk_level, (0.3, 0.6))
        return round(random.uniform(min_score, max_score), 3)
    
    def _validate_scenarios(self, scenarios: List[Dict[str, Any]]):
        """Validate generated scenarios for quality."""
        
        print(f"\n🔍 Validating {len(scenarios)} scenarios...")
        
        validation_results = {
            "total_scenarios": len(scenarios),
            "unique_entity_ids": len(set(s["entity_id"] for s in scenarios)),
            "scenario_type_coverage": len(set(s["scenario_type"] for s in scenarios)),
            "risk_level_coverage": len(set(s["risk_level"] for s in scenarios)),
            "invalid_scenarios": 0,
            "warnings": []
        }
        
        for scenario in scenarios:
            # Check for required fields
            required_fields = ["entity_id", "scenario_type", "risk_level"]
            for field in required_fields:
                if not scenario.get(field):
                    validation_results["invalid_scenarios"] += 1
                    validation_results["warnings"].append(f"Missing {field} in scenario {scenario.get('scenario_id')}")
            
            # Validate risk score ranges
            risk_level = scenario.get("risk_level")
            expected_risk_score = scenario.get("expected_risk_score", 0)
            
            if risk_level == "low" and expected_risk_score > 0.4:
                validation_results["warnings"].append(f"Risk score {expected_risk_score} too high for low risk scenario")
            elif risk_level == "critical" and expected_risk_score < 0.7:
                validation_results["warnings"].append(f"Risk score {expected_risk_score} too low for critical risk scenario")
        
        # Print validation results
        print(f"✅ Validation Results:")
        print(f"  • Total scenarios: {validation_results['total_scenarios']}")
        print(f"  • Unique entity IDs: {validation_results['unique_entity_ids']}")
        print(f"  • Scenario types: {validation_results['scenario_type_coverage']}")
        print(f"  • Risk levels: {validation_results['risk_level_coverage']}")
        print(f"  • Invalid scenarios: {validation_results['invalid_scenarios']}")
        print(f"  • Warnings: {len(validation_results['warnings'])}")
        
        if validation_results["warnings"]:
            print(f"\n⚠️  Validation Warnings (first 5):")
            for warning in validation_results["warnings"][:5]:
                print(f"    • {warning}")
    
    def export_scenarios(self, scenarios: List[Dict[str, Any]]):
        """Export scenarios to specified format(s)."""
        
        output_path = Path(self.config.output_file)
        output_path.parent.mkdir(exist_ok=True)
        
        if self.config.output_format in ["csv", "both"]:
            self._export_csv(scenarios, output_path.with_suffix(".csv"))
        
        if self.config.output_format in ["json", "both"]:
            self._export_json(scenarios, output_path.with_suffix(".json"))
        
        # Generate summary file
        self._export_summary(scenarios, output_path.with_suffix(".summary.json"))
    
    def _export_csv(self, scenarios: List[Dict[str, Any]], output_file: Path):
        """Export scenarios to CSV format."""
        
        if not scenarios:
            print(f"⚠️  No scenarios to export to CSV")
            return
        
        print(f"📄 Exporting to CSV: {output_file}")
        
        # Get all possible field names
        all_fields = set()
        for scenario in scenarios:
            all_fields.update(scenario.keys())
        
        # Sort fields for consistent ordering
        fieldnames = sorted(list(all_fields))
        
        with open(output_file, 'w', newline='') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(scenarios)
        
        print(f"✅ CSV exported: {len(scenarios)} scenarios, {len(fieldnames)} fields")
    
    def _export_json(self, scenarios: List[Dict[str, Any]], output_file: Path):
        """Export scenarios to JSON format."""
        
        print(f"📄 Exporting to JSON: {output_file}")
        
        export_data = {
            "metadata": {
                "generated_at": datetime.now().isoformat(),
                "total_scenarios": len(scenarios),
                "generator_config": self.config.__dict__,
                "version": "1.0.0"
            },
            "scenarios": scenarios
        }
        
        with open(output_file, 'w') as jsonfile:
            json.dump(export_data, jsonfile, indent=2, default=str)
        
        print(f"✅ JSON exported: {len(scenarios)} scenarios")
    
    def _export_summary(self, scenarios: List[Dict[str, Any]], output_file: Path):
        """Export generation summary."""
        
        # Calculate statistics
        scenario_type_counts = {}
        risk_level_counts = {}
        
        for scenario in scenarios:
            scenario_type = scenario.get("scenario_type", "unknown")
            risk_level = scenario.get("risk_level", "unknown")
            
            scenario_type_counts[scenario_type] = scenario_type_counts.get(scenario_type, 0) + 1
            risk_level_counts[risk_level] = risk_level_counts.get(risk_level, 0) + 1
        
        summary = {
            "generation_summary": {
                "total_scenarios": len(scenarios),
                "generated_at": datetime.now().isoformat(),
                "output_files": [str(output_file).replace(".summary.json", ext) for ext in [".csv", ".json"]],
                "config": self.config.__dict__
            },
            "statistics": {
                "scenario_types": scenario_type_counts,
                "risk_levels": risk_level_counts,
                "average_expected_risk_score": sum(s.get("expected_risk_score", 0) for s in scenarios) / len(scenarios) if scenarios else 0
            },
            "sample_scenarios": scenarios[:3] if len(scenarios) > 3 else scenarios,
            "usage_instructions": {
                "batch_runner": f"python batch_investigation_runner.py --csv-file {output_file.with_suffix('.csv')}",
                "limited_run": f"python batch_investigation_runner.py --csv-file {output_file.with_suffix('.csv')} --csv-limit 10"
            }
        }
        
        with open(output_file, 'w') as f:
            json.dump(summary, f, indent=2, default=str)
        
        print(f"📋 Summary exported: {output_file}")


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="CSV Scenario Generator for Investigation Testing",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Generate 100 mixed scenarios
    python csv_scenario_generator.py --count 100 --output test_scenarios.csv
    
    # Generate specific scenario types
    python csv_scenario_generator.py --scenario-types account_takeover,payment_fraud --count 50
    
    # Risk-stratified dataset
    python csv_scenario_generator.py --risk-distribution low:10,medium:40,high:40,critical:10 --count 200
    
    # Generate with metadata and validation
    python csv_scenario_generator.py --count 500 --format both --metadata --validate
        """
    )
    
    # Generation parameters
    parser.add_argument(
        "--count",
        type=int,
        default=100,
        help="Number of scenarios to generate (default: 100)"
    )
    
    parser.add_argument(
        "--scenario-types",
        type=str,
        help="Comma-separated list of scenario types to generate"
    )
    
    parser.add_argument(
        "--risk-distribution",
        type=str,
        help="Risk distribution as level:count pairs (e.g., 'low:20,high:80')"
    )
    
    # Output options
    parser.add_argument(
        "--output",
        type=str,
        default="generated_scenarios.csv",
        help="Output file path (default: generated_scenarios.csv)"
    )
    
    parser.add_argument(
        "--format",
        choices=["csv", "json", "both"],
        default="csv",
        help="Output format (default: csv)"
    )
    
    parser.add_argument(
        "--metadata",
        action="store_true",
        help="Include metadata fields in output"
    )
    
    parser.add_argument(
        "--validate",
        action="store_true",
        help="Validate generated scenarios for quality"
    )
    
    parser.add_argument(
        "--template",
        type=str,
        help="Custom template JSON file for scenario generation"
    )
    
    args = parser.parse_args()
    
    # Parse scenario types
    scenario_types = []
    if args.scenario_types:
        scenario_types = [s.strip() for s in args.scenario_types.split(",")]
    
    # Parse risk distribution
    risk_distribution = {}
    if args.risk_distribution:
        for pair in args.risk_distribution.split(","):
            if ":" in pair:
                level, count = pair.split(":", 1)
                risk_distribution[level.strip()] = float(count.strip())
    
    # Create configuration
    config = ScenarioGenerationConfig(
        total_count=args.count,
        scenario_types=scenario_types,
        risk_distribution=risk_distribution,
        output_file=args.output,
        output_format=args.format,
        include_metadata=args.metadata,
        validate_output=args.validate,
        custom_template=args.template
    )
    
    try:
        # Generate scenarios
        generator = CSVScenarioGenerator(config)
        scenarios = generator.generate_scenarios()
        
        # Export scenarios
        generator.export_scenarios(scenarios)
        
        print(f"\n✅ Scenario generation completed successfully!")
        print(f"📊 Generated {len(scenarios)} scenarios")
        print(f"📄 Output: {config.output_file}")
        print(f"\n💡 Usage:")
        print(f"  python batch_investigation_runner.py --csv-file {config.output_file}")
        print(f"  python batch_investigation_runner.py --csv-file {config.output_file} --csv-limit 10 --mode mock")
        
    except Exception as e:
        logger.error(f"Scenario generation failed: {e}")
        print(f"\n❌ Scenario generation failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()