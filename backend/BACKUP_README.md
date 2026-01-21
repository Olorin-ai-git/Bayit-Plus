# Database Backup System

Automatic daily backups for the Bayit+ MongoDB database to prevent data loss.

## 🚀 Quick Setup

Install automatic daily backups (runs at 3 AM every day):

```bash
cd /Users/olorin/Documents/olorin/backend/scripts
./setup_backup_schedule.sh
```

## 📁 What Gets Backed Up

- **Database**: `bayit_plus`
- **Location**: `/Users/olorin/Documents/olorin/backend/backups/`
- **Format**: Compressed tar.gz files
- **Retention**: 30 days (automatic rotation)

## ⏰ Backup Schedule

- **Frequency**: Daily
- **Time**: 3:00 AM
- **Automatic Cleanup**: Backups older than 30 days are automatically deleted

## 📝 Files Created

1. **Backup Script**: `scripts/backup_database.sh`
   - Performs the actual backup
   - Compresses backups to save space
   - Rotates old backups
   - Logs all operations

2. **Setup Script**: `scripts/setup_backup_schedule.sh`
   - Installs the automatic schedule
   - Configures macOS launchd

3. **Restore Script**: `scripts/restore_database.sh`
   - Interactive restore from any backup
   - Lists all available backups
   - Requires confirmation before restoring

4. **Schedule Config**: `scripts/com.bayitplus.backup.plist`
   - macOS launchd configuration
   - Defines when backups run

## 🔧 Manual Operations

### Run a Backup Manually

```bash
cd /Users/olorin/Documents/olorin/backend/scripts
./backup_database.sh
```

### Restore from Backup

```bash
cd /Users/olorin/Documents/olorin/backend/scripts
./restore_database.sh
```

The restore script will:
1. List all available backups
2. Let you choose which one to restore
3. Require typing 'RESTORE' to confirm
4. Replace the current database with the backup

### View Backup Status

```bash
# Check if backup schedule is running
launchctl list | grep bayitplus

# View backup log
tail -f /Users/olorin/Documents/olorin/backend/backups/backup.log

# List all backups
ls -lh /Users/olorin/Documents/olorin/backend/backups/*.tar.gz
```

### Disable Automatic Backups

```bash
launchctl unload ~/Library/LaunchAgents/com.bayitplus.backup.plist
```

### Enable Automatic Backups

```bash
launchctl load ~/Library/LaunchAgents/com.bayitplus.backup.plist
```

## 📊 Backup Details

Each backup includes:
- All content items (movies, series, episodes)
- Categories
- Live channels
- Radio stations
- Podcasts and episodes
- User data
- Profiles
- Watchlists and favorites
- Configuration

## 🔍 Troubleshooting

### Backup Not Running

Check if launchd job is loaded:
```bash
launchctl list | grep bayitplus
```

If not listed, reload it:
```bash
launchctl load ~/Library/LaunchAgents/com.bayitplus.backup.plist
```

### Check Backup Logs

View the backup log:
```bash
cat /Users/olorin/Documents/olorin/backend/backups/backup.log
```

View error log:
```bash
cat /Users/olorin/Documents/olorin/backend/backups/backup_stderr.log
```

### Disk Space Issues

Check backup directory size:
```bash
du -sh /Users/olorin/Documents/olorin/backend/backups
```

Reduce retention period by editing `backup_database.sh`:
```bash
RETENTION_DAYS=7  # Change from 30 to 7 days
```

### MongoDB Not Found

Ensure MongoDB is installed and `mongodump`/`mongorestore` are in PATH:
```bash
which mongodump
which mongorestore
```

If not found, install MongoDB tools:
```bash
brew install mongodb-database-tools
```

## 🔐 Security Notes

- Backups are stored locally on your machine
- Consider encrypting backups for sensitive data
- Ensure backup directory has proper permissions
- Consider off-site backup copies for disaster recovery

## 📈 Backup Size Expectations

Typical backup sizes (compressed):
- Small database (< 100 items): 1-5 MB
- Medium database (100-1000 items): 5-50 MB
- Large database (> 1000 items): 50-500 MB

With 30-day retention:
- Small: ~30-150 MB total
- Medium: ~150 MB - 1.5 GB total
- Large: ~1.5 GB - 15 GB total

## 🆘 Emergency Restore

If you need to restore immediately:

```bash
# Quick restore from latest backup
cd /Users/olorin/Documents/olorin/backend/backups
latest=$(ls -t *.tar.gz | head -1)
temp_dir=$(mktemp -d)
tar -xzf "$latest" -C "$temp_dir"
mongorestore --db bayit_plus --drop "$temp_dir"/*/bayit_plus
rm -rf "$temp_dir"
```

## 💾 Off-Site Backup (Recommended)

For extra safety, consider syncing backups to cloud storage:

```bash
# Example: Sync to iCloud Drive
cp /Users/olorin/Documents/olorin/backend/backups/*.tar.gz \
   ~/Library/Mobile\ Documents/com~apple~CloudDocs/Bayit-Backups/

# Example: Sync to external drive
rsync -av /Users/olorin/Documents/olorin/backend/backups/ \
   /Volumes/ExternalDrive/Bayit-Backups/
```

---

**Automatic Backups Status**: ✅ Configured
**Retention Period**: 30 days
**Last Setup**: 2026-01-11
