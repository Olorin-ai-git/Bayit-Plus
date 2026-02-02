# Automatic Deployment Setup
**Date**: 2026-01-15  
**Status**: 🔧 **IN PROGRESS**

---

## 🎯 **Goal**
Set up automatic Cloud Build triggers so that every push to `main` branch automatically deploys to Cloud Run.

---

## 📋 **Current Status**

✅ Cloud Build configuration exists (`backend/cloudbuild.yaml`)  
✅ Cloud Run service is running (`bayit-backend-production`)  
❌ GitHub connection to Cloud Build: **NOT CONFIGURED**  
❌ Build trigger: **NOT CONFIGURED**

---

## 🔗 **Step 1: Connect GitHub to Cloud Build**

### **Option A: Via Console (Recommended - Easier)**

1. **Open Cloud Build Connections Page**
   ```
   https://console.cloud.google.com/cloud-build/triggers/connect?project=bayit-plus
   ```

2. **Click "Connect Repository"**

3. **Select Source:**
   - Choose "GitHub (Cloud Build GitHub App)"

4. **Authenticate with GitHub:**
   - Click "Authenticate"
   - Sign in to your GitHub account (Olorin-ai-git)
   - Authorize Google Cloud Build

5. **Select Repository:**
   - Choose: `Olorin-ai-git/Bayit-Plus`
   - Click "Connect"

6. **Confirmation:**
   - You should see "Repository connected" ✅

---

### **Option B: Via CLI (Advanced)**

```bash
# This requires interactive authentication
gcloud alpha builds connections create github github-connection \
    --project=bayit-plus \
    --region=us-east1

# Then link your repository
gcloud alpha builds repositories create \
    --connection=github-connection \
    --remote-uri=https://github.com/Olorin-ai-git/Bayit-Plus.git \
    --project=bayit-plus \
    --region=us-east1
```

---

## ⚙️ **Step 2: Create Build Trigger**

### **After GitHub is Connected, Run This Command:**

```bash
gcloud builds triggers create github \
  --name="bayit-backend-production-auto-deploy" \
  --description="Auto-deploy backend on push to main" \
  --repo-name="Bayit-Plus" \
  --repo-owner="Olorin-ai-git" \
  --branch-pattern="^main$" \
  --build-config="backend/cloudbuild.yaml" \
  --project=bayit-plus \
  --region=us-east1 \
  --substitutions="_REGION=us-east1,_MEMORY=2Gi,_CPU=2,_MAX_INSTANCES=10,_MIN_INSTANCES=0"
```

**What This Does:**
- ✅ Watches `main` branch for commits
- ✅ Triggers build on every push
- ✅ Runs `backend/cloudbuild.yaml`
- ✅ Deploys to Cloud Run automatically
- ✅ Sets memory/CPU/scaling config

---

## 🔄 **Step 3: Test the Trigger**

After setup, make a test commit:

```bash
cd /Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus

# Make a small change
echo "# Auto-deploy configured $(date)" >> deployment/AUTO_DEPLOY_SETUP.md

# Commit and push
git add deployment/AUTO_DEPLOY_SETUP.md
git commit -m "Test auto-deploy trigger"
git push origin main
```

Then monitor the build:

```bash
# Watch builds in real-time
gcloud builds list --project=bayit-plus --limit=1 --ongoing

# Or check the console
open "https://console.cloud.google.com/cloud-build/builds?project=bayit-plus"
```

**Expected Result:**
- Build starts automatically within 10-30 seconds
- Build takes ~5-10 minutes
- New revision deployed to Cloud Run
- Service restarts with new code

---

## 📊 **Monitoring After Setup**

### **Check Trigger Status**
```bash
gcloud builds triggers list --project=bayit-plus --region=us-east1
```

### **View Recent Builds**
```bash
gcloud builds list --project=bayit-plus --limit=5
```

### **Check Current Deployment**
```bash
gcloud run services describe bayit-backend-production \
  --project=bayit-plus \
  --region=us-east1 \
  --format="table(metadata.name,status.url,status.latestReadyRevisionName,metadata.creationTimestamp)"
```

### **View Build Logs**
```bash
# Get latest build ID
BUILD_ID=$(gcloud builds list --project=bayit-plus --limit=1 --format="value(id)")

# View logs
gcloud builds log $BUILD_ID --project=bayit-plus
```

---

## 🎯 **What Gets Deployed**

Every push to `main` will:

1. **Build Docker Image**
   - Uses `backend/Dockerfile`
   - Pushes to Artifact Registry
   - Tags: `$BUILD_ID` and `latest`

2. **Deploy to Cloud Run**
   - Service: `bayit-backend-production`
   - Region: `us-east1`
   - Memory: 2Gi
   - CPU: 2
   - Max instances: 10
   - Environment: Production

3. **Apply Configuration**
   - All secrets from Secret Manager
   - Environment variables
   - Service account
   - CORS origins

---

## 🚨 **Important Notes**

### **Build Time**
- First build: ~10-15 minutes (no cache)
- Subsequent builds: ~5-8 minutes (with cache)

### **Cost Considerations**
- Cloud Build: $0.003/build-minute
- Typical build: ~7 minutes = $0.021/deployment
- Free tier: 120 build-minutes/day

### **Branch Protection**
Consider protecting your `main` branch:
```bash
# In GitHub repository settings:
# Settings → Branches → Add branch protection rule
# - Branch name: main
# - Require pull request reviews before merging
# - Require status checks to pass (Cloud Build)
```

### **Rollback Strategy**
If a deployment fails, rollback to previous revision:

```bash
# List revisions
gcloud run revisions list \
  --service=bayit-backend-production \
  --project=bayit-plus \
  --region=us-east1 \
  --limit=5

# Rollback to previous revision
gcloud run services update-traffic bayit-backend-production \
  --to-revisions=bayit-backend-production-00050-45q=100 \
  --project=bayit-plus \
  --region=us-east1
```

---

## 📝 **Next Steps**

After auto-deploy is set up:

1. ✅ Push your current changes (non-blocking upload queue fix)
2. ✅ Monitor the first automatic build
3. ✅ Verify deployment in Cloud Run
4. ✅ Test the production API
5. ✅ Set up Slack/Email notifications for build failures (optional)

---

## 🔔 **Optional: Build Notifications**

### **Email Notifications**
```bash
# Enable Cloud Build notifications
gcloud builds triggers update bayit-backend-production-auto-deploy \
  --project=bayit-plus \
  --region=us-east1 \
  --subscription=projects/bayit-plus/topics/cloud-builds
```

### **Slack Integration**
Configure in Cloud Build console:
https://console.cloud.google.com/cloud-build/triggers?project=bayit-plus

---

**Setup Guide Created**: 2026-01-15  
**Status**: Ready to configure  
**Next Action**: Connect GitHub to Cloud Build (Step 1)
# Auto-deploy configured and tested - Thu Jan 15 08:36:01 EST 2026
