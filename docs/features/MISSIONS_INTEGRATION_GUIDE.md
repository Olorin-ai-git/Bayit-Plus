# Missions & Gamification Integration Guide

## Quick Start

### 1. Add Route to Router

```typescript
// In your main router file (e.g., App.tsx or routes.tsx)
import MissionsPage from '@/pages/MissionsPage';

// Add route
<Route path="/missions" element={<MissionsPage />} />
```

### 2. Add Navigation Menu Item

```typescript
// In sidebar/navigation component
import { Target } from 'lucide-react';

<MenuItem 
  icon={<Target size={20} />}
  label="Missions"
  to="/missions"
/>
```

### 3. Test API Endpoints

```bash
# Backend should be running on port 8000
cd backend && poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Test endpoints with curl
curl http://localhost:8000/api/v1/missions/daily
curl http://localhost:8000/api/v1/shekels/balance
curl http://localhost:8000/api/v1/leaderboard/?scope=global&period=weekly
```

### 4. Frontend Testing

```bash
cd web && npm start

# Navigate to http://localhost:3000/missions
# Should see:
# - ShekelBalance widget at top
# - Three tabs: Missions, Leaderboard, Rewards
# - Mission cards with progress bars
# - Claim buttons for completed missions
```

## Component Usage

### Standalone Components

```typescript
// Use ShekelBalance anywhere
import { ShekelBalance } from '@/components/missions/ShekelBalance';

<ShekelBalance />

// Use MissionCard for custom mission displays
import { MissionCard } from '@/components/missions/MissionCard';

<MissionCard mission={missionData} profileId={currentProfileId} />

// Use LeaderboardPanel for custom leaderboard views
import { LeaderboardPanel } from '@/components/missions/LeaderboardPanel';

<LeaderboardPanel />
```

### Store Integration

```typescript
// Access missions state anywhere
import { useMissionsStore } from '@/stores/missionsStore';

function MyComponent() {
  const { 
    dailyMissions, 
    walletBalance, 
    fetchDailyMissions, 
    claimMission 
  } = useMissionsStore();

  useEffect(() => {
    fetchDailyMissions(profileId);
  }, [profileId]);

  return (
    <div>
      <p>Balance: {walletBalance?.balance}</p>
      {dailyMissions.map(m => (
        <button onClick={() => claimMission(m.id, profileId)}>
          Claim {m.title}
        </button>
      ))}
    </div>
  );
}
```

## Profile Integration

### With Profile Context

```typescript
import { useProfile } from '@/contexts/ProfileContext';
import { useMissionsStore } from '@/stores/missionsStore';

function MissionsWithProfile() {
  const { currentProfile } = useProfile();
  const { fetchDailyMissions } = useMissionsStore();

  useEffect(() => {
    if (currentProfile?.id) {
      fetchDailyMissions(currentProfile.id);
    }
  }, [currentProfile]);

  return <MissionsPage />;
}
```

## Error Handling & Notifications

### Add Toast Notifications

```typescript
import { useMissionsStore } from '@/stores/missionsStore';
import { toast } from 'react-hot-toast'; // or your toast library

function MissionCardWithToast({ mission, profileId }) {
  const { claimMission, error } = useMissionsStore();

  const handleClaim = async () => {
    try {
      await claimMission(mission.id, profileId);
      toast.success(`Claimed ${mission.reward_amount} shekels!`);
    } catch (err) {
      toast.error(error || 'Failed to claim mission');
    }
  };

  return <MissionCard mission={mission} onClaim={handleClaim} />;
}
```

## Testing Scenarios

### Manual Testing

1. **Load Page:**
   - Navigate to `/missions`
   - Verify missions load
   - Check balance displays

2. **Claim Mission:**
   - Complete a mission requirement (e.g., watch video)
   - Click "Claim" button
   - Verify balance updates
   - Check mission status changes to "claimed"

3. **Leaderboard:**
   - Switch between Global/Friends/Family
   - Change period (Daily/Weekly/Monthly/All Time)
   - Verify current user row is highlighted
   - Check "My Rank" section appears if rank > 10

4. **ShekelBalance:**
   - Click to expand
   - Verify total_earned and total_spent show
   - Click again to collapse

### API Testing

```bash
# Test with auth token
TOKEN="your_jwt_token_here"

# Get missions
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/missions/daily

# Claim mission
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  http://localhost:8000/api/v1/missions/MISSION_ID/claim

# Get balance
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/shekels/balance

# Get leaderboard
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/v1/leaderboard/?scope=global&period=weekly&page=1"
```

## Troubleshooting

### "No missions available"
- Check backend is running on port 8000
- Verify mission generation cronjob has run
- Check user has completed onboarding
- Inspect network tab for API errors

### "Failed to fetch balance"
- Verify auth token is valid
- Check backend logs for errors
- Ensure shekels collection exists in MongoDB

### Leaderboard empty
- Verify at least one user has completed a mission
- Check scope filter (global vs friends vs family)
- Inspect backend response in network tab

### Progress bar not showing
- Verify mission has target_value > 0
- Check current_value is numeric
- Ensure mission status is correct

## Production Checklist

- [ ] Backend endpoints tested with real data
- [ ] Frontend routes added to router
- [ ] Navigation menu item added
- [ ] Profile integration working
- [ ] Error handling with user-friendly messages
- [ ] Loading states show during API calls
- [ ] Responsive design verified on mobile/tablet/desktop
- [ ] Analytics events tracked (mission claim, etc.)
- [ ] CORS configured for production domain
- [ ] Rate limiting tested and working

## Next Features

1. **Rewards Store:** Implement shekel redemption UI
2. **Mission Notifications:** Push notifications for completed missions
3. **Streaks:** Visual streak indicators and bonuses
4. **Achievements:** Badge system for milestones
5. **Social Sharing:** Share leaderboard rank on social media
