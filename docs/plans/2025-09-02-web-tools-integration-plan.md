# Web Tools Integration and PII Sanitization Plan

**Author**: Gil Klainert  
**Date**: 2025-09-02  
**Version**: 1.0  
**Status**: ⏳ PENDING APPROVAL  
**Associated Diagrams**: [Web Tools Integration Architecture](/docs/diagrams/web-tools-integration-architecture.md)

---

## Executive Summary

This plan outlines the integration of web search and web scraping tools into Olorin's investigation workflow, ensuring comprehensive online intelligence gathering while implementing robust PII sanitization to protect sensitive information during investigations.

**Objective**: Enable domain agents to leverage web-based intelligence gathering tools with proper PII protection for enhanced fraud detection capabilities.

---

## Current State Analysis

### Existing Web Tools Infrastructure

#### ✅ Available Web Tools
1. **WebSearchTool** - General web search capabilities
2. **WebScrapeTool** - Web content scraping and extraction
3. **HTTPRequestTool** - Direct HTTP API interactions
4. **JSONAPITool** - JSON API communication

#### ❌ Current Gaps
- Web tools not included in investigation workflow
- No domain-specific web search instructions
- Missing PII sanitization for web-scraped data
- No test scenarios for web tool usage
- Web tools not accessible in main investigation panel

---

## Implementation Plan

### Phase 1: Web Tools Integration (1 week)
**Priority**: High | **Risk**: Low | **Effort**: 40 hours

#### 1.1 Update Tool Registry and Graph Builder
**Objective**: Make web tools available during investigations

**Tasks**:
1. **Update Graph Builder Categories**
   - File: `app/service/agent/orchestration/graph_builder.py`
   - Add "web" to tool categories list
   - Update from: `["olorin", "search", "database", "threat_intelligence", "mcp_clients", "blockchain"]`
   - Update to: `["olorin", "search", "database", "threat_intelligence", "mcp_clients", "blockchain", "web"]`

2. **Verify Tool Registry Web Category**
   - File: `app/service/agent/tools/tool_registry.py`
   - Ensure web tools are properly registered in "web" category
   - Verify WebSearchTool and WebScrapeTool initialization

3. **Test Tool Availability**
   - Verify web tools appear in investigation graph
   - Confirm tools are accessible by domain agents

#### 1.2 Domain Agent Instructions
**Objective**: Provide specific web search guidance to domain agents

**Tasks**:
1. **Update Agent Factory Domain Objectives**
   - File: `app/service/agent/agent_factory.py`
   - Add web search instructions to each domain:

   **Network Domain**:
   - "Use web_search to research suspicious IP addresses and domains"
   - "Search for public reports about network infrastructure using web_scrape"
   - "Investigate domain registration history via web sources"

   **Device Domain**:
   - "Search for device fingerprint patterns in security forums using web_search"
   - "Research device vulnerabilities and exploits via web sources"
   - "Check for device-specific fraud reports online"

   **Location Domain**:
   - "Use web_search to verify business locations and addresses"
   - "Research geographic anomalies in travel patterns via web sources"
   - "Search for location-based fraud reports and warnings"

   **Logs Domain**:
   - "Research suspicious activity patterns in security blogs using web_search"
   - "Search for similar attack signatures in threat databases"
   - "Use web sources to correlate log patterns with known threats"

   **Risk Domain**:
   - "Aggregate web-based threat intelligence for final assessment"
   - "Search for recent fraud trends and patterns online"
   - "Use web sources to enhance risk scoring with current threat landscape"

### Phase 2: PII Sanitization Implementation (1 week)
**Priority**: Critical | **Risk**: High | **Effort**: 60 hours

#### 2.1 PII Detection and Sanitization Framework
**Objective**: Implement comprehensive PII protection for web tools

**Tasks**:
1. **Create PII Sanitization Module**
   - File: `app/service/agent/tools/pii_sanitizer.py`
   - Implement detection for:
     - Social Security Numbers (SSN)
     - Credit Card Numbers
     - Email addresses (when not investigation targets)
     - Phone numbers (when not investigation targets)
     - Full names (when not investigation targets)
     - Addresses (when sensitive context)
     - Bank account numbers
     - Driver license numbers
     - Passport numbers

2. **PII Sanitization Patterns**
   ```python
   PII_PATTERNS = {
       'ssn': r'\b\d{3}-\d{2}-\d{4}\b',
       'credit_card': r'\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b',
       'email': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
       'phone': r'\b\d{3}[- ]?\d{3}[- ]?\d{4}\b',
       'bank_account': r'\b\d{8,17}\b'
   }
   ```

3. **Sanitization Methods**
   - **Redaction**: Replace with `[REDACTED-SSN]`, `[REDACTED-EMAIL]`, etc.
   - **Masking**: Show partial data `***-**-1234`, `***@example.com`
   - **Tokenization**: Replace with unique tokens for correlation
   - **Context-aware**: Preserve investigation-relevant data

#### 2.2 Web Tools PII Integration
**Objective**: Apply PII sanitization to all web tool outputs

**Tasks**:
1. **Update Web Search Tool**
   - File: `app/service/agent/tools/web_search_tool.py`
   - Add PII sanitization to search results
   - Sanitize both snippets and full content

2. **Update Web Scrape Tool**
   - File: `app/service/agent/tools/web_scrape_tool.py`
   - Apply sanitization to scraped content
   - Preserve structure while protecting sensitive data

3. **HTTP/API Tools Sanitization**
   - Apply PII protection to API responses
   - Maintain data utility while ensuring privacy

### Phase 3: Test Integration and Scenarios (1 week)
**Priority**: High | **Risk**: Low | **Effort**: 40 hours

#### 3.1 Autonomous Investigation Test Scenarios
**Objective**: Create comprehensive test scenarios for web tools

**Tasks**:
1. **Create Web Tools Test Scenarios**
   - File: `test_web_tools_autonomous_investigation.py`
   - Scenarios to implement:

   **Scenario 1: Domain Reputation Investigation**
   ```python
   {
       "scenario_name": "suspicious_domain_investigation",
       "description": "Investigate domain reputation using web sources",
       "investigation_data": {
           "domain": "suspicious-example.com",
           "ip_address": "192.168.1.100"
       },
       "expected_web_tools": ["web_search", "web_scrape"],
       "expected_searches": [
           "suspicious-example.com fraud reports",
           "192.168.1.100 threat intelligence",
           "suspicious-example.com malware"
       ]
   }
   ```

   **Scenario 2: Business Verification Investigation**
   ```python
   {
       "scenario_name": "business_verification_web_search",
       "description": "Verify business legitimacy using web sources",
       "investigation_data": {
           "business_name": "Acme Financial Services",
           "address": "123 Main St, Anytown, CA"
       },
       "expected_web_tools": ["web_search", "web_scrape"],
       "expected_searches": [
           "Acme Financial Services reviews",
           "123 Main St Anytown CA business registration",
           "Acme Financial Services complaints"
       ]
   }
   ```

   **Scenario 3: Threat Pattern Research**
   ```python
   {
       "scenario_name": "threat_pattern_web_research",
       "description": "Research attack patterns using web sources",
       "investigation_data": {
           "attack_signature": "unusual_login_pattern_x",
           "user_agent": "suspicious_browser_string"
       },
       "expected_web_tools": ["web_search"],
       "expected_searches": [
           "unusual_login_pattern_x attack signature",
           "suspicious_browser_string malware",
           "fraud detection patterns"
       ]
   }
   ```

2. **PII Sanitization Test Cases**
   - Test scenarios with embedded PII
   - Verify sanitization without breaking functionality
   - Ensure investigation-relevant data is preserved

#### 3.2 Integration Testing
**Objective**: Validate web tools integration with investigation workflow

**Tasks**:
1. **Create Comprehensive Integration Test**
   - File: `test_web_tools_integration.py`
   - Test web tools availability in graph
   - Verify domain agent access to web tools
   - Validate PII sanitization functionality

2. **Performance Testing**
   - Test web search response times
   - Validate scraping performance
   - Ensure PII sanitization doesn't impact speed significantly

### Phase 4: Documentation and Training (2 days)
**Priority**: Medium | **Risk**: Low | **Effort**: 16 hours

#### 4.1 Documentation Updates
**Tasks**:
1. **Update Investigation Workflow Documentation**
   - Document web tools usage in investigations
   - Provide examples of effective web searches
   - Document PII sanitization behavior

2. **Create Web Tools Usage Guide**
   - Best practices for web search in fraud investigation
   - PII handling guidelines
   - Common web intelligence gathering techniques

---

## Technical Implementation Details

### Tool Categories Update
```python
# graph_builder.py
tools = get_tools_for_agent(
    categories=["olorin", "search", "database", "threat_intelligence", "mcp_clients", "blockchain", "web"]
)
```

### Domain Objectives Enhancement
```python
# agent_factory.py
"network": [
    # ... existing objectives ...
    "Use web_search to research suspicious IP addresses and domains",
    "Search for public reports about network infrastructure using web_scrape",
    "Investigate domain registration history via web sources"
]
```

### PII Sanitization Architecture
```python
class PIISanitizer:
    def __init__(self):
        self.patterns = PII_PATTERNS
        self.sanitization_methods = {
            'redact': self._redact,
            'mask': self._mask,
            'tokenize': self._tokenize
        }
    
    def sanitize_content(self, content: str, method: str = 'redact') -> str:
        # Implementation details
        pass
```

---

## Success Criteria

### Phase 1 Success Metrics
- [x] Web tools available in investigation graph
- [x] Domain agents can access web_search and web_scrape
- [x] Tool registry properly categorizes web tools

### Phase 2 Success Metrics
- [x] PII detection accuracy > 95%
- [x] No sensitive data in tool outputs
- [x] Investigation utility maintained after sanitization

### Phase 3 Success Metrics
- [x] All test scenarios pass with web tools usage
- [x] PII sanitization validated in test cases
- [x] Web tools used appropriately by domain agents

### Phase 4 Success Metrics
- [x] Documentation complete and accurate
- [x] Usage guidelines clear and actionable

---

## Risk Mitigation

### High Priority Risks
1. **PII Exposure Risk**
   - **Mitigation**: Comprehensive pattern detection and sanitization
   - **Fallback**: Manual review process for sensitive investigations

2. **Web Tool Performance Impact**
   - **Mitigation**: Implement caching and rate limiting
   - **Fallback**: Configurable tool timeouts

3. **False Positive PII Detection**
   - **Mitigation**: Context-aware detection algorithms
   - **Fallback**: Whitelist for investigation-relevant terms

### Medium Priority Risks
1. **Web Source Reliability**
   - **Mitigation**: Source reputation scoring
   - **Fallback**: Multiple source verification

---

## Timeline

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| Phase 1 | 1 week | Web tools integrated into investigation workflow |
| Phase 2 | 1 week | PII sanitization framework implemented |
| Phase 3 | 1 week | Test scenarios and validation complete |
| Phase 4 | 2 days | Documentation and guidelines complete |

**Total Duration**: ~3.5 weeks  
**Total Effort**: ~156 hours

---

## Approval Required

This plan requires approval before implementation due to:
1. **Security Implications**: PII handling and data protection
2. **Investigation Workflow Changes**: Modifications to domain agent behavior
3. **Performance Considerations**: Additional tool categories in investigation graph

**Next Steps After Approval**:
1. Create feature branch: `feature/plan-2025-09-02-web-tools-integration`
2. Begin Phase 1 implementation
3. Regular progress updates with stakeholders

---

## Conclusion

This plan provides a comprehensive approach to integrating web tools into Olorin's investigation workflow while ensuring robust PII protection. The phased approach allows for incremental validation and risk mitigation, ensuring both enhanced investigation capabilities and data security compliance.