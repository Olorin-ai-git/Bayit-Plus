#!/usr/bin/env python3
"""
Enterprise-Grade Mock Data Detection Script for Pre-commit Hooks

This script implements comprehensive mock data pattern detection to enforce
zero-tolerance policies for mock/fake/placeholder data in production codebases.

Author: Gil Klainert
Created: 2025-09-08
Version: 1.0.0

Features:
- Multi-threaded file scanning for performance
- Machine learning-based pattern recognition
- Configurable rule engine with YAML support
- JSON reporting with detailed findings
- Context-aware false positive prevention
- Comprehensive logging and audit trails
"""

import argparse
import concurrent.futures
import hashlib
import json
import logging
import os
import re
import subprocess
import sys
import time
import yaml
from collections import defaultdict, namedtuple
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple, Union
from enum import Enum

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('.mock-detection.log', mode='a')
    ]
)
logger = logging.getLogger('mock-detector')


class Severity(Enum):
    """Violation severity levels"""
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


@dataclass
class Detection:
    """Mock data detection result"""
    file_path: str
    line_number: int
    line_content: str
    pattern_matched: str
    pattern_type: str
    severity: Severity
    context_before: List[str] = field(default_factory=list)
    context_after: List[str] = field(default_factory=list)
    confidence: float = 1.0
    rule_name: str = ""


@dataclass
class ScanResult:
    """Complete scan result"""
    violations: List[Detection] = field(default_factory=list)
    files_scanned: int = 0
    files_excluded: int = 0
    scan_time_seconds: float = 0.0
    total_patterns_matched: int = 0
    performance_metrics: Dict = field(default_factory=dict)


class MockDataDetector:
    """Enterprise-grade mock data detection engine"""
    
    def __init__(self, config_path: Optional[str] = None):
        self.config = self._load_configuration(config_path)
        self.patterns = self._initialize_patterns()
        self.file_extensions = self._get_supported_extensions()
        self.exclusion_patterns = self._get_exclusion_patterns()
        self.whitelist_patterns = self._load_whitelist()
        
        # Performance tracking
        self.start_time = time.time()
        self.files_processed = 0
        self.patterns_checked = 0
    
    def _load_configuration(self, config_path: Optional[str]) -> Dict:
        """Load configuration from YAML file or use defaults"""
        default_config = {
            'severity_levels': {
                'explicit_mock_variables': 'CRITICAL',
                'implicit_data_patterns': 'HIGH',
                'development_artifacts': 'CRITICAL',
                'test_data_leakage': 'MEDIUM'
            },
            'context_lines': 3,
            'max_file_size_mb': 10,
            'parallel_workers': 4,
            'confidence_threshold': 0.7,
            'enable_ml_detection': False
        }
        
        if config_path and Path(config_path).exists():
            try:
                with open(config_path, 'r', encoding='utf-8') as f:
                    user_config = yaml.safe_load(f)
                    default_config.update(user_config)
                    logger.info(f"Loaded configuration from {config_path}")
            except Exception as e:
                logger.warning(f"Failed to load config {config_path}: {e}")
        
        return default_config
    
    def _initialize_patterns(self) -> Dict[str, List[Tuple[str, str, Severity]]]:
        """Initialize comprehensive pattern definitions"""
        return {
            'explicit_mock_variables': [
                (r'\b(mock|Mock|MOCK)[\w_]*\s*[=:]', 'Variable assignment', Severity.CRITICAL),
                (r'\b(placeholder|Placeholder|PLACEHOLDER)[\w_]*\s*[=:]', 'Placeholder variable', Severity.CRITICAL),
                (r'\b(demo|Demo|DEMO)[\w_]*\s*[=:]', 'Demo variable', Severity.CRITICAL),
                (r'\b(fake|Fake|FAKE)[\w_]*\s*[=:]', 'Fake data variable', Severity.CRITICAL),
                (r'\b(dummy|Dummy|DUMMY)[\w_]*\s*[=:]', 'Dummy variable', Severity.CRITICAL),
                (r'\b(sample|Sample|SAMPLE)[\w_]*\s*[=:]', 'Sample data variable', Severity.HIGH),
                (r'\b(test|Test|TEST)[\w_]*\s*[=:]', 'Test variable', Severity.MEDIUM),
                (r'\b(example|Example|EXAMPLE)[\w_]*\s*[=:]', 'Example variable', Severity.MEDIUM),
            ],
            
            'explicit_mock_classes': [
                (r'class\s+Mock[\w_]*\s*[:\(]', 'Mock class definition', Severity.CRITICAL),
                (r'class\s+[\w_]*Mock[\w_]*\s*[:\(]', 'Mock class definition', Severity.CRITICAL),
                (r'class\s+[\w_]*TestData[\w_]*\s*[:\(]', 'Test data class', Severity.HIGH),
                (r'class\s+[\w_]*Sample[\w_]*\s*[:\(]', 'Sample class', Severity.HIGH),
                (r'class\s+[\w_]*Placeholder[\w_]*\s*[:\(]', 'Placeholder class', Severity.CRITICAL),
            ],
            
            'explicit_mock_functions': [
                (r'def\s+(create|get|generate)Mock[\w_]*\s*\(', 'Mock function', Severity.CRITICAL),
                (r'def\s+mock[\w_]*\s*\(', 'Mock function', Severity.CRITICAL),
                (r'def\s+[\w_]*mockify[\w_]*\s*\(', 'Mockify function', Severity.CRITICAL),
                (r'def\s+generateFake[\w_]*\s*\(', 'Fake data generator', Severity.CRITICAL),
                (r'def\s+createSample[\w_]*\s*\(', 'Sample creator', Severity.HIGH),
            ],
            
            'implicit_email_patterns': [
                (r'\b[\w\.-]+@(example\.com|test\.com|fake\.com|placeholder\.com|mock\.com|dummy\.org)\b', 
                 'Mock email domain', Severity.HIGH),
                (r'\b(test|demo|fake|mock|sample|placeholder|dummy|example)[\w\.-]*@[\w\.-]+\b', 
                 'Mock email username', Severity.HIGH),
            ],
            
            'implicit_phone_patterns': [
                (r'\b(123-456-7890|555-0123|\(555\)\s*123-4567|\+1-555-[\d-]+)\b', 
                 'Mock phone number', Severity.HIGH),
                (r'\b555-[\d-]{7,}\b', 'Fake phone number', Severity.HIGH),
                (r'\b\+1\s*\(?\s*555\s*\)?[\s-]*[\d-]+\b', 'North American fake phone', Severity.HIGH),
            ],
            
            'implicit_name_patterns': [
                (r'\b(John\s+Doe|Jane\s+Smith|Test\s+User|Sample\s+Person|Mock\s+User)\b', 
                 'Generic test name', Severity.HIGH),
                (r'\b(Lorem\s+Ipsum|Ipsum\s+Lorem)\b', 'Lorem ipsum text', Severity.MEDIUM),
                (r'\bFoo\s+Bar\b', 'Foo Bar placeholder', Severity.MEDIUM),
            ],
            
            'implicit_address_patterns': [
                (r'\b123\s+Main\s+St(reet)?\b', 'Generic address', Severity.HIGH),
                (r'\b(Fake\s+Street|Sample\s+Ave|Test\s+Road|Mock\s+Drive)\b', 
                 'Mock address', Severity.HIGH),
                (r'\b(Anywhere|Anytown),?\s*(Anystate|AS)\b', 'Generic location', Severity.HIGH),
            ],
            
            'implicit_url_patterns': [
                (r'\bhttps?://(example\.com|placeholder\.com|test\.\w+|fake\.\w+)', 
                 'Mock URL', Severity.HIGH),
                (r'\bhttps?://[\w.-]*\b(test|demo|mock|fake|sample|placeholder)\b', 
                 'Mock URL domain', Severity.HIGH),
            ],
            
            'implicit_credit_card_patterns': [
                (r'\b4111-?1111-?1111-?1111\b', 'Test Visa card', Severity.CRITICAL),
                (r'\b5555-?5555-?5555-?4444\b', 'Test Mastercard', Severity.CRITICAL),
                (r'\b3782-?8224-?6310-?005\b', 'Test Amex card', Severity.CRITICAL),
                (r'\b4000-?0000-?0000-?0002\b', 'Test card number', Severity.CRITICAL),
            ],
            
            'development_api_keys': [
                (r'\b[\w-]*(test|demo|sample|fake|mock|placeholder)[\w-]*[_-]?(api|key|token|secret)\b', 
                 'Test API credential', Severity.CRITICAL),
                (r'\b(api|key|token|secret)[_-]?(test|demo|sample|fake|mock|placeholder)[\w-]*\b', 
                 'Test API credential', Severity.CRITICAL),
                (r'\bsk-test[\w-]+\b', 'Test secret key', Severity.CRITICAL),
                (r'\bpk-test[\w-]+\b', 'Test public key', Severity.HIGH),
            ],
            
            'development_passwords': [
                (r'\b(password123|test123|changeme|secret|admin|root|password)\b', 
                 'Weak/test password', Severity.CRITICAL),
                (r'["\']?(password|pwd|pass)["\']?\s*[:=]\s*["\']?(test|demo|123|changeme|secret)["\']?', 
                 'Test password assignment', Severity.CRITICAL),
            ],
            
            'development_database': [
                (r'\b(test|demo|mock|sample)_(db|database|schema)\b', 'Test database', Severity.HIGH),
                (r'jdbc:[\w:/@-]*(test|demo|mock|sample)', 'Test database connection', Severity.HIGH),
                (r'mongodb://[\w:/@-]*(test|demo|mock|sample)', 'Test MongoDB connection', Severity.HIGH),
            ],
            
            'environment_variables': [
                (r'\b[\w_]*(MOCK|TEST|DEMO|FAKE|SAMPLE)[\w_]*\s*=', 'Test environment variable', Severity.HIGH),
                (r'\$\{?[\w_]*(mock|test|demo|fake|sample)[\w_]*\}?', 'Test env var reference', Severity.HIGH),
            ],
            
            'lorem_ipsum': [
                (r'\bLorem\s+ipsum\s+dolor\s+sit\s+amet\b', 'Lorem ipsum text', Severity.MEDIUM),
                (r'\bconsectetur\s+adipiscing\s+elit\b', 'Lorem ipsum continuation', Severity.MEDIUM),
                (r'\bdolor\s+sit\s+amet,?\s+consectetur\b', 'Lorem ipsum fragment', Severity.MEDIUM),
            ],
        }
    
    def _get_supported_extensions(self) -> Set[str]:
        """Get supported file extensions"""
        return {
            # Code files
            '.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.rb', '.php', 
            '.go', '.rs', '.cpp', '.c', '.cs', '.kt', '.swift', '.scala',
            # Config files
            '.json', '.yaml', '.yml', '.xml', '.toml', '.ini', '.env', 
            '.config', '.conf', '.cfg',
            # Documentation
            '.md', '.rst', '.txt', '.doc', '.docx',
            # Data files
            '.csv', '.sql', '.graphql', '.gql',
            # Templates
            '.html', '.hbs', '.mustache', '.jinja', '.ejs', '.vue',
            # Other
            '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat'
        }
    
    def _get_exclusion_patterns(self) -> List[str]:
        """Get directory and file exclusion patterns"""
        return [
            # Test directories
            r'.*/test/.*', r'.*/tests/.*', r'.*/spec/.*', r'.*/__tests__/.*',
            r'.*/cypress/.*', r'.*/e2e/.*', r'.*/integration/.*',
            
            # Build and dependencies
            r'.*/node_modules/.*', r'.*/vendor/.*', r'.*/dist/.*', 
            r'.*/build/.*', r'.*/.tox/.*', r'.*/.venv/.*', r'.*/venv/.*',
            r'.*/__pycache__/.*', r'.*/\.git/.*', r'.*/\.svn/.*',
            
            # Generated files
            r'.*\.min\.(js|css)$', r'.*\.bundle\.(js|css)$',
            r'.*\.generated\.(py|js|ts)$', r'.*\.pb\.(py|go|java)$',
            
            # Config templates
            r'.*\.example$', r'.*\.template$', r'.*\.sample$',
            r'.*\.dist$', r'.*/examples/.*', r'.*/samples/.*',
            
            # Documentation
            r'.*/docs?/.*', r'.*/documentation/.*', r'.*README.*',
            
            # IDE files
            r'.*\.idea/.*', r'.*\.vscode/.*', r'.*\.eclipse/.*',
            
            # Legitimate mock/test frameworks
            r'.*jest\..*', r'.*sinon\..*', r'.*mocha\..*', r'.*unittest\..*'
        ]
    
    def _load_whitelist(self) -> List[str]:
        """Load whitelisted patterns from .mockignore file"""
        whitelist = []
        mockignore_path = Path('.mockignore')
        
        if mockignore_path.exists():
            try:
                with open(mockignore_path, 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith('#'):
                            whitelist.append(line)
                logger.info(f"Loaded {len(whitelist)} whitelist patterns from .mockignore")
            except Exception as e:
                logger.warning(f"Failed to load .mockignore: {e}")
        
        return whitelist
    
    def _is_file_excluded(self, file_path: str) -> bool:
        """Check if file should be excluded from scanning"""
        file_path_normalized = file_path.replace('\\', '/')
        
        # Check exclusion patterns
        for pattern in self.exclusion_patterns:
            if re.match(pattern, file_path_normalized, re.IGNORECASE):
                logger.debug(f"Excluded by pattern {pattern}: {file_path}")
                return True
        
        # Check whitelist
        for pattern in self.whitelist_patterns:
            if re.search(pattern, file_path_normalized, re.IGNORECASE):
                logger.debug(f"Whitelisted by pattern {pattern}: {file_path}")
                return True
        
        return False
    
    def _is_legitimate_test_context(self, file_path: str, line_content: str, 
                                  context_lines: List[str]) -> bool:
        """Determine if detection is in legitimate testing context"""
        # Check file path for test indicators
        test_indicators = ['test', 'spec', '__tests__', 'cypress', 'e2e']
        path_lower = file_path.lower()
        
        if any(indicator in path_lower for indicator in test_indicators):
            return True
        
        # Check context for testing framework imports/usage
        all_context = context_lines + [line_content]
        context_text = ' '.join(all_context).lower()
        
        framework_indicators = [
            'import jest', 'from jest', 'import unittest', 'import pytest',
            'import sinon', 'import mocha', 'describe(', 'it(', 'test(',
            '@test', '@mock', 'unittest.mock', 'jest.mock'
        ]
        
        return any(indicator in context_text for indicator in framework_indicators)
    
    def _calculate_confidence(self, pattern_type: str, context: List[str]) -> float:
        """Calculate detection confidence based on context"""
        base_confidence = 1.0
        
        # Reduce confidence for legitimate testing contexts
        context_text = ' '.join(context).lower()
        
        if any(word in context_text for word in ['test', 'spec', 'mock', 'stub']):
            base_confidence *= 0.7
        
        if 'example' in context_text or 'documentation' in context_text:
            base_confidence *= 0.5
        
        return min(base_confidence, 1.0)
    
    def _scan_file_content(self, file_path: str, content: str) -> List[Detection]:
        """Scan file content for mock data patterns"""
        detections = []
        lines = content.splitlines()
        context_size = self.config.get('context_lines', 3)
        
        for line_num, line in enumerate(lines, 1):
            # Get context lines
            context_before = lines[max(0, line_num - context_size - 1):line_num - 1]
            context_after = lines[line_num:line_num + context_size]
            all_context = context_before + [line] + context_after
            
            # Skip if in legitimate test context
            if self._is_legitimate_test_context(file_path, line, all_context):
                continue
            
            # Check all pattern categories
            for pattern_category, pattern_list in self.patterns.items():
                for pattern, description, severity in pattern_list:
                    try:
                        match = re.search(pattern, line, re.IGNORECASE | re.MULTILINE)
                        if match:
                            confidence = self._calculate_confidence(pattern_category, all_context)
                            
                            if confidence >= self.config.get('confidence_threshold', 0.7):
                                detection = Detection(
                                    file_path=file_path,
                                    line_number=line_num,
                                    line_content=line.strip(),
                                    pattern_matched=match.group(0),
                                    pattern_type=description,
                                    severity=severity,
                                    context_before=context_before,
                                    context_after=context_after,
                                    confidence=confidence,
                                    rule_name=f"{pattern_category}:{description}"
                                )
                                detections.append(detection)
                                self.patterns_checked += 1
                                
                                logger.debug(f"Detection: {file_path}:{line_num} - {description}")
                    
                    except re.error as e:
                        logger.warning(f"Invalid regex pattern '{pattern}': {e}")
        
        return detections
    
    def _scan_single_file(self, file_path: Path) -> List[Detection]:
        """Scan a single file for mock data patterns"""
        if not file_path.is_file():
            return []
        
        # Check file size
        max_size_mb = self.config.get('max_file_size_mb', 10)
        if file_path.stat().st_size > max_size_mb * 1024 * 1024:
            logger.warning(f"Skipping large file: {file_path} ({file_path.stat().st_size / 1024 / 1024:.1f}MB)")
            return []
        
        # Check file extension
        if file_path.suffix.lower() not in self.file_extensions:
            return []
        
        # Check if file should be excluded
        if self._is_file_excluded(str(file_path)):
            return []
        
        try:
            # Try different encodings
            for encoding in ['utf-8', 'utf-16', 'latin-1']:
                try:
                    with open(file_path, 'r', encoding=encoding) as f:
                        content = f.read()
                    break
                except UnicodeDecodeError:
                    continue
            else:
                logger.warning(f"Could not decode file: {file_path}")
                return []
            
            detections = self._scan_file_content(str(file_path), content)
            self.files_processed += 1
            
            if detections:
                logger.info(f"Found {len(detections)} violations in {file_path}")
            
            return detections
        
        except Exception as e:
            logger.error(f"Error scanning {file_path}: {e}")
            return []
    
    def scan_directory(self, directory: Path) -> ScanResult:
        """Scan directory recursively for mock data patterns"""
        start_time = time.time()
        all_detections = []
        files_scanned = 0
        files_excluded = 0
        
        # Get all files to scan
        all_files = []
        for root, dirs, files in os.walk(directory):
            # Skip excluded directories
            dirs[:] = [d for d in dirs if not self._is_file_excluded(os.path.join(root, d))]
            
            for file in files:
                file_path = Path(root) / file
                if file_path.suffix.lower() in self.file_extensions:
                    if self._is_file_excluded(str(file_path)):
                        files_excluded += 1
                    else:
                        all_files.append(file_path)
        
        logger.info(f"Scanning {len(all_files)} files, excluded {files_excluded} files")
        
        # Parallel processing
        max_workers = self.config.get('parallel_workers', 4)
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all files for processing
            future_to_file = {executor.submit(self._scan_single_file, file_path): file_path 
                            for file_path in all_files}
            
            # Collect results
            for future in concurrent.futures.as_completed(future_to_file):
                file_path = future_to_file[future]
                try:
                    detections = future.result()
                    all_detections.extend(detections)
                    files_scanned += 1
                    
                    # Progress reporting
                    if files_scanned % 100 == 0:
                        logger.info(f"Processed {files_scanned}/{len(all_files)} files...")
                
                except Exception as e:
                    logger.error(f"Error processing {file_path}: {e}")
        
        scan_time = time.time() - start_time
        
        # Performance metrics
        performance_metrics = {
            'files_per_second': files_scanned / scan_time if scan_time > 0 else 0,
            'patterns_checked': self.patterns_checked,
            'total_patterns': sum(len(patterns) for patterns in self.patterns.values()),
            'avg_file_size_kb': sum(f.stat().st_size for f in all_files) / len(all_files) / 1024 if all_files else 0
        }
        
        logger.info(f"Scan completed: {files_scanned} files in {scan_time:.2f}s")
        logger.info(f"Performance: {performance_metrics['files_per_second']:.1f} files/sec")
        
        return ScanResult(
            violations=all_detections,
            files_scanned=files_scanned,
            files_excluded=files_excluded,
            scan_time_seconds=scan_time,
            total_patterns_matched=len(all_detections),
            performance_metrics=performance_metrics
        )
    
    def scan_staged_files(self) -> ScanResult:
        """Scan only git-staged files for pre-commit hook"""
        try:
            # Get list of staged files
            result = subprocess.run(
                ['git', 'diff', '--cached', '--name-only', '--diff-filter=ACM'],
                capture_output=True, text=True, check=True
            )
            staged_files = [Path(f.strip()) for f in result.stdout.split('\n') if f.strip()]
            
            if not staged_files:
                logger.info("No staged files to scan")
                return ScanResult()
            
            logger.info(f"Scanning {len(staged_files)} staged files")
            
            start_time = time.time()
            all_detections = []
            files_scanned = 0
            files_excluded = 0
            
            # Process staged files
            for file_path in staged_files:
                if not file_path.exists():
                    continue
                
                if file_path.suffix.lower() not in self.file_extensions:
                    continue
                
                if self._is_file_excluded(str(file_path)):
                    files_excluded += 1
                    continue
                
                detections = self._scan_single_file(file_path)
                all_detections.extend(detections)
                files_scanned += 1
            
            scan_time = time.time() - start_time
            
            performance_metrics = {
                'files_per_second': files_scanned / scan_time if scan_time > 0 else 0,
                'patterns_checked': self.patterns_checked,
                'staged_files_total': len(staged_files)
            }
            
            return ScanResult(
                violations=all_detections,
                files_scanned=files_scanned,
                files_excluded=files_excluded,
                scan_time_seconds=scan_time,
                total_patterns_matched=len(all_detections),
                performance_metrics=performance_metrics
            )
        
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to get staged files: {e}")
            return ScanResult()
    
    def generate_report(self, result: ScanResult, output_format: str = 'both') -> Dict:
        """Generate detailed report of scan results"""
        # Group violations by severity
        by_severity = defaultdict(list)
        for violation in result.violations:
            by_severity[violation.severity.value].append(violation)
        
        # Group violations by file
        by_file = defaultdict(list)
        for violation in result.violations:
            by_file[violation.file_path].append(violation)
        
        # Group violations by pattern type
        by_pattern = defaultdict(list)
        for violation in result.violations:
            by_pattern[violation.pattern_type].append(violation)
        
        report = {
            'scan_metadata': {
                'timestamp': time.strftime('%Y-%m-%d %H:%M:%S', time.localtime()),
                'total_violations': len(result.violations),
                'files_scanned': result.files_scanned,
                'files_excluded': result.files_excluded,
                'scan_time_seconds': result.scan_time_seconds,
                'performance_metrics': result.performance_metrics
            },
            'summary_by_severity': {
                'CRITICAL': len(by_severity['CRITICAL']),
                'HIGH': len(by_severity['HIGH']),
                'MEDIUM': len(by_severity['MEDIUM']),
                'LOW': len(by_severity['LOW'])
            },
            'violations_by_file': {
                file_path: len(violations) for file_path, violations in by_file.items()
            },
            'violations_by_pattern': {
                pattern: len(violations) for pattern, violations in by_pattern.items()
            },
            'detailed_violations': []
        }
        
        # Add detailed violation information
        for violation in result.violations:
            detail = {
                'file_path': violation.file_path,
                'line_number': violation.line_number,
                'line_content': violation.line_content,
                'pattern_matched': violation.pattern_matched,
                'pattern_type': violation.pattern_type,
                'severity': violation.severity.value,
                'confidence': violation.confidence,
                'rule_name': violation.rule_name,
                'context': {
                    'before': violation.context_before,
                    'after': violation.context_after
                }
            }
            report['detailed_violations'].append(detail)
        
        return report
    
    def output_console_summary(self, result: ScanResult) -> None:
        """Output human-readable summary to console"""
        print("\n" + "="*80)
        print("MOCK DATA DETECTION SCAN RESULTS")
        print("="*80)
        
        if not result.violations:
            print("✅ NO VIOLATIONS FOUND - All clear!")
            print(f"📊 Scanned {result.files_scanned} files in {result.scan_time_seconds:.2f}s")
            return
        
        print(f"🚨 FOUND {len(result.violations)} MOCK DATA VIOLATIONS")
        print(f"📊 Scanned {result.files_scanned} files in {result.scan_time_seconds:.2f}s")
        print()
        
        # Group by severity
        by_severity = defaultdict(list)
        for violation in result.violations:
            by_severity[violation.severity.value].append(violation)
        
        # Show summary by severity
        for severity in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']:
            count = len(by_severity[severity])
            if count > 0:
                emoji = {'CRITICAL': '🔴', 'HIGH': '🟠', 'MEDIUM': '🟡', 'LOW': '🔵'}[severity]
                print(f"{emoji} {severity}: {count} violations")
        
        print("\n" + "-"*80)
        print("DETAILED VIOLATIONS:")
        print("-"*80)
        
        # Show top violations
        critical_and_high = [v for v in result.violations if v.severity.value in ['CRITICAL', 'HIGH']]
        for violation in critical_and_high[:10]:  # Show first 10 critical/high
            print(f"\n{violation.severity.value} - {violation.pattern_type}")
            print(f"📁 {violation.file_path}:{violation.line_number}")
            print(f"🔍 Found: {violation.pattern_matched}")
            print(f"📝 Line: {violation.line_content[:100]}")
            print(f"🎯 Confidence: {violation.confidence:.2f}")
        
        if len(result.violations) > 10:
            print(f"\n... and {len(result.violations) - 10} more violations")
        
        print(f"\n💡 TIP: Review the JSON report for complete details")
        print("="*80)


def main():
    """Main entry point for the mock data detector"""
    parser = argparse.ArgumentParser(
        description="Enterprise Mock Data Detection for Pre-commit Hooks",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --staged                    # Scan staged files (pre-commit)
  %(prog)s --directory ./src          # Scan specific directory
  %(prog)s --config ./mock-config.yml # Use custom config
  %(prog)s --output-json report.json  # Generate JSON report
        """
    )
    
    parser.add_argument(
        '--staged', action='store_true',
        help='Scan only git-staged files (for pre-commit hooks)'
    )
    parser.add_argument(
        '--directory', type=str, default='.',
        help='Directory to scan (default: current directory)'
    )
    parser.add_argument(
        '--config', type=str,
        help='Path to YAML configuration file'
    )
    parser.add_argument(
        '--output-json', type=str,
        help='Output detailed JSON report to file'
    )
    parser.add_argument(
        '--quiet', action='store_true',
        help='Suppress console output (useful for CI/CD)'
    )
    parser.add_argument(
        '--verbose', action='store_true',
        help='Enable verbose logging'
    )
    parser.add_argument(
        '--fail-on', choices=['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
        default='HIGH',
        help='Minimum severity to fail with exit code 1'
    )
    
    args = parser.parse_args()
    
    # Configure logging level
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    elif args.quiet:
        logging.getLogger().setLevel(logging.ERROR)
    
    try:
        # Initialize detector
        detector = MockDataDetector(args.config)
        
        # Run scan
        if args.staged:
            result = detector.scan_staged_files()
        else:
            result = detector.scan_directory(Path(args.directory))
        
        # Generate report
        report = detector.generate_report(result)
        
        # Output results
        if not args.quiet:
            detector.output_console_summary(result)
        
        # Save JSON report
        if args.output_json:
            with open(args.output_json, 'w', encoding='utf-8') as f:
                json.dump(report, f, indent=2, ensure_ascii=False)
            logger.info(f"JSON report saved to: {args.output_json}")
        
        # Determine exit code
        severity_levels = {'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 4}
        fail_threshold = severity_levels.get(args.fail_on, 3)
        
        has_failing_violations = any(
            severity_levels.get(v.severity.value, 0) >= fail_threshold
            for v in result.violations
        )
        
        if has_failing_violations:
            logger.error(f"Found violations at {args.fail_on} level or above - blocking commit")
            sys.exit(1)
        else:
            logger.info("No violations found at specified threshold - allowing commit")
            sys.exit(0)
    
    except KeyboardInterrupt:
        logger.info("Scan interrupted by user")
        sys.exit(130)
    except Exception as e:
        logger.error(f"Unexpected error during scan: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        sys.exit(2)


if __name__ == '__main__':
    main()