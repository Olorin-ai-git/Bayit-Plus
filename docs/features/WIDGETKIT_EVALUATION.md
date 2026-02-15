# WidgetKit Evaluation for Bayit+

**Status:** Evaluation Complete
**Date:** 2026-02-14
**Platform:** iOS 14+ / tvOS 18+

## Executive Summary

WidgetKit enables iOS home screen widgets that provide glanceable information and quick access to app features. This evaluation analyzes the feasibility, benefits, and implementation approach for adding WidgetKit support to the Bayit+ mobile app.

## What is WidgetKit?

WidgetKit is Apple's framework for creating home screen widgets on iOS, iPadOS, and macOS. Widgets display timely, relevant content from your app and provide users with quick access to app features without opening the full app.

**Key Characteristics:**
- **Glanceable:** Quick, at-a-glance information
- **Timely:** Updates based on timeline or push notifications
- **Tappable:** Deep links into the app when tapped
- **Size variants:** Small, Medium, Large, Extra Large (iPad only)

## Recommended Widgets for Bayit+

### 1. **Continue Watching Widget** (HIGH PRIORITY)

**Description:** Shows the user's most recent content with a "Continue Watching" button.

**Sizes:**
- **Small:** Single content poster with progress bar
- **Medium:** Content poster + title + progress + "Resume" button
- **Large:** Up to 3 recent items with posters and progress

**Data Requirements:**
- Last played content (title, cover, progress)
- Continue watching endpoint

**Update Frequency:** Every 30 minutes or when app is opened

**Deep Link:** Opens app to continue playback at saved position

**User Value:** Quick resume without navigating through app

---

### 2. **Live TV Schedule Widget** (HIGH PRIORITY)

**Description:** Shows currently airing programs on favorite channels.

**Sizes:**
- **Small:** Single channel now playing
- **Medium:** 2 channels with now/next programs
- **Large:** 4-6 channels with full schedule

**Data Requirements:**
- EPG data for next 3 hours
- User's favorite channels
- Channel logos and program metadata

**Update Frequency:** Every 15 minutes during active viewing hours, hourly otherwise

**Deep Link:** Opens app to live TV channel

**User Value:** See what's on without opening app

---

### 3. **Beta 500 Credits Widget** (MEDIUM PRIORITY)

**Description:** Displays Beta 500 AI credits balance and recent activity.

**Sizes:**
- **Small:** Credits balance only
- **Medium:** Balance + active features (AI search, dubbing, etc.)
- **Large:** Balance + usage history + feature toggles

**Data Requirements:**
- Beta 500 credits balance
- Active feature toggles
- Recent AI usage statistics

**Update Frequency:** Hourly or when credits are used

**Deep Link:** Opens Beta 500 dashboard

**User Value:** Track AI credit usage at a glance

---

### 4. **New Releases Widget** (MEDIUM PRIORITY)

**Description:** Shows recently added movies, series, podcasts, or audiobooks.

**Sizes:**
- **Small:** Single new release poster
- **Medium:** 2 new releases with titles
- **Large:** 4-6 new releases in grid

**Data Requirements:**
- Recently added content endpoint
- Content posters and metadata

**Update Frequency:** Daily at midnight or when new content is added

**Deep Link:** Opens app to content detail screen

**User Value:** Discover new content without browsing

---

### 5. **Podcast/Audiobook Player Widget** (LOW PRIORITY)

**Description:** Mini player for active podcast or audiobook.

**Sizes:**
- **Small:** Cover art + play/pause
- **Medium:** Cover + title + progress + controls (play, skip)
- **Large:** Full player with chapter list (audiobooks only)

**Data Requirements:**
- Current playback state
- Track metadata (title, cover, duration, position)
- Chapter list (audiobooks)

**Update Frequency:** Real-time when playing, hourly when paused

**Deep Link:** Opens player screen

**User Value:** Control playback from home screen

## Technical Implementation

### Architecture

```
┌─────────────────────────────────────────────────┐
│           React Native App (JavaScript)         │
├─────────────────────────────────────────────────┤
│                Shared Data Layer                │
│  • User Defaults (App Groups)                   │
│  • Shared SQLite DB                             │
│  • Network JSON endpoints                       │
├─────────────────────────────────────────────────┤
│     WidgetKit Extension (Native Swift)          │
│  • TimelineProvider                             │
│  • Widget Views (SwiftUI)                       │
│  • Network requests to Bayit+ API               │
└─────────────────────────────────────────────────┘
```

### Implementation Steps

#### 1. **Create Widget Extension**

Create a new Widget Extension target in Xcode:
```swift
// BayitPlusWidget/BayitPlusWidget.swift
import WidgetKit
import SwiftUI

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), content: placeholderData)
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let entry = SimpleEntry(date: Date(), content: fetchLatestData())
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        let entries = generateTimeline()
        let timeline = Timeline(entries: entries, policy: .atEnd)
        completion(timeline)
    }
}

struct BayitPlusWidgetEntryView : View {
    var entry: Provider.Entry

    var body: some View {
        ZStack {
            // Widget UI here
        }
    }
}

@main
struct BayitPlusWidget: Widget {
    let kind: String = "BayitPlusWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            BayitPlusWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Continue Watching")
        .description("Resume your favorite shows and movies.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}
```

#### 2. **Data Sharing via App Groups**

Enable App Groups to share data between the main app and widget:

```swift
// In React Native (storage.ts)
export const storage = {
  async setWidgetData(key: string, value: any): Promise<void> {
    // Use react-native-shared-group-preferences
    await SharedGroupPreferences.setItem(key, JSON.stringify(value), 'group.tv.bayit.app')
  }
}

// In Widget Extension (Swift)
let sharedDefaults = UserDefaults(suiteName: "group.tv.bayit.app")
let continueWatchingData = sharedDefaults?.string(forKey: "continue_watching")
```

#### 3. **Network Requests from Widget**

Widgets can make network requests to fetch fresh data:

```swift
struct WidgetNetworkService {
    static func fetchContinueWatching(completion: @escaping (ContinueWatchingData?) -> Void) {
        guard let url = URL(string: "https://api.bayit.tv/v1/user/continue-watching") else {
            completion(nil)
            return
        }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(getAuthToken())", forHTTPHeaderField: "Authorization")

        URLSession.shared.dataTask(with: request) { data, response, error in
            guard let data = data else {
                completion(nil)
                return
            }

            let decoder = JSONDecoder()
            let result = try? decoder.decode(ContinueWatchingData.self, from: data)
            completion(result)
        }.resume()
    }
}
```

#### 4. **Deep Linking**

Handle widget taps with deep links:

```swift
struct BayitPlusWidgetEntryView : View {
    var entry: Provider.Entry

    var body: some View {
        VStack {
            // Widget content
        }
        .widgetURL(URL(string: "bayit://play/\(entry.content.id)?t=\(entry.content.position)")!)
    }
}
```

#### 5. **Timeline Updates**

Configure widget refresh policy:

```swift
func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
    let currentDate = Date()
    let entries: [SimpleEntry] = []

    // Fetch data and create entries
    let data = fetchContinueWatching()
    let entry = SimpleEntry(date: currentDate, content: data)

    // Refresh in 30 minutes
    let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: currentDate)!
    let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))

    completion(timeline)
}
```

## Dependencies

### Native iOS Dependencies
```ruby
# Podfile
target 'BayitPlusWidget' do
  use_frameworks!
  pod 'SDWebImageSwiftUI' # For async image loading
end
```

### React Native Dependencies
```json
{
  "react-native-shared-group-preferences": "^1.1.30"
}
```

## Development Effort Estimate

| Widget | Design | Development | Testing | Total |
|--------|--------|-------------|---------|-------|
| Continue Watching | 4h | 8h | 4h | 16h |
| Live TV Schedule | 4h | 10h | 4h | 18h |
| Beta 500 Credits | 3h | 6h | 3h | 12h |
| New Releases | 3h | 6h | 3h | 12h |
| Podcast Player | 4h | 8h | 4h | 16h |
| **Total** | **18h** | **38h** | **18h** | **74h** |

Additional overhead:
- App Group setup: 2h
- Deep linking integration: 4h
- Widget gallery documentation: 2h
- App Store screenshots: 4h

**Grand Total: 86 hours (~2.5 weeks)**

## Benefits

### User Benefits
1. **Faster content access** - Resume watching without opening app
2. **Glanceable information** - See what's on TV at a glance
3. **Personalized home screen** - Curated content on home screen
4. **Reduced friction** - Fewer taps to reach desired content

### Business Benefits
1. **Increased engagement** - Home screen presence encourages usage
2. **Better retention** - Convenient access improves daily habit formation
3. **Competitive advantage** - Premium feature not offered by all competitors
4. **App Store featuring** - Widgets often featured in App Store promotions

## Limitations

### Technical Constraints
1. **No interactive controls** - Widgets are read-only (tappable, not interactive)
2. **Limited updates** - iOS limits widget refresh frequency to conserve battery
3. **Memory limits** - Widgets have strict memory constraints (30MB small, 60MB large)
4. **No background audio** - Cannot play media directly from widget

### Platform Support
- **iOS 14+** required (released September 2020)
- **Not supported on Android** - Would require separate implementation

## Recommendations

### Phase 1: MVP (16 hours)
✅ **Implement Continue Watching Widget**
- Most valuable for user engagement
- Simple data requirements
- High impact on retention

### Phase 2: Enhancement (18 hours)
✅ **Implement Live TV Schedule Widget**
- Unique value proposition
- Leverages existing EPG infrastructure
- Differentiates from competitors

### Phase 3: Optional (42 hours)
⏸️ **Consider Beta 500, New Releases, and Player widgets based on user feedback**

## Implementation Decision

**RECOMMENDED:** Proceed with Phase 1 (Continue Watching Widget)

**Timeline:** 2 weeks (16 hours development time)

**Success Metrics:**
- Widget installation rate (target: 30% of iOS users within 3 months)
- Widget tap-through rate (target: 20% daily active users)
- Session starts from widget (target: 15% of daily sessions)
- Retention improvement (target: +5% 7-day retention)

## Next Steps

1. **Approve implementation** - Get stakeholder sign-off on Continue Watching widget
2. **Create design mockups** - Design all 3 widget sizes in Figma
3. **Set up App Groups** - Configure shared data container
4. **Implement widget extension** - Build Swift/SwiftUI widget
5. **Test on devices** - Verify on iOS 14, 15, 16, 17, 18
6. **Submit to App Store** - Include widget in next TestFlight build

## References

- [Apple WidgetKit Documentation](https://developer.apple.com/documentation/widgetkit)
- [Widget Design Guidelines](https://developer.apple.com/design/human-interface-guidelines/widgets)
- [React Native Shared Group Preferences](https://github.com/KjellConnelly/react-native-shared-group-preferences)
