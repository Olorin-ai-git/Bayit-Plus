# Quick Start - Admin Database Cleanup

## 🚀 Run the Cleanup Now

### Step 1: Get Your Admin Token

Login as admin to get your authentication token:
```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@bayit.tv", "password": "your_password"}'
```

Save the `access_token` from the response.

---

### Step 2: Check for Duplicates

```bash
curl -X GET "http://localhost:8000/api/v1/admin/database/verify/culture-cities" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "has_duplicates": true,
  "total_cities": 12,
  "duplicate_count": 2
}
```

---

### Step 3: View What Will Be Removed (Dry Run)

```bash
curl -X POST "http://localhost:8000/api/v1/admin/database/cleanup/culture-cities?dry_run=true" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

This shows you exactly what will be deleted without making any changes.

---

### Step 4: Execute the Cleanup

```bash
curl -X POST "http://localhost:8000/api/v1/admin/database/cleanup/culture-cities?dry_run=false" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Done!** The duplicate cities have been removed.

---

### Step 5: Verify Success

```bash
curl -X GET "http://localhost:8000/api/v1/admin/database/verify/culture-cities" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "has_duplicates": false,
  "total_cities": 10,
  "duplicate_count": 0
}
```

---

## ✅ What This Does

1. **Finds duplicates** - Looks for multiple cities with the same `(culture_id, city_id)`
2. **Keeps oldest** - Preserves the oldest entry for each duplicate
3. **Removes newer** - Deletes the newer duplicate entries
4. **Verifies** - Confirms no duplicates remain

---

## 📊 Expected Results

After cleanup:
- ✅ No more "duplicate key" warnings in React console
- ✅ Jerusalem appears only once in the UI
- ✅ Tel Aviv appears only once in the UI
- ✅ Database has unique `(culture_id, city_id)` combinations

---

## 🔒 Safety Features

- **Admin-only** - Requires admin authentication
- **Dry run first** - Always shows what will be removed before doing it
- **Audit logging** - All cleanup actions are logged
- **Verification** - Confirms results after cleanup

---

## 📚 Full Documentation

See `backend/ADMIN_API_CLEANUP_GUIDE.md` for complete API reference.
