# Firebase Functions Deployment Checklist

## Pre-Deployment Setup

### 1. Environment Variable Cleanup ✅
- [x] Remove API keys from `.env` file to avoid conflicts with Firebase Secrets
- [x] Create `.env.production` with only non-secret environment variables
- [x] Document which variables are secrets vs environment variables

### 2. Firebase Secrets Configuration
Ensure these secrets are properly configured:

```bash
# Check existing secrets
firebase functions:secrets:get --json

# Set required secrets (only if not already set)
firebase functions:secrets:set ANTHROPIC_API_KEY
firebase functions:secrets:set OPENAI_API_KEY  
firebase functions:secrets:set ELEVENLABS_API_KEY
firebase functions:secrets:set PINECONE_API_KEY  # If using RAG features
```

**Current Status**: ✅ ANTHROPIC_API_KEY and OPENAI_API_KEY are configured

### 3. Function Configuration Review
Check functions that use secrets to ensure proper configuration:

**Functions using OPENAI_API_KEY secret**:
- ✅ `generatePortfolioGallery`
- ✅ `generateLanguageVisualization` 
- ✅ `generateTestimonialsCarousel`
- ✅ `generateCertificationBadges`
- ✅ `generatePodcast` (also uses ELEVENLABS secrets)
- ✅ `processCV-enhanced` (uses both ANTHROPIC and OPENAI)

**Functions using ANTHROPIC_API_KEY secret**:
- ✅ `processCV-enhanced`
- ✅ `analyzeCV` (currently disabled - needs enabling)
- ✅ `processCV` (currently disabled - needs enabling)

### 4. Quota Management Setup ✅
- [x] Created batch deployment script (`scripts/deployment/deploy-batch.js`)
- [x] Configured batch size: 10 functions per batch
- [x] Configured delay: 30 seconds between batches
- [x] Added retry logic: 3 attempts per batch

## Deployment Process

### Step 1: Pre-deployment Validation
```bash
cd functions
node ../scripts/deployment/deploy-batch.js --validate-only
```

### Step 2: Build and Test
```bash
npm run build
npm test  # Optional but recommended
```

### Step 3: Batch Deployment
```bash
# Option A: Use automated batch deployment
node ../scripts/deployment/deploy-batch.js

# Option B: Use npm script (recommended)
npm run deploy:batch

# Option C: Manual deployment with specific batches
firebase deploy --only functions:processCV,functions:analyzeCV,functions:generateCV
# ... wait 30 seconds ...
firebase deploy --only functions:generatePodcast,functions:generateVideoIntroduction
# ... continue with remaining batches
```

### Step 4: Deployment Verification
```bash
# Check deployment status
firebase functions:list

# Test critical functions
firebase functions:shell
# processCV({data: 'test'})
# analyzeCV({data: 'test'})
```

## Post-Deployment

### 1. Function Health Check
- [ ] Test core CV processing: `processCV`, `analyzeCV`
- [ ] Test LLM verification: `processCV-enhanced`, `llmVerificationStatus`
- [ ] Test media generation: `generatePodcast`, `generateVideoIntroduction`
- [ ] Test feature functions: portfolio, testimonials, certifications

### 2. Monitor Logs
```bash
firebase functions:log
firebase functions:log --only processCV
firebase functions:log --only generatePodcast
```

### 3. Performance Monitoring
- [ ] Check function execution times
- [ ] Monitor memory usage (should be within 2GB limit)
- [ ] Verify timeout settings (540s for complex functions)

## Troubleshooting

### Common Issues

1. **Environment Variable Conflicts**
   ```
   Error: Secret environment variable overlaps non secret environment variable: OPENAI_API_KEY
   ```
   **Solution**: Remove the conflicting variable from `.env` file

2. **Quota Exceeded**
   ```  
   Error: Quota exceeded for quota metric 'Project mutation requests per minute per region'
   ```
   **Solution**: Use batch deployment with delays between batches

3. **Function Timeout**
   ```
   Error: Function execution took longer than 60 seconds
   ```
   **Solution**: Increase `timeoutSeconds` in function configuration

4. **Memory Limit**
   ```
   Error: Function crashed: out of memory
   ```
   **Solution**: Increase `memory` setting (currently set to 2GiB for complex functions)

### Debug Commands
```bash
# Check function configuration
firebase functions:config:get

# Check secrets
firebase functions:secrets:get --json

# View detailed logs
firebase functions:log --lines 50

# Test individual function
firebase functions:shell
```

## Current Function Status

### ✅ Successfully Deployed
- Core LLM verification system
- Most feature functions (60+ functions)

### ⚠️ Requires Fix & Redeploy
- `generatePortfolioGallery` - Environment variable conflict
- `generateLanguageVisualization` - Environment variable conflict  
- `generateTestimonialsCarousel` - Environment variable conflict
- Functions hitting quota limits during mass deployment

### 🎯 Target State
- All 60+ functions deployed successfully
- No environment variable conflicts
- Proper secret management
- Efficient batch deployment process