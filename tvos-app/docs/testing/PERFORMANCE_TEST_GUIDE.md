# Performance Test Guide

**Phase 7.5: Performance Profiling**
**Objective:** Meet all performance targets
**Tools:** Xcode Instruments, React Native Performance Monitor

---

## Performance Targets

### Critical Metrics (Must Meet)
| Metric | Target | Measured On | Tool |
|--------|--------|-------------|------|
| **App Launch Time** | < 3 seconds | Cold start | Instruments (Time Profiler) |
| **Screen Transition** | < 300ms | Navigation | React Native Performance |
| **Voice Latency** | < 1.5s | Command → response | Manual timing |
| **Memory Baseline** | < 512MB | Idle state | Instruments (Allocations) |
| **Memory Peak** | < 1GB | 4 windows active | Instruments (Allocations) |
| **CPU Idle** | < 40% | Idle state | Instruments (CPU Usage) |
| **CPU Playback** | < 80% | 4K video | Instruments (CPU Usage) |
| **Frame Rate** | 60fps sustained | All animations | React Native FPS Monitor |
| **Memory Leaks** | 0 leaks | 1 hour session | Instruments (Leaks) |

---

## Testing Environment

### Test Devices (All Required)
1. **Apple TV 4K (3rd gen, 2022)** - Primary target, best performance
2. **Apple TV 4K (2nd gen, 2021)** - Secondary target
3. **Apple TV HD (2015)** - Minimum spec, worst-case performance

### Xcode Instruments Setup
```bash
# Profile app launch time
1. Xcode → Product → Profile (⌘I)
2. Select "Time Profiler" template
3. Target: BayitPlusTVOS on Apple TV device/simulator
4. Record app launch from cold start
5. Analyze call tree for bottlenecks

# Profile memory usage
1. Xcode → Product → Profile (⌘I)
2. Select "Allocations" template
3. Record 1 hour session with navigation
4. Check for memory leaks and growth

# Profile frame rate
1. Enable React Native FPS monitor in dev menu
2. Navigate through app, perform animations
3. Record FPS during transitions and scrolling
```

---

## Test Scenarios

### 1. App Launch Time (< 3s)

**Objective:** Measure cold start to interactive

**Procedure:**
1. Force quit app (double-press TV button → swipe up)
2. Clear app from memory (wait 10s)
3. Launch app from home screen
4. Start timer
5. Stop when HomeScreen fully rendered and interactive
6. Record time

**Measurement Points:**
- **T0:** App icon selected
- **T1:** Splash screen appears
- **T2:** Splash screen disappears
- **T3:** HomeScreen skeleton visible
- **T4:** HomeScreen fully rendered (content loaded)
- **T5:** First element focusable

**Target Breakdown:**
- T0 → T1: < 500ms (splash)
- T1 → T2: < 1000ms (initialization)
- T2 → T4: < 1500ms (rendering + data fetch)
- **Total:** < 3000ms

**Optimization Checklist:**
- [ ] Lazy load non-critical components
- [ ] Optimize React Query initial state
- [ ] Minimize splash screen duration
- [ ] Preload critical data
- [ ] Use Hermes JS engine optimizations

---

### 2. Screen Transition Time (< 300ms)

**Objective:** Smooth navigation between screens

**Test Cases:**
1. Home → Live TV
2. Live TV → Player
3. Player → Home (Menu button)
4. Home → Search
5. Search → VOD
6. VOD → Settings
7. Settings → Profile
8. Profile → Home

**Measurement:**
- Use React Native Performance Monitor
- Record navigation time for each transition
- Calculate average

**Pass Criteria:**
- Average < 300ms
- No transition > 500ms
- Transitions feel instant (< 200ms ideal)

**Common Issues:**
- Large component trees
- Unoptimized re-renders
- Heavy data fetching on mount
- Non-optimized images

**Optimization:**
- Use React.memo() for expensive components
- Implement virtualization for long lists
- Preload next screen data
- Optimize image sizes and caching

---

### 3. Voice Command Latency (< 1.5s)

**Objective:** Fast voice response time

**Measurement Points:**
- **T0:** User finishes speaking
- **T1:** Audio processing complete
- **T2:** Backend API response received
- **T3:** Action executed (navigation/playback)
- **T4:** TTS response starts (if applicable)

**Target Breakdown:**
- T0 → T1: < 300ms (VAD + speech recognition)
- T1 → T2: < 500ms (API call)
- T2 → T3: < 200ms (action execution)
- T3 → T4: < 500ms (TTS generation)
- **Total:** < 1500ms

**Test Scenarios:**
1. "Show home" - Navigation command
2. "Play channel Galatz" - Playback command
3. "Search for movies" - Search command
4. "Pause" - Control command
5. "What's playing?" - Query command

**Optimization:**
- Optimize audio capture pipeline
- Reduce VAD processing time
- Cache frequently used API responses
- Preload TTS responses
- Use streaming for long responses

---

### 4. Memory Usage (< 512MB baseline, < 1GB peak)

**Objective:** Prevent memory leaks and excessive usage

**Test Procedure:**
1. Launch app → Record baseline memory
2. Navigate through all 14 screens → Record peak
3. Open 4 windows → Record peak
4. Play video for 10 minutes → Record stable state
5. Close all windows → Verify memory returns close to baseline
6. Repeat cycle 10 times → Check for leaks

**Memory Profiling:**
```bash
# Using Instruments
1. Select "Allocations" template
2. Launch app
3. Record session for 1 hour
4. Check:
   - Total memory usage
   - Memory growth over time
   - Persistent allocations
   - Leaked memory
```

**Common Memory Issues:**
- Event listeners not removed
- Images not released
- Video players not deallocated
- React Query cache growth
- Zustand store not clearing old data

**Optimization:**
- Use cleanup functions in useEffect
- Implement proper video player teardown
- Configure React Query cache limits
- Clear Zustand state on unmount
- Use weak references where appropriate

---

### 5. CPU Usage (< 40% idle, < 80% playback)

**Objective:** Efficient CPU usage

**Test Scenarios:**

**Idle State:**
1. Launch app to HomeScreen
2. No user interaction for 30s
3. Measure CPU usage
4. Target: < 40%

**Active Navigation:**
1. Navigate between screens rapidly
2. Measure CPU during transitions
3. Target: < 60%

**Video Playback:**
1. Play 4K video
2. Measure CPU during playback
3. Target: < 80%

**Multi-Window:**
1. Open 4 windows with video
2. Measure CPU with 4 concurrent streams
3. Target: < 80% (only 1 video actually playing)

**CPU Profiling:**
```bash
# Using Instruments
1. Select "CPU Usage" template
2. Record test scenarios
3. Analyze hot paths in call tree
4. Identify expensive operations
```

**Common CPU Issues:**
- Unoptimized animations (not using native driver)
- Heavy re-renders
- Expensive computations on UI thread
- Image processing not optimized
- Focus calculations in JS

**Optimization:**
- Use `useNativeDriver: true` for animations
- Move heavy calculations to workers
- Implement shouldComponentUpdate
- Optimize image caching
- Use native focus engine

---

### 6. Frame Rate (60fps sustained)

**Objective:** Smooth animations and scrolling

**Test Scenarios:**
1. **Horizontal Shelf Scrolling:** Scroll through ContentShelf at various speeds
2. **Grid Scrolling:** Scroll through 6-column grids (VOD, Radio, etc.)
3. **Focus Animations:** Rapid focus changes (simulate fast D-pad presses)
4. **Window Transitions:** Open/close multi-window overlay
5. **Layout Switching:** Switch between Grid/Sidebar/Fullscreen layouts
6. **Modal Animations:** Open/close modals repeatedly
7. **Player Controls:** Show/hide controls with auto-fade

**FPS Monitoring:**
```javascript
// Enable in dev menu
import { PerformanceObserver } from 'react-native';

// Dev menu → "Show Perf Monitor"
// Or programmatically:
if (__DEV__) {
  require('react-native').DevSettings.addMenuItem('Show FPS', () => {
    // FPS monitor appears on screen
  });
}
```

**Pass Criteria:**
- Sustained 60fps during all animations
- No frame drops during focus changes
- Smooth scrolling (no jank)
- No stuttering during transitions

**Common FPS Issues:**
- Animations without native driver
- Complex layout calculations
- Large component trees
- Synchronous image loading
- Heavy JavaScript on UI thread

**Optimization:**
- Always use `useNativeDriver: true`
- Simplify component hierarchy
- Use FlatList virtualization
- Implement image placeholders
- Debounce expensive operations

---

### 7. Memory Leak Detection (0 leaks)

**Objective:** No memory leaks over extended use

**Test Procedure:**
1. Run app for 1 hour
2. Perform these actions repeatedly:
   - Navigate all screens (5 cycles)
   - Play/pause video (10 times)
   - Open/close multi-window (10 times)
   - Voice commands (20 commands)
   - Search queries (10 searches)
3. Profile with Instruments "Leaks" template
4. Check for memory leaks

**Common Leak Sources:**
- useEffect without cleanup
- Event listeners not removed
- Timers not cleared
- Video players not disposed
- Navigation listeners not unsubscribed
- React Query subscriptions not canceled

**Leak Prevention Checklist:**
```typescript
// ✅ CORRECT - Cleanup function
useEffect(() => {
  const subscription = eventEmitter.addListener('event', handler);
  return () => subscription.remove(); // Cleanup
}, []);

// ❌ WRONG - No cleanup
useEffect(() => {
  eventEmitter.addListener('event', handler);
}, []); // Leak!

// ✅ CORRECT - Clear timer
useEffect(() => {
  const timer = setTimeout(() => {}, 5000);
  return () => clearTimeout(timer);
}, []);

// ✅ CORRECT - Dispose video player
useEffect(() => {
  const player = new VideoPlayer();
  return () => player.dispose();
}, []);
```

---

## Performance Testing Checklist

### Pre-Test Setup
- [ ] Build release version (not debug)
- [ ] Disable dev mode features
- [ ] Clear app cache
- [ ] Restart device
- [ ] Close all background apps
- [ ] Connect to profiling tools

### During Testing
- [ ] Run tests on all 3 devices (4K 3rd gen, 4K 2nd gen, HD)
- [ ] Test in various network conditions (fast, slow, offline)
- [ ] Test with different content loads (empty, full)
- [ ] Monitor temperature (device shouldn't overheat)
- [ ] Check battery usage (if wireless device)

### Post-Test Analysis
- [ ] Export Instruments data
- [ ] Generate performance report
- [ ] Identify bottlenecks
- [ ] Prioritize optimizations (P0 > P1 > P2)
- [ ] Retest after optimizations

---

## Performance Report Template

```markdown
# Performance Test Report - [Date]

## Test Environment
- **Device:** Apple TV 4K (3rd gen)
- **tvOS:** 17.0
- **Build:** [Version]
- **Network:** WiFi 100Mbps

## Results Summary

| Metric | Target | Measured | Status |
|--------|--------|----------|--------|
| App Launch | < 3s | 2.4s | ✅ PASS |
| Screen Transition | < 300ms | 280ms avg | ✅ PASS |
| Voice Latency | < 1.5s | 1.8s | ❌ FAIL |
| Memory Baseline | < 512MB | 480MB | ✅ PASS |
| Memory Peak | < 1GB | 920MB | ✅ PASS |
| CPU Idle | < 40% | 35% | ✅ PASS |
| CPU Playback | < 80% | 72% | ✅ PASS |
| Frame Rate | 60fps | 58fps avg | ⚠️ MARGINAL |
| Memory Leaks | 0 | 0 | ✅ PASS |

## Issues Found

### P0 - Critical
1. [P0] Voice latency exceeds target by 300ms
   - **Cause:** Backend API response time 800ms (target: 500ms)
   - **Fix:** Optimize backend query, add caching
   - **ETA:** 2 days

### P1 - High Priority
2. [P1] Frame rate drops to 55fps during grid scrolling
   - **Cause:** Heavy re-renders on focus changes
   - **Fix:** Implement React.memo() on ContentCard
   - **ETA:** 1 day

### P2 - Medium Priority
3. [P2] Memory usage creeps up slowly over 1 hour
   - **Cause:** React Query cache not expiring old entries
   - **Fix:** Configure gcTime limits
   - **ETA:** 4 hours

## Recommendations
1. Optimize backend API response time
2. Implement React.memo on frequently rendered components
3. Configure React Query cache expiration
4. Profile on Apple TV HD to ensure minimum spec performance

## Next Steps
1. Fix P0 issues
2. Retest voice latency
3. Verify fixes don't regress other metrics
4. Proceed to Accessibility Testing (Phase 7.6)
```

---

## Performance Optimization Quick Wins

### React Native
- Use `useNativeDriver: true` for all animations
- Implement FlatList virtualization
- Use React.memo() for expensive components
- Avoid inline functions in render
- Use useCallback and useMemo appropriately

### Images
- Optimize image sizes (320x180 for cards, not 1920x1080)
- Use progressive loading
- Implement image caching
- Use placeholder images
- Consider WebP format

### Data Fetching
- Configure React Query staleTime and gcTime
- Implement pagination
- Prefetch next page data
- Cache API responses
- Use optimistic updates

### Native Modules
- Minimize bridge calls
- Batch operations
- Use TurboModules for performance-critical code
- Implement native caching
- Optimize audio processing pipeline

---

**Next Steps:** After performance targets met, proceed to Accessibility Testing (Phase 7.6)
