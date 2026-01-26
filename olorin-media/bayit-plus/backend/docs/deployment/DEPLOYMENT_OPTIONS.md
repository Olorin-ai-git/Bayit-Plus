# Bayit+ Deployment Configuration

Bayit+ Backend is deployed to Google Cloud with dedicated MongoDB infrastructure.

## Current Deployment

**Status:** Active and migrated to new dedicated MongoDB cluster

### Infrastructure:
✅ **GCP Project:** `bayit-plus`
✅ **Cloud Run Service:** `bayit-plus-backend`
✅ **MongoDB Cluster:** `cluster0.fnjp1v.mongodb.net` (NEW - dedicated cluster)
✅ **Database:** `bayit_plus`
✅ **GCS Bucket:** `bayit-plus-media-new`
✅ **Region:** `us-east1`

### Migration History:
- **Original Cluster:** `cluster0.ydrvaft.mongodb.net` (shared, discontinued for Bayit+)
- **New Cluster:** `cluster0.fnjp1v.mongodb.net` (dedicated, January 2026)
- **Status:** Data migrated, old cluster databases deleted (except station_ai)
🆕 **Bayit+ Secrets:** Stripe keys, secret key, CORS settings

### Benefits:
- ✅ **Faster Setup** - Reuses existing infrastructure
- ✅ **Cost Savings** - Shared project, MongoDB cluster, service account
- ✅ **No New OAuth Setup** - Can reuse existing Google credentials
- ✅ **Proven Configuration** - Same region/settings as working Israeli-Radio
- ✅ **Simpler Management** - One GCP project, one MongoDB cluster

### Estimated Setup Time: **20-30 minutes**

### Monthly Cost Estimate:
- Cloud Run (Bayit+): ~$50/month
- GCS Storage (new bucket): ~$2/month for 100GB
- MongoDB (shared cluster): ~$0 additional (same cluster, new DB)
- Secret Manager: ~$0.50/month (new secrets only)
- **Total: ~$52/month**

---

## Option 2: Fresh Infrastructure

**Script:** `./deploy.sh`

### What Gets Created (All New):
🆕 **GCP Project:** New project ID
🆕 **MongoDB Cluster:** New Atlas cluster
🆕 **Service Account:** New dedicated account
🆕 **OAuth Setup:** New Google OAuth app
🆕 **All Secrets:** Complete new setup
🆕 **Cloud Run Service:** Fresh deployment
🆕 **GCS Bucket:** New storage bucket

### Benefits:
- ✅ **Complete Isolation** - Totally separate from Israeli-Radio
- ✅ **Independent Billing** - Separate GCP billing
- ✅ **Separate Quotas** - Won't affect Israeli-Radio quotas

### Drawbacks:
- ❌ **More Setup Time** - 60-90 minutes
- ❌ **Higher Costs** - Separate MongoDB cluster (~$10-30/month more)
- ❌ **More Complexity** - Two projects to manage
- ❌ **Duplicate OAuth Setup** - Need new credentials

### Estimated Setup Time: **60-90 minutes**

### Monthly Cost Estimate:
- Cloud Run: ~$50/month
- GCS Storage: ~$2/month
- MongoDB Cluster: ~$10-30/month (M10 shared tier)
- Secret Manager: ~$1/month
- **Total: ~$63-83/month**

---

## Comparison Table

| Aspect | Existing Infra | Fresh Infra |
|--------|---------------|-------------|
| Setup Time | 20-30 min | 60-90 min |
| Monthly Cost | ~$52 | ~$63-83 |
| GCP Projects | 1 (shared) | 2 (separate) |
| MongoDB | Shared cluster | New cluster |
| OAuth Setup | Reuse | New setup |
| Service Account | Reuse | New account |
| Isolation | Shared project | Complete |
| Management | Simpler | More complex |

---

## Recommendation: Use Existing Infrastructure

**Why?**

1. **Cost Effective** - Save ~$15-30/month on MongoDB
2. **Faster** - Reuse credentials, OAuth, service accounts
3. **Proven** - Same configuration as working Israeli-Radio
4. **Simple** - One project to manage, one cluster to maintain
5. **Safe** - Separate databases, Cloud Run services, GCS buckets ensure isolation where it matters

**Isolation is Maintained:**
- ✅ Separate Cloud Run services (independent scaling, billing)
- ✅ Separate GCS buckets (isolated storage)
- ✅ Separate MongoDB databases (isolated data)
- ✅ Bayit+-specific secrets (isolated credentials)
- ✅ Independent deployments (won't affect each other)

---

## Quick Start with Existing Infrastructure

```bash
cd /Users/olorin/Documents/olorin/backend

# Review configuration
cat .gcp-config

# Run deployment
./deploy-with-existing-infra.sh
```

The script will:
1. ✅ Detect existing Israeli-Radio infrastructure
2. ✅ Reuse service account and OAuth credentials
3. ✅ Create new GCS bucket for Bayit+
4. ✅ Setup new database on existing MongoDB cluster
5. ✅ Create Bayit+-specific secrets
6. ✅ Deploy to Cloud Run
7. ✅ Configure everything automatically

---

## What the Scripts Do

### `deploy-with-existing-infra.sh`
- Uses GCP project: `israeli-radio-475c9`
- Reads service account from: `/Users/olorin/Documents/Israeli-Radio-Manager/backend/service-account.json`
- Reads OAuth credentials from: `/Users/olorin/Documents/Israeli-Radio-Manager/backend/credentials.json`
- Creates new MongoDB database: `bayit_plus` on existing cluster
- Creates new secrets with `bayit-` prefix to avoid conflicts
- Deploys to `us-east1` region (same as Israeli-Radio)

### `deploy.sh`
- Prompts for new GCP project ID
- Creates all new resources from scratch
- No dependencies on Israeli-Radio
- Complete independence

---

## Migration Path

Start with existing infrastructure now, migrate later if needed:

1. **Phase 1 (Now):** Deploy using existing infrastructure
2. **Phase 2 (Later):** If you need complete isolation:
   ```bash
   # Create new project
   gcloud projects create bayit-plus-prod

   # Run fresh deployment
   cd /Users/olorin/Documents/olorin/backend
   ./deploy.sh

   # Migrate data
   # (MongoDB export/import, GCS transfer)
   ```

---

## Security Considerations

### Shared Project Security:
- ✅ Service accounts can be scoped per-service
- ✅ Secret access is per-service (Bayit+ can't access Israeli-Radio secrets)
- ✅ GCS buckets have separate IAM policies
- ✅ Cloud Run services are isolated
- ✅ MongoDB databases are access-controlled

### When to Use Separate Project:
- ❌ If you need different billing owners
- ❌ If you need completely separate quotas
- ❌ If compliance requires project-level isolation
- ❌ If you want zero risk of accidental cross-service access

For most cases, **shared project with separate resources is secure and recommended**.

---

## Next Steps

### Recommended Approach:
```bash
# 1. Review the configuration
cat /Users/olorin/Documents/olorin/backend/.gcp-config

# 2. Deploy using existing infrastructure
./deploy-with-existing-infra.sh

# 3. Test the deployment
curl https://[SERVICE-URL]/health

# 4. Update external services (Stripe, OAuth)

# 5. Deploy frontend to Firebase (optional)
```

### If You Choose Fresh Infrastructure:
```bash
./deploy.sh
# Follow the prompts for a complete new setup
```

---

## Support & References

- **Israeli-Radio Config:** `/Users/olorin/Documents/Israeli-Radio-Manager/backend/.env.example`
- **Service Account:** `/Users/olorin/Documents/Israeli-Radio-Manager/backend/service-account.json`
- **GCP Console:** https://console.cloud.google.com/home/dashboard?project=israeli-radio-475c9
- **MongoDB Atlas:** https://cloud.mongodb.com/ (cluster: cluster0.ydrvaft.mongodb.net)

---

**Ready to deploy?**

Run: `./deploy-with-existing-infra.sh` (recommended)
Or: `./deploy.sh` (fresh infrastructure)
