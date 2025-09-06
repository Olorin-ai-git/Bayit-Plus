#!/usr/bin/env python3
"""
Security Validation Rules
Comprehensive security validation including XSS prevention, SQL injection detection, 
fraud pattern recognition, and threat assessment.
"""

import re
import hashlib
import base64
import json
import unicodedata
from datetime import datetime
from typing import Any, Dict, List, Optional, Set, Tuple
from urllib.parse import unquote
import ipaddress
import logging

logger = logging.getLogger(__name__)


class SecurityValidationRules:
    """
    Advanced security validation rules for threat detection and prevention.
    """
    
    # Enhanced XSS prevention patterns with Unicode normalization protection
    XSS_PATTERNS = [
        # Script tags with Unicode normalization handling
        re.compile(r'<\s*[Ss\u00df\u1e9e]*[Cc\u00c7\u0107\u010d]*[Rr\u0280\u027d]*[Ii\u00ce\u012b]*[Pp\u03c1\u0440]*[Tt\u0442\u03c4]*[^>]*>.*?<\s*/\s*[Ss]*[Cc]*[Rr]*[Ii]*[Pp]*[Tt]*\s*>', re.IGNORECASE | re.DOTALL | re.UNICODE),
        # JavaScript protocol with Unicode variations  
        re.compile(r'[Jj\u0458\u029d]*[Aa\u00e0\u00c0]*[Vv\u03bd\u0432]*[Aa\u00e0]*[Ss\u015f]*[Cc\u00c7]*[Rr\u0280]*[Ii\u012b]*[Pp\u03c1]*[Tt\u0442]*\s*:', re.IGNORECASE | re.UNICODE),
        # Event handlers with Unicode normalization (more specific)
        re.compile(r'[Oo\u00f6\u043e]*[Nn\u00f1\u043d]+[a-zA-Z_][a-zA-Z0-9_]*\s*=', re.IGNORECASE | re.UNICODE),
        # Dangerous HTML elements
        re.compile(r'<\s*[Ii]*[Ff]*[Rr]*[Aa]*[Mm]*[Ee]*[^>]*>', re.IGNORECASE | re.UNICODE),
        re.compile(r'<\s*[Oo]*[Bb]*[Jj]*[Ee]*[Cc]*[Tt]*[^>]*>', re.IGNORECASE | re.UNICODE),
        re.compile(r'<\s*[Ee]*[Mm]*[Bb]*[Ee]*[Dd]*[^>]*>', re.IGNORECASE | re.UNICODE),
        # CSS expressions
        re.compile(r'[Ee\u00e8\u0435]*[Xx\u0445]*[Pp\u03c1]*[Rr\u0440]*[Ee\u0435]*[Ss\u015f]*[Ss\u015f]*[Ii\u0456]*[Oo\u043e]*[Nn\u043d]*\s*\(', re.IGNORECASE | re.UNICODE),
        # VBScript protocol
        re.compile(r'[Vv\u03bd]*[Bb\u0432]*[Ss\u015f]*[Cc\u00c7]*[Rr\u0440]*[Ii\u0456]*[Pp\u03c1]*[Tt\u0442]*\s*:', re.IGNORECASE | re.UNICODE),
        # Data URI schemes
        re.compile(r'data\s*:\s*[^,]*script', re.IGNORECASE | re.UNICODE),
        # Encoded script tags
        re.compile(r'%3[Cc]script', re.IGNORECASE),
        re.compile(r'&lt;script', re.IGNORECASE),
        re.compile(r'&#x3c;script', re.IGNORECASE)
    ]
    
    # Enhanced SQL injection patterns with comment variations and NoSQL protection
    SQL_INJECTION_PATTERNS = [
        # Standard SQL keywords with Unicode normalization
        re.compile(r'\b(union|select|insert|update|delete|drop|create|alter|exec|execute|grant|revoke)\b', re.IGNORECASE | re.UNICODE),
        # Comment variations (SQL and NoSQL)
        re.compile(r'[\'";].*?(\-\-|\#|/\*.*?\*/)', re.IGNORECASE | re.DOTALL),
        re.compile(r'/\*[^*]*\*+(?:[^/*][^*]*\*+)*/', re.IGNORECASE),  # Block comments
        re.compile(r'--[^\r\n]*', re.IGNORECASE),  # Line comments
        re.compile(r'\#[^\r\n]*', re.IGNORECASE),  # MySQL comments
        # Boolean-based injection patterns
        re.compile(r'\'\s*(or|and)\s*\'\w*\'\s*=\s*\'\w*', re.IGNORECASE),
        re.compile(r'\d+\s*(or|and)\s*\d+\s*=\s*\d+', re.IGNORECASE),
        re.compile(r'(true|false)\s*(and|or)\s*(true|false)', re.IGNORECASE),
        # Time-based injection
        re.compile(r'(sleep|benchmark|waitfor|pg_sleep)\s*\(', re.IGNORECASE),
        # File operations
        re.compile(r'\b(load_file|outfile|dumpfile|into\s+outfile)\b', re.IGNORECASE),
        # UNION-based with variations
        re.compile(r'union\s+(all\s+)?select', re.IGNORECASE),
        re.compile(r'union.*select.*from', re.IGNORECASE | re.DOTALL),
        # NoSQL injection patterns (MongoDB, etc.)
        re.compile(r'\{\s*\$[a-zA-Z_][a-zA-Z0-9_]*\s*:', re.IGNORECASE),  # MongoDB operators
        re.compile(r'\[\s*\$[a-zA-Z_][a-zA-Z0-9_]*\s*\]', re.IGNORECASE),  # Array operators
        re.compile(r'(\$where|\$regex|\$ne|\$gt|\$lt|\$in|\$nin)', re.IGNORECASE),
        # Error-based injection
        re.compile(r'(extractvalue|updatexml|exp|floor|rand)\s*\(', re.IGNORECASE),
        # Stacked queries
        re.compile(r';\s*(select|insert|update|delete|drop)', re.IGNORECASE)
    ]
    
    # Command injection patterns
    COMMAND_INJECTION_PATTERNS = [
        re.compile(r'[;&|`$(){}[\]<>]', re.IGNORECASE),
        re.compile(r'\b(cat|ls|ps|kill|rm|cp|mv|chmod|chown|sudo|su)\b', re.IGNORECASE),
        re.compile(r'(\.\.\/|\.\.\\)', re.IGNORECASE),
        re.compile(r'\$\{.*?\}', re.IGNORECASE)
    ]
    
    # Suspicious patterns for fraud detection
    FRAUD_PATTERNS = {
        'email_domains': {
            'temporary': {
                '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
                'mailinator.com', 'yopmail.com', 'throwaway.email'
            },
            'suspicious': {
                'example.com', 'test.com', 'fake.com', 'bogus.com',
                'invalid.com', 'dummy.com', 'sample.com'
            }
        },
        'phone_patterns': {
            'invalid': re.compile(r'^(\+?1)?[0-9]{10}$'),  # Too simple
            'test_numbers': {
                '+15551234567', '+1555123456', '5551234567',
                '+12345678901', '1234567890', '0000000000'
            }
        },
        'suspicious_strings': {
            'test', 'dummy', 'fake', 'bogus', 'invalid', 'sample',
            'example', 'placeholder', 'lorem', 'ipsum', 'qwerty'
        }
    }
    
    # Known malicious IP ranges and patterns
    MALICIOUS_IP_PATTERNS = {
        'tor_exit_nodes': [],  # Would be populated from TOR directory
        'known_vpn_ranges': [],  # VPN IP ranges
        'blacklisted_asns': {
            # Known malicious ASNs
            '13335', '16509', '15169'  # Example ASNs
        }
    }
    
    # Security headers validation
    SECURITY_HEADERS = {
        'required': {
            'X-Frame-Options': ['DENY', 'SAMEORIGIN'],
            'X-Content-Type-Options': ['nosniff'],
            'X-XSS-Protection': ['1; mode=block']
        },
        'recommended': {
            'Strict-Transport-Security': re.compile(r'max-age=\d+'),
            'Content-Security-Policy': re.compile(r"default-src\s+'self'"),
            'Referrer-Policy': ['strict-origin-when-cross-origin', 'no-referrer']
        }
    }
    
    def __init__(self):
        """Initialize security validation rules"""
        self.threat_score_cache = {}
        self.validation_cache = {}
        # Memory management settings
        self.cache_max_size = 1000  # Maximum cache entries
        self.cache_cleanup_threshold = 0.8  # Cleanup when cache is 80% full
    
    def validate_input_security(self, input_value: str, field_name: str = "") -> Tuple[bool, Optional[str], Dict[str, Any]]:
        """
        Comprehensive input security validation.
        
        Args:
            input_value: The input string to validate
            field_name: Optional field name for context
            
        Returns:
            Tuple of (is_safe, error_message, security_analysis)
        """
        if not input_value:
            return True, None, {'threat_score': 0.0, 'threats': []}
        
        # Check cache first
        cached_result = self._get_cached_validation_result(input_value)
        if cached_result is not None:
            return cached_result
        
        threats = []
        threat_score = 0.0
        
        # URL decode if necessary
        decoded_value = unquote(input_value)
        
        # Unicode normalization to prevent bypass attacks
        normalized_value = unicodedata.normalize('NFKC', decoded_value)
        
        # XSS detection on both original and normalized values
        xss_threats = self._detect_xss(decoded_value)
        xss_threats_normalized = self._detect_xss(normalized_value)
        if xss_threats or xss_threats_normalized:
            threats.extend(xss_threats + xss_threats_normalized)
            threat_score += 0.8
        
        # SQL injection detection
        sql_threats = self._detect_sql_injection(decoded_value)
        if sql_threats:
            threats.extend(sql_threats)
            threat_score += 0.9
        
        # Command injection detection
        cmd_threats = self._detect_command_injection(decoded_value)
        if cmd_threats:
            threats.extend(cmd_threats)
            threat_score += 0.7
        
        # Path traversal detection
        if self._detect_path_traversal(decoded_value):
            threats.append("Path traversal attempt detected")
            threat_score += 0.6
        
        # Suspicious encoding detection
        encoding_threats = self._detect_suspicious_encoding(input_value)
        if encoding_threats:
            threats.extend(encoding_threats)
            threat_score += 0.5
        
        # Calculate final assessment
        is_safe = threat_score < 0.5
        error_message = None
        
        if not is_safe:
            error_message = f"Security threat detected (score: {threat_score:.2f}): {', '.join(threats[:3])}"
        
        security_analysis = {
            'threat_score': min(threat_score, 1.0),
            'threats': threats,
            'is_safe': is_safe,
            'field_context': field_name
        }
        
        # Cache the result for future use
        result = (is_safe, error_message, security_analysis)
        self._cache_validation_result(input_value, result)
        
        return result
    
    def validate_fraud_indicators(self, user_data: Dict[str, Any]) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        """
        Detect fraud indicators in user data.
        
        Args:
            user_data: User information dictionary
            
        Returns:
            Tuple of (is_legitimate, error_message, fraud_analysis)
        """
        fraud_indicators = []
        fraud_score = 0.0
        
        # Check email domain
        email = user_data.get('email', '').lower()
        if email:
            domain = email.split('@')[-1] if '@' in email else ''
            
            if domain in self.FRAUD_PATTERNS['email_domains']['temporary']:
                fraud_indicators.append(f"Temporary email domain: {domain}")
                fraud_score += 0.7
            
            if domain in self.FRAUD_PATTERNS['email_domains']['suspicious']:
                fraud_indicators.append(f"Suspicious email domain: {domain}")
                fraud_score += 0.5
        
        # Check phone number patterns
        phone = user_data.get('phone', '')
        if phone:
            if phone in self.FRAUD_PATTERNS['phone_patterns']['test_numbers']:
                fraud_indicators.append("Test phone number detected")
                fraud_score += 0.8
        
        # Check for suspicious strings in names
        name_fields = ['first_name', 'last_name', 'full_name']
        for field in name_fields:
            name_value = str(user_data.get(field, '')).lower()
            for suspicious in self.FRAUD_PATTERNS['suspicious_strings']:
                if suspicious in name_value:
                    fraud_indicators.append(f"Suspicious name pattern: {suspicious}")
                    fraud_score += 0.4
                    break
        
        # Check address patterns
        address = str(user_data.get('address', '')).lower()
        if any(sus in address for sus in self.FRAUD_PATTERNS['suspicious_strings']):
            fraud_indicators.append("Suspicious address pattern")
            fraud_score += 0.3
        
        # Check IP reputation
        ip_address = user_data.get('ip_address', '')
        if ip_address:
            ip_risk = self._assess_ip_reputation(ip_address)
            if ip_risk['is_risky']:
                fraud_indicators.extend(ip_risk['reasons'])
                fraud_score += ip_risk['risk_score']
        
        # Device fingerprint analysis
        device_fingerprint = user_data.get('device_fingerprint', '')
        if device_fingerprint:
            device_risk = self._analyze_device_fingerprint(device_fingerprint)
            if device_risk['is_suspicious']:
                fraud_indicators.extend(device_risk['reasons'])
                fraud_score += device_risk['risk_score']
        
        # Calculate final assessment
        is_legitimate = fraud_score < 0.6
        error_message = None
        
        if not is_legitimate:
            error_message = f"Fraud indicators detected (score: {fraud_score:.2f})"
        
        fraud_analysis = {
            'fraud_score': min(fraud_score, 1.0),
            'fraud_indicators': fraud_indicators,
            'is_legitimate': is_legitimate,
            'requires_manual_review': fraud_score > 0.4
        }
        
        return is_legitimate, error_message, fraud_analysis
    
    def validate_authentication_data(self, auth_data: Dict[str, Any]) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        """
        Validate authentication-related data for security compliance.
        
        Args:
            auth_data: Authentication data dictionary
            
        Returns:
            Tuple of (is_secure, error_message, security_analysis)
        """
        security_issues = []
        security_score = 1.0
        
        # Password strength validation
        password = auth_data.get('password', '')
        if password:
            pwd_analysis = self._validate_password_strength(password)
            if not pwd_analysis['is_strong']:
                security_issues.extend(pwd_analysis['issues'])
                security_score -= 0.4
        
        # JWT token validation
        jwt_token = auth_data.get('jwt_token', '')
        if jwt_token:
            jwt_analysis = self._validate_jwt_security(jwt_token)
            if not jwt_analysis['is_valid']:
                security_issues.extend(jwt_analysis['issues'])
                security_score -= 0.5
        
        # Session data validation
        session_data = auth_data.get('session_data', {})
        if session_data:
            session_analysis = self._validate_session_security(session_data)
            if not session_analysis['is_secure']:
                security_issues.extend(session_analysis['issues'])
                security_score -= 0.3
        
        # Multi-factor authentication check
        mfa_enabled = auth_data.get('mfa_enabled', False)
        if not mfa_enabled:
            security_issues.append("Multi-factor authentication not enabled")
            security_score -= 0.2
        
        is_secure = security_score > 0.6
        error_message = None
        
        if not is_secure:
            error_message = f"Authentication security issues: {', '.join(security_issues[:2])}"
        
        security_analysis = {
            'security_score': max(security_score, 0.0),
            'security_issues': security_issues,
            'is_secure': is_secure,
            'recommendations': self._get_security_recommendations(security_issues)
        }
        
        return is_secure, error_message, security_analysis
    
    def _detect_xss(self, value: str) -> List[str]:
        """Detect XSS attack patterns"""
        threats = []
        
        for pattern in self.XSS_PATTERNS:
            if pattern.search(value):
                threats.append(f"XSS pattern detected: {pattern.pattern[:50]}...")
        
        return threats
    
    def _detect_sql_injection(self, value: str) -> List[str]:
        """Detect SQL injection patterns"""
        threats = []
        
        for pattern in self.SQL_INJECTION_PATTERNS:
            if pattern.search(value):
                threats.append(f"SQL injection pattern detected: {pattern.pattern[:50]}...")
        
        return threats
    
    def _detect_command_injection(self, value: str) -> List[str]:
        """Detect command injection patterns"""
        threats = []
        
        for pattern in self.COMMAND_INJECTION_PATTERNS:
            if pattern.search(value):
                threats.append(f"Command injection pattern detected")
        
        return threats
    
    def _detect_path_traversal(self, value: str) -> bool:
        """Detect path traversal attempts"""
        traversal_patterns = ['../', '..\\', '%2e%2e%2f', '%2e%2e%5c']
        return any(pattern in value.lower() for pattern in traversal_patterns)
    
    def _detect_suspicious_encoding(self, value: str) -> List[str]:
        """Detect suspicious encoding patterns"""
        threats = []
        
        # Check for excessive URL encoding
        url_encoded_count = value.count('%')
        if url_encoded_count > 10:
            threats.append("Excessive URL encoding detected")
        
        # Check for base64 patterns with proper bounds checking (DoS prevention)
        base64_pattern = re.search(r'[A-Za-z0-9+/=]{20,}', value)
        if base64_pattern and 50 < len(value) < 10000:  # Prevent DoS with size limits
            try:
                # Extract only the base64 portion to prevent memory exhaustion
                base64_content = base64_pattern.group(0)[:1000]  # Limit to 1KB
                decoded = base64.b64decode(base64_content + '==')  # Add padding
                
                # Limit decoded size check to prevent DoS
                if len(decoded) < 5000:  # Max 5KB decoded content
                    decoded_lower = decoded.lower()
                    if (b'<script' in decoded_lower or 
                        b'javascript:' in decoded_lower or
                        b'<iframe' in decoded_lower or
                        b'<object' in decoded_lower):
                        threats.append("Suspicious base64-encoded content")
            except (ValueError, TypeError):
                # Invalid base64, potentially malicious
                threats.append("Invalid base64 encoding detected")
        
        return threats
    
    def _assess_ip_reputation(self, ip_address: str) -> Dict[str, Any]:
        """Assess IP address reputation and risk"""
        try:
            ip_obj = ipaddress.ip_address(ip_address)
            reasons = []
            risk_score = 0.0
            
            # Check if it's a private IP
            if ip_obj.is_private:
                reasons.append("Private IP address")
                risk_score += 0.1
            
            # Check reserved ranges
            if ip_obj.is_reserved or ip_obj.is_loopback:
                reasons.append("Reserved/loopback IP address")
                risk_score += 0.3
            
            # Check against known malicious ranges (placeholder)
            # In real implementation, this would query threat intelligence feeds
            
            return {
                'is_risky': risk_score > 0.3,
                'risk_score': risk_score,
                'reasons': reasons
            }
            
        except ValueError:
            return {
                'is_risky': True,
                'risk_score': 0.5,
                'reasons': ['Invalid IP address format']
            }
    
    def _analyze_device_fingerprint(self, fingerprint: str) -> Dict[str, Any]:
        """Analyze device fingerprint for suspicious patterns"""
        reasons = []
        risk_score = 0.0
        
        # Check fingerprint format and length
        if len(fingerprint) < 16:
            reasons.append("Unusually short device fingerprint")
            risk_score += 0.3
        
        # Check for repetitive patterns
        if len(set(fingerprint)) < len(fingerprint) * 0.3:
            reasons.append("Repetitive fingerprint pattern")
            risk_score += 0.4
        
        # Check for common test fingerprints
        test_patterns = ['0000000000000000', 'abcdabcdabcdabcd', '1111111111111111']
        if fingerprint in test_patterns:
            reasons.append("Test device fingerprint detected")
            risk_score += 0.8
        
        return {
            'is_suspicious': risk_score > 0.3,
            'risk_score': risk_score,
            'reasons': reasons
        }
    
    def _validate_password_strength(self, password: str) -> Dict[str, Any]:
        """Validate password strength and security"""
        issues = []
        strength_score = 0.0
        
        if len(password) < 8:
            issues.append("Password too short (minimum 8 characters)")
        else:
            strength_score += 0.2
        
        if not re.search(r'[a-z]', password):
            issues.append("Password must contain lowercase letters")
        else:
            strength_score += 0.2
        
        if not re.search(r'[A-Z]', password):
            issues.append("Password must contain uppercase letters")
        else:
            strength_score += 0.2
        
        if not re.search(r'\d', password):
            issues.append("Password must contain numbers")
        else:
            strength_score += 0.2
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            issues.append("Password must contain special characters")
        else:
            strength_score += 0.2
        
        # Check for common passwords (placeholder)
        common_passwords = ['password', '123456', 'qwerty', 'admin']
        if password.lower() in common_passwords:
            issues.append("Password is too common")
            strength_score = 0.0
        
        return {
            'is_strong': strength_score >= 0.8 and len(issues) == 0,
            'strength_score': strength_score,
            'issues': issues
        }
    
    def _validate_jwt_security(self, jwt_token: str) -> Dict[str, Any]:
        """Validate JWT token security"""
        issues = []
        
        # Basic JWT format validation
        parts = jwt_token.split('.')
        if len(parts) != 3:
            issues.append("Invalid JWT format")
            return {'is_valid': False, 'issues': issues}
        
        try:
            # Decode header and payload (without verification for analysis)
            header = json.loads(base64.urlsafe_b64decode(parts[0] + '=='))
            payload = json.loads(base64.urlsafe_b64decode(parts[1] + '=='))
            
            # Check algorithm
            if header.get('alg') == 'none':
                issues.append("JWT using insecure 'none' algorithm")
            
            # Check expiration
            if 'exp' not in payload:
                issues.append("JWT missing expiration claim")
            
            # Check issued time
            if 'iat' not in payload:
                issues.append("JWT missing issued at claim")
            
        except Exception as e:
            issues.append(f"JWT decode error: {str(e)}")
        
        return {
            'is_valid': len(issues) == 0,
            'issues': issues
        }
    
    def _validate_session_security(self, session_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate session security configuration"""
        issues = []
        
        # Check session timeout
        if 'timeout' not in session_data:
            issues.append("Session timeout not configured")
        elif session_data['timeout'] > 86400:  # 24 hours
            issues.append("Session timeout too long")
        
        # Check secure flag
        if not session_data.get('secure', False):
            issues.append("Session not marked as secure")
        
        # Check httpOnly flag
        if not session_data.get('httpOnly', False):
            issues.append("Session not marked as httpOnly")
        
        return {
            'is_secure': len(issues) == 0,
            'issues': issues
        }
    
    def _get_security_recommendations(self, issues: List[str]) -> List[str]:
        """Generate security recommendations based on identified issues"""
        recommendations = []
        
        for issue in issues:
            if 'password' in issue.lower():
                recommendations.append("Implement strong password policy")
            elif 'jwt' in issue.lower():
                recommendations.append("Use secure JWT configuration")
            elif 'session' in issue.lower():
                recommendations.append("Configure secure session settings")
            elif 'mfa' in issue.lower():
                recommendations.append("Enable multi-factor authentication")
        
        return list(set(recommendations))  # Remove duplicates
    
    def _cleanup_cache(self) -> None:
        """
        Clean up validation cache to prevent memory exhaustion.
        Removes oldest 20% of entries when cache exceeds threshold.
        """
        # Cleanup validation cache
        if len(self.validation_cache) > self.cache_max_size * self.cache_cleanup_threshold:
            # Remove oldest 20% of entries
            remove_count = int(len(self.validation_cache) * 0.2)
            oldest_keys = list(self.validation_cache.keys())[:remove_count]
            for key in oldest_keys:
                del self.validation_cache[key]
            logger.info(f"Cleaned up {remove_count} validation cache entries")
        
        # Cleanup threat score cache
        if len(self.threat_score_cache) > self.cache_max_size * self.cache_cleanup_threshold:
            # Remove oldest 20% of entries
            remove_count = int(len(self.threat_score_cache) * 0.2)
            oldest_keys = list(self.threat_score_cache.keys())[:remove_count]
            for key in oldest_keys:
                del self.threat_score_cache[key]
            logger.info(f"Cleaned up {remove_count} threat score cache entries")
    
    def _cache_validation_result(self, input_value: str, result: Tuple[bool, Optional[str], Dict[str, Any]]) -> None:
        """
        Cache validation result with automatic cleanup.
        
        Args:
            input_value: The input that was validated
            result: The validation result to cache
        """
        # Perform cleanup if needed before adding new entry
        self._cleanup_cache()
        
        # Create cache key (hash for privacy and space efficiency)
        cache_key = hashlib.sha256(input_value.encode('utf-8')).hexdigest()[:16]
        
        # Cache the result with timestamp
        self.validation_cache[cache_key] = {
            'result': result,
            'timestamp': datetime.now().timestamp()
        }
    
    def _get_cached_validation_result(self, input_value: str) -> Optional[Tuple[bool, Optional[str], Dict[str, Any]]]:
        """
        Get cached validation result if available and not expired.
        
        Args:
            input_value: The input to check cache for
            
        Returns:
            Cached validation result or None if not available/expired
        """
        cache_key = hashlib.sha256(input_value.encode('utf-8')).hexdigest()[:16]
        
        if cache_key in self.validation_cache:
            cached_data = self.validation_cache[cache_key]
            # Check if cache entry is less than 1 hour old
            if datetime.now().timestamp() - cached_data['timestamp'] < 3600:
                return cached_data['result']
            else:
                # Remove expired entry
                del self.validation_cache[cache_key]
        
        return None