#!/usr/bin/env python3
"""
Test Suite for Mock Data Detection Script

This comprehensive test suite validates the mock data detector's ability to:
- Detect various types of mock data patterns
- Handle false positives correctly
- Process different file types
- Generate accurate reports
- Perform efficiently on large codebases

Author: Gil Klainert
Created: 2025-09-08
"""

import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path
from typing import Dict, List

class MockDataDetectorTests(unittest.TestCase):
    """Test suite for the mock data detector"""
    
    def setUp(self):
        """Set up test environment"""
        self.detector_script = Path(__file__).parent / "detect-mock-data.py"
        self.test_dir = None
    
    def tearDown(self):
        """Clean up test environment"""
        if self.test_dir and Path(self.test_dir).exists():
            import shutil
            shutil.rmtree(self.test_dir)
    
    def create_test_files(self, files: Dict[str, str]) -> str:
        """Create temporary test files"""
        self.test_dir = tempfile.mkdtemp(prefix="mock_detector_test_")
        
        for file_path, content in files.items():
            full_path = Path(self.test_dir) / file_path
            full_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(content)
        
        return self.test_dir
    
    def run_detector(self, directory: str = None, additional_args: List[str] = None) -> Dict:
        """Run the detector and return parsed JSON results"""
        args = ['python3', str(self.detector_script)]
        
        if directory:
            args.extend(['--directory', directory])
        
        if additional_args:
            args.extend(additional_args)
        
        # Generate temporary JSON report
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json_path = f.name
        
        args.extend(['--output-json', json_path, '--quiet'])
        
        try:
            result = subprocess.run(args, capture_output=True, text=True)
            
            # Load JSON report
            with open(json_path, 'r', encoding='utf-8') as f:
                report = json.load(f)
            
            return {
                'report': report,
                'returncode': result.returncode,
                'stdout': result.stdout,
                'stderr': result.stderr
            }
        
        finally:
            if os.path.exists(json_path):
                os.unlink(json_path)
    
    def test_explicit_mock_variables(self):
        """Test detection of explicit mock variable patterns"""
        test_files = {
            'test_file.py': '''
mock_user = {"name": "Test User"}
Mock_Data = {"email": "test@example.com"}
MOCK_API_KEY = "test-key-12345"
placeholder_config = {"url": "http://example.com"}
demo_settings = {"debug": True}
fake_response = {"status": "ok"}
dummy_data = [1, 2, 3]
sample_user = {"id": 123}
test_variable = "some value"
example_config = {"host": "localhost"}
            '''
        }
        
        test_dir = self.create_test_files(test_files)
        result = self.run_detector(test_dir)
        
        # Should find violations for all mock patterns
        self.assertEqual(result['returncode'], 1)  # Should fail due to violations
        violations = result['report']['detailed_violations']
        
        # Should detect multiple mock patterns
        self.assertGreater(len(violations), 5)
        
        # Check for specific patterns
        patterns_found = [v['pattern_type'] for v in violations]
        self.assertIn('Variable assignment', patterns_found)
        self.assertIn('Placeholder variable', patterns_found)
        self.assertIn('Demo variable', patterns_found)
        self.assertIn('Fake data variable', patterns_found)
    
    def test_implicit_data_patterns(self):
        """Test detection of implicit mock data patterns"""
        test_files = {
            'user_data.js': '''
const user = {
    email: "john.doe@example.com",
    phone: "123-456-7890",
    name: "John Doe",
    address: "123 Main St, Anytown, AS"
};

const testCard = "4111-1111-1111-1111";
const website = "http://example.com/api";
            '''
        }
        
        test_dir = self.create_test_files(test_files)
        result = self.run_detector(test_dir)
        
        self.assertEqual(result['returncode'], 1)
        violations = result['report']['detailed_violations']
        
        # Should detect various implicit patterns
        pattern_types = [v['pattern_type'] for v in violations]
        self.assertIn('Mock email domain', pattern_types)
        self.assertIn('Mock phone number', pattern_types)
        self.assertIn('Generic test name', pattern_types)
        self.assertIn('Generic address', pattern_types)
        self.assertIn('Test Visa card', pattern_types)
        self.assertIn('Mock URL', pattern_types)
    
    def test_development_artifacts(self):
        """Test detection of development artifacts"""
        test_files = {
            'config.py': '''
API_KEY = "test-api-key-12345"
DATABASE_URL = "postgresql://localhost/test_db"
SECRET_KEY = "changeme"
password = "password123"
DEMO_API_TOKEN = "demo-token-abcdef"
            '''
        }
        
        test_dir = self.create_test_files(test_files)
        result = self.run_detector(test_dir)
        
        self.assertEqual(result['returncode'], 1)
        violations = result['report']['detailed_violations']
        
        # Should detect development artifacts
        pattern_types = [v['pattern_type'] for v in violations]
        self.assertIn('Test API credential', pattern_types)
        self.assertIn('Test database', pattern_types)
        self.assertIn('Weak/test password', pattern_types)
    
    def test_legitimate_test_files_excluded(self):
        """Test that legitimate test files are excluded"""
        test_files = {
            'test/test_user.py': '''
def test_user_creation():
    mock_user = {"name": "Test User"}
    fake_email = "test@example.com"
    assert create_user(mock_user, fake_email)
            ''',
            'src/tests/user_spec.js': '''
describe('User', () => {
    it('should create user', () => {
        const mockData = {email: "test@example.com"};
        expect(createUser(mockData)).toBeTruthy();
    });
});
            ''',
            'production/user.py': '''
def create_user(data):
    # This should be flagged
    mock_user = {"default": "value"}
    return User(data)
            '''
        }
        
        test_dir = self.create_test_files(test_files)
        result = self.run_detector(test_dir)
        
        violations = result['report']['detailed_violations']
        
        # Should only flag the production file, not test files
        flagged_files = set(v['file_path'] for v in violations)
        self.assertTrue(any('production/user.py' in path for path in flagged_files))
        self.assertFalse(any('test/' in path for path in flagged_files))
    
    def test_file_type_filtering(self):
        """Test that only supported file types are scanned"""
        test_files = {
            'code.py': 'mock_data = "test"',
            'config.json': '{"mock_key": "test"}',
            'docs.md': 'Example: mock_user = "test"',
            'binary.jpg': b'\x89\x50\x4E\x47\x0D\x0A\x1A\x0A',  # Binary content
            'unsupported.xyz': 'mock_data = "should not be scanned"'
        }
        
        test_dir = self.create_test_files(test_files)
        result = self.run_detector(test_dir)
        
        # Should scan supported files but not unsupported ones
        scanned_files = set()
        for violation in result['report']['detailed_violations']:
            scanned_files.add(Path(violation['file_path']).name)
        
        # Should include supported extensions
        supported_files = {'code.py', 'config.json', 'docs.md'}
        flagged_files = set(Path(v['file_path']).name for v in result['report']['detailed_violations'])
        
        # Should find violations in supported files
        self.assertTrue(flagged_files.intersection(supported_files))
        # Should not scan unsupported file
        self.assertNotIn('unsupported.xyz', flagged_files)
    
    def test_confidence_scoring(self):
        """Test confidence scoring for detections"""
        test_files = {
            'high_confidence.py': '''
# Clear violation - should have high confidence
mock_api_key = "sk-test-12345"
fake_user = {"email": "test@fake.com"}
            ''',
            'low_confidence.py': '''
# In documentation context - should have lower confidence
# Example usage:
# mock_data = {"example": "value"}
def example_function():
    """
    This function shows how to use mock data in tests.
    mock_user = {"name": "Sample User"}
    """
    pass
            '''
        }
        
        test_dir = self.create_test_files(test_files)
        result = self.run_detector(test_dir)
        
        violations = result['report']['detailed_violations']
        
        # Find violations from each file
        high_conf_violations = [v for v in violations if 'high_confidence.py' in v['file_path']]
        low_conf_violations = [v for v in violations if 'low_confidence.py' in v['file_path']]
        
        if high_conf_violations and low_conf_violations:
            # High confidence violations should have higher confidence scores
            max_high = max(v['confidence'] for v in high_conf_violations)
            max_low = max(v['confidence'] for v in low_conf_violations)
            
            self.assertGreater(max_high, max_low)
    
    def test_severity_levels(self):
        """Test that different patterns have appropriate severity levels"""
        test_files = {
            'severity_test.py': '''
# CRITICAL - API keys and credentials
mock_api_key = "test-key"
fake_credit_card = "4111-1111-1111-1111"

# HIGH - Implicit data patterns
user_email = "test@example.com"
phone = "555-0123"

# MEDIUM - Lorem ipsum and examples
lorem_text = "Lorem ipsum dolor sit amet"
example_var = "sample"
            '''
        }
        
        test_dir = self.create_test_files(test_files)
        result = self.run_detector(test_dir)
        
        violations = result['report']['detailed_violations']
        severities = [v['severity'] for v in violations]
        
        # Should have multiple severity levels
        self.assertIn('CRITICAL', severities)
        self.assertIn('HIGH', severities)
        
        # Check severity distribution
        severity_counts = result['report']['summary_by_severity']
        self.assertGreater(severity_counts['CRITICAL'], 0)
        self.assertGreater(severity_counts['HIGH'], 0)
    
    def test_performance_metrics(self):
        """Test performance metrics collection"""
        test_files = {
            f'file_{i}.py': f'mock_data_{i} = "test"' for i in range(10)
        }
        
        test_dir = self.create_test_files(test_files)
        result = self.run_detector(test_dir)
        
        metrics = result['report']['scan_metadata']['performance_metrics']
        
        # Should have performance metrics
        self.assertIn('files_per_second', metrics)
        self.assertIn('patterns_checked', metrics)
        self.assertGreater(metrics['files_per_second'], 0)
        self.assertGreater(metrics['patterns_checked'], 0)
    
    def test_json_report_structure(self):
        """Test JSON report structure and completeness"""
        test_files = {
            'sample.py': 'mock_data = {"test": "value"}'
        }
        
        test_dir = self.create_test_files(test_files)
        result = self.run_detector(test_dir)
        
        report = result['report']
        
        # Check required top-level keys
        required_keys = [
            'scan_metadata',
            'summary_by_severity', 
            'violations_by_file',
            'violations_by_pattern',
            'detailed_violations'
        ]
        
        for key in required_keys:
            self.assertIn(key, report)
        
        # Check metadata structure
        metadata = report['scan_metadata']
        self.assertIn('timestamp', metadata)
        self.assertIn('total_violations', metadata)
        self.assertIn('files_scanned', metadata)
        self.assertIn('scan_time_seconds', metadata)
        
        # Check detailed violations structure
        if report['detailed_violations']:
            violation = report['detailed_violations'][0]
            required_violation_keys = [
                'file_path', 'line_number', 'line_content',
                'pattern_matched', 'pattern_type', 'severity',
                'confidence', 'rule_name', 'context'
            ]
            
            for key in required_violation_keys:
                self.assertIn(key, violation)
    
    def test_exit_codes(self):
        """Test appropriate exit codes for different scenarios"""
        # Test clean scan (no violations)
        clean_files = {
            'clean.py': '''
def legitimate_function():
    user_data = get_user_from_database()
    return process_user(user_data)
            '''
        }
        
        test_dir = self.create_test_files(clean_files)
        result = self.run_detector(test_dir)
        
        # Should exit with 0 for clean scan
        self.assertEqual(result['returncode'], 0)
        self.assertEqual(result['report']['scan_metadata']['total_violations'], 0)
        
        # Test scan with violations
        violation_files = {
            'violations.py': 'mock_user = {"name": "Test"}'
        }
        
        test_dir = self.create_test_files(violation_files)
        result = self.run_detector(test_dir)
        
        # Should exit with 1 for violations
        self.assertEqual(result['returncode'], 1)
        self.assertGreater(result['report']['scan_metadata']['total_violations'], 0)
    
    def test_whitelist_functionality(self):
        """Test .mockignore whitelist functionality"""
        test_files = {
            '.mockignore': '''
# Whitelist legitimate test patterns
.*/legitimate_test.py
            ''',
            'legitimate_test.py': '''
# This should be whitelisted
mock_data = {"test": "value"}
fake_user = {"name": "Test"}
            ''',
            'violation.py': '''
# This should be flagged
mock_data = {"test": "value"}
            '''
        }
        
        test_dir = self.create_test_files(test_files)
        result = self.run_detector(test_dir)
        
        violations = result['report']['detailed_violations']
        flagged_files = set(Path(v['file_path']).name for v in violations)
        
        # Should not flag whitelisted file
        self.assertNotIn('legitimate_test.py', flagged_files)
        # Should still flag non-whitelisted violations
        self.assertIn('violation.py', flagged_files)


class PerformanceTests(unittest.TestCase):
    """Performance tests for the mock data detector"""
    
    def test_large_file_handling(self):
        """Test handling of large files"""
        # Create a large file with mock data
        large_content = '\n'.join([
            f'line_{i} = "normal content"' if i % 100 != 0 
            else f'mock_data_{i} = "test content"'
            for i in range(1000)
        ])
        
        test_files = {'large_file.py': large_content}
        
        with tempfile.TemporaryDirectory() as test_dir:
            file_path = Path(test_dir) / 'large_file.py'
            with open(file_path, 'w') as f:
                f.write(large_content)
            
            detector_script = Path(__file__).parent / "detect-mock-data.py"
            
            # Should complete scan within reasonable time
            import time
            start_time = time.time()
            
            result = subprocess.run([
                'python3', str(detector_script),
                '--directory', test_dir,
                '--quiet'
            ], capture_output=True)
            
            scan_time = time.time() - start_time
            
            # Should complete within 10 seconds
            self.assertLess(scan_time, 10.0)
            # Should find some violations
            self.assertEqual(result.returncode, 1)
    
    def test_many_files_performance(self):
        """Test performance with many files"""
        with tempfile.TemporaryDirectory() as test_dir:
            # Create 50 files with mock data
            for i in range(50):
                file_path = Path(test_dir) / f'file_{i}.py'
                with open(file_path, 'w') as f:
                    f.write(f'mock_data_{i} = "test"\nlegitimate_var = "value"')
            
            detector_script = Path(__file__).parent / "detect-mock-data.py"
            
            # Should complete scan efficiently
            import time
            start_time = time.time()
            
            result = subprocess.run([
                'python3', str(detector_script),
                '--directory', test_dir,
                '--quiet'
            ], capture_output=True)
            
            scan_time = time.time() - start_time
            
            # Should complete within reasonable time (2 seconds per file max)
            self.assertLess(scan_time, 100.0)
            
            # Should achieve reasonable throughput (at least 1 file per second)
            files_per_second = 50 / scan_time
            self.assertGreater(files_per_second, 1.0)


def run_integration_test():
    """Run integration test with the actual codebase"""
    detector_script = Path(__file__).parent / "detect-mock-data.py"
    
    print("Running integration test on current codebase...")
    
    # Run detector on current directory
    result = subprocess.run([
        'python3', str(detector_script),
        '--directory', '.',
        '--fail-on', 'CRITICAL'
    ], capture_output=True, text=True)
    
    print(f"Exit code: {result.returncode}")
    print(f"Stdout: {result.stdout}")
    
    if result.stderr:
        print(f"Stderr: {result.stderr}")
    
    return result.returncode == 0


if __name__ == '__main__':
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == '--integration':
        # Run integration test
        success = run_integration_test()
        sys.exit(0 if success else 1)
    else:
        # Run unit tests
        unittest.main()