#!/usr/bin/env python3
"""
Network Validation Rules
Comprehensive validation for IP addresses, network patterns, user agents, 
device fingerprints, and network security analysis.
"""

import re
import ipaddress
import socket
from typing import Any, Dict, List, Optional, Set, Tuple
from urllib.parse import urlparse
import hashlib


class NetworkValidationRules:
    """
    Advanced network validation rules for IP addresses, domains, and network security.
    """
    
    # IP address patterns and validation
    IP_PATTERNS = {
        'ipv4': re.compile(r'^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$'),
        'ipv6': re.compile(r'^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$'),
        'ipv6_compressed': re.compile(r'^(([0-9a-fA-F]{1,4}:)*)?::?(([0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4})?$')
    }
    
    # Reserved IP ranges that should not be used for public transactions
    RESERVED_RANGES = {
        'private': [
            '10.0.0.0/8',
            '172.16.0.0/12',
            '192.168.0.0/16',
            '127.0.0.0/8',  # Loopback
            '169.254.0.0/16',  # Link-local
            '::1/128',  # IPv6 loopback
            'fc00::/7',  # IPv6 unique local
            'fe80::/10',  # IPv6 link-local
        ],
        'multicast': [
            '224.0.0.0/4',  # IPv4 multicast
            'ff00::/8'  # IPv6 multicast
        ],
        'reserved': [
            '0.0.0.0/8',
            '240.0.0.0/4'
        ]
    }
    
    # Known suspicious networks and patterns
    SUSPICIOUS_NETWORKS = {
        'tor_exit_nodes': set(),  # Would be populated from TOR directory
        'known_vpn_ranges': set(),  # VPN IP ranges
        'proxy_networks': set(),  # Known proxy services
        'hosting_providers': {
            # Common hosting/VPS provider ranges (examples)
            '173.252.0.0/16',  # Facebook
            '54.0.0.0/8',      # AWS EC2
            '104.16.0.0/12'    # CloudFlare
        }
    }
    
    # User agent patterns for validation and analysis
    USER_AGENT_PATTERNS = {
        'bot_patterns': [
            re.compile(r'bot|crawler|spider|scraper', re.IGNORECASE),
            re.compile(r'curl|wget|python-requests|http', re.IGNORECASE),
            re.compile(r'googlebot|bingbot|slurp|duckduckbot', re.IGNORECASE),
        ],
        'browser_patterns': {
            'chrome': re.compile(r'Chrome/(\d+)'),
            'firefox': re.compile(r'Firefox/(\d+)'),
            'safari': re.compile(r'Safari/(\d+)'),
            'edge': re.compile(r'Edge/(\d+)'),
            'ie': re.compile(r'MSIE (\d+)|Trident.*rv:(\d+)')
        },
        'os_patterns': {
            'windows': re.compile(r'Windows NT (\d+\.\d+)'),
            'macos': re.compile(r'Mac OS X ([\d_]+)'),
            'linux': re.compile(r'Linux'),
            'android': re.compile(r'Android (\d+\.\d+)'),
            'ios': re.compile(r'OS ([\d_]+)')
        },
        'mobile_patterns': [
            re.compile(r'Mobile|iPhone|iPad|Android|BlackBerry', re.IGNORECASE)
        ]
    }
    
    # Domain validation patterns
    DOMAIN_PATTERNS = {
        'valid_domain': re.compile(r'^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$'),
        'suspicious_tld': re.compile(r'\.(tk|ml|ga|cf|click|download|loan|racing|review|trade|accountant|cricket|date|faith|party|science|stream|top|webcam|win|bid)$', re.IGNORECASE),
        'subdomain_depth': re.compile(r'\.'),
        'punycode': re.compile(r'xn--')
    }
    
    # Port ranges and protocols
    PORT_RANGES = {
        'well_known': (1, 1023),
        'registered': (1024, 49151),
        'dynamic': (49152, 65535),
        'common_services': {
            80: 'HTTP',
            443: 'HTTPS',
            21: 'FTP',
            22: 'SSH',
            25: 'SMTP',
            53: 'DNS',
            110: 'POP3',
            143: 'IMAP',
            993: 'IMAPS',
            995: 'POP3S'
        }
    }
    
    def __init__(self):
        """Initialize network validation rules"""
        self.ip_cache = {}
        self.domain_cache = {}
        self.user_agent_cache = {}
    
    def validate_ip_address(self, ip: str) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        """
        Comprehensive IP address validation and analysis.
        
        Args:
            ip: IP address string to validate
            
        Returns:
            Tuple of (is_valid, error_message, ip_analysis)
        """
        if not ip:
            return False, "IP address cannot be empty", {}
        
        try:
            ip_obj = ipaddress.ip(ip)
            
            # Basic validation passed, now analyze characteristics
            ip_analysis = self._analyze_ip_address(ip_obj)
            
            # Check for suspicious patterns
            risk_factors = []
            risk_score = 0.0
            
            # Private/Reserved IP addresses
            if ip_obj.is_private:
                risk_factors.append("Private IP address")
                risk_score += 0.4
            
            if ip_obj.is_reserved:
                risk_factors.append("Reserved IP address")
                risk_score += 0.6
            
            if ip_obj.is_loopback:
                risk_factors.append("Loopback address")
                risk_score += 0.8
            
            # Check against suspicious networks
            if self._is_suspicious_ip(ip):
                risk_factors.append("Suspicious network range")
                risk_score += 0.7
            
            # Check if it's a hosting provider
            if self._is_hosting_provider_ip(ip):
                risk_factors.append("Hosting provider IP")
                risk_score += 0.3
            
            ip_analysis.update({
                'risk_factors': risk_factors,
                'risk_score': min(risk_score, 1.0),
                'is_suspicious': risk_score > 0.5
            })
            
            # Determine if IP should be blocked
            should_block = risk_score > 0.7
            error_message = None
            
            if should_block:
                error_message = f"IP address blocked due to security concerns: {', '.join(risk_factors[:2])}"
            
            return not should_block, error_message, ip_analysis
            
        except ValueError as e:
            return False, f"Invalid IP address format: {str(e)}", {}
    
    def validate_domain(self, domain: str) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        """
        Validate domain name format and analyze for suspicious patterns.
        
        Args:
            domain: Domain name to validate
            
        Returns:
            Tuple of (is_valid, error_message, domain_analysis)
        """
        if not domain:
            return False, "Domain cannot be empty", {}
        
        domain = domain.lower().strip()
        
        # Basic format validation
        if not self.DOMAIN_PATTERNS['valid_domain'].match(domain):
            return False, "Invalid domain format", {}
        
        # Analyze domain characteristics
        domain_analysis = self._analyze_domain(domain)
        
        # Check for suspicious patterns
        risk_factors = []
        risk_score = 0.0
        
        # Suspicious TLD
        if self.DOMAIN_PATTERNS['suspicious_tld'].search(domain):
            risk_factors.append("Suspicious top-level domain")
            risk_score += 0.6
        
        # Excessive subdomain depth
        subdomain_count = len(self.DOMAIN_PATTERNS['subdomain_depth'].findall(domain))
        if subdomain_count > 4:
            risk_factors.append("Excessive subdomain depth")
            risk_score += 0.4
        
        # Punycode domains (internationalized domains)
        if self.DOMAIN_PATTERNS['punycode'].search(domain):
            risk_factors.append("Punycode domain (internationalized)")
            risk_score += 0.2
        
        # Very long domain names
        if len(domain) > 60:
            risk_factors.append("Unusually long domain name")
            risk_score += 0.3
        
        # Check for homograph attacks (lookalike domains)
        if self._has_suspicious_characters(domain):
            risk_factors.append("Contains suspicious characters")
            risk_score += 0.5
        
        domain_analysis.update({
            'risk_factors': risk_factors,
            'risk_score': min(risk_score, 1.0),
            'is_suspicious': risk_score > 0.4
        })
        
        is_safe = risk_score < 0.6
        error_message = None
        
        if not is_safe:
            error_message = f"Domain appears suspicious: {', '.join(risk_factors[:2])}"
        
        return is_safe, error_message, domain_analysis
    
    def validate_user_agent(self, user_agent: str) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        """
        Validate and analyze user agent string for authenticity and security.
        
        Args:
            user_agent: User agent string to validate
            
        Returns:
            Tuple of (is_legitimate, error_message, user_agent_analysis)
        """
        if not user_agent:
            return False, "User agent cannot be empty", {}
        
        # Check cache first
        if user_agent in self.user_agent_cache:
            return self.user_agent_cache[user_agent]
        
        # Analyze user agent
        ua_analysis = self._analyze_user_agent(user_agent)
        
        # Check for suspicious patterns
        risk_factors = []
        risk_score = 0.0
        
        # Bot detection
        if ua_analysis['is_bot']:
            risk_factors.append("Bot/crawler detected")
            risk_score += 0.8
        
        # Missing or unusual browser info
        if not ua_analysis['browser_info']['name']:
            risk_factors.append("No browser information")
            risk_score += 0.6
        
        # Missing OS information
        if not ua_analysis['os_info']['name']:
            risk_factors.append("No OS information")
            risk_score += 0.4
        
        # Suspicious length
        if len(user_agent) < 20:
            risk_factors.append("Unusually short user agent")
            risk_score += 0.5
        elif len(user_agent) > 500:
            risk_factors.append("Unusually long user agent")
            risk_score += 0.3
        
        # Check for common fake user agents
        if self._is_fake_user_agent(user_agent):
            risk_factors.append("Known fake user agent")
            risk_score += 0.9
        
        ua_analysis.update({
            'risk_factors': risk_factors,
            'risk_score': min(risk_score, 1.0),
            'is_suspicious': risk_score > 0.5
        })
        
        is_legitimate = risk_score < 0.7
        error_message = None
        
        if not is_legitimate:
            error_message = f"Suspicious user agent: {', '.join(risk_factors[:2])}"
        
        result = (is_legitimate, error_message, ua_analysis)
        
        # Cache result
        if len(self.user_agent_cache) < 1000:
            self.user_agent_cache[user_agent] = result
        
        return result
    
    def validate_network_consistency(self, network_data: Dict[str, Any]) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        """
        Validate consistency across multiple network parameters.
        
        Args:
            network_data: Dictionary with network information
            
        Returns:
            Tuple of (is_consistent, error_message, consistency_analysis)
        """
        inconsistencies = []
        consistency_score = 1.0
        
        ip = network_data.get('ip', '')
        user_agent = network_data.get('user_agent', '')
        headers = network_data.get('headers', {})
        fingerprint = network_data.get('fingerprint', '')
        
        # Validate individual components first
        if ip:
            ip_valid, ip_error, ip_analysis = self.validate_ip_address(ip)
            if not ip_valid:
                inconsistencies.append(f"Invalid IP: {ip_error}")
                consistency_score -= 0.3
        
        if user_agent:
            ua_valid, ua_error, ua_analysis = self.validate_user_agent(user_agent)
            if not ua_valid:
                inconsistencies.append(f"Suspicious user agent: {ua_error}")
                consistency_score -= 0.2
        
        # Cross-validate network parameters
        if ip and user_agent:
            geo_consistency = self._check_geo_consistency(ip, user_agent)
            if not geo_consistency['is_consistent']:
                inconsistencies.extend(geo_consistency['issues'])
                consistency_score -= 0.3
        
        # Check header consistency
        if headers and user_agent:
            header_consistency = self._check_header_consistency(headers, user_agent)
            if not header_consistency['is_consistent']:
                inconsistencies.extend(header_consistency['issues'])
                consistency_score -= 0.2
        
        # Fingerprint validation
        if fingerprint:
            fingerprint_analysis = self._analyze_device_fingerprint(fingerprint)
            if fingerprint_analysis['is_suspicious']:
                inconsistencies.extend(fingerprint_analysis['issues'])
                consistency_score -= 0.2
        
        is_consistent = consistency_score > 0.6
        error_message = None
        
        if not is_consistent:
            error_message = f"Network inconsistencies detected: {', '.join(inconsistencies[:2])}"
        
        consistency_analysis = {
            'consistency_score': max(consistency_score, 0.0),
            'inconsistencies': inconsistencies,
            'is_consistent': is_consistent,
            'requires_review': consistency_score < 0.8
        }
        
        return is_consistent, error_message, consistency_analysis
    
    def _analyze_ip_address(self, ip_obj: ipaddress.IPv4Address | ipaddress.IPv6Address) -> Dict[str, Any]:
        """Analyze IP address characteristics"""
        return {
            'address': str(ip_obj),
            'version': ip_obj.version,
            'is_private': ip_obj.is_private,
            'is_reserved': ip_obj.is_reserved,
            'is_loopback': ip_obj.is_loopback,
            'is_multicast': ip_obj.is_multicast,
            'is_link_local': getattr(ip_obj, 'is_link_local', False),
            'is_global': ip_obj.is_global if hasattr(ip_obj, 'is_global') else not (ip_obj.is_private or ip_obj.is_reserved),
            'network_class': self._get_ip_class(ip_obj) if ip_obj.version == 4 else None
        }
    
    def _analyze_domain(self, domain: str) -> Dict[str, Any]:
        """Analyze domain characteristics"""
        parts = domain.split('.')
        return {
            'domain': domain,
            'tld': parts[-1] if len(parts) > 1 else '',
            'second_level_domain': parts[-2] if len(parts) > 1 else domain,
            'subdomain_count': len(parts) - 2 if len(parts) > 2 else 0,
            'total_length': len(domain),
            'has_numbers': any(c.isdigit() for c in domain),
            'has_hyphens': '-' in domain,
            'is_punycode': domain.startswith('xn--') or 'xn--' in domain
        }
    
    def _analyze_user_agent(self, user_agent: str) -> Dict[str, Any]:
        """Analyze user agent string"""
        analysis = {
            'user_agent': user_agent,
            'length': len(user_agent),
            'is_bot': False,
            'browser_info': {'name': None, 'version': None},
            'os_info': {'name': None, 'version': None},
            'is_mobile': False
        }
        
        # Check for bots
        for bot_pattern in self.USER_AGENT_PATTERNS['bot_patterns']:
            if bot_pattern.search(user_agent):
                analysis['is_bot'] = True
                break
        
        # Extract browser information
        for browser, pattern in self.USER_AGENT_PATTERNS['browser_patterns'].items():
            match = pattern.search(user_agent)
            if match:
                analysis['browser_info']['name'] = browser
                analysis['browser_info']['version'] = match.group(1)
                break
        
        # Extract OS information
        for os_name, pattern in self.USER_AGENT_PATTERNS['os_patterns'].items():
            match = pattern.search(user_agent)
            if match:
                analysis['os_info']['name'] = os_name
                analysis['os_info']['version'] = match.group(1) if match.group(1) else 'unknown'
                break
        
        # Check for mobile
        for mobile_pattern in self.USER_AGENT_PATTERNS['mobile_patterns']:
            if mobile_pattern.search(user_agent):
                analysis['is_mobile'] = True
                break
        
        return analysis
    
    def _is_suspicious_ip(self, ip: str) -> bool:
        """Check if IP is in suspicious network ranges"""
        try:
            ip_obj = ipaddress.ip(ip)
            
            # Check against known suspicious ranges
            for network_range in self.SUSPICIOUS_NETWORKS.get('hosting_providers', set()):
                try:
                    if ip_obj in ipaddress.ip_network(network_range):
                        return True
                except ValueError:
                    continue
            
            return False
        except ValueError:
            return True  # Invalid IP is suspicious
    
    def _is_hosting_provider_ip(self, ip: str) -> bool:
        """Check if IP belongs to a hosting provider"""
        # This would typically query a database of hosting provider ranges
        # For now, return basic check
        return self._is_suspicious_ip(ip)
    
    def _has_suspicious_characters(self, domain: str) -> bool:
        """Check for suspicious characters that might indicate homograph attacks"""
        # Common suspicious characters in domains
        suspicious_chars = ['а', 'о', 'р', 'е', 'у', 'х', 'с', 'в', 'т', 'н', 'к', 'м']  # Cyrillic lookalikes
        return any(char in domain for char in suspicious_chars)
    
    def _is_fake_user_agent(self, user_agent: str) -> bool:
        """Check against known fake user agent patterns"""
        fake_patterns = [
            'Mozilla/4.0',  # Very old
            'User-Agent:',  # Malformed
            'python-requests',
            'curl/',
            'wget/',
        ]
        
        return any(pattern in user_agent for pattern in fake_patterns)
    
    def _get_ip_class(self, ip_obj: ipaddress.IPv4Address) -> str:
        """Get IPv4 address class (A, B, C, etc.)"""
        first_octet = int(str(ip_obj).split('.')[0])
        
        if 1 <= first_octet <= 126:
            return 'A'
        elif 128 <= first_octet <= 191:
            return 'B'
        elif 192 <= first_octet <= 223:
            return 'C'
        elif 224 <= first_octet <= 239:
            return 'D (Multicast)'
        elif 240 <= first_octet <= 255:
            return 'E (Experimental)'
        else:
            return 'Unknown'
    
    def _check_geo_consistency(self, ip: str, user_agent: str) -> Dict[str, Any]:
        """Check consistency between IP geolocation and user agent locale info"""
        # This would typically use geolocation services
        # For now, return basic structure
        return {
            'is_consistent': True,
            'issues': []
        }
    
    def _check_header_consistency(self, headers: Dict[str, str], user_agent: str) -> Dict[str, Any]:
        """Check consistency between HTTP headers and user agent"""
        issues = []
        
        # Check Accept-Language header
        accept_lang = headers.get('Accept-Language', '')
        if not accept_lang:
            issues.append("Missing Accept-Language header")
        
        # Check Accept header
        accept_header = headers.get('Accept', '')
        if not accept_header:
            issues.append("Missing Accept header")
        
        # Check for browser-specific headers
        if 'Chrome' in user_agent:
            if 'sec-ch-ua' not in headers:
                issues.append("Missing Chrome-specific headers")
        
        return {
            'is_consistent': len(issues) == 0,
            'issues': issues
        }
    
    def _analyze_device_fingerprint(self, fingerprint: str) -> Dict[str, Any]:
        """Analyze device fingerprint for suspicious patterns"""
        issues = []
        
        # Check fingerprint length
        if len(fingerprint) < 16:
            issues.append("Unusually short fingerprint")
        
        # Check for repetitive patterns
        if len(set(fingerprint)) < len(fingerprint) * 0.3:
            issues.append("Repetitive fingerprint pattern")
        
        # Check for common test fingerprints
        test_patterns = ['0000000000000000', 'abcdabcdabcdabcd', '1111111111111111']
        if fingerprint in test_patterns:
            issues.append("Test fingerprint detected")
        
        return {
            'is_suspicious': len(issues) > 0,
            'issues': issues
        }