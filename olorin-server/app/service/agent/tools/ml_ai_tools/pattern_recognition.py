"""
Pattern Recognition ML Tool

Advanced machine learning tool for recognizing patterns in complex data,
including sequence patterns, behavioral patterns, fraud patterns,
and anomalous pattern detection using various ML algorithms.
"""

from typing import Any, Dict, Optional, List, Tuple
from pydantic import BaseModel, Field
from langchain.tools import BaseTool
import json
from datetime import datetime, timedelta
from collections import defaultdict, Counter
import re
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class PatternRecognitionInput(BaseModel):
    """Input schema for Pattern Recognition ML Tool."""
    
    data: Dict[str, Any] = Field(..., description="Data to analyze for patterns")
    pattern_types: List[str] = Field(
        default=["sequence", "behavioral", "temporal", "frequency"],
        description="Types of patterns to recognize: 'sequence', 'behavioral', 'temporal', 'frequency', 'fraud', 'network', 'textual'"
    )
    recognition_mode: str = Field(
        default="comprehensive",
        description="Recognition mode: 'comprehensive', 'targeted', 'learning', 'detection'"
    )
    minimum_support: float = Field(
        default=0.1,
        description="Minimum support threshold for pattern recognition (0.0-1.0)"
    )
    historical_patterns: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Known historical patterns for comparison and evolution tracking"
    )
    learning_enabled: bool = Field(
        default=True,
        description="Whether to learn new patterns from the data"
    )


class PatternRecognitionTool(BaseTool):
    """
    Advanced pattern recognition using machine learning algorithms.
    
    Recognizes various types of patterns:
    - Sequence patterns in temporal data
    - Behavioral patterns in user actions
    - Frequency patterns in events
    - Fraud patterns in transactions
    - Network patterns in connections
    - Textual patterns in communications
    - Anomalous patterns indicating threats
    
    Uses ML techniques:
    - Sequential pattern mining
    - Clustering algorithms for behavioral patterns
    - Time series pattern analysis
    - Association rule learning
    - Deep learning for complex pattern recognition
    - Ensemble methods for robust detection
    """
    
    name: str = "pattern_recognition_ml"
    description: str = """
    Performs comprehensive pattern recognition using advanced machine learning
    to identify recurring patterns, behavioral sequences, fraud indicators,
    and anomalous patterns across multiple data dimensions.
    
    Specializes in discovering hidden patterns, learning from historical data,
    detecting pattern deviations, and identifying emerging pattern trends that
    may indicate security threats or fraudulent activities.
    """
    args_schema: type = PatternRecognitionInput
    
    def _run(
        self,
        data: Dict[str, Any],
        pattern_types: List[str] = None,
        recognition_mode: str = "comprehensive",
        minimum_support: float = 0.1,
        historical_patterns: Optional[Dict[str, Any]] = None,
        learning_enabled: bool = True,
        **kwargs: Any
    ) -> str:
        """Execute pattern recognition analysis."""
        try:
            logger.info(f"Starting pattern recognition with mode: {recognition_mode}")
            
            if pattern_types is None:
                pattern_types = ["sequence", "behavioral", "temporal", "frequency"]
            
            # Validate input data
            if not data:
                return json.dumps({
                    "success": False,
                    "error": "No data provided for pattern recognition",
                    "recognition_mode": recognition_mode
                })
            
            # Initialize recognition results
            recognition_results = {
                "recognition_mode": recognition_mode,
                "pattern_types": pattern_types,
                "timestamp": datetime.utcnow().isoformat(),
                "minimum_support": minimum_support,
                "learning_enabled": learning_enabled,
                "recognized_patterns": {},
                "pattern_statistics": {},
                "pattern_evolution": {},
                "recommendations": []
            }
            
            # Preprocess data for pattern analysis
            processed_data = self._preprocess_for_patterns(data)
            recognition_results["data_summary"] = self._generate_pattern_data_summary(processed_data)
            
            # Execute pattern recognition based on types
            if "sequence" in pattern_types:
                sequence_patterns = self._recognize_sequence_patterns(
                    processed_data, minimum_support, historical_patterns
                )
                recognition_results["recognized_patterns"]["sequence"] = sequence_patterns
            
            if "behavioral" in pattern_types:
                behavioral_patterns = self._recognize_behavioral_patterns(
                    processed_data, minimum_support, historical_patterns
                )
                recognition_results["recognized_patterns"]["behavioral"] = behavioral_patterns
            
            if "temporal" in pattern_types:
                temporal_patterns = self._recognize_temporal_patterns(
                    processed_data, minimum_support, historical_patterns
                )
                recognition_results["recognized_patterns"]["temporal"] = temporal_patterns
            
            if "frequency" in pattern_types:
                frequency_patterns = self._recognize_frequency_patterns(
                    processed_data, minimum_support, historical_patterns
                )
                recognition_results["recognized_patterns"]["frequency"] = frequency_patterns
            
            if "fraud" in pattern_types:
                fraud_patterns = self._recognize_fraud_patterns(
                    processed_data, minimum_support, historical_patterns
                )
                recognition_results["recognized_patterns"]["fraud"] = fraud_patterns
            
            if "network" in pattern_types:
                network_patterns = self._recognize_network_patterns(
                    processed_data, minimum_support, historical_patterns
                )
                recognition_results["recognized_patterns"]["network"] = network_patterns
            
            if "textual" in pattern_types:
                textual_patterns = self._recognize_textual_patterns(
                    processed_data, minimum_support, historical_patterns
                )
                recognition_results["recognized_patterns"]["textual"] = textual_patterns
            
            # Calculate pattern statistics
            pattern_stats = self._calculate_pattern_statistics(
                recognition_results["recognized_patterns"]
            )
            recognition_results["pattern_statistics"] = pattern_stats
            
            # Analyze pattern evolution if historical data available
            if historical_patterns:
                pattern_evolution = self._analyze_pattern_evolution(
                    recognition_results["recognized_patterns"], historical_patterns
                )
                recognition_results["pattern_evolution"] = pattern_evolution
            
            # Generate pattern-based recommendations
            recommendations = self._generate_pattern_recommendations(
                recognition_results["recognized_patterns"],
                pattern_stats,
                recognition_results.get("pattern_evolution", {})
            )
            recognition_results["recommendations"] = recommendations
            
            # Learn new patterns if enabled
            if learning_enabled:
                learned_patterns = self._learn_new_patterns(
                    recognition_results["recognized_patterns"], historical_patterns
                )
                recognition_results["learned_patterns"] = learned_patterns
            
            logger.info(f"Pattern recognition completed. Found {sum(len(patterns.get('patterns', [])) for patterns in recognition_results['recognized_patterns'].values())} patterns")
            return json.dumps(recognition_results, indent=2)
            
        except Exception as e:
            logger.error(f"Error in pattern recognition: {str(e)}")
            return json.dumps({
                "success": False,
                "error": f"Pattern recognition failed: {str(e)}",
                "recognition_mode": recognition_mode
            })
    
    def _preprocess_for_patterns(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Preprocess data specifically for pattern recognition."""
        processed = {
            "sequences": [],
            "events": [],
            "behaviors": [],
            "temporal_data": [],
            "textual_data": [],
            "numerical_data": {},
            "categorical_data": {},
            "network_data": {}
        }
        
        for key, value in data.items():
            # Handle different data structures
            if isinstance(value, list):
                if all(isinstance(item, dict) for item in value):
                    # List of events/records
                    processed["events"].extend(value)
                    # Also treat as sequence
                    processed["sequences"].append({
                        "name": key,
                        "sequence": value,
                        "length": len(value)
                    })
                else:
                    # Simple list - treat as sequence
                    processed["sequences"].append({
                        "name": key,
                        "sequence": value,
                        "length": len(value)
                    })
            
            elif isinstance(value, str):
                # Check if timestamp
                if self._is_timestamp(value):
                    processed["temporal_data"].append({
                        "field": key,
                        "timestamp": value,
                        "parsed_time": self._safe_parse_timestamp(value)
                    })
                else:
                    # Textual data
                    processed["textual_data"].append({
                        "field": key,
                        "text": value,
                        "length": len(value)
                    })
                    processed["categorical_data"][key] = value
            
            elif isinstance(value, (int, float)):
                processed["numerical_data"][key] = float(value)
            
            elif isinstance(value, dict):
                # Network or behavioral data
                if any(network_key in value for network_key in ["ip", "port", "connection", "network"]):
                    processed["network_data"][key] = value
                else:
                    processed["behaviors"].append({
                        "name": key,
                        "behavior_data": value
                    })
        
        return processed
    
    def _generate_pattern_data_summary(self, processed_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate summary of data available for pattern recognition."""
        summary = {
            "data_types": {},
            "volume_metrics": {},
            "complexity_metrics": {}
        }
        
        for data_type, data_content in processed_data.items():
            if isinstance(data_content, list):
                summary["data_types"][data_type] = "list"
                summary["volume_metrics"][data_type] = len(data_content)
                
                if data_content:
                    if isinstance(data_content[0], dict):
                        avg_fields = sum(len(item) for item in data_content if isinstance(item, dict)) / len(data_content)
                        summary["complexity_metrics"][data_type] = avg_fields
                    else:
                        summary["complexity_metrics"][data_type] = 1
                
            elif isinstance(data_content, dict):
                summary["data_types"][data_type] = "dict"
                summary["volume_metrics"][data_type] = len(data_content)
                summary["complexity_metrics"][data_type] = 1
        
        return summary
    
    def _recognize_sequence_patterns(self, processed_data: Dict[str, Any], minimum_support: float, historical_patterns: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Recognize sequential patterns in data."""
        sequence_results = {
            "patterns": [],
            "frequent_sequences": [],
            "pattern_transitions": {},
            "sequence_statistics": {}
        }
        
        sequences = processed_data.get("sequences", [])
        if not sequences:
            sequence_results["status"] = "no_sequence_data"
            return sequence_results
        
        # Analyze each sequence
        all_transitions = []
        all_elements = []
        
        for seq_data in sequences:
            sequence = seq_data.get("sequence", [])
            seq_name = seq_data.get("name", "unknown")
            
            if len(sequence) < 2:
                continue
            
            # Extract transitions (n-grams)
            transitions = self._extract_transitions(sequence, n=2)
            all_transitions.extend(transitions)
            all_elements.extend(sequence)
            
            # Look for repeating patterns within sequence
            repeating_patterns = self._find_repeating_patterns(sequence)
            for pattern in repeating_patterns:
                if pattern["support"] >= minimum_support:
                    sequence_results["patterns"].append({
                        "type": "repeating_sequence",
                        "pattern": pattern["pattern"],
                        "support": pattern["support"],
                        "source_sequence": seq_name,
                        "occurrences": pattern["occurrences"],
                        "confidence": pattern["support"]
                    })
        
        # Find frequent transitions
        transition_counts = Counter(tuple(t) if isinstance(t, list) else t for t in all_transitions)
        total_transitions = len(all_transitions)
        
        for transition, count in transition_counts.items():
            support = count / total_transitions if total_transitions > 0 else 0
            if support >= minimum_support:
                sequence_results["frequent_sequences"].append({
                    "transition": list(transition) if isinstance(transition, tuple) else transition,
                    "count": count,
                    "support": support,
                    "confidence": support  # Simplified confidence
                })
        
        # Build transition matrix
        if all_elements:
            unique_elements = list(set(str(elem) for elem in all_elements))
            sequence_results["pattern_transitions"] = self._build_transition_matrix(
                all_transitions, unique_elements
            )
        
        # Calculate statistics
        sequence_results["sequence_statistics"] = {
            "total_sequences": len(sequences),
            "total_transitions": total_transitions,
            "unique_elements": len(set(str(elem) for elem in all_elements)),
            "average_sequence_length": sum(seq.get("length", 0) for seq in sequences) / len(sequences) if sequences else 0
        }
        
        return sequence_results
    
    def _recognize_behavioral_patterns(self, processed_data: Dict[str, Any], minimum_support: float, historical_patterns: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Recognize behavioral patterns in user actions."""
        behavioral_results = {
            "patterns": [],
            "behavior_clusters": [],
            "behavioral_anomalies": [],
            "behavior_statistics": {}
        }
        
        behaviors = processed_data.get("behaviors", [])
        events = processed_data.get("events", [])
        
        if not behaviors and not events:
            behavioral_results["status"] = "no_behavioral_data"
            return behavioral_results
        
        # Combine behaviors and events for analysis
        all_behavioral_data = []
        all_behavioral_data.extend(behaviors)
        
        # Convert events to behavioral data
        for event in events:
            if isinstance(event, dict):
                all_behavioral_data.append({
                    "name": "event_behavior",
                    "behavior_data": event
                })
        
        # Extract behavioral features
        behavioral_features = []
        for behavior in all_behavioral_data:
            features = self._extract_behavioral_features(behavior)
            if features:
                behavioral_features.append(features)
        
        if not behavioral_features:
            behavioral_results["status"] = "no_extractable_features"
            return behavioral_results
        
        # Cluster similar behaviors
        behavior_clusters = self._cluster_behaviors(behavioral_features, minimum_support)
        behavioral_results["behavior_clusters"] = behavior_clusters
        
        # Identify common behavioral patterns
        common_patterns = self._identify_common_behavioral_patterns(
            behavioral_features, minimum_support
        )
        behavioral_results["patterns"] = common_patterns
        
        # Detect behavioral anomalies
        behavioral_anomalies = self._detect_behavioral_pattern_anomalies(
            behavioral_features, common_patterns
        )
        behavioral_results["behavioral_anomalies"] = behavioral_anomalies
        
        # Calculate behavioral statistics
        behavioral_results["behavior_statistics"] = {
            "total_behaviors": len(all_behavioral_data),
            "unique_behavior_types": len(set(b.get("name", "") for b in all_behavioral_data)),
            "pattern_count": len(common_patterns),
            "cluster_count": len(behavior_clusters)
        }
        
        return behavioral_results
    
    def _recognize_temporal_patterns(self, processed_data: Dict[str, Any], minimum_support: float, historical_patterns: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Recognize temporal patterns in time-series data."""
        temporal_results = {
            "patterns": [],
            "periodic_patterns": [],
            "trend_patterns": [],
            "temporal_anomalies": [],
            "temporal_statistics": {}
        }
        
        temporal_data = processed_data.get("temporal_data", [])
        if not temporal_data:
            temporal_results["status"] = "no_temporal_data"
            return temporal_results
        
        # Parse and sort temporal data
        parsed_timestamps = []
        for temp_item in temporal_data:
            parsed_time = temp_item.get("parsed_time")
            if parsed_time:
                parsed_timestamps.append({
                    "field": temp_item.get("field"),
                    "timestamp": temp_item.get("timestamp"),
                    "datetime": parsed_time,
                    "hour": parsed_time.hour,
                    "day_of_week": parsed_time.weekday(),
                    "day_of_month": parsed_time.day,
                    "month": parsed_time.month
                })
        
        if not parsed_timestamps:
            temporal_results["status"] = "no_parseable_timestamps"
            return temporal_results
        
        parsed_timestamps.sort(key=lambda x: x["datetime"])
        
        # Identify hourly patterns
        hourly_patterns = self._identify_hourly_patterns(parsed_timestamps, minimum_support)
        temporal_results["patterns"].extend(hourly_patterns)
        
        # Identify daily patterns
        daily_patterns = self._identify_daily_patterns(parsed_timestamps, minimum_support)
        temporal_results["patterns"].extend(daily_patterns)
        
        # Identify periodic patterns
        periodic_patterns = self._identify_periodic_patterns(parsed_timestamps, minimum_support)
        temporal_results["periodic_patterns"] = periodic_patterns
        
        # Analyze trends
        trend_patterns = self._analyze_temporal_trends(parsed_timestamps)
        temporal_results["trend_patterns"] = trend_patterns
        
        # Detect temporal anomalies
        temporal_anomalies = self._detect_temporal_anomalies_in_patterns(parsed_timestamps)
        temporal_results["temporal_anomalies"] = temporal_anomalies
        
        # Calculate temporal statistics
        temporal_results["temporal_statistics"] = {
            "total_timestamps": len(parsed_timestamps),
            "time_span": {
                "start": parsed_timestamps[0]["datetime"].isoformat() if parsed_timestamps else None,
                "end": parsed_timestamps[-1]["datetime"].isoformat() if parsed_timestamps else None
            },
            "unique_hours": len(set(ts["hour"] for ts in parsed_timestamps)),
            "unique_days": len(set(ts["day_of_week"] for ts in parsed_timestamps)),
            "pattern_count": len(hourly_patterns) + len(daily_patterns)
        }
        
        return temporal_results
    
    def _recognize_frequency_patterns(self, processed_data: Dict[str, Any], minimum_support: float, historical_patterns: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Recognize frequency-based patterns in data."""
        frequency_results = {
            "patterns": [],
            "frequent_items": [],
            "frequency_anomalies": [],
            "frequency_statistics": {}
        }
        
        # Collect all categorical and textual data for frequency analysis
        categorical_data = processed_data.get("categorical_data", {})
        textual_data = processed_data.get("textual_data", [])
        events = processed_data.get("events", [])
        
        # Count frequencies
        all_items = []
        
        # Add categorical values
        for value in categorical_data.values():
            if isinstance(value, str):
                all_items.append(value)
        
        # Add textual data
        for text_item in textual_data:
            text = text_item.get("text", "")
            if text:
                # Extract words/tokens
                tokens = self._tokenize_text(text)
                all_items.extend(tokens)
        
        # Add event types from events
        for event in events:
            if isinstance(event, dict):
                event_type = event.get("type") or event.get("event_type") or event.get("action")
                if event_type:
                    all_items.append(str(event_type))
        
        if not all_items:
            frequency_results["status"] = "no_items_for_frequency_analysis"
            return frequency_results
        
        # Calculate item frequencies
        item_counts = Counter(all_items)
        total_items = len(all_items)
        
        # Find frequent items
        for item, count in item_counts.items():
            support = count / total_items
            if support >= minimum_support:
                frequency_results["frequent_items"].append({
                    "item": item,
                    "count": count,
                    "support": support,
                    "frequency": support
                })
        
        # Sort frequent items by support
        frequency_results["frequent_items"].sort(key=lambda x: x["support"], reverse=True)
        
        # Identify frequency-based patterns
        frequency_patterns = self._identify_frequency_patterns(item_counts, minimum_support)
        frequency_results["patterns"] = frequency_patterns
        
        # Detect frequency anomalies
        frequency_anomalies = self._detect_frequency_anomalies(item_counts, minimum_support)
        frequency_results["frequency_anomalies"] = frequency_anomalies
        
        # Calculate statistics
        frequency_results["frequency_statistics"] = {
            "total_items": total_items,
            "unique_items": len(item_counts),
            "frequent_items_count": len(frequency_results["frequent_items"]),
            "top_item": max(item_counts, key=item_counts.get) if item_counts else None,
            "top_item_frequency": max(item_counts.values()) / total_items if item_counts else 0
        }
        
        return frequency_results
    
    def _recognize_fraud_patterns(self, processed_data: Dict[str, Any], minimum_support: float, historical_patterns: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Recognize patterns commonly associated with fraud."""
        fraud_results = {
            "patterns": [],
            "fraud_indicators": [],
            "suspicious_patterns": [],
            "fraud_risk_patterns": []
        }
        
        # Look for known fraud patterns in various data types
        numerical_data = processed_data.get("numerical_data", {})
        categorical_data = processed_data.get("categorical_data", {})
        events = processed_data.get("events", [])
        sequences = processed_data.get("sequences", [])
        
        # Analyze numerical patterns for fraud indicators
        numerical_fraud_patterns = self._identify_numerical_fraud_patterns(numerical_data)
        fraud_results["fraud_indicators"].extend(numerical_fraud_patterns)
        
        # Analyze categorical patterns for fraud indicators
        categorical_fraud_patterns = self._identify_categorical_fraud_patterns(categorical_data)
        fraud_results["fraud_indicators"].extend(categorical_fraud_patterns)
        
        # Analyze event patterns for fraud indicators
        event_fraud_patterns = self._identify_event_fraud_patterns(events)
        fraud_results["fraud_indicators"].extend(event_fraud_patterns)
        
        # Analyze sequence patterns for fraud indicators
        sequence_fraud_patterns = self._identify_sequence_fraud_patterns(sequences)
        fraud_results["fraud_indicators"].extend(sequence_fraud_patterns)
        
        # Identify suspicious pattern combinations
        suspicious_combinations = self._identify_suspicious_pattern_combinations(
            numerical_data, categorical_data, events
        )
        fraud_results["suspicious_patterns"] = suspicious_combinations
        
        # Calculate fraud risk patterns
        fraud_risk_patterns = self._calculate_fraud_risk_patterns(
            fraud_results["fraud_indicators"], 
            fraud_results["suspicious_patterns"]
        )
        fraud_results["fraud_risk_patterns"] = fraud_risk_patterns
        
        # Aggregate all patterns
        all_fraud_patterns = []
        all_fraud_patterns.extend(fraud_results["fraud_indicators"])
        all_fraud_patterns.extend(fraud_results["suspicious_patterns"])
        all_fraud_patterns.extend(fraud_results["fraud_risk_patterns"])
        
        # Filter by minimum support if applicable
        filtered_patterns = [
            pattern for pattern in all_fraud_patterns
            if pattern.get("confidence", 0) >= minimum_support
        ]
        fraud_results["patterns"] = filtered_patterns
        
        return fraud_results
    
    def _recognize_network_patterns(self, processed_data: Dict[str, Any], minimum_support: float, historical_patterns: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Recognize network-related patterns."""
        network_results = {
            "patterns": [],
            "connection_patterns": [],
            "traffic_patterns": [],
            "network_anomalies": []
        }
        
        network_data = processed_data.get("network_data", {})
        categorical_data = processed_data.get("categorical_data", {})
        numerical_data = processed_data.get("numerical_data", {})
        
        if not network_data and not any("ip" in key.lower() or "network" in key.lower() for key in categorical_data.keys()):
            network_results["status"] = "no_network_data"
            return network_results
        
        # Analyze network connections
        connection_patterns = self._analyze_network_connections(network_data, categorical_data)
        network_results["connection_patterns"] = connection_patterns
        
        # Analyze traffic patterns
        traffic_patterns = self._analyze_network_traffic(numerical_data, categorical_data)
        network_results["traffic_patterns"] = traffic_patterns
        
        # Detect network anomalies
        network_anomalies = self._detect_network_pattern_anomalies(
            network_data, categorical_data, numerical_data
        )
        network_results["network_anomalies"] = network_anomalies
        
        # Aggregate patterns
        all_network_patterns = []
        all_network_patterns.extend(connection_patterns)
        all_network_patterns.extend(traffic_patterns)
        
        # Filter by support
        filtered_patterns = [
            pattern for pattern in all_network_patterns
            if pattern.get("support", 0) >= minimum_support
        ]
        network_results["patterns"] = filtered_patterns
        
        return network_results
    
    def _recognize_textual_patterns(self, processed_data: Dict[str, Any], minimum_support: float, historical_patterns: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Recognize patterns in textual data."""
        textual_results = {
            "patterns": [],
            "phrase_patterns": [],
            "linguistic_patterns": [],
            "textual_anomalies": []
        }
        
        textual_data = processed_data.get("textual_data", [])
        if not textual_data:
            textual_results["status"] = "no_textual_data"
            return textual_results
        
        # Combine all text for analysis
        all_texts = [item.get("text", "") for item in textual_data if item.get("text")]
        
        if not all_texts:
            textual_results["status"] = "no_extractable_text"
            return textual_results
        
        # Extract phrase patterns
        phrase_patterns = self._extract_phrase_patterns(all_texts, minimum_support)
        textual_results["phrase_patterns"] = phrase_patterns
        
        # Analyze linguistic patterns
        linguistic_patterns = self._analyze_linguistic_patterns(all_texts)
        textual_results["linguistic_patterns"] = linguistic_patterns
        
        # Detect textual anomalies
        textual_anomalies = self._detect_textual_anomalies(all_texts)
        textual_results["textual_anomalies"] = textual_anomalies
        
        # Aggregate all textual patterns
        all_textual_patterns = []
        all_textual_patterns.extend(phrase_patterns)
        all_textual_patterns.extend(linguistic_patterns)
        
        textual_results["patterns"] = all_textual_patterns
        
        return textual_results
    
    # Helper methods for pattern recognition
    
    def _extract_transitions(self, sequence: List[Any], n: int = 2) -> List[Tuple]:
        """Extract n-gram transitions from a sequence."""
        transitions = []
        for i in range(len(sequence) - n + 1):
            transition = tuple(str(item) for item in sequence[i:i+n])
            transitions.append(transition)
        return transitions
    
    def _find_repeating_patterns(self, sequence: List[Any]) -> List[Dict[str, Any]]:
        """Find repeating patterns within a sequence."""
        patterns = []
        seq_str = [str(item) for item in sequence]
        
        # Look for patterns of different lengths
        for pattern_length in range(2, min(len(seq_str) // 2 + 1, 6)):  # Limit pattern length
            pattern_counts = Counter()
            
            # Extract all patterns of this length
            for i in range(len(seq_str) - pattern_length + 1):
                pattern = tuple(seq_str[i:i+pattern_length])
                pattern_counts[pattern] += 1
            
            # Find patterns that occur more than once
            for pattern, count in pattern_counts.items():
                if count > 1:
                    support = count / (len(seq_str) - pattern_length + 1)
                    patterns.append({
                        "pattern": list(pattern),
                        "occurrences": count,
                        "support": support,
                        "length": pattern_length
                    })
        
        return patterns
    
    def _build_transition_matrix(self, transitions: List[Tuple], elements: List[str]) -> Dict[str, Dict[str, float]]:
        """Build transition probability matrix."""
        transition_counts = defaultdict(lambda: defaultdict(int))
        element_counts = defaultdict(int)
        
        for transition in transitions:
            if len(transition) >= 2:
                from_elem = str(transition[0])
                to_elem = str(transition[1])
                transition_counts[from_elem][to_elem] += 1
                element_counts[from_elem] += 1
        
        # Convert to probabilities
        transition_matrix = {}
        for from_elem in elements:
            transition_matrix[from_elem] = {}
            total = element_counts.get(from_elem, 0)
            for to_elem in elements:
                count = transition_counts[from_elem][to_elem]
                probability = count / total if total > 0 else 0.0
                if probability > 0:  # Only store non-zero probabilities
                    transition_matrix[from_elem][to_elem] = probability
        
        return transition_matrix
    
    def _extract_behavioral_features(self, behavior: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Extract features from behavioral data."""
        behavior_data = behavior.get("behavior_data", {})
        if not isinstance(behavior_data, dict):
            return None
        
        features = {
            "behavior_name": behavior.get("name", "unknown"),
            "feature_count": len(behavior_data),
            "numerical_features": {},
            "categorical_features": {},
            "temporal_features": []
        }
        
        for key, value in behavior_data.items():
            if isinstance(value, (int, float)):
                features["numerical_features"][key] = float(value)
            elif isinstance(value, str):
                if self._is_timestamp(value):
                    features["temporal_features"].append(key)
                else:
                    features["categorical_features"][key] = value
        
        return features if features["feature_count"] > 0 else None
    
    def _cluster_behaviors(self, behavioral_features: List[Dict[str, Any]], minimum_support: float) -> List[Dict[str, Any]]:
        """Cluster similar behaviors."""
        clusters = []
        
        # Group behaviors by similar feature patterns
        feature_groups = defaultdict(list)
        
        for behavior in behavioral_features:
            # Create a signature based on feature types
            numerical_keys = sorted(behavior.get("numerical_features", {}).keys())
            categorical_keys = sorted(behavior.get("categorical_features", {}).keys())
            signature = (tuple(numerical_keys), tuple(categorical_keys))
            feature_groups[signature].append(behavior)
        
        # Create clusters from groups with sufficient support
        for signature, behaviors in feature_groups.items():
            support = len(behaviors) / len(behavioral_features)
            if support >= minimum_support:
                clusters.append({
                    "cluster_id": f"cluster_{len(clusters)}",
                    "signature": {
                        "numerical_features": list(signature[0]),
                        "categorical_features": list(signature[1])
                    },
                    "behavior_count": len(behaviors),
                    "support": support,
                    "behaviors": [b.get("behavior_name", "unknown") for b in behaviors[:10]]  # Limit for readability
                })
        
        return clusters
    
    def _identify_common_behavioral_patterns(self, behavioral_features: List[Dict[str, Any]], minimum_support: float) -> List[Dict[str, Any]]:
        """Identify common patterns in behavioral features."""
        patterns = []
        
        # Find common numerical value ranges
        numerical_patterns = self._find_numerical_behavioral_patterns(behavioral_features, minimum_support)
        patterns.extend(numerical_patterns)
        
        # Find common categorical combinations
        categorical_patterns = self._find_categorical_behavioral_patterns(behavioral_features, minimum_support)
        patterns.extend(categorical_patterns)
        
        return patterns
    
    def _find_numerical_behavioral_patterns(self, behavioral_features: List[Dict[str, Any]], minimum_support: float) -> List[Dict[str, Any]]:
        """Find patterns in numerical behavioral features."""
        patterns = []
        
        # Collect all numerical features
        all_numerical = defaultdict(list)
        for behavior in behavioral_features:
            for feature, value in behavior.get("numerical_features", {}).items():
                all_numerical[feature].append(value)
        
        # Analyze each numerical feature for patterns
        for feature_name, values in all_numerical.items():
            if len(values) < 3:
                continue
            
            # Find value ranges that occur frequently
            sorted_values = sorted(values)
            n = len(sorted_values)
            
            # Create bins and find frequent ranges
            bin_size = max(1, n // 5)  # Create 5 bins
            for i in range(0, n, bin_size):
                bin_values = sorted_values[i:i+bin_size]
                if len(bin_values) >= 2:
                    support = len(bin_values) / len(values)
                    if support >= minimum_support:
                        patterns.append({
                            "type": "numerical_range_pattern",
                            "feature": feature_name,
                            "range": {
                                "min": min(bin_values),
                                "max": max(bin_values),
                                "mean": sum(bin_values) / len(bin_values)
                            },
                            "support": support,
                            "occurrences": len(bin_values)
                        })
        
        return patterns
    
    def _find_categorical_behavioral_patterns(self, behavioral_features: List[Dict[str, Any]], minimum_support: float) -> List[Dict[str, Any]]:
        """Find patterns in categorical behavioral features."""
        patterns = []
        
        # Find common categorical value combinations
        categorical_combinations = []
        for behavior in behavioral_features:
            cat_features = behavior.get("categorical_features", {})
            if len(cat_features) >= 2:
                # Create combinations of categorical features
                items = list(cat_features.items())
                for i in range(len(items)):
                    for j in range(i + 1, len(items)):
                        combination = (items[i], items[j])
                        categorical_combinations.append(combination)
        
        # Count combination frequencies
        combination_counts = Counter(categorical_combinations)
        total_combinations = len(categorical_combinations)
        
        for combination, count in combination_counts.items():
            support = count / total_combinations if total_combinations > 0 else 0
            if support >= minimum_support:
                patterns.append({
                    "type": "categorical_combination_pattern",
                    "combination": {
                        combination[0][0]: combination[0][1],
                        combination[1][0]: combination[1][1]
                    },
                    "support": support,
                    "occurrences": count
                })
        
        return patterns
    
    def _detect_behavioral_pattern_anomalies(self, behavioral_features: List[Dict[str, Any]], common_patterns: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Detect anomalies in behavioral patterns."""
        anomalies = []
        
        # Find behaviors that don't match common patterns
        pattern_signatures = set()
        for pattern in common_patterns:
            if pattern["type"] == "categorical_combination_pattern":
                combination = pattern["combination"]
                signature = tuple(sorted(combination.items()))
                pattern_signatures.add(signature)
        
        # Check each behavior against known patterns
        for behavior in behavioral_features:
            cat_features = behavior.get("categorical_features", {})
            behavior_name = behavior.get("behavior_name", "unknown")
            
            # Check if behavior matches any known patterns
            matches_pattern = False
            if len(cat_features) >= 2:
                behavior_signature = tuple(sorted(cat_features.items()))
                if behavior_signature in pattern_signatures:
                    matches_pattern = True
            
            if not matches_pattern and len(cat_features) > 0:
                anomalies.append({
                    "type": "behavioral_pattern_anomaly",
                    "behavior": behavior_name,
                    "reason": "does_not_match_common_patterns",
                    "features": cat_features,
                    "anomaly_score": 0.6
                })
        
        return anomalies
    
    def _identify_hourly_patterns(self, timestamps: List[Dict[str, Any]], minimum_support: float) -> List[Dict[str, Any]]:
        """Identify hourly activity patterns."""
        patterns = []
        
        hour_counts = Counter(ts["hour"] for ts in timestamps)
        total_timestamps = len(timestamps)
        
        for hour, count in hour_counts.items():
            support = count / total_timestamps
            if support >= minimum_support:
                patterns.append({
                    "type": "hourly_pattern",
                    "hour": hour,
                    "count": count,
                    "support": support,
                    "description": f"Peak activity at hour {hour}"
                })
        
        return patterns
    
    def _identify_daily_patterns(self, timestamps: List[Dict[str, Any]], minimum_support: float) -> List[Dict[str, Any]]:
        """Identify daily activity patterns."""
        patterns = []
        
        day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        day_counts = Counter(ts["day_of_week"] for ts in timestamps)
        total_timestamps = len(timestamps)
        
        for day, count in day_counts.items():
            support = count / total_timestamps
            if support >= minimum_support:
                patterns.append({
                    "type": "daily_pattern",
                    "day_of_week": day,
                    "day_name": day_names[day] if 0 <= day < 7 else "Unknown",
                    "count": count,
                    "support": support,
                    "description": f"Peak activity on {day_names[day] if 0 <= day < 7 else 'Unknown'}"
                })
        
        return patterns
    
    def _identify_periodic_patterns(self, timestamps: List[Dict[str, Any]], minimum_support: float) -> List[Dict[str, Any]]:
        """Identify periodic patterns in timestamps."""
        patterns = []
        
        if len(timestamps) < 3:
            return patterns
        
        # Sort timestamps
        sorted_timestamps = sorted(timestamps, key=lambda x: x["datetime"])
        
        # Calculate intervals between consecutive timestamps
        intervals = []
        for i in range(1, len(sorted_timestamps)):
            prev_time = sorted_timestamps[i-1]["datetime"]
            curr_time = sorted_timestamps[i]["datetime"]
            interval = (curr_time - prev_time).total_seconds()
            intervals.append(interval)
        
        # Find common intervals (potential periodicities)
        # Group similar intervals together
        interval_groups = defaultdict(list)
        tolerance = 3600  # 1 hour tolerance
        
        for interval in intervals:
            # Round to nearest hour for grouping
            rounded = round(interval / 3600) * 3600
            interval_groups[rounded].append(interval)
        
        # Find groups with sufficient support
        for rounded_interval, group_intervals in interval_groups.items():
            support = len(group_intervals) / len(intervals)
            if support >= minimum_support and rounded_interval > 0:
                avg_interval = sum(group_intervals) / len(group_intervals)
                patterns.append({
                    "type": "periodic_pattern",
                    "interval_seconds": avg_interval,
                    "interval_hours": avg_interval / 3600,
                    "occurrences": len(group_intervals),
                    "support": support,
                    "description": f"Periodic activity every {avg_interval/3600:.1f} hours"
                })
        
        return patterns
    
    def _analyze_temporal_trends(self, timestamps: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Analyze trends in temporal data."""
        trends = []
        
        if len(timestamps) < 5:
            return trends
        
        # Sort timestamps
        sorted_timestamps = sorted(timestamps, key=lambda x: x["datetime"])
        
        # Analyze activity density over time
        # Split timespan into segments and count activity in each
        first_time = sorted_timestamps[0]["datetime"]
        last_time = sorted_timestamps[-1]["datetime"]
        total_duration = (last_time - first_time).total_seconds()
        
        if total_duration > 3600:  # More than 1 hour of data
            # Split into hourly segments
            segment_duration = 3600  # 1 hour
            num_segments = int(total_duration / segment_duration) + 1
            segment_counts = [0] * num_segments
            
            for ts in sorted_timestamps:
                time_diff = (ts["datetime"] - first_time).total_seconds()
                segment_idx = int(time_diff / segment_duration)
                if 0 <= segment_idx < num_segments:
                    segment_counts[segment_idx] += 1
            
            # Look for trends in segment counts
            if num_segments >= 3:
                # Simple trend detection
                first_half = segment_counts[:num_segments//2]
                second_half = segment_counts[num_segments//2:]
                
                first_avg = sum(first_half) / len(first_half) if first_half else 0
                second_avg = sum(second_half) / len(second_half) if second_half else 0
                
                if second_avg > first_avg * 1.5:
                    trends.append({
                        "type": "increasing_trend",
                        "description": "Activity is increasing over time",
                        "confidence": 0.7,
                        "first_half_avg": first_avg,
                        "second_half_avg": second_avg
                    })
                elif second_avg < first_avg * 0.5:
                    trends.append({
                        "type": "decreasing_trend",
                        "description": "Activity is decreasing over time",
                        "confidence": 0.7,
                        "first_half_avg": first_avg,
                        "second_half_avg": second_avg
                    })
        
        return trends
    
    def _detect_temporal_anomalies_in_patterns(self, timestamps: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Detect anomalies in temporal patterns."""
        anomalies = []
        
        # Find unusual time gaps
        if len(timestamps) >= 2:
            sorted_timestamps = sorted(timestamps, key=lambda x: x["datetime"])
            
            gaps = []
            for i in range(1, len(sorted_timestamps)):
                prev_time = sorted_timestamps[i-1]["datetime"]
                curr_time = sorted_timestamps[i]["datetime"]
                gap = (curr_time - prev_time).total_seconds()
                gaps.append(gap)
            
            if gaps:
                avg_gap = sum(gaps) / len(gaps)
                
                # Find gaps that are much larger than average
                for i, gap in enumerate(gaps):
                    if gap > avg_gap * 5 and gap > 3600:  # Much larger than average and > 1 hour
                        anomalies.append({
                            "type": "temporal_gap_anomaly",
                            "gap_seconds": gap,
                            "gap_hours": gap / 3600,
                            "position": i,
                            "description": f"Unusual time gap of {gap/3600:.1f} hours",
                            "anomaly_score": min(gap / (avg_gap * 10), 1.0)
                        })
        
        # Find unusual hour activity
        hour_counts = Counter(ts["hour"] for ts in timestamps)
        if hour_counts:
            avg_count = sum(hour_counts.values()) / len(hour_counts)
            
            for hour, count in hour_counts.items():
                # Unusual hours with high activity
                if (hour < 6 or hour > 22) and count > avg_count:
                    anomalies.append({
                        "type": "unusual_hour_activity",
                        "hour": hour,
                        "count": count,
                        "average_count": avg_count,
                        "description": f"High activity at unusual hour {hour}:00",
                        "anomaly_score": 0.6
                    })
        
        return anomalies
    
    def _tokenize_text(self, text: str) -> List[str]:
        """Tokenize text into words/tokens."""
        # Simple tokenization - split by whitespace and punctuation
        tokens = re.findall(r'\b\w+\b', text.lower())
        return tokens
    
    def _identify_frequency_patterns(self, item_counts: Counter, minimum_support: float) -> List[Dict[str, Any]]:
        """Identify patterns based on item frequencies."""
        patterns = []
        total_items = sum(item_counts.values())
        
        if total_items == 0:
            return patterns
        
        # Find items with specific frequency characteristics
        sorted_items = item_counts.most_common()
        
        # Zipf's law check - frequency should follow power law distribution
        if len(sorted_items) >= 3:
            top_freq = sorted_items[0][1]
            second_freq = sorted_items[1][1]
            third_freq = sorted_items[2][1]
            
            # Check if it roughly follows Zipf's law (second should be ~1/2, third ~1/3)
            expected_second = top_freq / 2
            expected_third = top_freq / 3
            
            second_ratio = second_freq / expected_second if expected_second > 0 else 0
            third_ratio = third_freq / expected_third if expected_third > 0 else 0
            
            if 0.7 <= second_ratio <= 1.3 and 0.7 <= third_ratio <= 1.3:
                patterns.append({
                    "type": "zipf_distribution_pattern",
                    "description": "Item frequencies follow Zipf's law distribution",
                    "support": 0.8,  # High confidence for this pattern
                    "top_items": sorted_items[:3]
                })
        
        # Find frequency clusters
        frequency_clusters = self._cluster_frequencies(item_counts, minimum_support)
        patterns.extend(frequency_clusters)
        
        return patterns
    
    def _cluster_frequencies(self, item_counts: Counter, minimum_support: float) -> List[Dict[str, Any]]:
        """Cluster items by similar frequencies."""
        patterns = []
        
        if not item_counts:
            return patterns
        
        frequencies = list(item_counts.values())
        unique_frequencies = sorted(set(frequencies), reverse=True)
        
        # Group items by similar frequencies
        for freq in unique_frequencies:
            items_with_freq = [item for item, count in item_counts.items() if count == freq]
            support = len(items_with_freq) / len(item_counts)
            
            if support >= minimum_support and len(items_with_freq) > 1:
                patterns.append({
                    "type": "frequency_cluster_pattern",
                    "frequency": freq,
                    "items": items_with_freq[:10],  # Limit for readability
                    "item_count": len(items_with_freq),
                    "support": support,
                    "description": f"Cluster of {len(items_with_freq)} items with frequency {freq}"
                })
        
        return patterns
    
    def _detect_frequency_anomalies(self, item_counts: Counter, minimum_support: float) -> List[Dict[str, Any]]:
        """Detect anomalies in frequency patterns."""
        anomalies = []
        
        if not item_counts:
            return anomalies
        
        frequencies = list(item_counts.values())
        if len(frequencies) < 3:
            return anomalies
        
        # Calculate frequency statistics
        mean_freq = sum(frequencies) / len(frequencies)
        sorted_freqs = sorted(frequencies, reverse=True)
        
        # Find items with unusually high frequency
        for item, count in item_counts.items():
            if count > mean_freq * 5:  # Much higher than average
                anomalies.append({
                    "type": "high_frequency_anomaly",
                    "item": item,
                    "frequency": count,
                    "mean_frequency": mean_freq,
                    "anomaly_score": min(count / (mean_freq * 10), 1.0),
                    "description": f"Item '{item}' has unusually high frequency: {count}"
                })
        
        # Find items with frequency that breaks expected distribution
        if len(sorted_freqs) >= 10:
            # Check for sudden drops in frequency
            for i in range(len(sorted_freqs) - 1):
                curr_freq = sorted_freqs[i]
                next_freq = sorted_freqs[i + 1]
                
                if curr_freq > next_freq * 10 and curr_freq > 10:  # Sudden drop
                    # Find the item with this frequency
                    anomalous_items = [item for item, count in item_counts.items() if count == curr_freq]
                    for item in anomalous_items:
                        anomalies.append({
                            "type": "frequency_drop_anomaly",
                            "item": item,
                            "frequency": curr_freq,
                            "next_frequency": next_freq,
                            "anomaly_score": 0.6,
                            "description": f"Sudden frequency drop after item '{item}'"
                        })
                    break
        
        return anomalies
    
    # Additional helper methods for fraud and network pattern recognition
    
    def _identify_numerical_fraud_patterns(self, numerical_data: Dict[str, float]) -> List[Dict[str, Any]]:
        """Identify numerical patterns that may indicate fraud."""
        patterns = []
        
        # Common fraud indicators in numerical data
        fraud_indicators = {
            "amount": {"threshold": 10000, "type": "large_transaction"},
            "failed_attempts": {"threshold": 5, "type": "excessive_failures"},
            "velocity": {"threshold": 100, "type": "high_velocity"},
            "session_duration": {"threshold": 28800, "type": "unusually_long_session"}  # 8 hours
        }
        
        for field, value in numerical_data.items():
            field_lower = field.lower()
            
            for pattern_key, pattern_info in fraud_indicators.items():
                if pattern_key in field_lower:
                    if value > pattern_info["threshold"]:
                        patterns.append({
                            "type": pattern_info["type"],
                            "field": field,
                            "value": value,
                            "threshold": pattern_info["threshold"],
                            "confidence": min(value / pattern_info["threshold"], 2.0) / 2.0,
                            "description": f"{pattern_info['type'].replace('_', ' ').title()}: {field} = {value}"
                        })
        
        return patterns
    
    def _identify_categorical_fraud_patterns(self, categorical_data: Dict[str, str]) -> List[Dict[str, Any]]:
        """Identify categorical patterns that may indicate fraud."""
        patterns = []
        
        # Suspicious patterns in categorical data
        for field, value in categorical_data.items():
            value_lower = value.lower()
            field_lower = field.lower()
            
            # Check for suspicious user agent patterns
            if "user_agent" in field_lower or "agent" in field_lower:
                suspicious_agents = ["bot", "crawler", "automated", "script", "test"]
                if any(agent in value_lower for agent in suspicious_agents):
                    patterns.append({
                        "type": "suspicious_user_agent",
                        "field": field,
                        "value": value,
                        "confidence": 0.7,
                        "description": f"Suspicious user agent detected: {value}"
                    })
            
            # Check for VPN/Proxy indicators
            if "ip" in field_lower or "location" in field_lower:
                vpn_indicators = ["vpn", "proxy", "anonymous", "tor"]
                if any(indicator in value_lower for indicator in vpn_indicators):
                    patterns.append({
                        "type": "vpn_proxy_usage",
                        "field": field,
                        "value": value,
                        "confidence": 0.8,
                        "description": f"VPN/Proxy usage detected: {value}"
                    })
        
        return patterns
    
    def _identify_event_fraud_patterns(self, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Identify fraud patterns in event sequences."""
        patterns = []
        
        if not events:
            return patterns
        
        # Count event types
        event_types = Counter()
        failed_events = 0
        
        for event in events:
            if isinstance(event, dict):
                event_type = event.get("type") or event.get("event_type") or event.get("action")
                if event_type:
                    event_types[str(event_type)] += 1
                
                # Count failed events
                status = event.get("status", "")
                if "fail" in str(status).lower() or "error" in str(status).lower():
                    failed_events += 1
        
        # High failure rate pattern
        if failed_events > len(events) * 0.3:  # More than 30% failures
            patterns.append({
                "type": "high_failure_rate",
                "failed_events": failed_events,
                "total_events": len(events),
                "failure_rate": failed_events / len(events),
                "confidence": 0.8,
                "description": f"High failure rate: {failed_events}/{len(events)} ({failed_events/len(events):.1%})"
            })
        
        # Rapid repeated events
        rapid_patterns = event_types.most_common(3)
        for event_type, count in rapid_patterns:
            if count > len(events) * 0.5:  # More than 50% of events are the same type
                patterns.append({
                    "type": "rapid_repeated_events",
                    "event_type": event_type,
                    "count": count,
                    "total_events": len(events),
                    "confidence": 0.6,
                    "description": f"Rapid repeated events: {event_type} occurred {count} times"
                })
        
        return patterns
    
    def _identify_sequence_fraud_patterns(self, sequences: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Identify fraud patterns in sequences."""
        patterns = []
        
        for sequence_data in sequences:
            sequence = sequence_data.get("sequence", [])
            sequence_name = sequence_data.get("name", "unknown")
            
            if len(sequence) < 3:
                continue
            
            # Look for suspicious rapid sequences
            if len(sequence) > 20:  # Very long sequence might indicate automation
                patterns.append({
                    "type": "rapid_sequence",
                    "sequence_name": sequence_name,
                    "length": len(sequence),
                    "confidence": 0.6,
                    "description": f"Rapid sequence detected: {sequence_name} with {len(sequence)} items"
                })
            
            # Look for repeated identical items (possible automation)
            sequence_str = [str(item) for item in sequence]
            item_counts = Counter(sequence_str)
            most_common = item_counts.most_common(1)
            
            if most_common and most_common[0][1] > len(sequence) * 0.7:  # 70% same item
                patterns.append({
                    "type": "repeated_identical_actions",
                    "sequence_name": sequence_name,
                    "repeated_item": most_common[0][0],
                    "repetitions": most_common[0][1],
                    "total_length": len(sequence),
                    "confidence": 0.7,
                    "description": f"Repeated identical actions: '{most_common[0][0]}' repeated {most_common[0][1]} times"
                })
        
        return patterns
    
    def _identify_suspicious_pattern_combinations(self, numerical_data: Dict[str, float], categorical_data: Dict[str, str], events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Identify suspicious combinations of patterns."""
        patterns = []
        
        # Combination of high-risk indicators
        risk_score = 0
        risk_factors = []
        
        # Check numerical risk factors
        for field, value in numerical_data.items():
            field_lower = field.lower()
            if "amount" in field_lower and value > 5000:
                risk_score += 0.3
                risk_factors.append(f"high_{field_lower}")
            elif "failed" in field_lower and value > 3:
                risk_score += 0.4
                risk_factors.append(f"multiple_{field_lower}")
        
        # Check categorical risk factors
        for field, value in categorical_data.items():
            value_lower = value.lower()
            if any(indicator in value_lower for indicator in ["vpn", "proxy", "bot"]):
                risk_score += 0.3
                risk_factors.append(f"suspicious_{field.lower()}")
        
        # Check event risk factors
        if events:
            failure_rate = sum(1 for event in events if isinstance(event, dict) and "fail" in str(event.get("status", "")).lower()) / len(events)
            if failure_rate > 0.2:
                risk_score += 0.3
                risk_factors.append("high_failure_rate")
        
        # If multiple risk factors are present
        if len(risk_factors) >= 2 and risk_score >= 0.6:
            patterns.append({
                "type": "multiple_risk_factors",
                "risk_factors": risk_factors,
                "risk_score": min(risk_score, 1.0),
                "confidence": min(risk_score, 1.0),
                "description": f"Multiple risk factors detected: {', '.join(risk_factors)}"
            })
        
        return patterns
    
    def _calculate_fraud_risk_patterns(self, fraud_indicators: List[Dict[str, Any]], suspicious_patterns: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Calculate overall fraud risk patterns."""
        risk_patterns = []
        
        # Count indicators by type
        indicator_types = Counter(indicator.get("type", "unknown") for indicator in fraud_indicators)
        
        # High-confidence fraud pattern
        high_confidence_indicators = [ind for ind in fraud_indicators if ind.get("confidence", 0) > 0.7]
        if len(high_confidence_indicators) >= 2:
            risk_patterns.append({
                "type": "high_fraud_risk_pattern",
                "indicator_count": len(high_confidence_indicators),
                "confidence": 0.9,
                "risk_level": "high",
                "description": f"High fraud risk: {len(high_confidence_indicators)} high-confidence indicators"
            })
        
        # Multiple indicator types pattern
        if len(indicator_types) >= 3:
            risk_patterns.append({
                "type": "multiple_fraud_vectors",
                "indicator_types": list(indicator_types.keys()),
                "confidence": 0.8,
                "risk_level": "medium",
                "description": f"Multiple fraud vectors: {', '.join(indicator_types.keys())}"
            })
        
        return risk_patterns
    
    def _analyze_network_connections(self, network_data: Dict[str, Any], categorical_data: Dict[str, str]) -> List[Dict[str, Any]]:
        """Analyze network connection patterns."""
        patterns = []
        
        # Check for IP-related patterns
        for field, value in categorical_data.items():
            if "ip" in field.lower():
                # Check for private IP usage
                if any(private_prefix in value for private_prefix in ["192.168.", "10.0.", "172.16."]):
                    patterns.append({
                        "type": "private_ip_pattern",
                        "field": field,
                        "ip": value,
                        "support": 0.7,
                        "description": f"Private IP address usage: {value}"
                    })
                
                # Check for suspicious IP patterns
                if value in ["0.0.0.0", "127.0.0.1", "localhost"]:
                    patterns.append({
                        "type": "suspicious_ip_pattern",
                        "field": field,
                        "ip": value,
                        "support": 0.8,
                        "description": f"Suspicious IP address: {value}"
                    })
        
        return patterns
    
    def _analyze_network_traffic(self, numerical_data: Dict[str, float], categorical_data: Dict[str, str]) -> List[Dict[str, Any]]:
        """Analyze network traffic patterns."""
        patterns = []
        
        # Check for traffic volume patterns
        for field, value in numerical_data.items():
            field_lower = field.lower()
            
            if "bytes" in field_lower or "traffic" in field_lower:
                if value > 10000000:  # 10MB threshold
                    patterns.append({
                        "type": "high_traffic_pattern",
                        "field": field,
                        "bytes": value,
                        "support": 0.6,
                        "description": f"High traffic volume: {value} bytes"
                    })
            
            elif "connections" in field_lower or "requests" in field_lower:
                if value > 1000:  # High connection count
                    patterns.append({
                        "type": "high_connection_pattern",
                        "field": field,
                        "count": value,
                        "support": 0.7,
                        "description": f"High connection count: {value}"
                    })
        
        return patterns
    
    def _detect_network_pattern_anomalies(self, network_data: Dict[str, Any], categorical_data: Dict[str, str], numerical_data: Dict[str, float]) -> List[Dict[str, Any]]:
        """Detect anomalies in network patterns."""
        anomalies = []
        
        # Port scanning pattern (high number of different ports)
        port_fields = [field for field in numerical_data.keys() if "port" in field.lower()]
        if len(port_fields) > 10:
            anomalies.append({
                "type": "port_scanning_pattern",
                "port_count": len(port_fields),
                "anomaly_score": 0.8,
                "description": f"Possible port scanning: {len(port_fields)} different ports accessed"
            })
        
        # Unusual protocol usage
        for field, value in categorical_data.items():
            if "protocol" in field.lower():
                unusual_protocols = ["ftp", "telnet", "rsh", "rlogin"]
                if any(protocol in value.lower() for protocol in unusual_protocols):
                    anomalies.append({
                        "type": "unusual_protocol_pattern",
                        "protocol": value,
                        "anomaly_score": 0.6,
                        "description": f"Unusual protocol usage: {value}"
                    })
        
        return anomalies
    
    def _extract_phrase_patterns(self, texts: List[str], minimum_support: float) -> List[Dict[str, Any]]:
        """Extract common phrase patterns from text."""
        patterns = []
        
        # Extract n-gram phrases
        all_phrases = []
        for text in texts:
            words = self._tokenize_text(text)
            
            # Extract 2-grams and 3-grams
            for n in [2, 3]:
                for i in range(len(words) - n + 1):
                    phrase = " ".join(words[i:i+n])
                    all_phrases.append(phrase)
        
        # Count phrase frequencies
        phrase_counts = Counter(all_phrases)
        total_phrases = len(all_phrases)
        
        for phrase, count in phrase_counts.items():
            support = count / total_phrases if total_phrases > 0 else 0
            if support >= minimum_support and count > 1:
                patterns.append({
                    "type": "phrase_pattern",
                    "phrase": phrase,
                    "count": count,
                    "support": support,
                    "description": f"Common phrase: '{phrase}' (appears {count} times)"
                })
        
        return sorted(patterns, key=lambda x: x["support"], reverse=True)[:20]  # Limit to top 20
    
    def _analyze_linguistic_patterns(self, texts: List[str]) -> List[Dict[str, Any]]:
        """Analyze linguistic patterns in text."""
        patterns = []
        
        if not texts:
            return patterns
        
        # Analyze text lengths
        lengths = [len(text) for text in texts]
        if lengths:
            avg_length = sum(lengths) / len(lengths)
            patterns.append({
                "type": "text_length_pattern",
                "average_length": avg_length,
                "min_length": min(lengths),
                "max_length": max(lengths),
                "description": f"Average text length: {avg_length:.1f} characters"
            })
        
        # Analyze vocabulary richness
        all_words = []
        for text in texts:
            words = self._tokenize_text(text)
            all_words.extend(words)
        
        if all_words:
            unique_words = len(set(all_words))
            total_words = len(all_words)
            vocabulary_richness = unique_words / total_words if total_words > 0 else 0
            
            patterns.append({
                "type": "vocabulary_richness_pattern",
                "unique_words": unique_words,
                "total_words": total_words,
                "richness_ratio": vocabulary_richness,
                "description": f"Vocabulary richness: {vocabulary_richness:.2f} ({unique_words}/{total_words})"
            })
        
        return patterns
    
    def _detect_textual_anomalies(self, texts: List[str]) -> List[Dict[str, Any]]:
        """Detect anomalies in textual data."""
        anomalies = []
        
        for i, text in enumerate(texts):
            # Very short or very long texts
            if len(text) < 5:
                anomalies.append({
                    "type": "very_short_text",
                    "text_index": i,
                    "length": len(text),
                    "anomaly_score": 0.5,
                    "description": f"Very short text: {len(text)} characters"
                })
            elif len(text) > 1000:
                anomalies.append({
                    "type": "very_long_text",
                    "text_index": i,
                    "length": len(text),
                    "anomaly_score": 0.4,
                    "description": f"Very long text: {len(text)} characters"
                })
            
            # Check for suspicious patterns
            text_lower = text.lower()
            suspicious_terms = ["test", "debug", "admin", "password", "hack", "exploit"]
            found_terms = [term for term in suspicious_terms if term in text_lower]
            
            if found_terms:
                anomalies.append({
                    "type": "suspicious_text_content",
                    "text_index": i,
                    "suspicious_terms": found_terms,
                    "anomaly_score": 0.7,
                    "description": f"Suspicious terms found: {', '.join(found_terms)}"
                })
        
        return anomalies
    
    # Pattern analysis and statistics methods
    
    def _calculate_pattern_statistics(self, recognized_patterns: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate statistics across all recognized patterns."""
        stats = {
            "pattern_counts": {},
            "confidence_distribution": {},
            "support_distribution": {},
            "overall_metrics": {}
        }
        
        all_patterns = []
        for pattern_type, pattern_data in recognized_patterns.items():
            if isinstance(pattern_data, dict) and "patterns" in pattern_data:
                patterns = pattern_data["patterns"]
                stats["pattern_counts"][pattern_type] = len(patterns)
                all_patterns.extend(patterns)
        
        # Calculate confidence distribution
        confidences = [p.get("confidence", 0) for p in all_patterns if "confidence" in p]
        if confidences:
            stats["confidence_distribution"] = {
                "mean": sum(confidences) / len(confidences),
                "min": min(confidences),
                "max": max(confidences),
                "high_confidence_count": len([c for c in confidences if c > 0.7])
            }
        
        # Calculate support distribution
        supports = [p.get("support", 0) for p in all_patterns if "support" in p]
        if supports:
            stats["support_distribution"] = {
                "mean": sum(supports) / len(supports),
                "min": min(supports),
                "max": max(supports),
                "strong_support_count": len([s for s in supports if s > 0.5])
            }
        
        # Overall metrics
        stats["overall_metrics"] = {
            "total_patterns": len(all_patterns),
            "pattern_types": len(stats["pattern_counts"]),
            "average_patterns_per_type": len(all_patterns) / len(stats["pattern_counts"]) if stats["pattern_counts"] else 0
        }
        
        return stats
    
    def _analyze_pattern_evolution(self, current_patterns: Dict[str, Any], historical_patterns: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze how patterns have evolved compared to historical data."""
        evolution = {
            "new_patterns": [],
            "disappeared_patterns": [],
            "evolved_patterns": [],
            "stable_patterns": []
        }
        
        # This is a simplified comparison
        # In a real implementation, this would involve more sophisticated pattern matching
        
        current_pattern_signatures = set()
        historical_pattern_signatures = set()
        
        # Extract pattern signatures from current patterns
        for pattern_type, pattern_data in current_patterns.items():
            if isinstance(pattern_data, dict) and "patterns" in pattern_data:
                for pattern in pattern_data["patterns"]:
                    signature = self._create_pattern_signature(pattern, pattern_type)
                    current_pattern_signatures.add(signature)
        
        # Extract pattern signatures from historical patterns
        if historical_patterns:
            for pattern_type, pattern_data in historical_patterns.items():
                if isinstance(pattern_data, dict) and "patterns" in pattern_data:
                    for pattern in pattern_data["patterns"]:
                        signature = self._create_pattern_signature(pattern, pattern_type)
                        historical_pattern_signatures.add(signature)
        
        # Find new and disappeared patterns
        new_patterns = current_pattern_signatures - historical_pattern_signatures
        disappeared_patterns = historical_pattern_signatures - current_pattern_signatures
        stable_patterns = current_pattern_signatures & historical_pattern_signatures
        
        evolution["new_patterns"] = list(new_patterns)[:10]  # Limit for readability
        evolution["disappeared_patterns"] = list(disappeared_patterns)[:10]
        evolution["stable_patterns"] = list(stable_patterns)[:10]
        
        return evolution
    
    def _create_pattern_signature(self, pattern: Dict[str, Any], pattern_type: str) -> str:
        """Create a unique signature for a pattern."""
        # Create a simple signature based on pattern type and key characteristics
        signature_parts = [pattern_type]
        
        pattern_type_key = pattern.get("type", "unknown")
        signature_parts.append(pattern_type_key)
        
        # Add type-specific signature components
        if "field" in pattern:
            signature_parts.append(f"field:{pattern['field']}")
        if "item" in pattern:
            signature_parts.append(f"item:{pattern['item']}")
        if "phrase" in pattern:
            signature_parts.append(f"phrase:{pattern['phrase']}")
        
        return "|".join(signature_parts)
    
    def _generate_pattern_recommendations(self, recognized_patterns: Dict[str, Any], pattern_stats: Dict[str, Any], pattern_evolution: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate recommendations based on recognized patterns."""
        recommendations = []
        
        # High-confidence pattern recommendations
        total_patterns = pattern_stats.get("overall_metrics", {}).get("total_patterns", 0)
        if total_patterns > 20:
            recommendations.append({
                "priority": "medium",
                "category": "pattern_analysis",
                "action": "investigate_high_pattern_density",
                "description": f"High pattern density detected: {total_patterns} patterns found",
                "implementation": "Review patterns for potential automation or systematic behavior"
            })
        
        # Fraud pattern recommendations
        fraud_patterns = recognized_patterns.get("fraud", {}).get("patterns", [])
        if fraud_patterns:
            high_confidence_fraud = [p for p in fraud_patterns if p.get("confidence", 0) > 0.7]
            if high_confidence_fraud:
                recommendations.append({
                    "priority": "high",
                    "category": "security",
                    "action": "investigate_fraud_patterns",
                    "description": f"High-confidence fraud patterns detected: {len(high_confidence_fraud)}",
                    "implementation": "Immediate investigation of fraud indicators required"
                })
        
        # Behavioral pattern recommendations
        behavioral_patterns = recognized_patterns.get("behavioral", {}).get("patterns", [])
        if behavioral_patterns:
            recommendations.append({
                "priority": "medium",
                "category": "monitoring",
                "action": "enhance_behavioral_monitoring",
                "description": f"Behavioral patterns identified: {len(behavioral_patterns)}",
                "implementation": "Implement continuous behavioral pattern monitoring"
            })
        
        # New pattern recommendations
        if pattern_evolution.get("new_patterns"):
            recommendations.append({
                "priority": "medium",
                "category": "analysis",
                "action": "analyze_new_patterns",
                "description": f"New patterns emerged: {len(pattern_evolution['new_patterns'])}",
                "implementation": "Analyze new patterns for security implications"
            })
        
        return recommendations
    
    def _learn_new_patterns(self, recognized_patterns: Dict[str, Any], historical_patterns: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Learn and extract new patterns from the current analysis."""
        learned = {
            "pattern_rules": [],
            "updated_baselines": {},
            "pattern_correlations": []
        }
        
        # Extract new pattern rules
        for pattern_type, pattern_data in recognized_patterns.items():
            if isinstance(pattern_data, dict) and "patterns" in pattern_data:
                patterns = pattern_data["patterns"]
                high_confidence_patterns = [p for p in patterns if p.get("confidence", 0) > 0.8]
                
                for pattern in high_confidence_patterns:
                    learned["pattern_rules"].append({
                        "rule_type": f"{pattern_type}_rule",
                        "pattern_signature": self._create_pattern_signature(pattern, pattern_type),
                        "confidence": pattern.get("confidence"),
                        "description": pattern.get("description", ""),
                        "learned_from": "current_analysis"
                    })
        
        # Update baselines with current patterns
        for pattern_type, pattern_data in recognized_patterns.items():
            if isinstance(pattern_data, dict):
                learned["updated_baselines"][pattern_type] = {
                    "pattern_count": len(pattern_data.get("patterns", [])),
                    "last_updated": datetime.utcnow().isoformat(),
                    "confidence_threshold": 0.6
                }
        
        return learned
    
    # Utility methods
    
    def _is_timestamp(self, value: str) -> bool:
        """Check if a string value is likely a timestamp."""
        if not isinstance(value, str) or len(value) < 8:
            return False
        
        timestamp_indicators = ['T', ':', '-', 'Z', '+', 'GMT', 'UTC']
        return any(indicator in value for indicator in timestamp_indicators)
    
    def _safe_parse_timestamp(self, timestamp_str: str) -> Optional[datetime]:
        """Safely parse timestamp string to datetime object."""
        formats = [
            "%Y-%m-%dT%H:%M:%S.%fZ",
            "%Y-%m-%dT%H:%M:%SZ",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d",
            "%m/%d/%Y %H:%M:%S",
            "%m/%d/%Y"
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(timestamp_str, fmt)
            except ValueError:
                continue
        
        return None

    async def _arun(self, **kwargs: Any) -> str:
        """Async version of the run method."""
        return self._run(**kwargs)