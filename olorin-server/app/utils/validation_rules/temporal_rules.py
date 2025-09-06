#!/usr/bin/env python3
"""
Temporal Validation Rules
Comprehensive validation for dates, timestamps, durations, and temporal patterns.
"""

import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Set, Tuple
from dateutil import parser
import calendar


class TemporalValidationRules:
    """
    Advanced temporal validation rules for time-based data integrity.
    """
    
    # Supported timestamp formats
    TIMESTAMP_FORMATS = [
        '%Y-%m-%d %H:%M:%S',
        '%Y-%m-%dT%H:%M:%S',
        '%Y-%m-%dT%H:%M:%SZ',
        '%Y-%m-%dT%H:%M:%S%z',
        '%Y-%m-%d %H:%M:%S.%f',
        '%Y-%m-%dT%H:%M:%S.%f',
        '%Y-%m-%dT%H:%M:%S.%fZ',
        '%m/%d/%Y %H:%M:%S',
        '%d/%m/%Y %H:%M:%S',
        '%Y%m%d%H%M%S',
    ]
    
    # Regex patterns for different timestamp formats
    TIMESTAMP_PATTERNS = {
        'iso_with_z': re.compile(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$'),
        'iso_with_tz': re.compile(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$'),
        'iso_microseconds': re.compile(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z?$'),
        'unix_seconds': re.compile(r'^\d{10}$'),
        'unix_milliseconds': re.compile(r'^\d{13}$'),
        'unix_microseconds': re.compile(r'^\d{16}$'),
        'date_only': re.compile(r'^\d{4}-\d{2}-\d{2}$'),
        'time_only': re.compile(r'^\d{2}:\d{2}:\d{2}$'),
    }
    
    # Business hours and suspicious time patterns
    TEMPORAL_PATTERNS = {
        'business_hours': {
            'weekday_start': 9,  # 9 AM
            'weekday_end': 17,   # 5 PM
            'weekend_transactions': 'suspicious'
        },
        'suspicious_hours': {
            'late_night': (0, 5),   # Midnight to 5 AM
            'early_morning': (5, 7)  # 5 AM to 7 AM
        },
        'velocity_windows': {
            'rapid_fire': 60,      # Seconds between transactions
            'burst_pattern': 300,   # 5 minutes
            'hourly_limit': 3600,   # 1 hour
            'daily_pattern': 86400  # 24 hours
        }
    }
    
    # Holiday periods that might affect transaction patterns
    HOLIDAY_PERIODS = {
        'US': [
            ('01-01', '01-02'),  # New Year
            ('07-04', '07-04'),  # Independence Day
            ('11-24', '11-25'),  # Thanksgiving (approximate)
            ('12-24', '12-26'),  # Christmas
        ],
        'EU': [
            ('01-01', '01-01'),  # New Year
            ('12-24', '12-26'),  # Christmas
            ('12-31', '12-31'),  # New Year's Eve
        ]
    }
    
    def __init__(self):
        """Initialize temporal validation rules"""
        self.parse_cache = {}
        self.validation_cache = {}
    
    def validate_timestamp(self, timestamp: Any, format_hint: Optional[str] = None) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        """
        Validate timestamp format and value.
        
        Args:
            timestamp: Timestamp to validate (string, int, or datetime)
            format_hint: Optional hint about expected format
            
        Returns:
            Tuple of (is_valid, error_message, temporal_analysis)
        """
        if timestamp is None:
            return False, "Timestamp cannot be null", {}
        
        try:
            parsed_dt, format_used = self._parse_timestamp(timestamp, format_hint)
            
            # Validate timestamp range (reasonable dates)
            if not self._is_reasonable_date(parsed_dt):
                return False, "Timestamp outside reasonable range", {}
            
            # Analyze temporal characteristics
            temporal_analysis = self._analyze_timestamp(parsed_dt, format_used)
            
            return True, None, temporal_analysis
            
        except Exception as e:
            return False, f"Invalid timestamp format: {str(e)}", {}
    
    def validate_date_range(self, start_date: Any, end_date: Any) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        """
        Validate date range consistency and business logic.
        
        Args:
            start_date: Range start date
            end_date: Range end date
            
        Returns:
            Tuple of (is_valid, error_message, range_analysis)
        """
        try:
            start_dt, _ = self._parse_timestamp(start_date)
            end_dt, _ = self._parse_timestamp(end_date)
            
            # Check chronological order
            if start_dt > end_dt:
                return False, "Start date must be before end date", {}
            
            # Calculate duration
            duration = end_dt - start_dt
            duration_seconds = duration.total_seconds()
            
            # Check for suspicious durations
            warnings = []
            if duration_seconds < 1:
                warnings.append("Extremely short duration")
            elif duration_seconds > 365 * 24 * 3600:  # More than 1 year
                warnings.append("Very long duration")
            
            range_analysis = {
                'start_datetime': start_dt.isoformat(),
                'end_datetime': end_dt.isoformat(),
                'duration_seconds': duration_seconds,
                'duration_days': duration.days,
                'duration_human': self._humanize_duration(duration),
                'warnings': warnings
            }
            
            return True, None, range_analysis
            
        except Exception as e:
            return False, f"Invalid date range: {str(e)}", {}
    
    def validate_temporal_pattern(self, timestamps: List[Any]) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        """
        Validate temporal patterns for fraud detection.
        
        Args:
            timestamps: List of timestamps to analyze
            
        Returns:
            Tuple of (is_normal, error_message, pattern_analysis)
        """
        if not timestamps:
            return True, None, {}
        
        try:
            parsed_timestamps = []
            for ts in timestamps:
                dt, _ = self._parse_timestamp(ts)
                parsed_timestamps.append(dt)
            
            # Sort timestamps
            parsed_timestamps.sort()
            
            # Analyze patterns
            pattern_analysis = self._analyze_temporal_patterns(parsed_timestamps)
            
            # Check for suspicious patterns
            suspicious_indicators = []
            risk_score = 0.0
            
            # Rapid-fire transactions
            if pattern_analysis['min_interval'] < self.TEMPORAL_PATTERNS['velocity_windows']['rapid_fire']:
                suspicious_indicators.append("Rapid-fire transaction pattern")
                risk_score += 0.7
            
            # Burst patterns
            if pattern_analysis['burst_count'] > 5:
                suspicious_indicators.append(f"Transaction bursts detected: {pattern_analysis['burst_count']}")
                risk_score += 0.5
            
            # Off-hours activity
            if pattern_analysis['off_hours_percentage'] > 0.5:
                suspicious_indicators.append("High percentage of off-hours transactions")
                risk_score += 0.4
            
            # Weekend activity (if suspicious for business)
            if pattern_analysis['weekend_percentage'] > 0.3:
                suspicious_indicators.append("Unusual weekend activity")
                risk_score += 0.3
            
            is_normal = risk_score < 0.5
            error_message = None
            
            if not is_normal:
                error_message = f"Suspicious temporal patterns detected (risk: {risk_score:.2f})"
            
            pattern_analysis.update({
                'suspicious_indicators': suspicious_indicators,
                'risk_score': min(risk_score, 1.0),
                'is_normal': is_normal
            })
            
            return is_normal, error_message, pattern_analysis
            
        except Exception as e:
            return False, f"Temporal pattern analysis failed: {str(e)}", {}
    
    def validate_business_hours(self, timestamp: Any, business_config: Optional[Dict[str, Any]] = None) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        """
        Validate if timestamp falls within business hours.
        
        Args:
            timestamp: Timestamp to validate
            business_config: Optional business hours configuration
            
        Returns:
            Tuple of (is_business_hours, error_message, business_analysis)
        """
        try:
            dt, _ = self._parse_timestamp(timestamp)
            
            # Use default business config if not provided
            if business_config is None:
                business_config = self.TEMPORAL_PATTERNS['business_hours']
            
            # Check if weekday or weekend
            is_weekend = dt.weekday() >= 5  # Saturday = 5, Sunday = 6
            
            # Check hour
            hour = dt.hour
            is_business_hour = (business_config['weekday_start'] <= hour < business_config['weekday_end'])
            
            # Determine if transaction is suspicious
            warnings = []
            risk_score = 0.0
            
            if is_weekend:
                warnings.append("Weekend transaction")
                risk_score += 0.3
            
            if not is_business_hour:
                if self.TEMPORAL_PATTERNS['suspicious_hours']['late_night'][0] <= hour < self.TEMPORAL_PATTERNS['suspicious_hours']['late_night'][1]:
                    warnings.append("Late night transaction")
                    risk_score += 0.5
                elif self.TEMPORAL_PATTERNS['suspicious_hours']['early_morning'][0] <= hour < self.TEMPORAL_PATTERNS['suspicious_hours']['early_morning'][1]:
                    warnings.append("Early morning transaction")
                    risk_score += 0.4
                else:
                    warnings.append("Outside business hours")
                    risk_score += 0.2
            
            # Check if it's a holiday period
            is_holiday = self._is_holiday_period(dt)
            if is_holiday:
                warnings.append("Holiday period transaction")
                risk_score += 0.2
            
            business_analysis = {
                'datetime': dt.isoformat(),
                'is_weekend': is_weekend,
                'is_business_hours': is_business_hour,
                'is_holiday_period': is_holiday,
                'hour': hour,
                'weekday': dt.strftime('%A'),
                'warnings': warnings,
                'risk_score': min(risk_score, 1.0)
            }
            
            is_normal_business = risk_score < 0.4
            error_message = None
            
            if not is_normal_business:
                error_message = f"Transaction outside normal business patterns: {', '.join(warnings[:2])}"
            
            return is_normal_business, error_message, business_analysis
            
        except Exception as e:
            return False, f"Business hours validation failed: {str(e)}", {}
    
    def validate_age_date(self, birth_date: Any, minimum_age: int = 18) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        """
        Validate age from birth date.
        
        Args:
            birth_date: Date of birth
            minimum_age: Minimum required age
            
        Returns:
            Tuple of (meets_age_requirement, error_message, age_analysis)
        """
        try:
            birth_dt, _ = self._parse_timestamp(birth_date)
            current_date = datetime.now()
            
            # Calculate age
            age = current_date.year - birth_dt.year
            
            # Adjust if birthday hasn't occurred this year
            if current_date.month < birth_dt.month or \
               (current_date.month == birth_dt.month and current_date.day < birth_dt.day):
                age -= 1
            
            # Validate reasonable age range
            if age < 0:
                return False, "Birth date cannot be in the future", {}
            
            if age > 150:
                return False, "Invalid birth date (age over 150)", {}
            
            meets_requirement = age >= minimum_age
            error_message = None
            
            if not meets_requirement:
                error_message = f"Minimum age requirement not met (age: {age}, required: {minimum_age})"
            
            age_analysis = {
                'birth_date': birth_dt.date().isoformat(),
                'current_age': age,
                'minimum_age': minimum_age,
                'meets_requirement': meets_requirement,
                'age_category': self._categorize_age(age)
            }
            
            return meets_requirement, error_message, age_analysis
            
        except Exception as e:
            return False, f"Age validation failed: {str(e)}", {}
    
    def _parse_timestamp(self, timestamp: Any, format_hint: Optional[str] = None) -> Tuple[datetime, str]:
        """Parse timestamp from various formats"""
        
        # Check cache first
        cache_key = f"{timestamp}_{format_hint}"
        if cache_key in self.parse_cache:
            return self.parse_cache[cache_key]
        
        if isinstance(timestamp, datetime):
            result = (timestamp, 'datetime_object')
        elif isinstance(timestamp, (int, float)):
            # Unix timestamp
            if timestamp > 1e12:  # Milliseconds
                dt = datetime.fromtimestamp(timestamp / 1000, tz=timezone.utc)
                result = (dt, 'unix_milliseconds')
            else:  # Seconds
                dt = datetime.fromtimestamp(timestamp, tz=timezone.utc)
                result = (dt, 'unix_seconds')
        else:
            # String timestamp
            timestamp_str = str(timestamp).strip()
            
            # Try format hint first
            if format_hint:
                try:
                    dt = datetime.strptime(timestamp_str, format_hint)
                    result = (dt, format_hint)
                except ValueError:
                    pass
            
            # Try predefined formats
            for format_str in self.TIMESTAMP_FORMATS:
                try:
                    dt = datetime.strptime(timestamp_str, format_str)
                    result = (dt, format_str)
                    break
                except ValueError:
                    continue
            else:
                # Use dateutil parser as fallback
                try:
                    dt = parser.parse(timestamp_str)
                    result = (dt, 'dateutil_parser')
                except (ValueError, TypeError):
                    raise ValueError(f"Unable to parse timestamp: {timestamp}")
        
        # Cache result
        if len(self.parse_cache) < 1000:
            self.parse_cache[cache_key] = result
        
        return result
    
    def _is_reasonable_date(self, dt: datetime) -> bool:
        """Check if datetime is within reasonable range"""
        current_date = datetime.now()
        
        # Allow dates from 1900 to 50 years in the future
        min_date = datetime(1900, 1, 1)
        max_date = current_date + timedelta(days=365 * 50)
        
        return min_date <= dt <= max_date
    
    def _analyze_timestamp(self, dt: datetime, format_used: str) -> Dict[str, Any]:
        """Analyze temporal characteristics of a timestamp"""
        return {
            'parsed_datetime': dt.isoformat(),
            'format_used': format_used,
            'year': dt.year,
            'month': dt.month,
            'day': dt.day,
            'hour': dt.hour,
            'minute': dt.minute,
            'second': dt.second,
            'weekday': dt.strftime('%A'),
            'is_weekend': dt.weekday() >= 5,
            'timezone': str(dt.tzinfo) if dt.tzinfo else 'naive',
            'unix_timestamp': int(dt.timestamp()),
            'is_recent': (datetime.now() - dt).total_seconds() < 3600  # Within last hour
        }
    
    def _analyze_temporal_patterns(self, timestamps: List[datetime]) -> Dict[str, Any]:
        """Analyze patterns in a list of timestamps"""
        if len(timestamps) < 2:
            return {'count': len(timestamps)}
        
        # Calculate intervals between consecutive timestamps
        intervals = []
        for i in range(1, len(timestamps)):
            interval = (timestamps[i] - timestamps[i-1]).total_seconds()
            intervals.append(interval)
        
        # Analyze time distribution
        hours = [ts.hour for ts in timestamps]
        weekdays = [ts.weekday() for ts in timestamps]
        
        # Count off-hours and weekend transactions
        off_hours_count = sum(1 for h in hours if h < 9 or h >= 17)
        weekend_count = sum(1 for wd in weekdays if wd >= 5)
        
        # Detect burst patterns (multiple transactions within short time)
        burst_count = sum(1 for interval in intervals if interval < 300)  # 5 minutes
        
        return {
            'count': len(timestamps),
            'time_span_hours': (timestamps[-1] - timestamps[0]).total_seconds() / 3600,
            'min_interval': min(intervals) if intervals else 0,
            'max_interval': max(intervals) if intervals else 0,
            'avg_interval': sum(intervals) / len(intervals) if intervals else 0,
            'off_hours_count': off_hours_count,
            'off_hours_percentage': off_hours_count / len(timestamps),
            'weekend_count': weekend_count,
            'weekend_percentage': weekend_count / len(timestamps),
            'burst_count': burst_count,
            'most_active_hour': max(set(hours), key=hours.count),
            'most_active_weekday': max(set(weekdays), key=weekdays.count)
        }
    
    def _is_holiday_period(self, dt: datetime) -> bool:
        """Check if date falls within a holiday period"""
        date_str = dt.strftime('%m-%d')
        
        # Check common holiday periods (simplified)
        for country, holidays in self.HOLIDAY_PERIODS.items():
            for start, end in holidays:
                if start <= date_str <= end:
                    return True
        
        return False
    
    def _categorize_age(self, age: int) -> str:
        """Categorize age into demographic groups"""
        if age < 18:
            return 'minor'
        elif age < 25:
            return 'young_adult'
        elif age < 35:
            return 'adult'
        elif age < 50:
            return 'middle_aged'
        elif age < 65:
            return 'mature'
        else:
            return 'senior'
    
    def _humanize_duration(self, duration: timedelta) -> str:
        """Convert duration to human-readable format"""
        seconds = duration.total_seconds()
        
        if seconds < 60:
            return f"{int(seconds)} seconds"
        elif seconds < 3600:
            return f"{int(seconds // 60)} minutes"
        elif seconds < 86400:
            return f"{int(seconds // 3600)} hours"
        else:
            days = duration.days
            if days == 1:
                return "1 day"
            elif days < 30:
                return f"{days} days"
            elif days < 365:
                return f"{days // 30} months"
            else:
                return f"{days // 365} years"