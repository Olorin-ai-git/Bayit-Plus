"""
Tool Input Validation Fix

Fixes tool provider invocation errors by validating inputs before calling external services.

Symptoms:
- VirusTotal _arun() missing arg 'domain'
- Shodan _arun() missing arg 'ip_address' 
- IP reputation 422 "The ip address must be valid IPv4/IPv6 address"

Root Cause:
- Tool router calls providers without validated inputs
- Inputs aren't derived from scenario due to earlier parse failures
- Tools receive empty/invalid parameters

Solution: Comprehensive input validation before tool execution
"""

import re
import ipaddress
import logging
from typing import Dict, Any, Optional, Tuple, List, Union
from dataclasses import dataclass
from enum import Enum
import validators
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

class ToolType(Enum):
    """Types of external tools that need validation"""
    VIRUSTOTAL = "virustotal"
    SHODAN = "shodan"
    IP_REPUTATION = "ip_reputation"
    URL_SCANNER = "url_scanner"
    DNS_LOOKUP = "dns_lookup"
    WHOIS = "whois"

@dataclass
class ValidationResult:
    """Result of input validation"""
    valid: bool
    cleaned_input: Any = None
    error_message: str = ""
    warnings: List[str] = None
    suggestions: List[str] = None
    
    def __post_init__(self):
        if self.warnings is None:
            self.warnings = []
        if self.suggestions is None:
            self.suggestions = []

class ToolInputValidator:
    """Comprehensive tool input validator with cleaning and suggestions"""
    
    def __init__(self):
        self.validation_stats = {
            'total_validations': 0,
            'successful_validations': 0,
            'failed_validations': 0,
            'cleaned_inputs': 0
        }
    
    def validate_tool_input(
        self, 
        tool_type: ToolType, 
        **kwargs
    ) -> ValidationResult:
        """Validate and clean tool input based on tool type"""
        
        self.validation_stats['total_validations'] += 1
        
        try:
            if tool_type == ToolType.VIRUSTOTAL:
                result = self._validate_virustotal_input(**kwargs)
            elif tool_type == ToolType.SHODAN:
                result = self._validate_shodan_input(**kwargs)
            elif tool_type == ToolType.IP_REPUTATION:
                result = self._validate_ip_reputation_input(**kwargs)
            elif tool_type == ToolType.URL_SCANNER:
                result = self._validate_url_scanner_input(**kwargs)
            elif tool_type == ToolType.DNS_LOOKUP:
                result = self._validate_dns_lookup_input(**kwargs)
            elif tool_type == ToolType.WHOIS:
                result = self._validate_whois_input(**kwargs)
            else:
                result = ValidationResult(
                    valid=False,
                    error_message=f"Unknown tool type: {tool_type}"
                )
            
            if result.valid:
                self.validation_stats['successful_validations'] += 1
                if result.cleaned_input != kwargs:
                    self.validation_stats['cleaned_inputs'] += 1
            else:
                self.validation_stats['failed_validations'] += 1
            
            return result
            
        except Exception as e:
            self.validation_stats['failed_validations'] += 1
            return ValidationResult(
                valid=False,
                error_message=f"Validation exception: {str(e)}"
            )
    
    def _validate_virustotal_input(self, **kwargs) -> ValidationResult:
        """Validate VirusTotal tool input - requires domain"""
        
        domain = kwargs.get('domain', '').strip()
        
        if not domain:
            return ValidationResult(
                valid=False,
                error_message="VirusTotal requires 'domain' parameter",
                suggestions=[
                    "Extract domain from URL",
                    "Use IP address for IP-based analysis",
                    "Skip VirusTotal if no domain available"
                ]
            )
        
        # Clean and validate domain
        cleaned_domain = self._clean_domain(domain)
        domain_validation = self._validate_domain_format(cleaned_domain)
        
        if not domain_validation.valid:
            return ValidationResult(
                valid=False,
                error_message=f"Invalid domain format: {domain_validation.error_message}",
                suggestions=[
                    "Check domain extraction logic",
                    "Verify URL parsing",
                    "Use alternative IOC if domain invalid"
                ]
            )
        
        return ValidationResult(
            valid=True,
            cleaned_input={'domain': cleaned_domain},
            warnings=domain_validation.warnings
        )
    
    def _validate_shodan_input(self, **kwargs) -> ValidationResult:
        """Validate Shodan tool input - requires ip_address"""
        
        ip_address = kwargs.get('ip_address', '').strip()
        
        if not ip_address:
            return ValidationResult(
                valid=False,
                error_message="Shodan requires 'ip_address' parameter",
                suggestions=[
                    "Extract IP from network logs",
                    "Resolve domain to IP",
                    "Skip Shodan if no IP available"
                ]
            )
        
        # Clean and validate IP address
        cleaned_ip = self._clean_ip_address(ip_address)
        ip_validation = self._validate_ip_address_format(cleaned_ip)
        
        if not ip_validation.valid:
            return ValidationResult(
                valid=False,
                error_message=f"Invalid IP address format: {ip_validation.error_message}",
                suggestions=[
                    "Check IP extraction logic",
                    "Verify log parsing",
                    "Use domain analysis if IP invalid"
                ]
            )
        
        return ValidationResult(
            valid=True,
            cleaned_input={'ip_address': cleaned_ip},
            warnings=ip_validation.warnings
        )
    
    def _validate_ip_reputation_input(self, **kwargs) -> ValidationResult:
        """Validate IP reputation tool input"""
        
        ip_address = kwargs.get('ip_address', '').strip()
        
        if not ip_address:
            return ValidationResult(
                valid=False,
                error_message="IP reputation check requires 'ip_address' parameter"
            )
        
        # Clean and validate IP address
        cleaned_ip = self._clean_ip_address(ip_address)
        ip_validation = self._validate_ip_address_format(cleaned_ip)
        
        if not ip_validation.valid:
            return ValidationResult(
                valid=False,
                error_message=f"Invalid IP address: {ip_validation.error_message}",
                suggestions=["Use valid IPv4 or IPv6 format (e.g. 8.8.8.8 or 2001:4860:4860::8888)"]
            )
        
        return ValidationResult(
            valid=True,
            cleaned_input={'ip_address': cleaned_ip},
            warnings=ip_validation.warnings
        )
    
    def _validate_url_scanner_input(self, **kwargs) -> ValidationResult:
        """Validate URL scanner tool input"""
        
        url = kwargs.get('url', '').strip()
        
        if not url:
            return ValidationResult(
                valid=False,
                error_message="URL scanner requires 'url' parameter"
            )
        
        # Clean and validate URL
        cleaned_url = self._clean_url(url)
        url_validation = self._validate_url_format(cleaned_url)
        
        if not url_validation.valid:
            return ValidationResult(
                valid=False,
                error_message=f"Invalid URL format: {url_validation.error_message}"
            )
        
        return ValidationResult(
            valid=True,
            cleaned_input={'url': cleaned_url},
            warnings=url_validation.warnings
        )
    
    def _validate_dns_lookup_input(self, **kwargs) -> ValidationResult:
        """Validate DNS lookup tool input"""
        
        domain = kwargs.get('domain', '').strip()
        
        if not domain:
            return ValidationResult(
                valid=False,
                error_message="DNS lookup requires 'domain' parameter"
            )
        
        # Clean and validate domain
        cleaned_domain = self._clean_domain(domain)
        domain_validation = self._validate_domain_format(cleaned_domain)
        
        if not domain_validation.valid:
            return ValidationResult(
                valid=False,
                error_message=f"Invalid domain: {domain_validation.error_message}"
            )
        
        return ValidationResult(
            valid=True,
            cleaned_input={'domain': cleaned_domain},
            warnings=domain_validation.warnings
        )
    
    def _validate_whois_input(self, **kwargs) -> ValidationResult:
        """Validate WHOIS tool input"""
        
        target = kwargs.get('domain') or kwargs.get('ip_address', '').strip()
        
        if not target:
            return ValidationResult(
                valid=False,
                error_message="WHOIS requires 'domain' or 'ip_address' parameter"
            )
        
        # Try as IP first, then as domain
        if self._is_ip_address(target):
            ip_validation = self._validate_ip_address_format(target)
            if ip_validation.valid:
                return ValidationResult(
                    valid=True,
                    cleaned_input={'ip_address': target}
                )
        
        # Try as domain
        cleaned_domain = self._clean_domain(target)
        domain_validation = self._validate_domain_format(cleaned_domain)
        
        if domain_validation.valid:
            return ValidationResult(
                valid=True,
                cleaned_input={'domain': cleaned_domain}
            )
        
        return ValidationResult(
            valid=False,
            error_message="WHOIS target must be valid domain or IP address"
        )
    
    # Input cleaning methods
    
    def _clean_domain(self, domain: str) -> str:
        """Clean domain input"""
        domain = domain.strip().lower()
        
        # Remove protocol if present
        if domain.startswith(('http://', 'https://')):
            domain = urlparse(domain).netloc
        
        # Remove www prefix if present
        if domain.startswith('www.'):
            domain = domain[4:]
        
        # Remove trailing slash or path
        domain = domain.split('/')[0]
        
        # Remove port if present
        domain = domain.split(':')[0]
        
        return domain
    
    def _clean_ip_address(self, ip: str) -> str:
        """Clean IP address input"""
        ip = ip.strip()
        
        # Remove brackets from IPv6
        if ip.startswith('[') and ip.endswith(']'):
            ip = ip[1:-1]
        
        # Remove port if present
        if ':' in ip and not self._is_ipv6(ip):
            # IPv4 with port
            ip = ip.split(':')[0]
        
        return ip
    
    def _clean_url(self, url: str) -> str:
        """Clean URL input"""
        url = url.strip()
        
        # Add protocol if missing
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
        
        return url
    
    # Format validation methods
    
    def _validate_domain_format(self, domain: str) -> ValidationResult:
        """Validate domain format"""
        
        if not domain:
            return ValidationResult(
                valid=False,
                error_message="Empty domain"
            )
        
        # Basic domain pattern
        domain_pattern = re.compile(
            r'^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$'
        )
        
        warnings = []
        
        if not domain_pattern.match(domain):
            return ValidationResult(
                valid=False,
                error_message="Invalid domain format"
            )
        
        # Check for suspicious patterns
        if len(domain) > 253:
            warnings.append("Domain is unusually long")
        
        if domain.count('.') > 10:
            warnings.append("Domain has many subdomains")
        
        # Check for localhost or internal domains
        if domain in ['localhost', '127.0.0.1'] or domain.endswith('.local'):
            warnings.append("Domain appears to be local/internal")
        
        return ValidationResult(
            valid=True,
            warnings=warnings
        )
    
    def _validate_ip_address_format(self, ip: str) -> ValidationResult:
        """Validate IP address format"""
        
        if not ip:
            return ValidationResult(
                valid=False,
                error_message="Empty IP address"
            )
        
        try:
            ip_obj = ipaddress.ip_address(ip)
            
            warnings = []
            
            # Check for private/reserved addresses
            if ip_obj.is_private:
                warnings.append("IP address is private (RFC 1918)")
            
            if ip_obj.is_reserved:
                warnings.append("IP address is reserved")
            
            if ip_obj.is_loopback:
                warnings.append("IP address is loopback")
            
            if ip_obj.is_link_local:
                warnings.append("IP address is link-local")
            
            return ValidationResult(
                valid=True,
                warnings=warnings
            )
            
        except ValueError as e:
            return ValidationResult(
                valid=False,
                error_message=f"Invalid IP address format: {str(e)}"
            )
    
    def _validate_url_format(self, url: str) -> ValidationResult:
        """Validate URL format"""
        
        if not url:
            return ValidationResult(
                valid=False,
                error_message="Empty URL"
            )
        
        try:
            parsed = urlparse(url)
            
            if not parsed.scheme:
                return ValidationResult(
                    valid=False,
                    error_message="URL missing scheme (http/https)"
                )
            
            if not parsed.netloc:
                return ValidationResult(
                    valid=False,
                    error_message="URL missing domain"
                )
            
            warnings = []
            
            if parsed.scheme not in ['http', 'https']:
                warnings.append(f"Unusual URL scheme: {parsed.scheme}")
            
            return ValidationResult(
                valid=True,
                warnings=warnings
            )
            
        except Exception as e:
            return ValidationResult(
                valid=False,
                error_message=f"Invalid URL format: {str(e)}"
            )
    
    # Helper methods
    
    def _is_ip_address(self, value: str) -> bool:
        """Check if value is an IP address"""
        try:
            ipaddress.ip_address(value)
            return True
        except ValueError:
            return False
    
    def _is_ipv6(self, value: str) -> bool:
        """Check if value is IPv6"""
        try:
            ip = ipaddress.ip_address(value)
            return isinstance(ip, ipaddress.IPv6Address)
        except ValueError:
            return False
    
    def get_validation_stats(self) -> Dict[str, Any]:
        """Get validation statistics"""
        total = self.validation_stats['total_validations']
        return {
            'total_validations': total,
            'success_rate': (self.validation_stats['successful_validations'] / max(total, 1)) * 100,
            'failure_rate': (self.validation_stats['failed_validations'] / max(total, 1)) * 100,
            'cleaning_rate': (self.validation_stats['cleaned_inputs'] / max(total, 1)) * 100,
            'stats': self.validation_stats
        }


# Global validator instance
_global_tool_validator = None

def get_tool_validator() -> ToolInputValidator:
    """Get global tool validator instance"""
    global _global_tool_validator
    if _global_tool_validator is None:
        _global_tool_validator = ToolInputValidator()
    return _global_tool_validator

# Convenience functions for immediate use

def validate_virustotal_call(**kwargs) -> ValidationResult:
    """Validate VirusTotal API call parameters"""
    validator = get_tool_validator()
    return validator.validate_tool_input(ToolType.VIRUSTOTAL, **kwargs)

def validate_shodan_call(**kwargs) -> ValidationResult:
    """Validate Shodan API call parameters"""
    validator = get_tool_validator()
    return validator.validate_tool_input(ToolType.SHODAN, **kwargs)

def validate_ip_reputation_call(**kwargs) -> ValidationResult:
    """Validate IP reputation API call parameters"""
    validator = get_tool_validator()
    return validator.validate_tool_input(ToolType.IP_REPUTATION, **kwargs)

def safe_tool_call(tool_type: ToolType, tool_function: callable, **kwargs) -> Tuple[bool, Any]:
    """
    Safely call a tool function with validation
    
    Returns: (success, result)
    """
    validator = get_tool_validator()
    
    # Validate inputs
    validation_result = validator.validate_tool_input(tool_type, **kwargs)
    
    if not validation_result.valid:
        logger.warning(f"Tool validation failed for {tool_type.value}: {validation_result.error_message}")
        return False, {
            'error': validation_result.error_message,
            'tool_type': tool_type.value,
            'suggestions': validation_result.suggestions
        }
    
    try:
        # Use cleaned inputs if available
        call_params = validation_result.cleaned_input or kwargs
        
        # Log warnings if present
        if validation_result.warnings:
            for warning in validation_result.warnings:
                logger.warning(f"{tool_type.value} validation warning: {warning}")
        
        # Call the tool function
        result = tool_function(**call_params)
        
        logger.info(f"✅ {tool_type.value} call successful with validated inputs")
        return True, result
        
    except Exception as e:
        logger.error(f"Tool call failed for {tool_type.value}: {str(e)}")
        return False, {
            'error': f"Tool execution failed: {str(e)}",
            'tool_type': tool_type.value
        }


# Example usage patterns:
"""
# OLD CODE (causes errors):
try:
    result = virustotal_tool.analyze(domain=domain)  # domain might be empty!
except Exception as e:
    logger.error(f"VirusTotal failed: {e}")

# NEW CODE (validated):
validation = validate_virustotal_call(domain=domain)
if validation.valid:
    try:
        result = virustotal_tool.analyze(**validation.cleaned_input)
        logger.info("✅ VirusTotal analysis successful")
    except Exception as e:
        logger.error(f"VirusTotal API error: {e}")
else:
    logger.warning(f"Skipping VirusTotal: {validation.error_message}")
    # Use alternative analysis or continue without

# EVEN BETTER - use safe_tool_call:
success, result = safe_tool_call(
    ToolType.VIRUSTOTAL, 
    virustotal_tool.analyze, 
    domain=extracted_domain
)
if success:
    logger.info(f"VirusTotal result: {result}")
else:
    logger.warning(f"VirusTotal unavailable: {result['error']}")
"""