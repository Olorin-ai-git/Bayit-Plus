# MongoDB Atlas Configuration

This document explains the MongoDB setup for Bayit+ and Station AI (Israeli Radio Manager).

## Architecture

**Two separate MongoDB clusters:**

| Platform | Cluster | Database | URI |
|----------|---------|----------|-----|
| **Bayit+** (Streaming) | `cluster0.fnjp1v` | `bayit_plus` | `MONGODB_URI` |
| **Station AI** (Radio Manager) | `cluster0.ydrvaft` | `station_ai` | `STATION_AI_MONGODB_URI` |

## Configuration Files

### 1. Backend Configuration (backend/.env)

```bash
# ============================================
# BAYIT+ MONGODB DATABASE
# ============================================
MONGODB_URI=mongodb+srv://admin_db_user:<password>@cluster0.fnjp1v.mongodb.net/bayit_plus?retryWrites=true&w=majority&appName=Cluster0
MONGODB_DB_NAME=bayit_plus

# ============================================
# STATION AI MONGODB DATABASE
# ============================================
STATION_AI_MONGODB_URI=mongodb+srv://admin_db_user:<password>@cluster0.ydrvaft.mongodb.net/station_ai?retryWrites=true&w=majority&appName=Cluster0
STATION_AI_MONGODB_DB_NAME=station_ai
```

**Replace `<password>` with actual MongoDB Atlas password**

### 2. Environment Variable Export

```bash
# Load MongoDB environment variables
source scripts/environment/export-mongodb-vars.sh

# Check exports
echo $MONGODB_URI
echo $STATION_AI_MONGODB_URI
```

## Deployment

### Local Development

```bash
# 1. Update backend/.env with correct passwords
cd backend
nano .env  # Or use your editor

# 2. Export MongoDB variables
source ../scripts/environment/export-mongodb-vars.sh

# 3. Start backend
poetry run python -m app.local_server

# 4. Verify connection (in new terminal)
curl http://localhost:8000/health
```

### Google Cloud Deployment

```bash
# 1. Update backend/.env with MongoDB URIs
# 2. Deploy with deploy_server.sh (handles secret creation)

cd deployment/scripts
./deploy_server.sh

# This will:
# - Read MONGODB_URI and create secret: bayit-mongodb-url
# - Read STATION_AI_MONGODB_URI and create secret: station-ai-mongodb-url
# - Grant service account access to both secrets
# - Deploy to Cloud Run
```

### Cloud Run Secrets

The deployment script automatically creates these secrets:

**Bayit+ secrets:**
- `bayit-mongodb-url` - Full MongoDB connection string
- `bayit-mongodb-db-name` - Database name

**Station AI secrets:**
- `station-ai-mongodb-url` - Full MongoDB connection string
- `station-ai-mongodb-db-name` - Database name

View all secrets:
```bash
gcloud secrets list | grep mongodb
```

View secret version:
```bash
gcloud secrets versions access latest --secret="bayit-mongodb-url"
```

## Data Isolation

**Bayit+ and Station AI use:**
- ✅ Separate MongoDB Atlas clusters
- ✅ Separate databases within same cluster (optional: can be separate clusters)
- ✅ Separate environment variables
- ✅ Separate Cloud Run secrets

**This ensures:**
- Complete data isolation between platforms
- Independent scaling and backup
- Security: credentials stored in Google Secret Manager
- Easy multi-tenant support

## Atlas Configuration Checklist

### For Bayit+ Cluster (cluster0.fnjp1v):

- [ ] Create user: `admin_db_user` with secure password
- [ ] Create database: `bayit_plus`
- [ ] Add IP whitelist for:
  - [ ] Google Cloud Run (0.0.0.0/0 or specific IP range)
  - [ ] Local development (your IP)
  - [ ] CI/CD pipeline
- [ ] Enable Network Access
- [ ] Configure backups and PITR (Point-in-Time Recovery)
- [ ] Set up monitoring and alerts

### For Station AI Cluster (cluster0.ydrvaft):

- [ ] Create user: `admin_db_user` with secure password
- [ ] Create database: `station_ai`
- [ ] Add IP whitelist for:
  - [ ] Google Cloud Run (0.0.0.0/0 or specific IP range)
  - [ ] Local development (your IP)
- [ ] Enable Network Access
- [ ] Configure backups and PITR

## Troubleshooting

### Connection Failed

```bash
# Check environment variables are exported
env | grep MONGODB_URI

# Test connection directly
python3 -c "from pymongo import MongoClient; client = MongoClient('$MONGODB_URI'); print(client.server_info())"

# Check MongoDB Atlas:
# 1. Verify IP whitelist includes your IP
# 2. Verify user credentials are correct
# 3. Check network connectivity: telnet cluster0.fnjp1v.mongodb.net 27017
```

### Wrong Cluster Connection

```bash
# Verify you're connecting to correct cluster:
echo "Bayit+ cluster:"
gcloud secrets versions access latest --secret="bayit-mongodb-url" | grep -o "cluster0\.[^.]*"

echo "Station AI cluster:"
gcloud secrets versions access latest --secret="station-ai-mongodb-url" | grep -o "cluster0\.[^.]*"
```

### Database Not Found

```bash
# List available databases in cluster
mongo $MONGODB_URI
> show dbs

# Verify MONGODB_DB_NAME environment variable
echo $MONGODB_DB_NAME
```

## Migration Guide

If migrating existing data between clusters:

```bash
# 1. Dump from source cluster
mongodump --uri "$SOURCE_MONGODB_URI" --out /tmp/dump

# 2. Restore to target cluster
mongorestore --uri "$TARGET_MONGODB_URI" /tmp/dump

# 3. Verify migration
mongo $TARGET_MONGODB_URI
> use bayit_plus
> db.collection.countDocuments()
```

## Security Best Practices

1. **Never commit real credentials** to version control
2. **Use `.env.example`** with placeholder values
3. **Store passwords in Google Secret Manager** (never in code)
4. **Rotate credentials regularly** in MongoDB Atlas
5. **Use separate users per environment** (dev, staging, prod)
6. **Enable audit logging** in MongoDB Atlas
7. **Restrict network access** to known IP ranges
8. **Enable encryption at rest** in MongoDB Atlas
9. **Use VPC peering** instead of IP whitelist in production

## References

- [MongoDB Atlas Connection String](https://docs.mongodb.com/manual/reference/connection-string/)
- [Google Secret Manager](https://cloud.google.com/secret-manager)
- [Cloud Run Configuration](https://cloud.google.com/run/docs/configuring/environment-variables)
