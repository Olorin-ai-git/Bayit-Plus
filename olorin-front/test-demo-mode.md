# Demo Mode Test Instructions

## Test Scenarios for Demo Mode

### 1. Enable Demo Mode
- Navigate to the application with `?demo=true&authid=YOUR_AUTH_ID` in the URL
- Example: `http://localhost:3000/?demo=true&authid=test123`
- Once activated, demo mode persists in session storage

### 2. Verify Demo Mode Persistence
- ✓ Removing `?demo=true` from URL should NOT disable demo mode
- ✓ Demo mode remains active even after page refresh
- ✓ Demo mode persists for 24 hours or until explicitly exited
- ✓ Yellow banner appears at top saying "Demo Mode Active"

### 3. Verify Logo is Hidden
- ✓ The Olorin.ai logo should NOT appear in the top AppBar
- ✓ The logo should NOT appear in the mobile drawer menu

### 4. Verify Navigation Restrictions
- ✓ Only "New Investigation" and "Investigate with AI" should appear in navigation
- ✓ "Investigations" and "Settings" options should be hidden
- ✓ Desktop navigation bar should only show allowed items
- ✓ Mobile drawer should only show allowed items

### 5. Test Direct URL Access Restrictions
Try accessing restricted pages directly:
- `/investigations` → Should redirect to `/investigation`
- `/settings` → Should redirect to `/investigation`
- `/home` → Should redirect to `/investigation`
- Root path `/` → Should redirect to `/investigation` in demo mode

### 6. Verify API Calls are Blocked
In demo mode, all API calls should be intercepted:
- ✓ OlorinService returns mock data instead of making HTTP requests
- ✓ GAIAService returns mock data instead of making HTTP requests
- ✓ RAGApiService returns mock data instead of making HTTP requests
- ✓ ChatService returns mock data instead of making HTTP requests
- ✓ SettingsService returns mock data instead of making HTTP requests
- ✓ ToolsService returns mock data instead of making HTTP requests
- ✓ AutonomousInvestigationClient simulates WebSocket events without connecting

### 7. Test Allowed Pages
These pages should work normally:
- `/investigation` → New Investigation page
- `/rag` → Investigate with AI page
- `/investigation/123` → Specific investigation page

### 8. Exit Demo Mode
Methods to exit demo mode (for authorized users only):
1. **URL Parameter**: Navigate with `?demo=false`
   - This will clear demo mode from session storage
2. **Session Storage**: Clear browser session storage manually
3. **Internal Method**: Special keyboard shortcut (not disclosed to users)

## Summary of Changes Made

### Robust Demo Mode Implementation

1. **DemoModeContext.tsx** (NEW):
   - Created context provider for demo mode state management
   - Stores demo mode in session storage with 24-hour duration
   - Prevents easy bypass by removing URL parameters after activation
   - Includes periodic checks to enforce demo mode
   - Includes hidden exit mechanism for authorized users

2. **App.tsx**:
   - Added `DemoModeProvider` to wrap the application
   - Created `ProtectedRoute` component using demo mode context
   - Created `RootRedirect` component for dynamic root path handling
   - Routes check demo mode from context, not URL

3. **Layout.tsx**:
   - Uses `useDemoMode` hook from context
   - Filters navigation items based on demo mode state
   - Hides logo in both AppBar and drawer when in demo mode
   - Adds yellow warning banner showing demo mode is active

4. **InvestigationPage.tsx**:
   - Updated to use `useDemoMode` hook from context
   - Demo mode state comes from context, not URL parsing

5. **API Blocking**:
   - All services check `isDemoModeActive()` from session storage
   - Services return mock data instead of making real API calls
   - WebSocket connections are simulated in demo mode
   - No actual HTTP requests are made to backend servers

6. **Key Features**:
   - Demo mode persists across page refreshes and URL changes
   - Users cannot simply remove `?demo=true` to exit demo mode
   - Session storage maintains state for 24 hours
   - Clear visual indicator (yellow banner) when in demo mode
   - Hidden exit mechanism (not disclosed in UI)
   - Only `/investigation` and `/rag` routes accessible in demo mode
   - All restricted routes redirect to `/investigation`
   - All API calls are blocked and return mock data