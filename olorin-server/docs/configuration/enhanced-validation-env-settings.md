# Enhanced Validation Configuration

## Environment Variables for Investigation Validation

Add these environment variables to your `.env` file to configure the enhanced validation system:

```bash
# ========================================
# ENHANCED VALIDATION SETTINGS
# ========================================

# Enable/disable LLM verification (true/false)
LLM_VERIFICATION_ENABLED=true

# Verification model selection (uses cost-effective models by default)
# Available models: 
# - gpt-3.5-turbo (recommended for cost-effectiveness and OpenAI compatibility)
# - gemini-1.5-flash (Google alternative)
# - claude-3-haiku-20240307 (fast and affordable)
LLM_VERIFICATION_MODEL=gpt-3.5-turbo

# Verification threshold (0-100, percentage)
# Investigations scoring below this threshold will be marked as failed
VERIFICATION_THRESHOLD_DEFAULT=85

# Minimum evidence threshold
# Number of data sources/tools that must provide evidence for valid investigation
MIN_EVIDENCE_THRESHOLD=3

# Maximum allowed risk score delta
# Maximum difference between initial and final risk scores (0.0-1.0)
# Prevents dramatic risk changes without proper evidence
MAX_RISK_DELTA_THRESHOLD=0.5

# Verification sampling percentage (0-100)
# Percentage of investigations to verify (for gradual rollout)
VERIFICATION_SAMPLE_PERCENT=100

# Verification mode (shadow/blocking)
# - shadow: Log validation failures but don't block investigations
# - blocking: Fail investigations that don't pass validation
VERIFICATION_MODE=blocking

# Maximum retries for verification
VERIFICATION_MAX_RETRIES=1
```

## Configuration Explanation

### Core Settings

1. **LLM_VERIFICATION_ENABLED**: Master switch for the enhanced validation system
   - Set to `true` to enable comprehensive validation
   - Set to `false` to use basic validation only

2. **LLM_VERIFICATION_MODEL**: The LLM model used for verification
   - `gpt-3.5-turbo`: Most cost-effective, good performance (default)
   - `gemini-1.5-flash`: Google alternative
   - `claude-3-haiku-20240307`: Fast Anthropic model
   - Choose based on your API availability and cost requirements

3. **VERIFICATION_THRESHOLD_DEFAULT**: Pass/fail threshold
   - Investigations must score above this percentage to pass
   - Default: 85% (reasonable balance between strictness and flexibility)
   - Increase for stricter validation, decrease for more lenient

### Data Quality Settings

4. **MIN_EVIDENCE_THRESHOLD**: Minimum evidence sources required
   - Ensures investigations have sufficient data before making decisions
   - Default: 3 (at least 3 tools/agents must provide evidence)
   - Prevents false negatives from insufficient data

5. **MAX_RISK_DELTA_THRESHOLD**: Maximum allowed risk score change
   - Prevents suspicious risk score changes (e.g., 0.99 → 0.00)
   - Default: 0.5 (50% change maximum)
   - Critical for detecting data extraction failures

### Operational Settings

6. **VERIFICATION_SAMPLE_PERCENT**: Gradual rollout control
   - Percentage of investigations to verify
   - Useful for testing validation without affecting all investigations
   - Default: 100 (verify all investigations)

7. **VERIFICATION_MODE**: Enforcement mode
   - `shadow`: Log issues but don't fail investigations (monitoring mode)
   - `blocking`: Fail investigations that don't pass validation (enforcement mode)
   - Start with `shadow` for testing, switch to `blocking` for production

## Example Configuration

### Development Environment
```bash
LLM_VERIFICATION_ENABLED=true
LLM_VERIFICATION_MODEL=gpt-3.5-turbo
VERIFICATION_THRESHOLD_DEFAULT=75
MIN_EVIDENCE_THRESHOLD=2
MAX_RISK_DELTA_THRESHOLD=0.6
VERIFICATION_MODE=shadow
```

### Production Environment
```bash
LLM_VERIFICATION_ENABLED=true
LLM_VERIFICATION_MODEL=gpt-3.5-turbo
VERIFICATION_THRESHOLD_DEFAULT=85
MIN_EVIDENCE_THRESHOLD=3
MAX_RISK_DELTA_THRESHOLD=0.5
VERIFICATION_MODE=blocking
```

### Testing Environment
```bash
LLM_VERIFICATION_ENABLED=true
LLM_VERIFICATION_MODEL=claude-3-haiku-20240307
VERIFICATION_THRESHOLD_DEFAULT=90
MIN_EVIDENCE_THRESHOLD=4
MAX_RISK_DELTA_THRESHOLD=0.3
VERIFICATION_MODE=blocking
```

## Validation Failure Scenarios

The enhanced validation will fail investigations in these cases:

1. **Data Extraction Failure**
   - Snowflake returns string data instead of structured JSON
   - Agents fail to parse data properly
   - No data successfully extracted

2. **Risk Score Inconsistency**
   - Initial risk: 0.99, Final risk: 0.00 (suspicious clearance)
   - Risk delta exceeds MAX_RISK_DELTA_THRESHOLD
   - Missing risk scores

3. **Insufficient Evidence**
   - Fewer than MIN_EVIDENCE_THRESHOLD sources provide data
   - Agents return "no_results" or "failed" status
   - Empty or minimal findings

4. **LLM Verification Failure**
   - Verification score below VERIFICATION_THRESHOLD_DEFAULT
   - Inconsistent findings across agents
   - Quality assessment fails

## Monitoring and Debugging

To monitor validation performance:

1. Check logs for validation results:
   ```bash
<<<<<<< HEAD
   grep "Enhanced validation" logs/autonomous_investigation_*.log
=======
   grep "Enhanced validation" logs/structured_investigation_*.log
>>>>>>> 001-modify-analyzer-method
   ```

2. Look for critical issues:
   ```bash
<<<<<<< HEAD
   grep "FAILED validation" logs/autonomous_investigation_*.log
=======
   grep "FAILED validation" logs/structured_investigation_*.log
>>>>>>> 001-modify-analyzer-method
   ```

3. Review validation statistics:
   ```bash
<<<<<<< HEAD
   grep "Validation.*Score=" logs/autonomous_investigation_*.log
=======
   grep "Validation.*Score=" logs/structured_investigation_*.log
>>>>>>> 001-modify-analyzer-method
   ```

## Integration with Test Runner

The test runner automatically uses enhanced validation when available:

```python
# The test runner will:
1. Check if enhanced validation is available
2. Use LLM_VERIFICATION_MODEL from .env for LLM verification
3. Apply all thresholds and rules
4. Fail investigations that don't pass validation
5. Provide detailed failure reasons and recommendations
```

## Troubleshooting

### Issue: All investigations failing validation
- Lower VERIFICATION_THRESHOLD_DEFAULT temporarily
- Check MIN_EVIDENCE_THRESHOLD is reasonable
- Ensure LLM_VERIFICATION_MODEL API key is configured

### Issue: Suspicious investigations passing
- Increase VERIFICATION_THRESHOLD_DEFAULT
- Decrease MAX_RISK_DELTA_THRESHOLD
- Switch VERIFICATION_MODE to "blocking"

### Issue: LLM verification not running
- Check LLM_VERIFICATION_ENABLED=true
- Verify API key for LLM_VERIFICATION_MODEL is set
- Check model name is valid

## Cost Optimization

To minimize verification costs:

1. Use `gemini-1.5-flash` (most cost-effective)
2. Set VERIFICATION_SAMPLE_PERCENT < 100 for sampling
3. Use VERIFICATION_MODE=shadow initially
4. Only verify high-risk investigations

## Future Enhancements

Planned improvements:
- Dynamic threshold adjustment based on entity type
- Historical validation performance tracking
- Multi-model consensus verification
- Automated threshold tuning based on false positive/negative rates