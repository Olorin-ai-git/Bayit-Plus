# CVPlus Firebase Functions Deployment Guide

## 🚨 Current Issues & Solutions

### Issue 1: Environment Variable Conflicts
**Problem**: Functions failing with "Secret environment variable overlaps non secret environment variable: OPENAI_API_KEY"

**Root Cause**: API keys are configured in both:
- `.env` file (as regular environment variables)
- Firebase Secrets (secure secret management)

**Solution**: ✅ **IMPLEMENTED**
- Removed API keys from `.env` file 
- Created `.env.production` with only non-secret variables
- All API keys now managed exclusively through Firebase Secrets

### Issue 2: Quota Exceeded During Deployment
**Problem**: "Per project mutation requests per minute per region" limit exceeded

**Root Cause**: Deploying 60+ functions simultaneously hits Google Cloud quotas

**Solution**: ✅ **IMPLEMENTED**
- Created batch deployment script (`scripts/deployment/deploy-batch.js`)
- Deploys functions in batches of 10 with 30-second delays
- Includes retry logic and error handling

## 🛠️ Quick Fix Commands

### Step 1: Fix Environment Variables
```bash
cd functions

# The .env file has been updated to remove API key conflicts
# Verify no API keys remain in .env:
grep -E "(ANTHROPIC_API_KEY|OPENAI_API_KEY|ELEVENLABS_API_KEY)=sk" .env
# Should return no results

# Verify Firebase Secrets are configured:
firebase functions:secrets:get --json
```

### Step 2: Fix Function Configurations
```bash
# Run the automated secret configuration fixer:
npm run fix-secrets

# This will:
# - Analyze all function files
# - Add missing secret configurations  
# - Update existing secret configurations
# - Report what was fixed
```

### Step 3: Deploy with Batch Script
```bash
# Option A: Complete safe deployment (recommended)
npm run deploy:safe

# Option B: Manual batch deployment
npm run deploy:batch

# Option C: Traditional deployment (may hit quotas)
npm run deploy
```

## 📋 Detailed Steps

### Pre-Deployment Checklist

1. **Environment Variables** ✅
   ```bash
   # Check .env file - should NOT contain API keys
   cat .env | grep -E "(ANTHROPIC|OPENAI|ELEVENLABS)_API_KEY"
   
   # Should only show commented lines like:
   # # Use: firebase functions:secrets:set ANTHROPIC_API_KEY
   ```

2. **Firebase Secrets** ✅
   ```bash
   # Verify secrets are configured
   firebase functions:secrets:get ANTHROPIC_API_KEY
   firebase functions:secrets:get OPENAI_API_KEY
   firebase functions:secrets:set ELEVENLABS_API_KEY
   
   # If any are missing, set them:
   # firebase functions:secrets:set ANTHROPIC_API_KEY
   # firebase functions:secrets:set OPENAI_API_KEY
   # firebase functions:secrets:set ELEVENLABS_API_KEY
   ```

3. **Function Configurations**
   ```bash
   # Run the configuration fixer
   npm run fix-secrets
   
   # Review changes:
   git diff src/functions/
   ```

### Deployment Process

#### Option A: Automated Safe Deployment (Recommended)
```bash
cd functions
npm run deploy:safe
```
This will:
1. Fix any remaining secret configuration issues
2. Build the functions
3. Deploy in batches with proper delays
4. Provide detailed progress and error reporting

#### Option B: Manual Step-by-Step
```bash
cd functions

# 1. Fix configurations
npm run fix-secrets

# 2. Build
npm run build

# 3. Deploy in batches
npm run deploy:batch
```

#### Option C: Deploy Specific Function Groups
```bash
# Core CV functions
firebase deploy --only functions:processCV,functions:analyzeCV,functions:generateCV

# Wait 30 seconds
sleep 30

# LLM verification functions  
firebase deploy --only functions:processCV-enhanced,functions:llmVerificationStatus

# Wait 30 seconds
sleep 30

# Media generation functions
firebase deploy --only functions:generatePodcast,functions:generateVideoIntroduction

# Continue with remaining batches...
```

### Post-Deployment Verification

1. **Check Deployment Status**
   ```bash
   firebase functions:list
   ```

2. **Test Critical Functions**
   ```bash
   firebase functions:shell
   
   # Test in the shell:
   # processCV({data: {content: 'test cv content'}})
   # analyzeCV({data: {content: 'test cv content'}})
   # generatePodcast({data: {title: 'Test', content: 'Test content'}})
   ```

3. **Monitor Logs**
   ```bash
   # View all function logs
   firebase functions:log
   
   # View specific function logs
   firebase functions:log --only processCV
   firebase functions:log --only generatePodcast
   ```

## 🔧 Troubleshooting

### Common Errors & Solutions

1. **"Secret environment variable overlaps non secret environment variable"**
   ```bash
   # Solution: Remove the variable from .env
   grep -v "CONFLICTING_KEY=" .env > .env.tmp && mv .env.tmp .env
   ```

2. **"Quota exceeded for quota metric"**
   ```bash
   # Solution: Use batch deployment
   npm run deploy:batch
   
   # Or deploy smaller batches manually:
   firebase deploy --only functions:func1,functions:func2,functions:func3
   ```

3. **"Function crashed: out of memory"**
   ```bash
   # Solution: Check function memory settings in TypeScript files
   # Ensure complex functions have adequate memory:
   # { memory: '2GiB', timeoutSeconds: 540 }
   ```

4. **Build failures**
   ```bash
   # Clean and rebuild
   rm -rf lib/
   npm run build
   
   # Check TypeScript errors
   npx tsc --noEmit
   ```

### Debug Commands

```bash
# Check function configurations
firebase functions:config:get

# List all functions
firebase functions:list

# Get detailed logs
firebase functions:log --lines 100

# Check secrets
firebase functions:secrets:get --json

# Test individual function
firebase functions:shell
```

## 📊 Expected Results

### Before Fix
- ❌ Functions failing with environment variable conflicts
- ❌ Quota exceeded errors during mass deployment
- ❌ Inconsistent secret management

### After Fix
- ✅ All API keys managed through Firebase Secrets
- ✅ No environment variable conflicts
- ✅ Successful batch deployment of all 60+ functions
- ✅ Proper quota management with delays and retries
- ✅ Comprehensive deployment monitoring and reporting

## 🚀 Production Deployment

For production deployment, ensure:

1. **Backup Current State**
   ```bash
   firebase functions:config:get > current-config-backup.json
   ```

2. **Use Production Environment**
   ```bash
   # Use .env.production for production-specific variables
   cp .env.production .env
   ```

3. **Deploy with Extra Caution**
   ```bash
   # Dry run first (if available)
   npm run deploy:batch --dry-run
   
   # Full deployment
   npm run deploy:safe
   ```

4. **Monitor Post-Deployment**
   ```bash
   # Monitor logs in real-time
   firebase functions:log --tail
   
   # Check all function health
   curl https://us-central1-cvplus.cloudfunctions.net/processCV
   ```

## 📞 Support

If issues persist:
1. Check the deployment logs: `firebase functions:log`
2. Review the batch deployment output
3. Verify Firebase project permissions and quotas
4. Consider contacting Firebase Support for quota increase requests