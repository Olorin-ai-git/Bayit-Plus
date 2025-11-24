"""
Fraud detection features WITHOUT using MODEL_SCORE.
These features detect fraud based on behavioral patterns only.
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from collections import Counter
import hashlib

logger = logging.getLogger(__name__)


class FraudDetectionFeatures:
    """
    Calculate fraud risk features without using MODEL_SCORE.
    Focus on velocity, repetition, concentration, and anomaly patterns.
    """
    
    def __init__(self):
        self.base_threshold = 0.20  # Base threshold for high-volume entities
        self.progressive_thresholds = {
            'high_volume': 0.20,      # 10+ transactions
            'medium_volume': 0.17,    # 5-9 transactions
            'low_volume': 0.14        # 2-4 transactions
        }
        self.merchant_risk_multipliers = {
            # High-risk merchants (known for fraud)
            'coinflow': 0.85,         # Lower threshold (easier to flag)
            'eneba': 0.85,
            'g2a': 0.85,
            'kinguin': 0.85,
            # Medium-risk merchants
            'steam': 0.95,
            'epic': 0.95,
            # Low-risk merchants (utilities, subscriptions)
            'netflix': 1.15,          # Higher threshold (harder to flag)
            'spotify': 1.15,
            'amazon': 1.10,
            'apple': 1.10
        }
        
    @property
    def risk_threshold(self):
        """Backward compatibility for existing code"""
        return self.base_threshold
        
    def calculate_transaction_features(
        self, 
        transactions: List[Dict[str, Any]],
        entity_id: str,
        window_hours: int = 24
    ) -> Dict[str, Any]:
        """
        Calculate comprehensive fraud features from transactions.
        
        Args:
            transactions: List of transaction records
            entity_id: Entity being analyzed (email, card, etc.)
            window_hours: Time window for velocity calculations
            
        Returns:
            Dictionary of calculated features and risk scores
        """
        if not transactions:
            return {
                'risk_score': 0.0,
                'risk_level': 'low',
                'features': {},
                'anomalies': []
            }
        
        # Sort transactions by time
        sorted_txs = sorted(transactions, key=lambda x: x.get('TX_DATETIME', x.get('tx_datetime', '')))
        
        # Calculate all features
        velocity_features = self._calculate_velocity_features(sorted_txs, window_hours)
        repetition_features = self._calculate_repetition_features(sorted_txs)
        concentration_features = self._calculate_concentration_features(sorted_txs)
        temporal_features = self._calculate_temporal_features(sorted_txs)
        amount_features = self._calculate_amount_features(sorted_txs)
        
        # Combine all features
        all_features = {
            **velocity_features,
            **repetition_features,
            **concentration_features,
            **temporal_features,
            **amount_features
        }
        
        # Calculate composite risk score WITHOUT MODEL_SCORE
        risk_score = self._calculate_composite_risk_score(all_features)
        
        # Detect anomalies
        anomalies = self._detect_anomalies(all_features)
        
        return {
            'risk_score': risk_score,
            'risk_level': self._get_risk_level(risk_score),
            'features': all_features,
            'anomalies': anomalies,
            'threshold': self.risk_threshold,
            'is_fraud': risk_score >= self.risk_threshold
        }
    
    def _calculate_velocity_features(self, transactions: List[Dict], window_hours: int) -> Dict[str, float]:
        """Calculate transaction velocity features."""
        features = {}
        
        if not transactions:
            return features
        
        # Get timestamps
        timestamps = []
        for tx in transactions:
            tx_time = tx.get('TX_DATETIME') or tx.get('tx_datetime')
            if tx_time:
                if isinstance(tx_time, str):
                    timestamps.append(datetime.fromisoformat(tx_time[:19]))
                else:
                    timestamps.append(tx_time)
        
        if not timestamps:
            return features
        
        # Overall velocity
        first_time = min(timestamps)
        last_time = max(timestamps)
        time_span_hours = max((last_time - first_time).total_seconds() / 3600, 0.1)
        
        features['tx_count'] = len(transactions)
        features['tx_per_hour'] = len(transactions) / time_span_hours
        
        # Burst detection - transactions in short windows
        burst_windows = [1, 3, 6, 12, 24]  # hours
        for window in burst_windows:
            burst_count = self._count_transactions_in_window(timestamps, window)
            features[f'max_tx_in_{window}h'] = burst_count
            features[f'burst_score_{window}h'] = burst_count / max(window, 1)
        
        # Time between transactions
        if len(timestamps) > 1:
            intervals = [(timestamps[i+1] - timestamps[i]).total_seconds() / 60 
                        for i in range(len(timestamps)-1)]
            features['min_interval_minutes'] = min(intervals)
            features['avg_interval_minutes'] = sum(intervals) / len(intervals)
            
            # Rapid succession flag
            features['rapid_succession'] = 1.0 if min(intervals) < 5 else 0.0
        
        return features
    
    def _calculate_repetition_features(self, transactions: List[Dict]) -> Dict[str, float]:
        """Calculate repetition and pattern features."""
        features = {}
        
        if not transactions:
            return features
        
        # Amount repetition
        amounts = [float(tx.get('AMOUNT', tx.get('amount', 0))) for tx in transactions]
        amount_counts = Counter(amounts)
        
        features['unique_amounts'] = len(amount_counts)
        features['amount_diversity'] = len(amount_counts) / len(amounts) if amounts else 0
        
        # Most repeated amount
        if amount_counts:
            most_common_amount, count = amount_counts.most_common(1)[0]
            features['max_repeated_amount_count'] = count
            features['max_repeated_amount_ratio'] = count / len(amounts)
            features['has_repeated_amounts'] = 1.0 if count > 2 else 0.0
        
        # Merchant repetition
        merchants = [tx.get('MERCHANT', tx.get('merchant', '')) for tx in transactions]
        merchant_counts = Counter(merchants)
        
        features['unique_merchants'] = len(merchant_counts)
        features['merchant_diversity'] = len(merchant_counts) / len(merchants) if merchants else 0
        
        if merchant_counts:
            most_common_merchant, count = merchant_counts.most_common(1)[0]
            features['max_merchant_concentration'] = count / len(merchants)
            features['single_merchant'] = 1.0 if len(merchant_counts) == 1 else 0.0
        
        return features
    
    def _calculate_concentration_features(self, transactions: List[Dict]) -> Dict[str, float]:
        """Calculate concentration features for IPs, devices, etc."""
        features = {}
        
        if not transactions:
            return features
        
        # IP concentration
        ips = [tx.get('IP', tx.get('ip', '')) for tx in transactions if tx.get('IP') or tx.get('ip')]
        if ips:
            ip_counts = Counter(ips)
            features['unique_ips'] = len(ip_counts)
            features['ip_diversity'] = len(ip_counts) / len(ips)
            
            most_common_ip, count = ip_counts.most_common(1)[0]
            features['max_ip_concentration'] = count / len(ips)
            features['single_ip'] = 1.0 if len(ip_counts) == 1 else 0.0
            features['tx_per_ip'] = len(ips) / len(ip_counts)
        
        # Device concentration
        devices = [tx.get('DEVICE_ID', tx.get('device_id', '')) for tx in transactions 
                  if tx.get('DEVICE_ID') or tx.get('device_id')]
        if devices:
            device_counts = Counter(devices)
            features['unique_devices'] = len(device_counts)
            features['device_diversity'] = len(device_counts) / len(devices)
            
            most_common_device, count = device_counts.most_common(1)[0]
            features['max_device_concentration'] = count / len(devices)
            features['single_device'] = 1.0 if len(device_counts) == 1 else 0.0
            features['tx_per_device'] = len(devices) / len(device_counts)
        
        # Country concentration
        countries = [tx.get('IP_COUNTRY_CODE', tx.get('country', '')) for tx in transactions 
                    if tx.get('IP_COUNTRY_CODE') or tx.get('country')]
        if countries:
            country_counts = Counter(countries)
            features['unique_countries'] = len(country_counts)
            features['international'] = 1.0 if len(country_counts) > 1 else 0.0
        
        return features
    
    def _calculate_temporal_features(self, transactions: List[Dict]) -> Dict[str, float]:
        """Calculate time-based pattern features."""
        features = {}
        
        if not transactions:
            return features
        
        # Extract timestamps
        timestamps = []
        for tx in transactions:
            tx_time = tx.get('TX_DATETIME') or tx.get('tx_datetime')
            if tx_time:
                if isinstance(tx_time, str):
                    timestamps.append(datetime.fromisoformat(tx_time[:19]))
                else:
                    timestamps.append(tx_time)
        
        if not timestamps:
            return features
        
        # Time of day analysis
        hours = [ts.hour for ts in timestamps]
        hour_counts = Counter(hours)
        
        features['unique_hours'] = len(hour_counts)
        features['hour_concentration'] = max(hour_counts.values()) / len(hours) if hours else 0
        
        # Night time transactions (10 PM - 6 AM)
        night_txs = sum(1 for h in hours if h >= 22 or h < 6)
        features['night_time_ratio'] = night_txs / len(hours) if hours else 0
        
        # Weekend transactions
        weekend_txs = sum(1 for ts in timestamps if ts.weekday() >= 5)
        features['weekend_ratio'] = weekend_txs / len(timestamps) if timestamps else 0
        
        # Time span
        if len(timestamps) > 1:
            time_span = (max(timestamps) - min(timestamps))
            features['time_span_hours'] = time_span.total_seconds() / 3600
            features['time_span_days'] = time_span.days
            
            # Check if all in single day
            dates = set(ts.date() for ts in timestamps)
            features['single_day'] = 1.0 if len(dates) == 1 else 0.0
        
        return features
    
    def _calculate_amount_features(self, transactions: List[Dict]) -> Dict[str, float]:
        """Calculate amount-based features."""
        features = {}
        
        if not transactions:
            return features
        
        amounts = [float(tx.get('AMOUNT', tx.get('amount', tx.get('PAID_AMOUNT_VALUE_IN_CURRENCY', 0)))) 
                  for tx in transactions]
        
        if not amounts:
            return features
        
        features['total_amount'] = sum(amounts)
        features['avg_amount'] = sum(amounts) / len(amounts)
        features['max_amount'] = max(amounts)
        features['min_amount'] = min(amounts)
        
        # Amount variance
        if len(amounts) > 1:
            avg = features['avg_amount']
            variance = sum((a - avg) ** 2 for a in amounts) / len(amounts)
            features['amount_variance'] = variance
            features['amount_std'] = variance ** 0.5
            
            # Coefficient of variation
            features['amount_cv'] = features['amount_std'] / avg if avg > 0 else 0
        
        # Round number detection
        round_amounts = sum(1 for a in amounts if a == int(a))
        features['round_amount_ratio'] = round_amounts / len(amounts)
        
        # Small amount flag
        features['small_amounts'] = 1.0 if features['avg_amount'] < 50 else 0.0
        
        return features
    
    def _count_transactions_in_window(self, timestamps: List[datetime], window_hours: int) -> int:
        """Count maximum transactions in any sliding window."""
        if not timestamps or len(timestamps) <= 1:
            return len(timestamps)
        
        max_count = 0
        window_delta = timedelta(hours=window_hours)
        
        for i, start_time in enumerate(timestamps):
            end_time = start_time + window_delta
            count = sum(1 for ts in timestamps if start_time <= ts <= end_time)
            max_count = max(max_count, count)
        
        return max_count
    
    def _calculate_composite_risk_score(self, features: Dict[str, float]) -> float:
        """
        Calculate composite risk score WITHOUT using MODEL_SCORE.
        Based entirely on behavioral patterns.
        Handles both burst fraud and distributed fraud patterns.
        """
        risk_score = 0.0
        
        # Transaction volume risk (40% weight - INCREASED) - catches distributed fraud
        volume_risk = 0.0
        tx_count = features.get('tx_count', 0)
        if tx_count > 15:
            volume_risk += 1.0  # Very high volume
        elif tx_count > 10:
            volume_risk += 0.8
        elif tx_count > 6:
            volume_risk += 0.6
        elif tx_count > 4:
            volume_risk += 0.4
        elif tx_count > 2:
            volume_risk += 0.2
        
        # Velocity/burst detection
        if features.get('tx_per_hour', 0) > 2:
            volume_risk += 0.4
        if features.get('burst_score_3h', 0) > 3:
            volume_risk += 0.5
        if features.get('rapid_succession', 0) > 0:
            volume_risk += 0.4
        
        risk_score += min(volume_risk, 1.0) * 0.40  # Increased from 0.30
        
        # Concentration risk (30% weight - adjusted)
        concentration_risk = 0.0
        if features.get('single_merchant', 0) > 0 and tx_count > 3:  # Lowered from 5
            concentration_risk += 0.6  # All at same merchant
        if features.get('single_device', 0) > 0 and tx_count > 3:  # Lowered from 5
            concentration_risk += 0.4  # Same device
        elif features.get('tx_per_device', 0) > 3:  # Lowered from 5
            concentration_risk += 0.3  # High concentration per device
        
        if features.get('single_ip', 0) > 0 and tx_count > 3:  # Lowered from 5
            concentration_risk += 0.3  # Same IP
        elif features.get('tx_per_ip', 0) > 3:  # Lowered from 5
            concentration_risk += 0.2  # High concentration per IP
        
        # Low diversity is suspicious
        if features.get('merchant_diversity', 1) < 0.3 and tx_count > 3:  # Lowered from 5
            concentration_risk += 0.3
        
        risk_score += min(concentration_risk, 1.0) * 0.30  # Reduced from 0.35
        
        # Repetition risk (15% weight - reduced)
        repetition_risk = 0.0
        if features.get('max_repeated_amount_ratio', 0) > 0.5:
            repetition_risk += 0.6
        if features.get('has_repeated_amounts', 0) > 0:
            repetition_risk += 0.4
        if features.get('amount_diversity', 1) < 0.3:
            repetition_risk += 0.3
        risk_score += min(repetition_risk, 1.0) * 0.15  # Reduced from 0.20
        
        # Amount pattern risk (10% weight)
        amount_risk = 0.0
        if features.get('amount_cv', 0) < 0.1 and tx_count > 3:
            amount_risk += 0.5  # Very similar amounts
        if features.get('round_amount_ratio', 0) > 0.8:
            amount_risk += 0.3
        if features.get('total_amount', 0) > 500 and tx_count > 10:
            amount_risk += 0.3  # High total value
        risk_score += min(amount_risk, 1.0) * 0.10
        
        # Temporal risk (5% weight - reduced)
        temporal_risk = 0.0
        if features.get('single_day', 0) > 0 and tx_count > 5:
            temporal_risk += 0.5
        if features.get('night_time_ratio', 0) > 0.5:
            temporal_risk += 0.3
        if features.get('time_span_hours', 24) < 3 and tx_count > 5:
            temporal_risk += 0.2
        risk_score += min(temporal_risk, 1.0) * 0.05
        
        # Ensure score is between 0 and 1
        return min(max(risk_score, 0.0), 1.0)
    
    def _detect_anomalies(self, features: Dict[str, float]) -> List[Dict[str, Any]]:
        """Detect specific anomaly patterns."""
        anomalies = []
        
        # Burst pattern
        if features.get('burst_score_3h', 0) > 3:
            anomalies.append({
                'type': 'burst_pattern',
                'severity': 'high',
                'description': f"{features.get('max_tx_in_3h', 0)} transactions in 3 hours",
                'risk_contribution': 0.15
            })
        
        # Repeated amounts
        if features.get('max_repeated_amount_ratio', 0) > 0.5:
            anomalies.append({
                'type': 'repeated_amounts',
                'severity': 'high',
                'description': f"{features.get('max_repeated_amount_count', 0)} identical amounts",
                'risk_contribution': 0.10
            })
        
        # Single source concentration
        if (features.get('single_ip', 0) > 0 and 
            features.get('single_device', 0) > 0 and 
            features.get('tx_count', 0) > 5):
            anomalies.append({
                'type': 'single_source',
                'severity': 'high',
                'description': 'All transactions from single IP/device',
                'risk_contribution': 0.15
            })
        
        # Rapid succession
        if features.get('min_interval_minutes', float('inf')) < 5:
            anomalies.append({
                'type': 'rapid_succession',
                'severity': 'medium',
                'description': f"Transactions {features.get('min_interval_minutes', 0):.1f} minutes apart",
                'risk_contribution': 0.08
            })
        
        return anomalies
    
    def _get_risk_level(self, risk_score: float) -> str:
        """Categorize risk level."""
        if risk_score >= 0.7:
            return 'critical'
        elif risk_score >= 0.5:
            return 'high'
        elif risk_score >= self.risk_threshold:
            return 'medium'
        elif risk_score >= 0.2:
            return 'low'
        else:
            return 'minimal'
    
    def calculate_per_transaction_risk(
        self,
        transaction: Dict[str, Any],
        historical_transactions: List[Dict[str, Any]]
    ) -> float:
        """
        Calculate risk score for a single transaction based on historical context.
        Does NOT use MODEL_SCORE.
        """
        if not historical_transactions:
            return 0.0
        
        # Get recent transactions (last 24 hours before this transaction)
        tx_time = transaction.get('TX_DATETIME') or transaction.get('tx_datetime')
        if not tx_time:
            return 0.0
        
        if isinstance(tx_time, str):
            tx_datetime = datetime.fromisoformat(tx_time[:19])
        else:
            tx_datetime = tx_time
        
        window_start = tx_datetime - timedelta(hours=24)
        
        recent_txs = []
        for htx in historical_transactions:
            htx_time = htx.get('TX_DATETIME') or htx.get('tx_datetime')
            if htx_time:
                if isinstance(htx_time, str):
                    htx_datetime = datetime.fromisoformat(htx_time[:19])
                else:
                    htx_datetime = htx_time
                
                if window_start <= htx_datetime <= tx_datetime:
                    recent_txs.append(htx)
        
        # Include current transaction
        recent_txs.append(transaction)
        
        # Calculate features for this window
        window_features = self.calculate_transaction_features(recent_txs, '', 24)
        
        return window_features['risk_score']
