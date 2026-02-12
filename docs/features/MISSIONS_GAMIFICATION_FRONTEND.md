# Missions & Gamification Frontend

## Overview

Frontend implementation of the daily missions, shekels wallet, and leaderboard gamification system for Bayit+. Built using React Native Web pattern with TypeScript, Zustand state management, and design tokens.

## File Structure

```
web/src/
├── stores/
│   └── missionsStore.ts                # Zustand store for missions state
├── components/missions/
│   ├── MissionCard.tsx                 # Individual mission display
│   ├── LeaderboardPanel.tsx            # Leaderboard with filters
│   └── ShekelBalance.tsx               # Wallet balance widget
└── pages/
    └── MissionsPage.tsx                # Main missions dashboard
```

## Components

### 1. MissionsPage (`web/src/pages/MissionsPage.tsx`)
**Lines:** 120
**Purpose:** Main dashboard with tab navigation

**Features:**
- Three tabs: Missions, Leaderboard, Rewards
- Tab bar with icons and active indicator
- ShekelBalance header visible on all tabs
- Auto-loads missions and balance on mount

**API Calls:**
- `fetchDailyMissions()` on mount
- `fetchBalance()` on mount

### 2. MissionCard (`web/src/components/missions/MissionCard.tsx`)
**Lines:** 80
**Purpose:** Individual mission card with progress tracking

**Features:**
- Icon, title (English + Hebrew), reward amount
- Progress bar (current/target with percentage)
- Status badge (active/completed/claimed/expired)
- Claim button when status is "completed"
- Glass card styling with border

**Props:**
```typescript
{
  mission: MissionData;
  profileId?: string;
}
```

### 3. LeaderboardPanel (`web/src/components/missions/LeaderboardPanel.tsx`)
**Lines:** 100
**Purpose:** Leaderboard display with filtering

**Features:**
- Scope selector: Global / Friends / Family
- Period selector: Daily / Weekly / Monthly / All Time
- Ranked list with medals for top 3
- Highlight current user's row
- "My Rank" section if not in visible range
- Auto-refreshes on scope/period change

**State:**
- Local state for scope and period selection
- Calls `fetchLeaderboard(scope, period, page)` on change

### 4. ShekelBalance (`web/src/components/missions/ShekelBalance.tsx`)
**Lines:** 60
**Purpose:** Compact wallet balance widget

**Features:**
- Large balance display
- Expandable to show total_earned and total_spent
- Glass background with border
- Loading state

### 5. missionsStore (`web/src/stores/missionsStore.ts`)
**Lines:** 80
**Purpose:** Zustand store for state management

**State:**
```typescript
{
  dailyMissions: MissionData[];
  walletBalance: WalletBalance | null;
  leaderboard: LeaderboardData | null;
  loadingMissions: boolean;
  loadingBalance: boolean;
  loadingLeaderboard: boolean;
  error: string | null;
}
```

**Actions:**
- `fetchDailyMissions(profileId?)` - GET `/missions/daily`
- `claimMission(missionId, profileId?)` - POST `/missions/{id}/claim`
- `fetchBalance(profileId?)` - GET `/shekels/balance`
- `fetchLeaderboard(scope, period, page, profileId?)` - GET `/leaderboard/`

**Logging:**
- Uses `logger.scope('MissionsStore')` for structured logging
- Logs success/error for all API calls
- No console.log statements

## Design Tokens Used

All styling uses `@olorin/design-tokens`:

**Colors:**
- `colors.primary[400]` - Primary accent color
- `colors.glass.bgMedium` - Card backgrounds
- `colors.glass.border` - Card borders
- `colors.text` / `colors.textSecondary` - Text hierarchy
- `colors.success[500]` / `colors.error[500]` - Status colors

**Spacing:**
- `spacing[1-12]` - Padding, margins, gaps
- `spacing[4]` - Default padding (16px)

**Border Radius:**
- `borderRadius.md` - 12px for cards
- `borderRadius.lg` - 16px for containers
- `borderRadius.full` - 9999px for pills

**Typography:**
- `fontSize.xs` - 12px (captions)
- `fontSize.sm` - 14px (secondary text)
- `fontSize.base` - 16px (body)
- `fontSize.xl` - 20px (headings)

## API Integration

All API calls use centralized `api` from `@/services/api`:

```typescript
import api from '@/services/api';

// Example: Returns data directly (not full response)
const missions = await api.get('/missions/daily', { 
  params: { profile_id: profileId } 
});
// missions = { missions: MissionData[] }
```

**Endpoints:**
- GET `/api/v1/missions/daily` - Daily missions list
- POST `/api/v1/missions/{mission_id}/claim` - Claim mission
- GET `/api/v1/shekels/balance` - Wallet balance
- GET `/api/v1/leaderboard/` - Leaderboard entries

## State Management

Uses Zustand for reactive state:

```typescript
import { useMissionsStore } from '@/stores/missionsStore';

function Component() {
  const { 
    dailyMissions, 
    loadingMissions, 
    fetchDailyMissions 
  } = useMissionsStore();
  
  useEffect(() => {
    fetchDailyMissions();
  }, []);
}
```

## Error Handling

All API errors are:
1. Caught in store actions
2. Logged via `logger.error()`
3. Set in `error` state field
4. Thrown for UI to handle (e.g., toast notifications)

## Testing Checklist

### Component Tests
- [ ] MissionCard renders all mission fields correctly
- [ ] MissionCard shows Claim button only for completed missions
- [ ] LeaderboardPanel filters work (scope & period)
- [ ] LeaderboardPanel highlights current user
- [ ] ShekelBalance expands/collapses correctly
- [ ] MissionsPage tab switching works

### Integration Tests
- [ ] Fetch daily missions on page load
- [ ] Claim mission updates missions list
- [ ] Claim mission updates wallet balance
- [ ] Leaderboard loads with correct filters
- [ ] Profile-specific missions work with profileId

### API Tests
- [ ] GET /missions/daily returns valid missions
- [ ] POST /missions/{id}/claim succeeds
- [ ] GET /shekels/balance returns valid balance
- [ ] GET /leaderboard/ returns valid entries
- [ ] 401 errors handled correctly
- [ ] Network errors retry properly

### Visual Tests
- [ ] Glass cards render with correct styling
- [ ] Progress bars animate smoothly
- [ ] Status badges show correct colors
- [ ] Responsive layout works on mobile/tablet/desktop
- [ ] Dark theme colors are correct
- [ ] Icons render properly

## Usage Example

```typescript
import MissionsPage from '@/pages/MissionsPage';

// In router
<Route path="/missions" element={<MissionsPage />} />
```

## Next Steps

1. **Add to Router:** Add `/missions` route to main app router
2. **Navigation:** Add menu item in sidebar/navigation
3. **Notifications:** Add toast notifications for mission claims
4. **Analytics:** Track mission completion events
5. **Rewards Store:** Implement rewards redemption when backend ready
6. **Profile Integration:** Pass current profileId from profile context

## Dependencies

- `react-native` - Core UI primitives
- `zustand` - State management
- `lucide-react` - Icons
- `@olorin/design-tokens` - Design system
- `@bayit/shared-utils/logger` - Logging

## Notes

- All files are under 200 lines as required
- No console.log - uses structured logger
- No hardcoded values - uses design tokens
- No emojis in code (except for rank medals in UI)
- React Native Web pattern for cross-platform compatibility
- Glass morphism styling consistent with Bayit+ design
