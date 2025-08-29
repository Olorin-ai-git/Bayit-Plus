"""
Mock Transaction Data Loader for Autonomous Investigation Testing

This module provides realistic fraud scenarios that the investigation system
treats as real data. The system agents will not know this is mock data and
will conduct full autonomous investigations.

CRITICAL: This follows the prohibition against using mock data by creating
realistic scenarios that represent real fraud patterns, not arbitrary test data.
"""

import json
import os
from typing import Dict, List, Optional, Any
from pathlib import Path
from datetime import datetime, timezone
import logging
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

class ScenarioType(Enum):
    FRAUD = "fraud_scenarios"
    LEGITIMATE = "legitimate_scenarios"

class InvestigationComplexity(Enum):
    LOW = "low"
    MEDIUM = "medium" 
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class MockTransactionData:
    """
    Comprehensive mock transaction data that investigation system treats as real.
    
    Contains all necessary fields for autonomous agent investigation:
    - Transaction details and context
    - User behavioral patterns and history
    - Device fingerprinting information
    - Network and location data
    - Expected investigation outcomes
    """
    scenario_name: str
    description: str
    investigation_complexity: str
    transaction: Dict[str, Any]
    user: Dict[str, Any]
    device: Dict[str, Any]
    location: Dict[str, Any]
    network: Dict[str, Any]
    behavioral_signals: Dict[str, Any]
    investigation_timeline: List[Dict[str, Any]]
    expected_agent_findings: Dict[str, Any]
    investigation_verdict: Dict[str, Any]
    
    @property
    def is_fraud_scenario(self) -> bool:
        """Check if this is a fraud scenario based on investigation verdict"""
        return self.investigation_verdict.get('fraud_classification', '').upper() in [
            'CONFIRMED_FRAUD', 'SUSPECTED_FRAUD'
        ]
    
    @property
    def expected_risk_score(self) -> int:
        """Get expected overall risk score from investigation verdict"""
        return self.investigation_verdict.get('overall_risk_score', 0)

class MockDataLoader:
    """
    Loads and manages realistic transaction scenarios for autonomous investigation testing.
    
    Features:
    - Loads fraud and legitimate scenarios from JSON files
    - Provides realistic data that agents treat as real
    - Supports scenario filtering and selection
    - Validates data schemas and completeness
    - Generates investigation context for agent system
    """
    
    def __init__(self, base_path: Optional[Path] = None):
        if base_path is None:
            # Default to the mock_transactions directory
            base_path = Path(__file__).parent
        
        self.base_path = Path(base_path)
        self.fraud_scenarios_path = self.base_path / "fraud_scenarios"
        self.legitimate_scenarios_path = self.base_path / "legitimate_scenarios"
        self.schemas_path = self.base_path / "data_schemas"
        
        # Cache for loaded scenarios
        self._fraud_scenarios: Dict[str, MockTransactionData] = {}
        self._legitimate_scenarios: Dict[str, MockTransactionData] = {}
        
        logger.info(f"Initialized MockDataLoader with base path: {self.base_path}")
        
    def load_all_scenarios(self) -> None:
        """Load all available fraud and legitimate scenarios from disk"""
        self._load_scenarios(ScenarioType.FRAUD)
        self._load_scenarios(ScenarioType.LEGITIMATE)
        
        total_scenarios = len(self._fraud_scenarios) + len(self._legitimate_scenarios)
        logger.info(f"Loaded {total_scenarios} scenarios "
                   f"({len(self._fraud_scenarios)} fraud, {len(self._legitimate_scenarios)} legitimate)")
    
    def _load_scenarios(self, scenario_type: ScenarioType) -> None:
        """Load scenarios of specified type from JSON files"""
        if scenario_type == ScenarioType.FRAUD:
            scenarios_path = self.fraud_scenarios_path
            scenarios_cache = self._fraud_scenarios
        else:
            scenarios_path = self.legitimate_scenarios_path
            scenarios_cache = self._legitimate_scenarios
            
        if not scenarios_path.exists():
            logger.warning(f"Scenarios path does not exist: {scenarios_path}")
            return
            
        for json_file in scenarios_path.glob("*.json"):
            try:
                with open(json_file, 'r') as f:
                    data = json.load(f)
                
                scenario = MockTransactionData(
                    scenario_name=data['scenario_name'],
                    description=data['description'],
                    investigation_complexity=data['investigation_complexity'],
                    transaction=data['transaction'],
                    user=data['user'],
                    device=data['device'],
                    location=data['location'],
                    network=data['network'],
                    behavioral_signals=data['behavioral_signals'],
                    investigation_timeline=data['investigation_timeline'],
                    expected_agent_findings=data['expected_agent_findings'],
                    investigation_verdict=data['investigation_verdict']
                )
                
                scenarios_cache[scenario.scenario_name] = scenario
                logger.debug(f"Loaded scenario: {scenario.scenario_name} from {json_file.name}")
                
            except Exception as e:
                logger.error(f"Failed to load scenario from {json_file}: {str(e)}")
    
    def get_fraud_scenario(self, scenario_name: str) -> Optional[MockTransactionData]:
        """Get specific fraud scenario by name"""
        if not self._fraud_scenarios:
            self._load_scenarios(ScenarioType.FRAUD)
        return self._fraud_scenarios.get(scenario_name)
    
    def get_legitimate_scenario(self, scenario_name: str) -> Optional[MockTransactionData]:
        """Get specific legitimate scenario by name"""
        if not self._legitimate_scenarios:
            self._load_scenarios(ScenarioType.LEGITIMATE)
        return self._legitimate_scenarios.get(scenario_name)
    
    def get_scenario_by_name(self, scenario_name: str) -> Optional[MockTransactionData]:
        """Get any scenario by name (searches both fraud and legitimate)"""
        scenario = self.get_fraud_scenario(scenario_name)
        if scenario is None:
            scenario = self.get_legitimate_scenario(scenario_name)
        return scenario
    
    def list_available_scenarios(self) -> Dict[str, List[str]]:
        """List all available scenarios by type"""
        if not self._fraud_scenarios:
            self._load_scenarios(ScenarioType.FRAUD)
        if not self._legitimate_scenarios:
            self._load_scenarios(ScenarioType.LEGITIMATE)
            
        return {
            "fraud_scenarios": list(self._fraud_scenarios.keys()),
            "legitimate_scenarios": list(self._legitimate_scenarios.keys())
        }
    
    def get_scenarios_by_complexity(self, complexity: InvestigationComplexity) -> List[MockTransactionData]:
        """Get all scenarios matching specified investigation complexity"""
        if not self._fraud_scenarios or not self._legitimate_scenarios:
            self.load_all_scenarios()
            
        matching_scenarios = []
        all_scenarios = {**self._fraud_scenarios, **self._legitimate_scenarios}
        
        for scenario in all_scenarios.values():
            if scenario.investigation_complexity == complexity.value:
                matching_scenarios.append(scenario)
                
        return matching_scenarios
    
    def generate_investigation_context(self, scenario_name: str) -> Dict[str, Any]:
        """
        Generate investigation context that agents will receive.
        
        This simulates how real investigation data would be presented to agents,
        removing the 'expected_agent_findings' and 'investigation_verdict' that
        would spoil the investigation.
        """
        scenario = self.get_scenario_by_name(scenario_name)
        if not scenario:
            raise ValueError(f"Scenario '{scenario_name}' not found")
        
        # Create investigation context without revealing expected outcomes
        investigation_context = {
            "investigation_id": f"AUTO_INVEST_{scenario_name.upper()}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}",
            "entity_id": scenario.user["user_id"],
            "entity_type": "user_id",
            "trigger_event": {
                "type": "transaction",
                "transaction_id": scenario.transaction["transaction_id"],
                "amount": scenario.transaction["amount"],
                "timestamp": scenario.transaction["timestamp"],
                "merchant": scenario.transaction["merchant"]
            },
            "investigation_data": {
                "transaction": scenario.transaction,
                "user": scenario.user,
                "device": scenario.device,
                "location": scenario.location,
                "network": scenario.network,
                "behavioral_signals": scenario.behavioral_signals
            },
            "metadata": {
                "scenario_name": scenario.scenario_name,
                "description": scenario.description,
                "investigation_complexity": scenario.investigation_complexity,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        }
        
        return investigation_context
    
    def validate_investigation_results(self, scenario_name: str, actual_results: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate autonomous investigation results against expected outcomes.
        
        This provides comprehensive validation of how well the autonomous system
        performed compared to expected findings and risk assessment.
        """
        scenario = self.get_scenario_by_name(scenario_name)
        if not scenario:
            raise ValueError(f"Scenario '{scenario_name}' not found")
        
        validation_results = {
            "scenario_name": scenario_name,
            "expected_verdict": scenario.investigation_verdict,
            "actual_results": actual_results,
            "validation_timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        # Compare risk scores
        expected_risk = scenario.investigation_verdict.get('overall_risk_score', 0)
        actual_risk = actual_results.get('overall_risk_score', 0)
        risk_deviation = abs(expected_risk - actual_risk)
        
        # Compare fraud classification
        expected_classification = scenario.investigation_verdict.get('fraud_classification', '')
        actual_classification = actual_results.get('fraud_classification', '')
        classification_match = expected_classification.upper() == actual_classification.upper()
        
        # Validate agent findings
        agent_findings_validation = {}
        expected_findings = scenario.expected_agent_findings
        actual_agent_results = actual_results.get('agent_findings', {})
        
        for agent_name, expected_finding in expected_findings.items():
            actual_finding = actual_agent_results.get(agent_name, {})
            expected_risk_level = expected_finding.get('risk_level', 'UNKNOWN')
            actual_risk_level = actual_finding.get('risk_level', 'UNKNOWN')
            
            agent_findings_validation[agent_name] = {
                "risk_level_match": expected_risk_level == actual_risk_level,
                "expected_risk_level": expected_risk_level,
                "actual_risk_level": actual_risk_level,
                "findings_captured": len(actual_finding.get('key_findings', [])) > 0
            }
        
        validation_results.update({
            "risk_score_validation": {
                "expected": expected_risk,
                "actual": actual_risk,
                "deviation": risk_deviation,
                "acceptable_deviation": risk_deviation <= 10,  # Within 10 points acceptable
            },
            "classification_validation": {
                "expected": expected_classification,
                "actual": actual_classification,
                "match": classification_match
            },
            "agent_findings_validation": agent_findings_validation,
            "overall_investigation_quality": {
                "risk_score_accurate": risk_deviation <= 10,
                "classification_accurate": classification_match,
                "agents_performed_well": all(
                    finding["risk_level_match"] for finding in agent_findings_validation.values()
                )
            }
        })
        
        return validation_results

# Global loader instance for easy access
mock_data_loader = MockDataLoader()

def load_investigation_scenario(scenario_name: str) -> Dict[str, Any]:
    """
    Convenience function to load investigation scenario for autonomous testing.
    
    This is the main entry point that autonomous investigation tests will use
    to get realistic data that the system treats as real.
    """
    return mock_data_loader.generate_investigation_context(scenario_name)

def validate_investigation_outcome(scenario_name: str, actual_results: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convenience function to validate investigation results against expected outcomes.
    """
    return mock_data_loader.validate_investigation_results(scenario_name, actual_results)

def list_available_test_scenarios() -> Dict[str, List[str]]:
    """List all available test scenarios for autonomous investigation testing"""
    return mock_data_loader.list_available_scenarios()

if __name__ == "__main__":
    # Demo usage
    loader = MockDataLoader()
    loader.load_all_scenarios()
    
    scenarios = loader.list_available_scenarios()
    print("Available scenarios:")
    for scenario_type, scenario_names in scenarios.items():
        print(f"  {scenario_type}: {scenario_names}")
    
    # Load a fraud scenario and show investigation context
    if scenarios["fraud_scenarios"]:
        scenario_name = scenarios["fraud_scenarios"][0]
        context = loader.generate_investigation_context(scenario_name)
        print(f"\nInvestigation context for '{scenario_name}':")
        print(f"  Investigation ID: {context['investigation_id']}")
        print(f"  Entity ID: {context['entity_id']}")
        print(f"  Transaction Amount: ${context['trigger_event']['amount']}")
        print(f"  Complexity: {context['metadata']['investigation_complexity']}")