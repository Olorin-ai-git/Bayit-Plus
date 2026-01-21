# Firebase Functions Migration Backup System - Quick Reference

## Common Commands

### Backup Operations
```bash
# Pre-migration full backup
./scripts/migration/backup-system.sh full 6 true true

# Incremental backup
./scripts/migration/backup-system.sh incremental 3 true true

# Emergency backup
./scripts/migration/backup-system.sh emergency 1 false true "reason"
```

### Verification Operations
```bash
# Quick verification of latest backup
./scripts/migration/verify-backups.sh quick latest

# Full verification of specific backup
./scripts/migration/verify-backups.sh full BACKUP_ID

# Integrity check only
./scripts/migration/verify-backups.sh integrity BACKUP_ID
```

### Restore Operations
```bash
# Test restore (recommended first)
./scripts/migration/restore-system.sh BACKUP_ID /tmp/test-restore test false

# Full restore
./scripts/migration/restore-system.sh BACKUP_ID /path/to/restore full false

# Emergency restore
./scripts/migration/restore-system.sh BACKUP_ID /path/to/restore emergency false
```

## Command Parameters

### Backup System Parameters
1. **Backup Type**: `full`, `incremental`, `emergency`
2. **Compression Level**: `1-9` (higher = better compression, slower)
3. **Encryption**: `true`/`false`
4. **Cleanup**: `true`/`false` (cleanup old backups)
5. **Reason**: Text description (for emergency backups)

### Verification Parameters
1. **Type**: `quick`, `full`, `integrity`, `restore-test`
2. **Backup ID**: Specific backup ID or `latest`
3. **Parallel**: `true`/`false` (parallel checks)
4. **Restore Test**: `true`/`false` (perform actual restore test)

### Restore Parameters
1. **Backup ID**: Required - specific backup to restore
2. **Target Directory**: Where to restore (default: current project)
3. **Mode**: `full`, `selective`, `test`, `emergency`
4. **Dry Run**: `true`/`false` (test mode)

## File Locations

### Scripts
- **Backup**: `/scripts/migration/backup-system.sh`
- **Verify**: `/scripts/migration/verify-backups.sh`
- **Restore**: `/scripts/migration/restore-system.sh`
- **Test**: `/scripts/migration/test-backup-system.sh`

### Configuration
- **Backup Config**: `/scripts/migration/config/backup-settings.json`
- **Migration Config**: `/scripts/migration/config/migration-settings.json`

### Storage
- **Backups**: `/Users/gklainert/Documents/cvplus/backups/migration/`
- **Metadata**: `/backups/migration/metadata/`
- **Archives**: `/backups/migration/archives/`
- **Verification**: `/backups/migration/verification/`

## Quick Troubleshooting

### Backup Failed
```bash
# Check disk space
df -h /Users/gklainert/Documents/cvplus/backups/

# Check permissions
ls -la /Users/gklainert/Documents/cvplus/backups/migration/

# Check git status
cd /Users/gklainert/Documents/cvplus && git status
```

### Verification Failed
```bash
# List available backups
ls -la /Users/gklainert/Documents/cvplus/backups/migration/metadata/

# Check specific backup metadata
cat /Users/gklainert/Documents/cvplus/backups/migration/metadata/BACKUP_ID.json
```

### Restore Issues
```bash
# Check backup integrity first
./scripts/migration/verify-backups.sh integrity BACKUP_ID

# Try test restore first
./scripts/migration/restore-system.sh BACKUP_ID /tmp/test-restore test false
```

## Emergency Procedures

### Critical System Failure
1. **Identify last good backup**:
   ```bash
   ls -t /Users/gklainert/Documents/cvplus/backups/migration/metadata/*.json | head -5
   ```

2. **Emergency restore**:
   ```bash
   ./scripts/migration/restore-system.sh BACKUP_ID . emergency false
   ```

3. **Verify critical functions**:
   ```bash
   find functions/src/functions -name "*.ts" | wc -l
   ```

### Data Corruption Detection
1. **Run integrity check**:
   ```bash
   ./scripts/migration/verify-backups.sh integrity latest
   ```

2. **If corruption found, use previous backup**:
   ```bash
   ls -t /Users/gklainert/Documents/cvplus/backups/migration/metadata/*.json | head -10
   ```

## Integration with Migration

### Before Migration
```bash
# 1. Create pre-migration backup
BACKUP_ID=$(./scripts/migration/backup-system.sh full 6 true true)

# 2. Verify backup
./scripts/migration/verify-backups.sh full $BACKUP_ID

# 3. Test restore capability
./scripts/migration/restore-system.sh $BACKUP_ID /tmp/test-restore test false
```

### During Migration
```bash
# Create checkpoint backups at each phase
./scripts/migration/backup-system.sh incremental 3 true true
```

### After Migration
```bash
# Create final backup
./scripts/migration/backup-system.sh full 6 true true

# Verify migration success
./scripts/migration/verify-backups.sh full latest
```

## Monitoring

### Check Backup Health
```bash
# List recent backups
ls -lt /Users/gklainert/Documents/cvplus/backups/migration/metadata/ | head -10

# Check storage usage
du -sh /Users/gklainert/Documents/cvplus/backups/migration/

# Verify latest backup
./scripts/migration/verify-backups.sh quick latest
```

### Log Files
- **Backup logs**: `/tmp/backup-system-*.log`
- **Verification logs**: `/tmp/backup-verification-*.log`
- **Restore logs**: `/tmp/restore-system-*.log`

## Testing

### Run Test Suite
```bash
# Full test suite
./scripts/migration/test-backup-system.sh true true false

# Quick tests only
./scripts/migration/test-backup-system.sh false true false
```

### Manual Testing
```bash
# Test backup creation
./scripts/migration/backup-system.sh full 1 false true

# Test verification
./scripts/migration/verify-backups.sh quick latest

# Test restore
./scripts/migration/restore-system.sh BACKUP_ID /tmp/manual-test test false
```

---

**Need Help?** Contact Gil Klainert (gil@cvplus.com) or refer to the full documentation at `/docs/migration/backup-system-documentation.md`