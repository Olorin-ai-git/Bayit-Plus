#!/usr/bin/env python3
"""
Container Security Scanner
Enterprise-grade container vulnerability scanning with Trivy integration
Part of Phase 5: Security & Compliance Automation

Author: Gil Klainert
Date: 2025-09-06
"""

import os
import sys
import json
import subprocess
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
import yaml

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class VulnerabilityResult:
    """Container vulnerability scan result"""
    severity: str
    cve_id: str
    package_name: str
    installed_version: str
    fixed_version: Optional[str]
    title: str
    description: str
    cvss_score: float

@dataclass  
class ScanResult:
    """Complete container scan result"""
    image_name: str
    scan_timestamp: datetime
    total_vulnerabilities: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    vulnerabilities: List[VulnerabilityResult]
    scan_duration: float
    status: str

class ContainerSecurityScanner:
    """Enterprise container security scanner with Trivy integration"""
    
    def __init__(self, config_path: str = None):
        self.config_path = config_path or "deployment/security/scanner-config.yaml"
        self.config = self._load_config()
        self.trivy_path = self._find_trivy()
        
    def _load_config(self) -> Dict:
        """Load scanner configuration"""
        default_config = {
            'severity_levels': ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
            'ignore_unfixed': False,
            'timeout': 600,
            'cache_dir': '/tmp/trivy-cache',
            'security_thresholds': {
                'critical': 0,  # Block on any critical
                'high': 5,      # Block on >5 high
                'medium': 20,   # Block on >20 medium
                'total': 50     # Block on >50 total
            }
        }
        
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, 'r') as f:
                    user_config = yaml.safe_load(f)
                    default_config.update(user_config)
            except Exception as e:
                logger.warning(f"Failed to load config: {e}, using defaults")
                
        return default_config
    
    def _find_trivy(self) -> str:
        """Find Trivy executable"""
        trivy_paths = ['/usr/local/bin/trivy', '/usr/bin/trivy', 'trivy']
        
        for path in trivy_paths:
            try:
                result = subprocess.run([path, '--version'], 
                                      capture_output=True, text=True, timeout=10)
                if result.returncode == 0:
                    logger.info(f"Found Trivy at: {path}")
                    return path
            except (subprocess.TimeoutExpired, FileNotFoundError):
                continue
                
        logger.warning("Trivy not found, attempting to install...")
        self._install_trivy()
        return 'trivy'
    
    def _install_trivy(self) -> None:
        """Install Trivy if not found"""
        try:
            # Try to install via package manager
            if os.system('which apt-get > /dev/null 2>&1') == 0:
                os.system('sudo apt-get update && sudo apt-get install -y trivy')
            elif os.system('which brew > /dev/null 2>&1') == 0:
                os.system('brew install trivy')
            else:
                logger.error("Unable to install Trivy automatically")
        except Exception as e:
            logger.error(f"Trivy installation failed: {e}")
    
    def scan_image(self, image_name: str) -> ScanResult:
        """Scan container image for vulnerabilities"""
        logger.info(f"Starting security scan for image: {image_name}")
        start_time = datetime.now()
        
        try:
            # Build Trivy command
            cmd = [
                self.trivy_path,
                'image',
                '--format', 'json',
                '--severity', ','.join(self.config['severity_levels']),
                '--timeout', str(self.config['timeout']) + 's'
            ]
            
            if self.config['ignore_unfixed']:
                cmd.append('--ignore-unfixed')
                
            cmd.append(image_name)
            
            # Execute scan
            result = subprocess.run(cmd, capture_output=True, text=True, 
                                  timeout=self.config['timeout'])
            
            if result.returncode != 0:
                logger.error(f"Trivy scan failed: {result.stderr}")
                return self._create_error_result(image_name, result.stderr)
            
            # Parse results
            scan_data = json.loads(result.stdout)
            vulnerabilities = self._parse_vulnerabilities(scan_data)
            
            # Calculate duration
            duration = (datetime.now() - start_time).total_seconds()
            
            # Create result
            scan_result = ScanResult(
                image_name=image_name,
                scan_timestamp=start_time,
                total_vulnerabilities=len(vulnerabilities),
                critical_count=len([v for v in vulnerabilities if v.severity == 'CRITICAL']),
                high_count=len([v for v in vulnerabilities if v.severity == 'HIGH']),
                medium_count=len([v for v in vulnerabilities if v.severity == 'MEDIUM']),
                low_count=len([v for v in vulnerabilities if v.severity == 'LOW']),
                vulnerabilities=vulnerabilities,
                scan_duration=duration,
                status='completed'
            )
            
            logger.info(f"Scan completed in {duration:.2f}s - Found {len(vulnerabilities)} vulnerabilities")
            return scan_result
            
        except subprocess.TimeoutExpired:
            logger.error(f"Scan timeout after {self.config['timeout']}s")
            return self._create_error_result(image_name, "Scan timeout")
        except Exception as e:
            logger.error(f"Scan failed: {str(e)}")
            return self._create_error_result(image_name, str(e))
    
    def _parse_vulnerabilities(self, scan_data: Dict) -> List[VulnerabilityResult]:
        """Parse Trivy JSON output into vulnerability objects"""
        vulnerabilities = []
        
        if 'Results' not in scan_data:
            return vulnerabilities
            
        for result in scan_data['Results']:
            if 'Vulnerabilities' not in result:
                continue
                
            for vuln in result['Vulnerabilities']:
                vulnerability = VulnerabilityResult(
                    severity=vuln.get('Severity', 'UNKNOWN'),
                    cve_id=vuln.get('VulnerabilityID', 'N/A'),
                    package_name=vuln.get('PkgName', 'unknown'),
                    installed_version=vuln.get('InstalledVersion', 'unknown'),
                    fixed_version=vuln.get('FixedVersion'),
                    title=vuln.get('Title', ''),
                    description=vuln.get('Description', ''),
                    cvss_score=float(vuln.get('CVSS', {}).get('nvd', {}).get('V3Score', 0.0))
                )
                vulnerabilities.append(vulnerability)
        
        return sorted(vulnerabilities, key=lambda x: x.cvss_score, reverse=True)
    
    def _create_error_result(self, image_name: str, error_msg: str) -> ScanResult:
        """Create error scan result"""
        return ScanResult(
            image_name=image_name,
            scan_timestamp=datetime.now(),
            total_vulnerabilities=0,
            critical_count=0,
            high_count=0,
            medium_count=0,
            low_count=0,
            vulnerabilities=[],
            scan_duration=0.0,
            status=f'error: {error_msg}'
        )
    
    def evaluate_security_gate(self, scan_result: ScanResult) -> Tuple[bool, str]:
        """Evaluate if image passes security gate"""
        thresholds = self.config['security_thresholds']
        
        if scan_result.status.startswith('error'):
            return False, f"Scan failed: {scan_result.status}"
        
        if scan_result.critical_count > thresholds['critical']:
            return False, f"Critical vulnerabilities: {scan_result.critical_count} (max: {thresholds['critical']})"
        
        if scan_result.high_count > thresholds['high']:
            return False, f"High vulnerabilities: {scan_result.high_count} (max: {thresholds['high']})"
            
        if scan_result.medium_count > thresholds['medium']:
            return False, f"Medium vulnerabilities: {scan_result.medium_count} (max: {thresholds['medium']})"
            
        if scan_result.total_vulnerabilities > thresholds['total']:
            return False, f"Total vulnerabilities: {scan_result.total_vulnerabilities} (max: {thresholds['total']})"
        
        return True, "Security gate passed"
    
    def generate_report(self, scan_result: ScanResult, output_path: str) -> None:
        """Generate security report"""
        report = {
            'scan_summary': {
                'image_name': scan_result.image_name,
                'scan_timestamp': scan_result.scan_timestamp.isoformat(),
                'total_vulnerabilities': scan_result.total_vulnerabilities,
                'severity_breakdown': {
                    'critical': scan_result.critical_count,
                    'high': scan_result.high_count,
                    'medium': scan_result.medium_count,
                    'low': scan_result.low_count
                },
                'scan_duration': scan_result.scan_duration,
                'status': scan_result.status
            },
            'vulnerabilities': [
                {
                    'cve_id': v.cve_id,
                    'severity': v.severity,
                    'package': v.package_name,
                    'installed_version': v.installed_version,
                    'fixed_version': v.fixed_version,
                    'cvss_score': v.cvss_score,
                    'title': v.title
                } for v in scan_result.vulnerabilities[:50]  # Limit to top 50
            ]
        }
        
        with open(output_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        logger.info(f"Security report saved to: {output_path}")

def main():
    """Main execution function"""
    if len(sys.argv) < 2:
        print("Usage: container-security-scanner.py <image_name> [output_path]")
        sys.exit(1)
    
    image_name = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else f"security-report-{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    # Initialize scanner
    scanner = ContainerSecurityScanner()
    
    # Perform scan
    result = scanner.scan_image(image_name)
    
    # Evaluate security gate
    passed, message = scanner.evaluate_security_gate(result)
    
    # Generate report
    scanner.generate_report(result, output_path)
    
    # Print summary
    print(f"\n=== Container Security Scan Results ===")
    print(f"Image: {image_name}")
    print(f"Total Vulnerabilities: {result.total_vulnerabilities}")
    print(f"Critical: {result.critical_count}, High: {result.high_count}, Medium: {result.medium_count}, Low: {result.low_count}")
    print(f"Security Gate: {'PASSED' if passed else 'FAILED'}")
    print(f"Message: {message}")
    print(f"Report: {output_path}")
    
    # Exit with appropriate code
    sys.exit(0 if passed else 1)

if __name__ == "__main__":
    main()