# Fix Hybrid Intelligence Snowflake Tool Execution Plan

**Date:** September 10, 2025  
**Author:** Gil Klainert  
**Status:** 🔄 IN PROGRESS  
**Priority:** CRITICAL  

## 🚨 Problem Statement

The Hybrid Intelligence system recommends `snowflake_analysis` but the LLM ignores this recommendation and calls external threat intelligence tools instead. This happens because the hybrid system calls the original clean graph `assistant` function which doesn't respect AI confidence engine recommendations.

### Root Cause
- **Line 262** in `hybrid_graph_builder.py`: `assistant_result = assistant(state, config)`
- The `assistant` function from clean graph makes independent tool choices
- AI confidence engine recommendation `snowflake_analysis` is ignored
- LLM chooses threat intel tools (abuseipdb, virustotal, shodan) instead

## 🎯 Objectives

1. **Create Hybrid-Aware Assistant**: Build a new assistant function that respects AI recommendations
2. **Prioritize Snowflake**: Ensure Snowflake is the first tool used as recommended
3. **Maintain Mock Mode**: Keep all testing in mock mode during development
4. **Preserve Functionality**: Don't break existing clean graph behavior

## 📋 Phase 1: Create Hybrid-Aware Assistant Function ⏳ PENDING

### 1.1 Build New Assistant Function
- Create `_hybrid_aware_assistant` in `hybrid_graph_builder.py`
- Check for `ai_decisions` in state and extract `recommended_action`
- If recommendation is `snowflake_analysis`, prioritize Snowflake tool
- Fall back to normal LLM decision-making if no recommendations

### 1.2 Integrate with Existing Tools
- Ensure new assistant has access to all tool registry tools
- Maintain compatibility with existing tool execution pipeline
- Preserve tool result collection and state management
- Handle both mock and live mode properly

## 📋 Phase 2: Implement Snowflake Prioritization ⏳ PENDING

### 2.1 Snowflake-First Logic
- When `recommended_action = "snowflake_analysis"`, force Snowflake tool call
- Add context about why Snowflake is being called first
- Ensure proper entity information is passed to Snowflake
- Handle mock mode Snowflake responses appropriately

### 2.2 Tool Sequencing
- After Snowflake completes, allow LLM to choose next tools
- Use Snowflake results to inform subsequent tool selection
- Maintain proper investigation flow and state transitions
- Ensure all domain agents eventually get data

## 📋 Phase 3: Mock Mode Testing ⏳ PENDING

### 3.1 Snowflake Mock Implementation
- Verify Snowflake tool works in `TEST_MODE=mock`
- Ensure mock responses are realistic and useful
- Test that mock Snowflake data flows to domain agents
- Validate investigation can complete with mock data

### 3.2 Integration Testing
- Run unified test runner with fixed hybrid system
- Verify tools execute in correct sequence (Snowflake first)
- Ensure all domain agents receive data and complete
- Validate risk scores are calculated properly

## 📋 Phase 4: Code Implementation ⏳ PENDING

### 4.1 Hybrid Assistant Function
```python
async def _hybrid_aware_assistant(
    self,
    state: HybridInvestigationState,
    config: Optional[Dict] = None
) -> HybridInvestigationState:
    """Hybrid-aware assistant that respects AI recommendations"""
    
    # Check for AI recommendations
    ai_decisions = state.get("ai_decisions", [])
    if ai_decisions:
        latest_decision = ai_decisions[-1]
        if latest_decision.recommended_action == "snowflake_analysis":
            # Force Snowflake tool call
            return await self._execute_snowflake_analysis(state, config)
    
    # Fall back to normal LLM decision-making
    return assistant(state, config)
```

### 4.2 Update Hybrid Graph Builder
- Replace `assistant(state, config)` call with `_hybrid_aware_assistant`
- Ensure proper state handling and result merging
- Maintain backward compatibility with existing functionality
- Add proper logging for debugging

## 📋 Phase 5: Validation and Testing ⏳ PENDING

### 5.1 Mock Mode Validation
- Run test with `TEST_MODE=mock` and `HYBRID_FLAG_HYBRID_GRAPH_V1=true`
- Verify Snowflake is called first as expected
- Ensure investigation completes successfully with proper risk score
- Validate all domain agents receive data

### 5.2 Integration Testing
- Test with various entity types (ip, user_id, etc.)
- Verify tool execution sequence is correct
- Ensure investigation quality scores improve
- Validate performance metrics are collected

## 🔧 Technical Implementation Details

### Files to Modify
1. **`hybrid_graph_builder.py`** - Add new `_hybrid_aware_assistant` function
2. **`hybrid_graph_builder.py`** - Update `_enhanced_fraud_investigation` to use new assistant
3. **Tool execution pipeline** - Ensure Snowflake mock mode works correctly

### Key Functions
```python
# New function to add
async def _hybrid_aware_assistant(self, state, config) -> HybridInvestigationState

# Function to modify
async def _enhanced_fraud_investigation(self, state, config) -> HybridInvestigationState

# New helper function  
async def _execute_snowflake_analysis(self, state, config) -> HybridInvestigationState
```

### State Requirements
- Access to `ai_decisions` array
- Proper `recommended_action` handling
- Tool result collection and storage
- Investigation phase management

## 🎯 Success Criteria

- [ ] Snowflake tool is called first when recommended by AI engine
- [ ] Investigation completes successfully in mock mode
- [ ] All domain agents receive data and complete analysis
- [ ] Risk score > 0.00 with proper evidence
- [ ] Investigation passes validation with 90%+ success rate
- [ ] Tool execution sequence: Snowflake → Other tools → Domain agents

## 🚨 Critical Constraints

- **STAY IN MOCK MODE ONLY** until all issues are fixed
- **NO LIVE MODE EXECUTION** without explicit approval
- Don't break existing clean graph functionality
- Maintain backward compatibility
- Follow all CLAUDE.md requirements (plan approval, code review, etc.)

## 📊 Progress Tracking

- **Phase 1**: ⏳ PENDING - Create hybrid-aware assistant function
- **Phase 2**: ⏳ PENDING - Implement Snowflake prioritization  
- **Phase 3**: ⏳ PENDING - Mock mode testing
- **Phase 4**: ⏳ PENDING - Code implementation
- **Phase 5**: ⏳ PENDING - Validation and testing

## 🔗 Related Files

- `/app/service/agent/orchestration/hybrid/hybrid_graph_builder.py` - Main implementation
- `/app/service/agent/orchestration/assistant.py` - Original assistant function
- `/app/service/agent/orchestration/hybrid/ai_confidence_engine.py` - Recommendation source
- `/scripts/testing/unified_autonomous_test_runner.py` - Testing framework

---

**Next Step**: Get plan approval, then implement the hybrid-aware assistant function that respects AI recommendations and prioritizes Snowflake.