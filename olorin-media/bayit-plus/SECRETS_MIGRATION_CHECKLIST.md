# Secrets Migration Checklist

## 🎯 Objective
Migrate from hardcoded secrets to Google Cloud Secret Manager as the single source of truth.

## ✅ Completed (By Implementation)

- [x] Created deployment scripts:
  - [x] `scripts/deployment/bayit-plus/create_critical_secrets.sh`
  - [x] `scripts/deployment/bayit-plus/validate_secrets.sh`
  - [x] `scripts/deployment/bayit-plus/sync_secrets_to_gcp.sh`

- [x] Updated configuration files:
  - [x] `cloudbuild.yaml` (17 → 85+ secrets)
  - [x] `backend/cloudbuild.yaml` (3 → 85+ secrets)
  - [x] `backend/.env` (~40 hardcoded secrets → secure placeholders)

- [x] Created documentation:
  - [x] `docs/deployment/SECRET_MANAGEMENT_GUIDE.md`
  - [x] `docs/deployment/SECRETS_IMPLEMENTATION_SUMMARY.md`

## 🚀 User Actions Required (30-45 minutes)

### Step 1: Backup Current Secrets (5 minutes)
```bash
# IMPORTANT: Save current backend/.env before running scripts
# You'll need the real MongoDB URIs for manual secret creation

# Option 1: Copy to safe location
cp backend/.env backend/.env.backup.$(date +%Y%m%d)

# Option 2: Extract just the MongoDB URIs
grep MONGODB_URI backend/.env > mongodb-uris-backup.txt
```

**⚠️ CRITICAL**: The MongoDB URIs in the backup contain real passwords. Store securely and delete after migration.

### Step 2: Create Critical Secrets (10 minutes)
```bash
# Navigate to project root
cd /Users/olorin/Documents/olorin/olorin-media/bayit-plus

# Run critical secrets creation script
./scripts/deployment/bayit-plus/create_critical_secrets.sh

# Expected output:
# ✓ Created: bayit-admin-password (auto-generated secure password)
# ✓ Created: bayit-admin-email
# ✓ Created: bayit-location-encryption-key (auto-generated Fernet key)
# ✓ Created: bayit-elevenlabs-webhook-secret
# ✓ Created: bayit-geonames-username
```

**Note**: Script will prompt you to manually create MongoDB secrets (next step).

### Step 3: Manually Create MongoDB Secrets (10 minutes)

**Extract values from your backup** (backend/.env.backup or mongodb-uris-backup.txt):

```bash
# 1. Bayit+ Main MongoDB
echo -n 'mongodb+srv://admin_db_user:PASSWORD@cluster0.fnjp1v.mongodb.net/bayit_plus?retryWrites=true&w=majority&appName=Cluster0' | \
    gcloud secrets create bayit-mongodb-uri --data-file=-

# 2. Station AI MongoDB (Israeli Radio Manager)
echo -n 'mongodb+srv://admin_db_user:PASSWORD@cluster0.ydrvaft.mongodb.net/station_ai?retryWrites=true&w=majority&appName=Cluster0' | \
    gcloud secrets create station-ai-mongodb-uri --data-file=-

# 3. Olorin Fraud Detection MongoDB
echo -n 'mongodb+srv://admin_db_user:PASSWORD@cluster0.aqe2wwx.mongodb.net/olorin?retryWrites=true&w=majority&appName=Cluster0' | \
    gcloud secrets create olorin-fraud-mongodb-uri --data-file=-

# 4. Olorin Source MongoDB (old cluster)
echo -n 'mongodb+srv://admin_db_user:PASSWORD@cluster0.ydrvaft.mongodb.net/olorin?retryWrites=true&w=majority&appName=Cluster0' | \
    gcloud secrets create olorin-fraud-mongodb-source-uri --data-file=-

# 5. CVPlus MongoDB
echo -n 'mongodb+srv://admin_db_user:PASSWORD@cluster0.xwvtofw.mongodb.net/cvplus_production?retryWrites=true&w=majority&appName=Cluster0' | \
    gcloud secrets create cvplus-mongodb-uri --data-file=-

# 6. CVPlus Source MongoDB (old cluster)
echo -n 'mongodb+srv://admin_db_user:PASSWORD@cluster0.ydrvaft.mongodb.net/cvplus_production?retryWrites=true&w=majority&appName=Cluster0' | \
    gcloud secrets create cvplus-mongodb-source-uri --data-file=-
```

**⚠️ Replace `PASSWORD` with the actual password from your backup.**

### Step 4: Sync All Other Secrets (5 minutes)

**IMPORTANT**: This step uses the CURRENT backend/.env which still has real values (before you committed the placeholder changes).

If you haven't committed the changes yet:
```bash
# First, restore the original .env with real secrets temporarily
git restore backend/.env

# Run sync script
./scripts/deployment/bayit-plus/sync_secrets_to_gcp.sh

# Expected output:
# Created: X secrets
# Updated: Y secrets
# Skipped: Z placeholders

# Now re-apply the placeholder changes
git checkout HEAD -- backend/.env
```

If you've already committed the placeholder changes:
```bash
# You'll need to use your backup
cp backend/.env backend/.env.current
cp backend/.env.backup.YYYYMMDD backend/.env

# Run sync
./scripts/deployment/bayit-plus/sync_secrets_to_gcp.sh

# Restore current version
mv backend/.env.current backend/.env
```

### Step 5: Validate All Secrets (2 minutes)
```bash
./scripts/deployment/bayit-plus/validate_secrets.sh

# Expected output:
# ✅ All secrets validated successfully
# Total placeholder secrets in .env: 85+
# Missing in Secret Manager: 0
```

**If any secrets are missing**:
- Review the output to see which secrets are missing
- Create them manually or re-run sync script

### Step 6: Test Deployment (10 minutes)
```bash
# Deploy using Cloud Build
gcloud builds submit --config=cloudbuild.yaml

# Monitor deployment
gcloud builds list --limit=5

# Wait for deployment to complete (2-5 minutes)
```

### Step 7: Verify Application (5 minutes)

**Check Cloud Run service**:
```bash
# Get service URL
gcloud run services describe bayit-plus-backend --region=us-east1 --format='value(status.url)'

# Check health endpoint
curl https://[SERVICE-URL]/health

# Expected response:
# {"status": "healthy", ...}
```

**Check logs for issues**:
```bash
gcloud run services logs read bayit-plus-backend --region=us-east1 --limit=50

# Look for:
# ✓ "Configuration validation passed"
# ✓ "MongoDB connection successful"
# ✓ No "<from-secret-manager:...>" placeholders
# ✓ No "Secret not found" errors
```

### Step 8: Commit Changes (5 minutes)
```bash
# Add all secret management files
git add backend/.env
git add cloudbuild.yaml
git add backend/cloudbuild.yaml
git add scripts/deployment/bayit-plus/
git add docs/deployment/SECRET_MANAGEMENT_GUIDE.md
git add docs/deployment/SECRETS_IMPLEMENTATION_SUMMARY.md
git add SECRETS_MIGRATION_CHECKLIST.md

# Commit
git commit -m "feat(security): implement single source of truth secrets management

- Migrate all 40+ hardcoded secrets to Google Cloud Secret Manager
- Update cloudbuild.yaml: 17 → 85+ secret references
- Update backend/cloudbuild.yaml: 3 → 85+ secret references
- Replace hardcoded values with secure placeholders in backend/.env
- Add deployment scripts: create, validate, sync secrets
- Add comprehensive SECRET_MANAGEMENT_GUIDE.md
- Standardize naming: bayit-{category}-{name} convention
- Resolve CRITICAL security issues: hardcoded passwords, MongoDB URIs, API keys

Security improvements:
- No secrets in version control
- Single source of truth (Google Cloud Secret Manager)
- Consistent secret references across deployment methods
- Automated validation and sync scripts
"

# Push to remote
git push origin main
```

### Step 9: Clean Up Backups (IMPORTANT)
```bash
# After successful deployment and verification, DELETE backups containing real secrets
rm backend/.env.backup.*
rm mongodb-uris-backup.txt

# Verify no secrets remain in git history (already excluded by .gitignore, but double-check)
git log --all --full-history --source -- backend/.env
```

## 🔍 Verification Checklist

After completing all steps, verify:

- [ ] All scripts run successfully without errors
- [ ] validate_secrets.sh reports 0 missing secrets
- [ ] Cloud Build deployment completes successfully
- [ ] Cloud Run service starts and passes health check
- [ ] Application can connect to MongoDB
- [ ] Stripe integration works (test payment endpoint)
- [ ] No `<from-secret-manager:...>` placeholders in production logs
- [ ] No "Secret not found" errors in logs
- [ ] All third-party services accessible (TMDB, ElevenLabs, etc.)
- [ ] Backup files with real secrets deleted
- [ ] Changes committed and pushed to repository

## 🚨 Troubleshooting

### Issue: "Secret not found" during deployment
**Solution**:
```bash
# Check which secret is missing
gcloud secrets list --filter="name~bayit-"

# Create missing secret
echo -n 'secret_value' | gcloud secrets create bayit-secret-name --data-file=-

# Retry deployment
gcloud builds submit --config=cloudbuild.yaml
```

### Issue: Application can't connect to MongoDB
**Solution**:
```bash
# Verify MongoDB secret value is correct
gcloud secrets versions access latest --secret=bayit-mongodb-uri

# If incorrect, update
echo -n 'correct_mongodb_uri' | gcloud secrets versions add bayit-mongodb-uri --data-file=-

# Redeploy
gcloud builds submit --config=cloudbuild.yaml
```

### Issue: Placeholder appears in production logs
**Solution**:
- This should never happen in Cloud Run (secrets are injected)
- Check cloudbuild.yaml has `--update-secrets=` line for that secret
- Verify secret exists in Secret Manager
- Redeploy

### Issue: "Permission denied" accessing secrets
**Solution**:
```bash
# Grant Cloud Run service account access to secrets
gcloud projects add-iam-policy-binding PROJECT_ID \
    --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \
    --role="roles/secretmanager.secretAccessor"
```

## 📚 Documentation

Refer to these documents for detailed information:

- **SECRET_MANAGEMENT_GUIDE.md**: Comprehensive guide for managing secrets
- **SECRETS_IMPLEMENTATION_SUMMARY.md**: Technical implementation details
- **SECRETS_ENVIRONMENT_AUDIT_2026-01-28.md**: Original audit findings

## 🎉 Success Criteria

Migration is complete when:

✅ All secrets stored in Google Cloud Secret Manager
✅ backend/.env contains only secure placeholders
✅ No secrets in version control
✅ All deployment methods use same secret references
✅ Application runs successfully in production
✅ No security warnings or errors in logs
✅ Backup files with real secrets deleted

## ⏱️ Time Estimate

- **Step 1** (Backup): 5 minutes
- **Step 2** (Critical secrets): 10 minutes
- **Step 3** (MongoDB secrets): 10 minutes
- **Step 4** (Sync secrets): 5 minutes
- **Step 5** (Validate): 2 minutes
- **Step 6** (Deploy): 10 minutes
- **Step 7** (Verify): 5 minutes
- **Step 8** (Commit): 5 minutes
- **Step 9** (Cleanup): 2 minutes

**Total**: 54 minutes (worst case)
**Typical**: 30-40 minutes

## 🔐 Security Notes

- MongoDB URIs contain passwords - handle backups securely
- Delete all backups after successful migration
- Never commit real secrets to version control
- Rotate secrets after migration (recommended)
- Enable secret version expiration (90 days)
- Monitor secret access logs

## 📞 Support

If issues persist:
1. Check application logs: `gcloud run services logs read bayit-plus-backend --region=us-east1 --limit=100`
2. Review SECRET_MANAGEMENT_GUIDE.md troubleshooting section
3. Contact platform team

---

**Ready to begin?** Start with Step 1 above. Good luck! 🚀
