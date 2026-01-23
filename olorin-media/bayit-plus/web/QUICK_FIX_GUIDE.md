# QUICK FIX GUIDE - 3 Critical Violations

**Estimated Total Time:** 15 minutes
**Files Affected:** 2
**Blocking Production:** YES

---

## Fix #1: EPGSmartSearch Button (5 minutes)

**File:** `src/components/epg/EPGSmartSearch.tsx`
**Line:** 86

### Step 1: Add imports
```tsx
// Add to imports at top of file (around line 3)
import { GlassButton } from '@bayit/shared/ui'
import { useNavigate } from 'react-router-dom'
```

### Step 2: Add navigate hook
```tsx
// Add inside component (around line 18)
const navigate = useNavigate()
```

### Step 3: Replace button
```tsx
// FIND (line 86-88):
<button className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg font-medium transition-colors text-sm">
  {t('common.upgrade')}
</button>

// REPLACE WITH:
<GlassButton 
  variant="primary" 
  size="sm"
  className="bg-yellow-500 hover:bg-yellow-600 text-black"
  onPress={() => navigate('/subscribe')}
>
  {t('common.upgrade')}
</GlassButton>
```

---

## Fix #2: UserDetailPage Alert #1 (5 minutes)

**File:** `src/pages/admin/UserDetailPage.tsx`
**Line:** 175

### Step 1: Update useModal destructure
```tsx
// FIND (line 58):
const { showConfirm } = useModal();

// REPLACE WITH:
const { showConfirm, showAlert } = useModal();
```

### Step 2: Replace alert call
```tsx
// FIND (line 175):
alert(errorMessage);

// REPLACE WITH:
showAlert({
  title: t('admin.users.resetPasswordFailed'),
  message: errorMessage,
  variant: 'error'
});
```

---

## Fix #3: UserDetailPage Alert #2 (5 minutes)

**File:** `src/pages/admin/UserDetailPage.tsx`
**Line:** 191

### Replace alert call
```tsx
// FIND (line 191):
alert(error?.message || 'Failed to delete user');

// REPLACE WITH:
showAlert({
  title: t('admin.users.deleteFailed'),
  message: error?.message || t('admin.users.deleteFailedMessage'),
  variant: 'error'
});
```

---

## Verification Checklist

After making all 3 fixes:

### Build & Lint
```bash
npm run typecheck  # Should pass
npm run lint       # Should pass
npm run build      # Should succeed
```

### Manual Testing
- [ ] EPG smart search opens
- [ ] Premium upgrade button works
- [ ] Admin user detail page loads
- [ ] Password reset error shows modal (not alert)
- [ ] User delete error shows modal (not alert)

### Code Verification
```bash
# Verify no native buttons
grep -r "<button" src/components/epg/EPGSmartSearch.tsx
# Should return: 0 results

# Verify no alert() calls
grep -n "alert(" src/pages/admin/UserDetailPage.tsx
# Should return: 0 results
```

---

## Common Issues

### Issue: GlassButton not found
**Solution:** Verify @bayit/shared is properly linked
```bash
ls -la node_modules/@bayit/shared
```

### Issue: showAlert not a function
**Solution:** Check ModalContext implementation has showAlert method

### Issue: Navigation doesn't work
**Solution:** Verify useNavigate is imported from react-router-dom

---

## Quick Commands

```bash
# Open files in VS Code
code src/components/epg/EPGSmartSearch.tsx
code src/pages/admin/UserDetailPage.tsx

# Search for violations
grep -n "<button" src/components/epg/EPGSmartSearch.tsx
grep -n "alert(" src/pages/admin/UserDetailPage.tsx

# Test build
npm run build
```

---

**Total Time:** ~15 minutes
**Production Ready:** After these 3 fixes + console cleanup (optional)

