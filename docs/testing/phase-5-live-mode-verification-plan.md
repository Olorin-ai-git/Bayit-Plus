# Phase 5 LIVE Mode Verification Plan

**Author**: Gil Klainert  
**Date**: 2025-01-09  
**Purpose**: Comprehensive verification of all 5 phases in LIVE mode  
**Status**: AWAITING USER APPROVAL

## 🚨 CRITICAL REQUIREMENTS

**LIVE MODE COSTS REAL MONEY** - This verification requires explicit user approval before execution.

**MANDATORY APPROVAL NEEDED**: User must explicitly approve LIVE mode testing before any execution.

## 📋 Verification Scope

### **Phase 1: Investigation Initialization**
- ✅ Entity validation and setup
- ✅ Investigation ID generation  
- ✅ State initialization

### **Phase 2: Orchestrator Analysis**
- ✅ LangGraph state management
- ✅ Investigation context building
- ✅ Phase progression logic

### **Phase 3: Snowflake Data Retrieval**
- 🔍 **CRITICAL**: Real Snowflake database queries
- 🔍 **CRITICAL**: SQL injection prevention
- 🔍 **CRITICAL**: Data format validation

### **Phase 4: Tool Execution**
- 🔍 **CRITICAL**: Real API calls to external services
- 🔍 **CRITICAL**: Tool result processing pipeline
- 🔍 **CRITICAL**: Error handling and recovery

### **Phase 5: Domain Analysis**
- 🔍 **CRITICAL**: Category-based tool processing
- 🔍 **CRITICAL**: Risk score calculations  
- 🔍 **CRITICAL**: All 6 domain agents integration

## 🎯 Detailed Verification Tests

### **5.1 Domain Routing Verification**
```bash
# Test sequential domain execution
TEST_MODE=live poetry run python scripts/testing/unified_autonomous_test_runner.py \
  --scenario domain_routing \
  --verbose --log-level DEBUG \
  --mode live --csv-limit 1 --timeout 60
```

**Expected Results**:
- [Step 5.1.1] Domain execution order logged correctly
- [Step 5.1.2] Sequential routing works: network → device → location → logs → authentication → risk
- All domain agents receive proper state and tool results

### **5.2 Domain Agent Verification**

#### **5.2.1 Network Agent (Step 5.2.1)**
```bash
# Test network agent with real threat intelligence
USE_SNOWFLAKE=true poetry run python scripts/testing/test_network_agent_live.py \
  --entity-type user --entity-id test_user_123 \
  --log-level DEBUG --timeout 30
```

**Expected Results**:
- ✅ Real Snowflake data processed correctly
- ✅ Category-based tool processing works with live API results
- ✅ [Step 5.2.1.2] Threat signal extraction from multiple tools
- ✅ [Step 5.2.1.3] Risk score calculation with evidence collection
- ✅ Proper integration with VPN detection, IP reputation services

#### **5.2.2 Device Agent (Step 5.2.2)**
```bash
# Test device agent with real device fingerprinting
USE_SNOWFLAKE=true poetry run python scripts/testing/test_device_agent_live.py \
  --entity-type user --entity-id test_user_123 \
  --log-level DEBUG --timeout 30
```

**Expected Results**:
- ✅ Device fingerprint analysis from real data
- ✅ [Step 5.2.2.2] ML anomaly detection with live tool results
- ✅ [Step 5.2.2.3] Bot detection and spoofing identification
- ✅ Browser consistency and automation detection

#### **5.2.3 Location Agent (Step 5.2.3)**
```bash
# Test location agent with real geolocation data
USE_SNOWFLAKE=true poetry run python scripts/testing/test_location_agent_live.py \
  --entity-type user --entity-id test_user_123 \
  --log-level DEBUG --timeout 30
```

**Expected Results**:
- ✅ Impossible travel detection with real coordinates
- ✅ [Step 5.2.3.2] Geolocation intelligence processing
- ✅ [Step 5.2.3.3] Travel risk assessment and VPN detection
- ✅ High-risk country identification

#### **5.2.4 Logs Agent (Step 5.2.4)**
```bash
# Test logs agent with real activity data
USE_SNOWFLAKE=true poetry run python scripts/testing/test_logs_agent_live.py \
  --entity-type user --entity-id test_user_123 \
  --log-level DEBUG --timeout 30
```

**Expected Results**:
- ✅ Real transaction log analysis
- ✅ [Step 5.2.4.2] Category-based log intelligence processing
- ✅ [Step 5.2.4.3] Behavioral risk assessment
- ✅ Failed transaction pattern detection

#### **5.2.5 Authentication Agent (Step 5.2.5)**
```bash
# Test authentication agent with real login data  
USE_SNOWFLAKE=true poetry run python scripts/testing/test_auth_agent_live.py \
  --entity-type user --entity-id test_user_123 \
  --log-level DEBUG --timeout 30
```

**Expected Results**:
- ✅ Brute force detection with real attempt data
- ✅ [Step 5.2.5.2] Authentication threat intelligence processing
- ✅ [Step 5.2.5.3] Account takeover risk assessment
- ✅ MFA bypass and credential stuffing detection

#### **5.2.6 Risk Agent (Step 5.2.6)**
```bash
# Test risk agent with complete domain findings
USE_SNOWFLAKE=true poetry run python scripts/testing/test_risk_agent_live.py \
  --entity-type user --entity-id test_user_123 \
  --log-level DEBUG --timeout 30
```

**Expected Results**:
- ✅ Final risk score aggregation from all domains
- ✅ [Step 5.2.6] Evidence synthesis and risk level determination
- ✅ Risk indicators properly weighted and combined

### **5.3 End-to-End Integration Test**
```bash
# Complete 5-phase investigation in LIVE mode
USE_SNOWFLAKE=true poetry run python scripts/testing/unified_autonomous_test_runner.py \
  --scenario complete_investigation \
  --verbose --log-level DEBUG \
  --mode live --csv-limit 1 --timeout 120
```

**Expected Results**:
- ✅ All 5 phases complete successfully in sequence
- ✅ Real Snowflake data flows through all agents
- ✅ All 50+ tools integrate properly with category-based processing
- ✅ Risk scores differentiate properly (no more identical 0.99 scores)
- ✅ Complete DEBUG logging shows proper phase execution

## 🔍 Success Criteria

### **Phase Execution**
- [ ] Phase 1-2: Complete in under 10 seconds
- [ ] Phase 3: Snowflake queries return valid data in under 15 seconds  
- [ ] Phase 4: Tool execution completes with results in under 30 seconds
- [ ] Phase 5: All 6 domain agents complete in under 45 seconds

### **Risk Score Validation**
- [ ] Domain agents produce **different** risk scores (no identical 0.99)
- [ ] Risk scores are properly justified by evidence
- [ ] Category-based tool processing extracts signals from all tools
- [ ] Final risk assessment aggregates domain findings correctly

### **Debug Logging Verification**
- [ ] All [Step X.Y.Z] prefixes appear correctly in logs
- [ ] Category-based processing logs show tool signal extraction
- [ ] Evidence collection is fully traceable
- [ ] No errors or exceptions in the complete flow

### **Data Flow Validation**
- [ ] Real Snowflake data reaches all domain agents
- [ ] Tool results are properly processed by category-based system
- [ ] State is maintained correctly throughout all phases
- [ ] Investigation findings are complete and accurate

## ⚠️ Risk Mitigation

### **Cost Control**
- Use `--csv-limit 1` to minimize Snowflake queries
- Set `--timeout` values to prevent runaway processes
- Monitor API usage during testing

### **Error Handling**
- Verify graceful degradation when tools fail
- Test error recovery mechanisms
- Ensure partial results still produce valid investigations

### **Data Validation**  
- Confirm all security measures are active
- Verify no sensitive data leaks in logs
- Test SQL injection prevention

## 📊 Verification Report Template

After LIVE mode testing (with approval), generate:

```
# Phase 5 LIVE Mode Verification Report
Date: [Date]
Duration: [Total Time]
Status: [PASS/FAIL]

## Phase Results
- Phase 1-2: [PASS/FAIL] - [Duration]
- Phase 3: [PASS/FAIL] - [Duration] - [Records Retrieved]  
- Phase 4: [PASS/FAIL] - [Duration] - [Tools Executed]
- Phase 5: [PASS/FAIL] - [Duration] - [Domain Agents Results]

## Risk Score Analysis
- Network Agent: [Score] - [Evidence Points]
- Device Agent: [Score] - [Evidence Points]
- Location Agent: [Score] - [Evidence Points] 
- Logs Agent: [Score] - [Evidence Points]
- Authentication Agent: [Score] - [Evidence Points]
- Risk Agent Final: [Score] - [Risk Level]

## Issues Found: [Count]
[Detailed issue list]

## Recommendations: [Count]  
[Improvement suggestions]
```

---

## 🎫 **APPROVAL REQUIRED**

**This verification plan requires explicit user approval before execution in LIVE mode.**

**Please confirm**: 
- [ ] Approval to run LIVE mode tests with real Snowflake data
- [ ] Approval to execute real API calls to external services  
- [ ] Understanding that LIVE mode testing will incur actual costs

**Once approved, I will execute the comprehensive verification and provide detailed results.**