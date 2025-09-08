# Mock Data Detection Reference Guide

**Version**: 1.0.0  
**Author**: Gil Klainert  
**Created**: 2025-01-08  
**Last Updated**: 2025-01-08  

## Overview

This comprehensive reference guide documents the mock data detection system that enforces Olorin's **ZERO TOLERANCE policy for mock data**. The system uses advanced pattern matching, multi-threaded scanning, and intelligent analysis to identify and prevent mock data contamination in the enterprise fraud detection platform.

## Table of Contents

- [Pattern Catalog](#pattern-catalog)
- [Severity Level Definitions](#severity-level-definitions)
- [File Type Support Matrix](#file-type-support-matrix)
- [Configuration Parameters](#configuration-parameters)
- [API Documentation](#api-documentation)
- [Custom Pattern Development](#custom-pattern-development)
- [Performance Optimization](#performance-optimization)
- [Integration Guidelines](#integration-guidelines)

## Pattern Catalog

The detection system uses 248+ carefully crafted patterns organized by severity level and category. All patterns use Python regular expressions with case-insensitive matching.

### Critical Patterns (CRITICAL)

Critical patterns represent the highest risk of mock data contamination and **ALWAYS block commits**.

#### Core Mock Data Patterns

| Pattern | Description | Example Matches |
|---------|-------------|-----------------|
| `mockdata` | Direct mock data references | `mockdata.json`, `user_mockdata` |
| `mock_data` | Underscore-separated mock data | `mock_data.py`, `test_mock_data` |
| `fake_data` | Fake data declarations | `fake_data = {...}`, `load_fake_data()` |
| `dummy_data` | Dummy data structures | `dummy_data.csv`, `DUMMY_DATA_FILE` |
| `testdata` | Test data without proper separation | `testdata.json`, `USER_TESTDATA` |
| `sample_data` | Sample data in production code | `sample_data.db`, `load_sample_data()` |

#### Fraud Detection Specific Patterns

| Pattern | Description | Example Matches |
|---------|-------------|-----------------|
| `fraud.*mock` | Mock fraud data | `fraud_mock_data`, `fraudulent_mock` |
| `investigation.*mock` | Mock investigation data | `investigation_mock.json` |
| `evidence.*fake` | Fake evidence data | `evidence_fake.py`, `fake_evidence_db` |
| `transaction.*dummy` | Dummy transaction data | `transaction_dummy.csv` |
| `account.*fake` | Fake account information | `fake_account_data`, `account_fake.json` |
| `witness.*dummy` | Dummy witness information | `dummy_witness_statement` |

#### Financial Data Patterns

| Pattern | Description | Example Matches |
|---------|-------------|-----------------|
| `balance.*mock` | Mock account balances | `mock_balance_data`, `balance_mock.py` |
| `payment.*fake` | Fake payment data | `fake_payment_info`, `payment_fake.json` |
| `credit.*dummy` | Dummy credit information | `dummy_credit_score`, `credit_dummy` |
| `loan.*mock` | Mock loan data | `mock_loan_application`, `loan_mock` |

#### Compliance Data Patterns

| Pattern | Description | Example Matches |
|---------|-------------|-----------------|
| `audit.*fake` | Fake audit data | `fake_audit_trail`, `audit_fake.log` |
| `regulation.*mock` | Mock regulatory data | `mock_regulation_data` |
| `compliance.*dummy` | Dummy compliance data | `dummy_compliance_report` |
| `kyc.*fake` | Fake KYC data | `fake_kyc_verification` |

### High Severity Patterns (HIGH)

High patterns indicate likely mock data and typically block commits unless in test contexts.

#### Generic Mock Patterns

| Pattern | Description | Example Matches |
|---------|-------------|-----------------|
| `fake` | Generic fake references | `fake_user`, `fake.json` |
| `dummy` | Generic dummy references | `dummy_config`, `dummy.py` |
| `mock` | Generic mock references | `mock_service`, `mock.js` |
| `artificial.*data` | Artificial data references | `artificial_data_set` |
| `synthetic.*data` | Synthetic data references | `synthetic_data.csv` |
| `simulated.*data` | Simulated data references | `simulated_data.json` |

#### Test Data Patterns (Outside Test Contexts)

| Pattern | Description | Example Matches |
|---------|-------------|-----------------|
| `test.*data(?!.*spec)` | Test data outside specs | `test_data.json` (not in test files) |
| `example.*data` | Example data in production | `example_data.py` |
| `demo.*data` | Demo data references | `demo_data.json` |
| `placeholder.*data` | Placeholder data | `placeholder_data.csv` |

#### Development Patterns

| Pattern | Description | Example Matches |
|---------|-------------|-----------------|
| `temp.*data` | Temporary data files | `temp_data.json` |
| `draft.*data` | Draft data files | `draft_data.py` |
| `prototype.*data` | Prototype data | `prototype_data.csv` |
| `poc.*data` | Proof-of-concept data | `poc_data.json` |

### Medium Severity Patterns (MEDIUM)

Medium patterns may indicate mock data but allow more flexibility for legitimate use cases.

#### Development Artifacts

| Pattern | Description | Example Matches |
|---------|-------------|-----------------|
| `placeholder` | Placeholder values | `placeholder_text`, `PLACEHOLDER` |
| `template.*data` | Template data files | `template_data.json` |
| `skeleton.*data` | Skeleton data structures | `skeleton_data.py` |
| `boilerplate.*data` | Boilerplate data | `boilerplate_data.csv` |

#### Temporary Constructs

| Pattern | Description | Example Matches |
|---------|-------------|-----------------|
| `tmp.*data` | Temporary data references | `tmp_data.json` |
| `temporary.*data` | Temporary data files | `temporary_data.py` |
| `scratch.*data` | Scratch data files | `scratch_data.csv` |
| `working.*data` | Working data files | `working_data.json` |

### Low Severity Patterns (LOW)

Low patterns are informational and typically generate warnings rather than blocking commits.

#### Questionable Naming

| Pattern | Description | Example Matches |
|---------|-------------|-----------------|
| `lorem.*ipsum` | Lorem ipsum text | `lorem_ipsum.txt` |
| `foo.*bar` | Generic placeholder names | `foo_bar_data.json` |
| `todo.*data` | TODO data markers | `todo_data_cleanup` |
| `fixme.*data` | FIXME data markers | `fixme_data_validation` |

## Severity Level Definitions

### CRITICAL Severity

**Definition**: Patterns that indicate definitive mock data presence that poses immediate risk to production systems.

**Enforcement**: 
- **ALWAYS blocks commits** regardless of context
- No exceptions or bypass options
- Immediate alert to security team
- Mandatory remediation before code can be committed

**Impact Level**: 
- **Financial Risk**: High - Could affect fraud detection accuracy
- **Compliance Risk**: High - Could violate audit requirements  
- **Operational Risk**: High - Could corrupt production datasets
- **Security Risk**: High - Could create data integrity issues

**Examples**:
```python
# CRITICAL - Will block commit
user_data = mockdata.load_users()
fraud_analysis = load_fake_data("investigation.json")
```

### HIGH Severity

**Definition**: Patterns that strongly suggest mock data but may have legitimate uses in specific contexts.

**Enforcement**:
- Blocks commits in production branches (`main`, `production`, `release/*`)
- Allowed in development branches with warning
- Requires justification in commit message
- Subject to code review scrutiny

**Impact Level**:
- **Financial Risk**: Medium-High - Potential for fraud detection issues
- **Compliance Risk**: Medium - May require additional documentation
- **Operational Risk**: Medium - Could affect system reliability
- **Security Risk**: Medium - May create audit trail gaps

**Examples**:
```python
# HIGH - Blocks in production branches, warns in development
test_users = fake_user_generator()
dummy_transactions = create_dummy_data(100)
```

### MEDIUM Severity

**Definition**: Patterns that may indicate mock data but have common legitimate uses in development.

**Enforcement**:
- Generates warning in all contexts
- Logged for audit purposes
- Does not block commits
- Triggers additional scrutiny during code review

**Impact Level**:
- **Financial Risk**: Low-Medium - Unlikely to affect production
- **Compliance Risk**: Low - Generally acceptable with documentation
- **Operational Risk**: Low - Minimal production impact
- **Security Risk**: Low - Limited security implications

**Examples**:
```python
# MEDIUM - Warning only, does not block
config_template = load_template_data()
placeholder_text = "Enter your data here"
```

### LOW Severity

**Definition**: Patterns that are informational and indicate potential areas for cleanup or improvement.

**Enforcement**:
- Informational log entry only
- No blocking or warnings
- Aggregated for periodic review
- Used for code quality metrics

**Impact Level**:
- **Financial Risk**: None - No production impact
- **Compliance Risk**: None - No compliance implications
- **Operational Risk**: None - No operational impact
- **Security Risk**: None - No security implications

**Examples**:
```python
# LOW - Informational only
# TODO: Replace with real data source
lorem_text = "Lorem ipsum dolor sit amet..."
```

## File Type Support Matrix

The detection system supports scanning of multiple file types with optimized patterns for each.

### Fully Supported File Types

| Extension | Language/Type | Pattern Sets Applied | Performance | Notes |
|-----------|---------------|---------------------|-------------|-------|
| `.py` | Python | All patterns | Excellent | Full AST analysis support |
| `.js` | JavaScript | All patterns | Excellent | Supports ES6+ syntax |
| `.ts` | TypeScript | All patterns | Excellent | Type-aware scanning |
| `.jsx` | React JSX | All patterns | Excellent | Component-aware analysis |
| `.tsx` | React TypeScript | All patterns | Excellent | Combined React+TS support |
| `.json` | JSON | Data-focused patterns | Excellent | Structured data validation |
| `.yaml` | YAML | Configuration patterns | Very Good | Hierarchical analysis |
| `.yml` | YAML | Configuration patterns | Very Good | Same as .yaml |
| `.sql` | SQL | Data patterns | Very Good | Query-aware scanning |
| `.md` | Markdown | Documentation patterns | Good | Content analysis |
| `.html` | HTML | Web-specific patterns | Good | DOM-aware scanning |
| `.css` | CSS | Style-specific patterns | Good | Selector analysis |
| `.xml` | XML | Structured patterns | Good | Element analysis |
| `.properties` | Properties | Configuration patterns | Good | Key-value analysis |

### Partially Supported File Types

| Extension | Language/Type | Limitations | Notes |
|-----------|---------------|-------------|-------|
| `.java` | Java | Generic patterns only | Limited language-specific patterns |
| `.c` | C | Basic patterns | No advanced language features |
| `.cpp` | C++ | Basic patterns | No template analysis |
| `.php` | PHP | Web patterns | Limited PHP-specific detection |
| `.rb` | Ruby | Generic patterns | No Ruby-specific patterns |
| `.go` | Go | Basic patterns | Limited Go idiom support |
| `.rs` | Rust | Basic patterns | No Rust-specific patterns |
| `.sh` | Shell | Script patterns | Basic shell analysis |

### Configuration File Support

| File Type | Detection Focus | Special Handling |
|-----------|----------------|------------------|
| `docker-compose.yml` | Service configurations | Container name analysis |
| `Dockerfile` | Build configurations | Layer content scanning |
| `package.json` | Dependencies | Script analysis |
| `requirements.txt` | Python dependencies | Package name validation |
| `pyproject.toml` | Python project config | Tool configuration scanning |
| `.env` | Environment variables | Value pattern matching |
| `.gitignore` | Git exclusions | Path pattern analysis |
| `Makefile` | Build scripts | Target and command analysis |

### Excluded File Types

The following file types are automatically excluded from scanning:

| Category | Extensions | Reason |
|----------|------------|--------|
| Binary | `.exe`, `.dll`, `.so`, `.dylib` | Cannot contain text patterns |
| Images | `.jpg`, `.png`, `.gif`, `.svg` | Media files |
| Archives | `.zip`, `.tar`, `.gz`, `.7z` | Compressed content |
| Compiled | `.pyc`, `.class`, `.o` | Generated code |
| Databases | `.db`, `.sqlite`, `.mdb` | Binary data format |
| Logs | `.log` (in log dirs) | Runtime output |
| Temporary | `.tmp`, `.temp`, `.bak` | Temporary files |

## Configuration Parameters

The detection system provides extensive configuration options for customization and optimization.

### Core Detection Settings

```yaml
detection:
  # Pattern configuration
  patterns:
    critical: []      # Critical severity patterns
    high: []          # High severity patterns  
    medium: []        # Medium severity patterns
    low: []           # Low severity patterns
    
  # Pattern behavior
  case_sensitive: false           # Case-sensitive matching
  word_boundaries: true           # Require word boundaries
  multiline_support: true        # Multi-line pattern matching
  unicode_support: true          # Unicode character support
  
  # File type configuration
  file_types:
    include: []                   # Specific file types to scan
    exclude: []                   # File types to exclude
    
  # Exclusion configuration
  exclusions:
    directories: []               # Directories to exclude
    files: []                     # Specific files to exclude
    patterns: []                  # Pattern-based exclusions
    
  # Advanced settings
  max_file_size: 10485760        # Maximum file size (10MB)
  encoding_detection: true       # Automatic encoding detection
  binary_file_detection: true   # Skip binary files
```

### Performance Configuration

```yaml
performance:
  # Threading configuration
  thread_count: 4                # Number of worker threads
  max_threads: 8                # Maximum thread limit
  thread_pool_size: "auto"      # Auto-size thread pool
  
  # Memory management
  max_memory_per_thread: 256     # MB per thread
  memory_limit: 1024            # Total memory limit (MB)
  garbage_collection: true      # Enable GC optimization
  
  # Processing optimization
  batch_size: 100               # Files per batch
  streaming_mode: false         # Stream large files
  chunk_size: 1048576          # Chunk size for streaming (1MB)
  
  # Caching configuration
  enable_caching: true          # Enable result caching
  cache_size: 1000             # Number of cached results
  cache_ttl: 3600              # Cache TTL in seconds
  persistent_cache: false       # Persist cache across runs
  
  # Timeout settings
  timeout: 30                   # Overall timeout (seconds)
  file_timeout: 5              # Per-file timeout (seconds)
  pattern_timeout: 1           # Per-pattern timeout (seconds)
```

### Logging Configuration

```yaml
logging:
  # Basic logging settings
  level: "INFO"                 # Log level (DEBUG, INFO, WARNING, ERROR)
  format: "structured"          # Log format (plain, structured, json)
  
  # Output configuration
  console_output: true          # Enable console logging
  file_output: true            # Enable file logging
  log_file: ".mock-detection.log"  # Log file path
  
  # Audit logging
  audit_enabled: true           # Enable audit trail
  audit_file: ".audit.log"     # Audit log file
  audit_retention: 90          # Audit retention (days)
  
  # Performance logging
  performance_tracking: true    # Track performance metrics
  performance_file: ".performance.log"  # Performance log file
  benchmark_mode: false        # Enable benchmarking
  
  # Violation logging
  violation_logging: true       # Log all violations
  violation_file: ".violations.log"  # Violation log file
  include_file_content: false  # Include file snippets
  
  # Integration logging
  integration_logs: true       # Log integrations
  webhook_logs: true           # Log webhook calls
  api_logs: true               # Log API interactions
```

### Notification Configuration

```yaml
notifications:
  # Slack integration
  slack:
    enabled: false
    webhook_url: ""
    channel: "#dev-alerts"
    username: "Mock Detection Bot"
    
  # Email notifications
  email:
    enabled: false
    smtp_server: "smtp.company.com"
    smtp_port: 587
    username: ""
    password: ""
    from_address: "hooks@olorin.com"
    to_addresses: []
    
  # Webhook notifications
  webhook:
    enabled: false
    url: ""
    method: "POST"
    headers: {}
    timeout: 10
    
  # Custom notifications
  custom:
    enabled: false
    command: ""
    args: []
```

### Compliance Configuration

```yaml
compliance:
  # Audit requirements
  audit_enabled: true           # Enable compliance auditing
  audit_retention: 365         # Audit data retention (days)
  detailed_logging: true       # Comprehensive audit logs
  
  # Reporting requirements
  reporting_enabled: true      # Enable compliance reporting
  report_frequency: "daily"    # Reporting frequency
  report_recipients: []        # Report email addresses
  
  # Data protection
  anonymize_data: true         # Anonymize sensitive data in logs
  encryption_enabled: false   # Encrypt audit data
  secure_storage: false       # Use secure storage backend
  
  # Regulatory compliance
  gdpr_compliance: true        # GDPR compliance mode
  sox_compliance: false        # SOX compliance mode
  pci_compliance: false        # PCI compliance mode
```

## API Documentation

The mock detection system provides both command-line and programmatic APIs.

### Command Line Interface

#### Basic Usage

```bash
# Scan specific files
./scripts/git-hooks/detect-mock-data.py file1.py file2.js

# Scan with configuration
./scripts/git-hooks/detect-mock-data.py --config config.yml file.py

# Scan all files in directory
./scripts/git-hooks/detect-mock-data.py --recursive src/

# Output formats
./scripts/git-hooks/detect-mock-data.py --format json file.py
./scripts/git-hooks/detect-mock-data.py --format xml file.py
./scripts/git-hooks/detect-mock-data.py --format github file.py
```

#### Advanced Options

```bash
# Performance options
./scripts/git-hooks/detect-mock-data.py --threads 8 --timeout 60 file.py

# Filtering options  
./scripts/git-hooks/detect-mock-data.py --severity critical,high file.py
./scripts/git-hooks/detect-mock-data.py --exclude-patterns "test.*" src/

# Debugging options
./scripts/git-hooks/detect-mock-data.py --verbose --debug file.py
./scripts/git-hooks/detect-mock-data.py --benchmark file.py
```

### Python API

#### Basic Integration

```python
#!/usr/bin/env python3
from scripts.git_hooks.detect_mock_data import MockDataDetector
import yaml

# Initialize detector
detector = MockDataDetector()

# Load custom configuration
with open('config.yml', 'r') as f:
    config = yaml.safe_load(f)
detector.configure(config)

# Scan a single file
result = detector.scan_file('src/fraud_analysis.py')
print(f"Violations found: {len(result.violations)}")

# Scan multiple files
files = ['src/file1.py', 'src/file2.js', 'src/file3.py']
results = detector.scan_files(files)

# Process results
for file_path, result in results.items():
    if result.violations:
        print(f"File: {file_path}")
        for violation in result.violations:
            print(f"  - Line {violation.line}: {violation.pattern} ({violation.severity})")
```

#### Advanced Integration

```python
#!/usr/bin/env python3
from scripts.git_hooks.detect_mock_data import (
    MockDataDetector, 
    DetectionConfig,
    ViolationSeverity
)

# Custom configuration
config = DetectionConfig(
    thread_count=8,
    timeout=30,
    severity_levels=[ViolationSeverity.CRITICAL, ViolationSeverity.HIGH],
    custom_patterns={
        'critical': ['olorin.*mock', 'fraud.*fake'],
        'high': ['investigation.*dummy']
    },
    exclusions={
        'directories': ['test/', 'docs/'],
        'files': ['*.test.*', '*.spec.*']
    }
)

detector = MockDataDetector(config)

# Scan with callback for real-time processing
def violation_callback(file_path, violation):
    print(f"VIOLATION: {file_path}:{violation.line} - {violation.pattern}")
    
    # Send to monitoring system
    send_to_monitoring({
        'file': file_path,
        'line': violation.line,
        'pattern': violation.pattern,
        'severity': violation.severity.value,
        'timestamp': violation.timestamp
    })

results = detector.scan_directory('src/', callback=violation_callback)

# Generate comprehensive report
report = detector.generate_report(results, format='html')
with open('detection-report.html', 'w') as f:
    f.write(report)
```

#### Custom Pattern Integration

```python
#!/usr/bin/env python3
from scripts.git_hooks.detect_mock_data import PatternManager

# Initialize pattern manager
pattern_manager = PatternManager()

# Add custom patterns
pattern_manager.add_pattern(
    pattern=r'olorin.*mock.*data',
    severity='critical',
    description='Olorin-specific mock data pattern',
    category='fraud-detection'
)

# Bulk import patterns
patterns = {
    'critical': [
        {'pattern': 'investigation.*fake', 'description': 'Fake investigation data'},
        {'pattern': 'evidence.*mock', 'description': 'Mock evidence data'}
    ],
    'high': [
        {'pattern': 'witness.*dummy', 'description': 'Dummy witness data'}
    ]
}

pattern_manager.bulk_import(patterns)

# Validate patterns
issues = pattern_manager.validate_all()
if issues:
    print(f"Pattern validation issues: {issues}")

# Export patterns
pattern_manager.export('custom-patterns.yml', format='yaml')
```

### REST API

For integration with web applications and external systems:

#### Endpoints

```
POST /api/v1/scan
  - Scan provided files or content
  - Request body: multipart/form-data or JSON
  - Response: JSON with violation results

GET /api/v1/patterns
  - Retrieve current pattern configuration
  - Response: JSON with all patterns by severity

POST /api/v1/patterns
  - Add new detection patterns
  - Request body: JSON with pattern definitions
  - Response: Success/failure status

GET /api/v1/stats
  - Get detection system statistics
  - Response: JSON with performance and usage metrics

POST /api/v1/validate-config
  - Validate configuration file
  - Request body: JSON or YAML configuration
  - Response: Validation results
```

#### Example API Usage

```bash
# Scan files via API
curl -X POST http://localhost:5000/api/v1/scan \
  -H "Content-Type: application/json" \
  -d '{
    "files": [
      {"path": "src/fraud.py", "content": "user_data = mockdata.load()"}
    ],
    "config": {
      "severity_levels": ["critical", "high"]
    }
  }'

# Get current patterns
curl http://localhost:5000/api/v1/patterns | jq '.patterns.critical'

# Add custom pattern
curl -X POST http://localhost:5000/api/v1/patterns \
  -H "Content-Type: application/json" \
  -d '{
    "pattern": "investigation.*fake",
    "severity": "critical",
    "description": "Fake investigation data"
  }'
```

## Custom Pattern Development

### Pattern Design Guidelines

#### Effective Pattern Characteristics

1. **Specificity**: Patterns should be specific enough to avoid false positives
2. **Comprehensiveness**: Cover variations and common misspellings
3. **Performance**: Use efficient regex constructs
4. **Maintainability**: Clear, documented, and testable

#### Pattern Development Process

```python
#!/usr/bin/env python3
import re
from typing import List, Tuple

def develop_pattern(base_concept: str, variations: List[str]) -> str:
    """
    Develop a robust pattern from a base concept and variations.
    
    Args:
        base_concept: Core concept (e.g., "mock", "fake", "dummy")
        variations: List of variations and contexts
        
    Returns:
        Optimized regex pattern
    """
    
    # Start with base concept
    pattern_parts = [re.escape(base_concept)]
    
    # Add variations
    for variation in variations:
        pattern_parts.append(re.escape(variation))
    
    # Create alternation pattern
    alternation = '|'.join(pattern_parts)
    
    # Add word boundaries for precision
    pattern = rf'\b(?:{alternation})\b'
    
    # Test pattern efficiency
    test_pattern = re.compile(pattern, re.IGNORECASE)
    
    return pattern

# Example: Develop "mock" pattern family
mock_pattern = develop_pattern(
    base_concept="mock",
    variations=[
        "mockdata", "mock_data", "mock-data",
        "mocked", "mocking", "mockup",
        "mock_user", "mock_transaction", "mock_fraud"
    ]
)

print(f"Generated pattern: {mock_pattern}")
```

#### Pattern Testing Framework

```python
#!/usr/bin/env python3
import unittest
import re
from typing import List, Tuple

class PatternTestCase:
    def __init__(self, pattern: str, should_match: List[str], should_not_match: List[str]):
        self.pattern = pattern
        self.should_match = should_match
        self.should_not_match = should_not_match
        
    def validate(self) -> Tuple[bool, List[str]]:
        """Validate pattern against test cases"""
        compiled_pattern = re.compile(self.pattern, re.IGNORECASE)
        errors = []
        
        # Test positive cases
        for text in self.should_match:
            if not compiled_pattern.search(text):
                errors.append(f"Pattern should match '{text}' but doesn't")
                
        # Test negative cases  
        for text in self.should_not_match:
            if compiled_pattern.search(text):
                errors.append(f"Pattern should not match '{text}' but does")
                
        return len(errors) == 0, errors

# Define comprehensive test cases
pattern_tests = [
    PatternTestCase(
        pattern=r'\bmock.*data\b',
        should_match=[
            'mockdata.json',
            'mock_data.py', 
            'mock-data.csv',
            'load_mock_data()',
            'MOCK_DATA_FILE'
        ],
        should_not_match=[
            'mock.py',
            'data.json',
            'unmocked_data',
            'mock_function',
            'data_mock_up'  # "up" breaks word boundary
        ]
    )
]

# Run pattern tests
def run_pattern_tests():
    """Run all pattern validation tests"""
    for i, test in enumerate(pattern_tests):
        success, errors = test.validate()
        print(f"Test {i+1}: {'PASS' if success else 'FAIL'}")
        if errors:
            for error in errors:
                print(f"  - {error}")
```

### Performance Optimization Patterns

#### Efficient Pattern Construction

```python
#!/usr/bin/env python3
import re
import time
from typing import List

class PatternOptimizer:
    @staticmethod
    def optimize_alternation(patterns: List[str]) -> str:
        """
        Optimize alternation patterns for better performance.
        Orders patterns by specificity and frequency.
        """
        # Sort by length (longer patterns first for specificity)
        sorted_patterns = sorted(patterns, key=len, reverse=True)
        
        # Use non-capturing groups for efficiency
        alternation = '|'.join(f'(?:{p})' for p in sorted_patterns)
        
        return f'(?:{alternation})'
    
    @staticmethod
    def compile_with_cache(pattern: str) -> re.Pattern:
        """Compile pattern with caching for reuse"""
        if not hasattr(PatternOptimizer, '_pattern_cache'):
            PatternOptimizer._pattern_cache = {}
            
        if pattern not in PatternOptimizer._pattern_cache:
            PatternOptimizer._pattern_cache[pattern] = re.compile(
                pattern, 
                re.IGNORECASE | re.MULTILINE
            )
            
        return PatternOptimizer._pattern_cache[pattern]
    
    @staticmethod
    def benchmark_pattern(pattern: str, test_text: str, iterations: int = 1000) -> float:
        """Benchmark pattern performance"""
        compiled = PatternOptimizer.compile_with_cache(pattern)
        
        start_time = time.time()
        for _ in range(iterations):
            compiled.search(test_text)
        end_time = time.time()
        
        return (end_time - start_time) / iterations

# Example optimization
original_patterns = ['mock', 'fake', 'dummy', 'test', 'sample']
optimized_pattern = PatternOptimizer.optimize_alternation(original_patterns)

# Benchmark results
test_text = "This is a sample of mock data for testing fake scenarios"
original_time = PatternOptimizer.benchmark_pattern('mock|fake|dummy|test|sample', test_text)
optimized_time = PatternOptimizer.benchmark_pattern(optimized_pattern, test_text)

print(f"Original pattern time: {original_time:.6f}s")
print(f"Optimized pattern time: {optimized_time:.6f}s")
print(f"Performance improvement: {(original_time/optimized_time):.2f}x")
```

## Performance Optimization

### System Performance Metrics

The detection system is optimized for high-performance scanning with these benchmarks:

| Metric | Target | Typical Performance |
|--------|--------|-------------------|
| Files/second | 40+ | 45.2 files/sec |
| Lines/second | 10,000+ | 12,500 lines/sec |
| Memory usage | <512MB | ~280MB typical |
| CPU utilization | <80% | ~65% typical |
| Startup time | <2 seconds | ~1.3 seconds |
| Pattern compilation | <500ms | ~320ms |

### Performance Tuning Guidelines

#### Thread Configuration

```yaml
# Optimal thread configuration by system type
performance:
  # Development machines (4-8 cores)
  thread_count: 4
  max_threads: 6
  
  # CI/CD systems (2-4 cores, limited memory)
  thread_count: 2
  max_threads: 3
  memory_limit: 256
  
  # High-performance systems (16+ cores)
  thread_count: 8
  max_threads: 12
  parallel_processing: true
```

#### Memory Optimization

```yaml
performance:
  # Memory-constrained environments
  streaming_mode: true          # Process files in streams
  chunk_size: 524288           # 512KB chunks
  max_memory_per_thread: 64    # 64MB per thread
  garbage_collection: true     # Force GC
  
  # High-memory environments  
  streaming_mode: false        # Load full files
  chunk_size: 2097152         # 2MB chunks  
  max_memory_per_thread: 256   # 256MB per thread
  enable_caching: true        # Enable result caching
```

#### File Processing Optimization

```yaml
performance:
  # Large repositories (10,000+ files)
  batch_size: 200              # Larger batches
  enable_indexing: true        # File system indexing
  persistent_cache: true       # Cross-session caching
  
  # Small repositories (<1,000 files)
  batch_size: 50               # Smaller batches
  enable_indexing: false       # No indexing overhead
  persistent_cache: false      # No cache persistence
```

### Profiling and Monitoring

#### Performance Profiling Script

```python
#!/usr/bin/env python3
import cProfile
import pstats
import time
from scripts.git_hooks.detect_mock_data import MockDataDetector

def profile_detection_system():
    """Profile the detection system performance"""
    
    # Create profiler
    profiler = cProfile.Profile()
    
    # Initialize detector
    detector = MockDataDetector()
    
    # Profile execution
    profiler.enable()
    
    # Run detection on test files
    test_files = [
        'src/fraud_analysis.py',
        'src/investigation_tools.js',
        'src/compliance_checker.py',
        'src/data_validator.ts'
    ]
    
    results = detector.scan_files(test_files)
    
    profiler.disable()
    
    # Generate performance report
    stats = pstats.Stats(profiler)
    stats.sort_stats('cumulative')
    
    # Print top 20 functions by time
    print("Top 20 functions by cumulative time:")
    stats.print_stats(20)
    
    # Print pattern matching performance
    print("\nPattern matching performance:")
    stats.print_stats('.*pattern.*')
    
    # Print file I/O performance
    print("\nFile I/O performance:")
    stats.print_stats('.*file.*|.*read.*')

if __name__ == '__main__':
    profile_detection_system()
```

#### Real-time Monitoring

```python
#!/usr/bin/env python3
import psutil
import time
import json
from datetime import datetime
from threading import Thread
import queue

class PerformanceMonitor:
    def __init__(self, interval: float = 1.0):
        self.interval = interval
        self.monitoring = False
        self.metrics_queue = queue.Queue()
        
    def start_monitoring(self):
        """Start performance monitoring in background thread"""
        self.monitoring = True
        monitor_thread = Thread(target=self._monitor_loop)
        monitor_thread.daemon = True
        monitor_thread.start()
        
    def stop_monitoring(self):
        """Stop performance monitoring"""
        self.monitoring = False
        
    def _monitor_loop(self):
        """Main monitoring loop"""
        process = psutil.Process()
        
        while self.monitoring:
            try:
                # Collect metrics
                cpu_percent = process.cpu_percent()
                memory_info = process.memory_info()
                io_counters = process.io_counters()
                
                metrics = {
                    'timestamp': datetime.now().isoformat(),
                    'cpu_percent': cpu_percent,
                    'memory_mb': memory_info.rss / 1024 / 1024,
                    'memory_peak_mb': memory_info.peak_wss / 1024 / 1024 if hasattr(memory_info, 'peak_wss') else None,
                    'io_read_bytes': io_counters.read_bytes,
                    'io_write_bytes': io_counters.write_bytes,
                    'threads': process.num_threads()
                }
                
                self.metrics_queue.put(metrics)
                time.sleep(self.interval)
                
            except Exception as e:
                print(f"Monitoring error: {e}")
                break
    
    def get_metrics(self) -> list:
        """Get collected metrics"""
        metrics = []
        while not self.metrics_queue.empty():
            metrics.append(self.metrics_queue.get())
        return metrics
    
    def generate_report(self, metrics: list) -> dict:
        """Generate performance report from metrics"""
        if not metrics:
            return {}
            
        cpu_values = [m['cpu_percent'] for m in metrics]
        memory_values = [m['memory_mb'] for m in metrics]
        
        return {
            'monitoring_duration': len(metrics) * self.interval,
            'cpu_stats': {
                'avg': sum(cpu_values) / len(cpu_values),
                'max': max(cpu_values),
                'min': min(cpu_values)
            },
            'memory_stats': {
                'avg_mb': sum(memory_values) / len(memory_values),
                'max_mb': max(memory_values),
                'min_mb': min(memory_values)
            },
            'thread_count': metrics[-1]['threads'] if metrics else 0
        }

# Usage example
monitor = PerformanceMonitor(interval=0.5)
monitor.start_monitoring()

# Run detection
detector = MockDataDetector()
results = detector.scan_directory('src/')

monitor.stop_monitoring()
metrics = monitor.get_metrics()
report = monitor.generate_report(metrics)

print(json.dumps(report, indent=2))
```

## Integration Guidelines

### Git Hook Integration

#### Pre-commit Hook Implementation

```bash
#!/bin/bash
# .git/hooks/pre-commit

set -euo pipefail

# Configuration
DETECTOR_SCRIPT="scripts/git-hooks/detect-mock-data.py"
CONFIG_FILE="scripts/git-hooks/mock-detection-config.yml"
LOG_FILE=".pre-commit-hook.log"

# Logging function
log() {
    echo "[$(date -Iseconds)] $*" | tee -a "$LOG_FILE"
}

# Get list of staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

if [ -z "$STAGED_FILES" ]; then
    log "No staged files to check"
    exit 0
fi

# Run mock data detection
log "Running mock data detection on ${#STAGED_FILES} files"

python3 "$DETECTOR_SCRIPT" \
    --config "$CONFIG_FILE" \
    --staged-files \
    --format text \
    --log-level INFO \
    $STAGED_FILES

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    log "✅ Mock data detection passed"
    exit 0
else
    log "❌ Mock data detection failed with exit code $EXIT_CODE"
    echo ""
    echo "🚫 COMMIT BLOCKED: Mock data violations detected"
    echo "Please fix the violations above and retry your commit."
    echo ""
    echo "For emergency bypasses (use sparingly):"
    echo "  git commit --no-verify"
    echo ""
    exit $EXIT_CODE
fi
```

#### Pre-push Hook Implementation

```bash
#!/bin/bash
# .git/hooks/pre-push

set -euo pipefail

# Configuration
REMOTE="$1"
URL="$2"
DETECTOR_SCRIPT="scripts/git-hooks/detect-mock-data.py"
CONFIG_FILE="scripts/git-hooks/mock-detection-config.yml"

echo "🔍 Running comprehensive mock data scan before push..."

# Get all changed files since last push
CHANGED_FILES=$(git diff --name-only HEAD~1 HEAD)

if [ -z "$CHANGED_FILES" ]; then
    echo "✅ No changed files to scan"
    exit 0
fi

# Run comprehensive scan
python3 "$DETECTOR_SCRIPT" \
    --config "$CONFIG_FILE" \
    --comprehensive \
    --format text \
    --severity critical,high \
    $CHANGED_FILES

if [ $? -eq 0 ]; then
    echo "✅ Pre-push mock data scan completed successfully"
    exit 0
else
    echo "❌ Pre-push scan failed - push blocked"
    echo ""
    echo "Please resolve mock data violations before pushing."
    exit 1
fi
```

### CI/CD Integration

#### GitHub Actions Workflow

```yaml
name: Mock Data Detection

on:
  push:
    branches: [ main, develop, 'feature/*' ]
  pull_request:
    branches: [ main, develop ]

jobs:
  mock-data-detection:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout Code
      uses: actions/checkout@v4
      with:
        fetch-depth: 0
        
    - name: Setup Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
        cache: 'pip'
        
    - name: Install Dependencies
      run: |
        pip install pyyaml
        chmod +x scripts/git-hooks/detect-mock-data.py
        
    - name: Run Mock Data Detection
      run: |
        python3 scripts/git-hooks/detect-mock-data.py \
          --config scripts/git-hooks/mock-detection-config.yml \
          --recursive src/ \
          --format github \
          --severity critical,high
          
    - name: Generate Detection Report
      if: always()
      run: |
        python3 scripts/git-hooks/detect-mock-data.py \
          --config scripts/git-hooks/mock-detection-config.yml \
          --recursive . \
          --format json \
          --output detection-report.json
          
    - name: Upload Detection Report
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: mock-detection-report
        path: detection-report.json
        
    - name: Comment on PR
      if: github.event_name == 'pull_request' && failure()
      uses: actions/github-script@v6
      with:
        script: |
          const fs = require('fs');
          try {
            const report = JSON.parse(fs.readFileSync('detection-report.json', 'utf8'));
            const violations = report.violations || [];
            
            if (violations.length > 0) {
              let comment = '🚨 **Mock Data Violations Detected**\n\n';
              comment += `Found ${violations.length} violation(s):\n\n`;
              
              violations.slice(0, 10).forEach(v => {
                comment += `- **${v.file}:${v.line}**: ${v.pattern} (${v.severity})\n`;
              });
              
              if (violations.length > 10) {
                comment += `\n... and ${violations.length - 10} more violations.\n`;
              }
              
              comment += '\nPlease fix these violations before merging.';
              
              github.rest.issues.createComment({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: comment
              });
            }
          } catch (error) {
            console.error('Error reading detection report:', error);
          }
```

### IDE Integration

#### VS Code Extension Configuration

```json
// .vscode/settings.json
{
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": false,
  "python.linting.flake8Enabled": true,
  
  // Mock data detection integration
  "files.associations": {
    "*.mockignore": "gitignore"
  },
  
  // Custom task for mock data detection
  "tasks": {
    "version": "2.0.0",
    "tasks": [
      {
        "label": "Mock Data Detection",
        "type": "shell",
        "command": "python3",
        "args": [
          "scripts/git-hooks/detect-mock-data.py",
          "--config", "scripts/git-hooks/mock-detection-config.yml",
          "--file", "${file}"
        ],
        "group": "test",
        "presentation": {
          "echo": true,
          "reveal": "always",
          "focus": false,
          "panel": "shared"
        },
        "problemMatcher": {
          "pattern": {
            "regexp": "^(.*):(\\d+):\\s+(.*?)\\s+\\((CRITICAL|HIGH|MEDIUM|LOW)\\)$",
            "file": 1,
            "line": 2,
            "message": 3,
            "severity": 4
          }
        }
      }
    ]
  }
}
```

#### PyCharm Integration

```xml
<!-- .idea/externalTools.xml -->
<toolSet name="Mock Data Detection">
  <tool name="Check Current File" 
        description="Check current file for mock data violations"
        showInMainMenu="true" 
        showInEditor="true" 
        showInProject="false" 
        showInSearchPopup="false" 
        disabled="false" 
        useConsole="true" 
        showConsoleOnStdOut="true" 
        showConsoleOnStdErr="true" 
        synchronizeAfterRun="false">
    <exec>
      <option name="COMMAND" value="python3" />
      <option name="PARAMETERS" value="scripts/git-hooks/detect-mock-data.py --config scripts/git-hooks/mock-detection-config.yml --file $FilePath$" />
      <option name="WORKING_DIRECTORY" value="$ProjectFileDir$" />
    </exec>
  </tool>
  
  <tool name="Check All Files" 
        description="Check all files for mock data violations"
        showInMainMenu="true" 
        showInEditor="false" 
        showInProject="true" 
        showInSearchPopup="false" 
        disabled="false" 
        useConsole="true" 
        showConsoleOnStdOut="true" 
        showConsoleOnStdErr="true" 
        synchronizeAfterRun="false">
    <exec>
      <option name="COMMAND" value="python3" />
      <option name="PARAMETERS" value="scripts/git-hooks/detect-mock-data.py --config scripts/git-hooks/mock-detection-config.yml --recursive src/" />
      <option name="WORKING_DIRECTORY" value="$ProjectFileDir$" />
    </exec>
  </tool>
</toolSet>
```

---

## Conclusion

This reference guide provides comprehensive documentation for the Olorin mock data detection system. The system enforces **ZERO TOLERANCE for mock data** through:

- **248+ Detection Patterns** across 4 severity levels
- **Multi-language Support** for Python, JavaScript, TypeScript, and more
- **High-performance Scanning** at 45+ files per second
- **Flexible Configuration** for various environments and use cases
- **Comprehensive APIs** for programmatic integration
- **Enterprise Integration** with CI/CD, monitoring, and compliance systems

The detection system is a critical component of Olorin's data integrity and compliance framework, ensuring that fabricated data never compromises the fraud detection platform's accuracy and regulatory compliance.

---

*This reference guide is maintained by the Olorin DevOps team and updated regularly to reflect system enhancements and new pattern discoveries. For questions, improvements, or custom integrations, contact devops-team@olorin.com.*