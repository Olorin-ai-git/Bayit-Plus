# Emoji-to-Icons Migration - Remaining Files

## Migration Status

### Completed Files
1. ✅ CampaignsListScreen.tsx - COMPLETE
2. ✅ EmailCampaignsScreen.tsx - COMPLETE
3. ✅ PlanManagementScreen.tsx - COMPLETE

### Remaining Files to Migrate

#### 4. PushNotificationsScreen.tsx
- Line 229: `✏️` → `<NativeIcon name="edit" size={12} color={colors.text} />`
- Line 232: `📅` → `<NativeIcon name="calendar" size={12} color={colors.warning} />`
- Line 233: `📤` → `<NativeIcon name="send" size={12} color={colors.success} />`
- Line 236: `🗑️` → `<NativeIcon name="trash" size={12} color={colors.error} />`

#### 5. RefundsScreen.tsx
- Line 179: `✅` → `<NativeIcon name="checkCircle" size={14} color={colors.success} />`
- Line 182: `❌` → `<NativeIcon name="xCircle" size={14} color={colors.error} />`

#### 6. SubscriptionsScreen.tsx
- Line 259: `📅` → `<NativeIcon name="calendar" size={12} color={colors.text} />`
- Line 262: `🏷️` → `<NativeIcon name="tag" size={12} color={colors.text} />`
- Line 266: `⏸️` → `<NativeIcon name="pause" size={12} color={colors.warning} />`
- Line 270: `▶️` → `<NativeIcon name="play" size={12} color={colors.success} />`
- Line 275: `❌` → `<NativeIcon name="x" size={12} color={colors.error} />`
- Line 284: `⚙️` → `<NativeIcon name="settings" size={14} color={colors.text} />`
- Line 294: `✅` → `<NativeIcon name="checkCircle" size={20} color="#10b981" />`
- Line 295: `📉` → `<NativeIcon name="trendingDown" size={20} color={churnAnalytics?.churn_rate < 5 ? "#10b981" : "#ef4444"} />`
- Line 296: `⚠️` → `<NativeIcon name="alertTriangle" size={20} color="#f59e0b" />`
- Line 297: `📈` → `<NativeIcon name="trendingUp" size={20} color="#a855f7" />`

#### 7. TransactionsScreen.tsx
- Line 235: `👁️` → `<NativeIcon name="eye" size={14} color={colors.text} />`
- Line 241: `📄` → `<NativeIcon name="fileText" size={14} color={colors.text} />`
- Line 248: `↩️` → `<NativeIcon name="cornerUpLeft" size={14} color={colors.error} />`
- Line 257: `🔍` → `<NativeIcon name="search" size={16} color={colors.text} style={{ marginRight: spacing.xs }} />`
- Line 260: `📥` → `<NativeIcon name="download" size={14} color={colors.text} style={{ marginRight: 4 }} />`

#### 8. UploadsScreen.tsx
- Line 179: `⚠️` → `<NativeIcon name="alertTriangle" size={16} color={colors.warning} />`
- Line 196: `📊` → `<NativeIcon name="barChart" size={20} color={colors.primary} />`
- Line 202: `⏳` → `<NativeIcon name="clock" size={20} color={colors.warning} />`
- Line 208: `✅` → `<NativeIcon name="checkCircle" size={20} color={colors.success} />`
- Line 214: `❌` → `<NativeIcon name="xCircle" size={20} color={colors.error} />`

#### 9. UserDetailScreen.tsx
- Line 320: `🔑` → `<NativeIcon name="key" size={14} color={colors.text} style={{ marginRight: 4 }} />`
- Line 326: `🚫` → `<NativeIcon name="slash" size={14} color={colors.text} style={{ marginRight: 4 }} />`
- Line 332: `🗑️` → `<NativeIcon name="trash" size={14} color={colors.text} style={{ marginRight: 4 }} />`
- Line 588: `💳` → `<NativeIcon name="creditCard" size={18} color={colors.text} />`

#### 10. UsersListScreen.tsx
- Line 300: `👁️` → `<NativeIcon name="eye" size={14} color={colors.text} />`
- Line 306: `🔑` → `<NativeIcon name="key" size={14} color={colors.text} />`
- Line 311: `🚫` → `<NativeIcon name="slash" size={14} color={colors.text} />`
- Line 318: `🗑️` → `<NativeIcon name="trash" size={14} color={colors.error} />`
- Line 340: `🔍` → `<NativeIcon name="search" size={16} color={colors.text} style={{ marginRight: spacing.xs }} />`
- Line 349: `+` → `<NativeIcon name="plus" size={18} color={colors.text} style={{ marginRight: spacing.xs }} />`

## Next Steps

For each remaining file:
1. Add import: `import { NativeIcon } from '@olorin/shared-icons/native';`
2. Replace emoji Text elements with NativeIcon components
3. Remove unused `actionIcon` or similar icon text styles from StyleSheet
4. Test on iOS, tvOS, and Web platforms

## Icon Name Reference

Common mappings used:
- ✏️ → edit
- 🗑️ → trash
- ✓/✅ → check / checkCircle
- ✕/❌ → x / xCircle
- 📊 → barChart
- 💳 → creditCard
- 📧 → mail
- 👤/👁️ → user / eye
- 🔒/🔑 → lock / key
- 📤 → send
- 🔍 → search
- ⚙️ → settings
- 📅 → calendar
- ⏸️ → pause
- ▶️ → play
- 🏷️ → tag
- ⚠️ → alertTriangle
- 📈 → trendingUp
- 📉 → trendingDown
- ⏳ → clock
- 📄 → fileText
- 📥 → download
- ↩️ → cornerUpLeft
- 🚫 → slash
- 🧪 → flask
