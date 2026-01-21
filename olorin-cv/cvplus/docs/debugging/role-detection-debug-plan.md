# Role Detection Debug Plan - 2025-08-23

**Author**: Gil Klainert  
**Issue**: Role detection functionality not working properly  
**Status**: Investigation Phase  

## Issue Analysis

### Primary Problems Identified

1. **Verification Service Failures** (Critical)
   - LLM monitoring shows "Verification Service Down" alerts
   - Success rate below 50% threshold
   - VerifiedClaudeService dependency failures

2. **Poor Fallback Quality** (High)
   - Generic "Professional" role with 0.3 confidence
   - Below minimum confidence threshold (0.6)
   - No meaningful role suggestions for users

3. **User Experience Issues** (Medium)
   - "Role Detection In progress" state persists
   - No clear feedback when detection fails
   - 30-second rate limiting causes delays

4. **Cache Strategy Problems** (Low)
   - Short-lived cache (10 minutes) 
   - Frequent regeneration requests
   - No graceful degradation

### Root Cause Analysis

The role detection system relies heavily on the VerifiedClaudeService for AI-powered analysis. When this service fails (which appears to be happening frequently), the system falls back to a generic analysis that provides little value to users.

**Critical Path**: CV Data → RoleDetectionService → VerifiedClaudeService → Analysis → Fallback (when verification fails)

## Fix Strategy

### Phase 1: Immediate Fixes (High Priority)
1. **Disable Verification Temporarily** 
   - Bypass LLM verification to improve reliability
   - Use direct Claude API calls
   - Monitor performance improvement

2. **Improve Fallback Quality**
   - Enhance generic role detection logic
   - Increase fallback confidence to meet threshold
   - Add skill-based role suggestions

3. **Better Error Handling**
   - Clear error messages to users
   - Graceful fallback UI states
   - Manual role selection prominence

### Phase 2: Service Reliability (Medium Priority)  
1. **Fix VerifiedClaudeService**
   - Investigate OpenAI API connectivity issues
   - Implement circuit breaker pattern
   - Add retry logic with exponential backoff

2. **Optimize Cache Strategy**
   - Extend cache duration to 1 hour
   - Implement cache warming
   - Add cache invalidation controls

### Phase 3: Enhancement (Low Priority)
1. **Improve Role Matching Algorithm**
   - Lower confidence threshold for initial matching
   - Add fuzzy matching improvements
   - Implement multi-factor scoring

2. **Enhanced User Experience**
   - Progress indicators with status updates
   - Alternative role suggestions
   - Quick manual override options

## Implementation Plan

### Step 1: Quick Reliability Fix
- Modify VerifiedClaudeService to disable verification
- Update fallback analysis to provide better suggestions
- Deploy and test

### Step 2: Enhanced Fallback System  
- Improve skill-based role detection
- Add multiple role suggestions
- Increase confidence scores appropriately

### Step 3: UI/UX Improvements
- Add better loading states
- Clear error messaging
- Prominent manual selection options

### Step 4: Service Recovery
- Fix underlying verification service issues
- Re-enable verification with improved reliability
- Monitor and adjust

## Success Criteria

- [ ] Role detection success rate > 80%
- [ ] Average detection confidence > 0.7  
- [ ] User sees meaningful role suggestions within 30 seconds
- [ ] Fallback system provides relevant alternatives
- [ ] No more "stuck in progress" states
- [ ] Manual override always available and clear

## Testing Strategy

1. **Unit Tests**: Role detection algorithms and fallback logic
2. **Integration Tests**: End-to-end role detection flow  
3. **User Testing**: Real CV data with various backgrounds
4. **Performance Testing**: Response times and reliability
5. **Error Testing**: Network failures and edge cases

## Next Steps

1. Implement Phase 1 fixes (disable verification, improve fallback)
2. Deploy and monitor success rates
3. Gather user feedback on improved experience
4. Proceed with Phase 2 based on results