# Threat Intelligence API Setup Guide

## Overview
This document describes the threat intelligence API integration setup for the Olorin fraud detection platform.

## API Keys Configuration

### AbuseIPDB
- **Status**: ✅ Configured and Working
- **Secret Name**: `ABUSEIPDB_API_KEY`
- **Test Result**: Successfully connected and verified with Google DNS (8.8.8.8)
- **Setup Date**: 2025-09-06

### VirusTotal
- **Status**: ⏳ Pending Configuration
- **Secret Name**: `VIRUSTOTAL_API_KEY`
- **Setup Instructions**: Run `./scripts/setup-threat-intel-secrets.sh`

### Shodan
- **Status**: ⏳ Pending Configuration  
- **Secret Name**: `SHODAN_API_KEY`
- **Setup Instructions**: Run `./scripts/setup-threat-intel-secrets.sh`

## Setup Instructions

### 1. Add API Keys to Firebase Secrets

Run the setup script:
```bash
./scripts/setup-threat-intel-secrets.sh
```

Or add individual keys:
```bash
# For VirusTotal
echo "YOUR_VIRUSTOTAL_API_KEY" | firebase functions:secrets:set VIRUSTOTAL_API_KEY

# For Shodan
echo "YOUR_SHODAN_API_KEY" | firebase functions:secrets:set SHODAN_API_KEY
```

### 2. Verify Configuration

Test individual API access:
```bash
# Test AbuseIPDB
cd olorin-server
poetry run python scripts/testing/test_abuseipdb_access.py

# Test all threat intelligence tools
poetry run python scripts/testing/test_threat_intelligence_integration.py
```

### 3. Restart Services

After adding API keys, restart the Olorin services:
```bash
npm run olorin restart
```

## Code Improvements Implemented

### 1. Entity ID vs IP Address Resolution
- **Problem**: Entity IDs (e.g., "K1F6HIIGBVHH20TX") were being passed to threat intelligence tools instead of IP addresses
- **Solution**: 
  - Added `get_ip_addresses()` method to `AutonomousInvestigationContext`
  - Updated network agent objectives to explicitly extract IP addresses from context
  - Added validation to prevent entity IDs from being treated as IPs

### 2. Missing Model Attributes
- **Problem**: VirusTotalDomainResponse was missing required fields
- **Solution**: Added missing fields to the Pydantic model:
  - `tags`: List[str]
  - `last_modification_date`: Optional[datetime]
  - `last_analysis_stats`: Optional[VirusTotalAnalysisStats]
  - `popularity_ranks`: Dict[str, int]
  - `total_votes`: Dict[str, int]

### 3. RAG Enhancement Issues
- **Problem**: `specific_objectives` was undefined in RAG-enhanced investigation
- **Solution**: Added parameter to `_execute_enhanced_investigation` method and updated calls

### 4. Async/Await Corrections
- **Problem**: Synchronous `get_firebase_secret()` was being awaited
- **Solution**: Removed `await` keyword from all calls to this synchronous function

## Testing

### Unit Tests
```bash
cd olorin-server
poetry run pytest test/unit/test_threat_intelligence_tools.py -v
```

### Integration Tests
```bash
# Run autonomous investigation tests with threat intelligence
./scripts/run-autonomous-investigation.sh --scenario device_spoofing --verbose
```

### Mock Mode Testing
```bash
# Test with mock responses (no API calls)
poetry run python scripts/testing/unified_autonomous_test_runner.py \
  --scenario device_spoofing \
  --mode mock \
  --csv-file /Users/gklainert/Documents/olorin/transaction_dataset.csv \
  --csv-limit 1
```

## Troubleshooting

### "API key not found" Error
1. Verify the secret exists: `firebase functions:secrets:access SECRET_NAME`
2. Clear cache: `rm -rf /tmp/firebase_secrets_cache`
3. Check Firebase authentication: `firebase login`
4. Restart services: `npm run olorin restart`

### Entity ID Being Passed Instead of IP
1. Ensure data sources include IP addresses in the investigation context
2. Check that the LLM context includes the IP extraction instructions
3. Verify the network agent objectives include IP extraction guidance

## API Key Sources

- **AbuseIPDB**: https://www.abuseipdb.com/register
- **VirusTotal**: https://www.virustotal.com/gui/join-us  
- **Shodan**: https://account.shodan.io/register

## Security Notes

- All API keys are stored in Firebase Secret Manager
- Keys are accessed via Firebase CLI, not environment variables
- No API keys should be committed to the repository
- Use the provided scripts to manage secrets securely