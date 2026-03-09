# AI Onboarding Gaps Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix ~20 broken/missing tasks in the AI onboarding feature that were marked complete but don't exist in code.

**Architecture:** Backend model + route registration, iOS localization keys for all 9 tour cards, iOS tooltip system parity with Android, missing analytics events, navigation wiring gaps, and demo polish items.

**Tech Stack:** Python/FastAPI/Beanie (backend), Swift/SwiftUI (iOS/tvOS), Kotlin/Compose (Android), BayitLocalization JSON i18n

---

## Gap Summary

| #   | Gap                                    | Severity | Platform    |
| --- | -------------------------------------- | -------- | ----------- |
| 1   | OnboardingTour model missing from User | BLOCKER  | Backend     |
| 2   | Tour routes not registered             | BLOCKER  | Backend     |
| 3   | Tour localization keys missing         | BLOCKER  | iOS/Android |
| 4   | Analytics events missing               | HIGH     | iOS         |
| 5   | OnboardingAIView tour integration      | HIGH     | iOS         |
| 6   | TVOnboardingView tour integration      | HIGH     | tvOS        |
| 7   | Zeh Ani vocab overlay missing          | MEDIUM   | iOS/Android |
| 8   | Interaction creditInfo missing         | MEDIUM   | iOS/Android |
| 9   | iOS tooltip system missing             | MEDIUM   | iOS         |
| 10  | Android "What's New" version tracking  | LOW      | Android     |
| 11  | Android cross-device sync              | LOW      | Android     |

---

## Task 1: Add OnboardingTour Embedded Document to User Model

**Files:**

- Modify: `backend/app/models/user.py:297` (before `class Settings:`)

**Step 1: Add OnboardingTour BaseModel class**

Insert after the existing `RecordingQuota` import area (before the `User` class) in `backend/app/models/user.py`. The service at `backend/app/services/onboarding_tour_service.py:7` imports `from app.models.user import OnboardingTour, User`, so the class name and location must match exactly.

```python
class OnboardingTour(BaseModel):
    """Embedded document tracking feature discovery tour state."""

    platform: Optional[str] = None
    tour_version: int = 0
    current_card_index: int = 0
    completion_status: str = "not_started"  # not_started, in_progress, completed, skipped
    completed_cards: List[str] = Field(default_factory=list)
    demo_cards_tapped: List[str] = Field(default_factory=list)
    language: Optional[str] = None
    preferences: Optional[dict] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    skipped_at: Optional[datetime] = None
```

**Step 2: Add field to User document**

Insert before the `# Timestamps` comment block (around line 295):

```python
    # Onboarding tour state
    onboarding_tour: Optional[OnboardingTour] = None
```

**Step 3: Verify import works**

Run:

```bash
cd backend && poetry run python -c "from app.models.user import OnboardingTour, User; print('OK')"
```

Expected: `OK`

**Step 4: Verify service imports**

Run:

```bash
cd backend && poetry run python -c "from app.services.onboarding_tour_service import OnboardingTourService; print('OK')"
```

Expected: `OK`

**Step 5: Commit**

```bash
git add backend/app/models/user.py
git commit -m "feat(backend): add OnboardingTour embedded document to User model"
```

---

## Task 2: Register Tour Routes in Router Registry

**Files:**

- Modify: `backend/app/api/router_registry.py:61` (import line) and `~401` (registration)

**Step 1: Add import**

In the import block at line 61 (where `onboarding` is imported), add `onboarding_tour` to the import list. The routes module is at `backend/app/api/routes/onboarding_tour.py`.

Add to the `from app.api.routes import (` block:

```python
                                onboarding, onboarding_tour, party, password_reset, payments,
```

**Step 2: Add route registration**

After the existing onboarding registration at line ~401:

```python
    app.include_router(
        onboarding.router, prefix=f"{prefix}/onboarding/ai", tags=["ai-onboarding"]
    )
```

Add immediately after:

```python
    app.include_router(
        onboarding_tour.router,
        prefix=f"{prefix}/onboarding",
        tags=["onboarding-tour"],
    )
```

This mounts the tour endpoints at `/api/v1/onboarding/tour/*` (the router in `onboarding_tour.py` already has `prefix="/tour"`).

**Step 3: Verify routes are reachable**

Run:

```bash
cd backend && poetry run python -c "
from fastapi.testclient import TestClient
from app.main import app
client = TestClient(app)
r = client.get('/api/v1/onboarding/tour/cards?platform=ios')
print(r.status_code, r.json()[:1] if r.status_code == 200 else r.text[:100])
"
```

Expected: 200 with card data (or 401 if auth required -- either confirms route is mounted).

**Step 4: Commit**

```bash
git add backend/app/api/router_registry.py
git commit -m "feat(backend): register onboarding tour routes at /api/v1/onboarding/tour"
```

---

## Task 3: Add Tour Localization Keys (All 10 Languages)

**Files:**

- Modify: `ios-app/Packages/BayitLocalization/Sources/Resources/en.json`
- Modify: `ios-app/Packages/BayitLocalization/Sources/Resources/he.json`
- Modify: 8 other language files (fr, es, it, bn, hi, ja, ta, zh)

The iOS `FeatureTourViewModel+Cards.swift` maps feature keys to i18n paths via `i18nKeyMap`:

```
"live_dubbing" -> "onboarding.tour.dubbing"
"live_trivia" -> "onboarding.tour.trivia"
"subtitles_split" -> "onboarding.tour.subtitles"
"engrew_heblish" -> "onboarding.tour.engrewHeblish"
"pause_and_ask" -> "onboarding.tour.pauseAndAsk"
"movie_interaction" -> "onboarding.tour.interaction"
"zeh_ani" -> "onboarding.tour.zehAni"
"catchup" -> "onboarding.tour.catchup"
"byoc" -> "onboarding.tour.byoc"
```

Each card needs `.title`, `.tagline`, `.description` keys. The personalization step needs its own section. The tour chrome needs skip/start/continue keys.

**Step 1: Add `tour` object inside the existing `onboarding` section of en.json**

Add as a new key inside the `"onboarding": { ... }` object:

```json
"tour": {
  "title": "Discover Bayit+",
  "skipButton": "Skip Tour",
  "getStarted": "Get Started",
  "continuePrompt": "Continue where you left off?",
  "replayLabel": "Replay Feature Tour",
  "tryItNow": "Try It Now",
  "cardProgress": "Card {current} of {total}",
  "dubbing": {
    "title": "Live AI Dubbing",
    "tagline": "Watch Israeli TV in your language",
    "description": "Every live channel dubbed in real time into English, French, Spanish, Italian, Bengali, Hindi, Japanese, Tamil, and Chinese."
  },
  "trivia": {
    "title": "Live Trivia",
    "tagline": "Learn while you watch",
    "description": "AI-generated facts and trivia pop up during live TV, sourced from the web and matched to what's on screen."
  },
  "subtitles": {
    "title": "Smart Subtitles",
    "tagline": "Four subtitle modes",
    "description": "Switch between Original Hebrew, Nikud (voweled), Engrew, and Heblish subtitles on any content.",
    "mode": {
      "original": "Original",
      "nikud": "Nikud",
      "engrew": "Engrew",
      "heblish": "Heblish"
    }
  },
  "engrewHeblish": {
    "title": "Engrew and Heblish",
    "tagline": "Bridge two languages",
    "description": "Engrew writes English words in Hebrew letters. Heblish writes Hebrew words in Latin script. Both help you learn naturally."
  },
  "pauseAndAsk": {
    "title": "Pause and Ask",
    "tagline": "Talk to any scene",
    "description": "Pause any moment and ask questions about what's happening. AI answers using the scene context."
  },
  "interaction": {
    "title": "Movie Interactions",
    "tagline": "Chat with characters",
    "description": "Tap highlighted characters during curated moments to start a conversation. Look for the star icon during playback.",
    "creditInfo": "Each exchange uses 1 AI credit. Premium subscribers get unlimited interactions.",
    "tapCharacter": "Tap a character to start talking",
    "curatedMoments": "Look for the star icon during playback for interactive moments"
  },
  "zehAni": {
    "title": "Zeh Ani - Magic Mirror",
    "tagline": "Your personal avatar",
    "description": "Create a 3D avatar from a selfie. Use it for interactive features, vocabulary practice, and social connections.",
    "consent": "Camera access is used only on-device. No photos are sent to our servers.",
    "enableCamera": "Enable Camera",
    "noDataSent": "All processing happens on your device",
    "vocabWord": "Word of the day",
    "vocabTransliteration": "Transliteration",
    "vocabTranslation": "Translation"
  },
  "catchup": {
    "title": "7-Day Catchup",
    "tagline": "Never miss a moment",
    "description": "Scroll back up to 7 days on any channel. AI summaries help you jump to the best moments. Programs up to 4 hours supported."
  },
  "byoc": {
    "title": "Bring Your Own Content",
    "tagline": "Your media, our AI",
    "description": "Connect Plex, YouTube, IPTV, Xtream, USB, or cloud storage. All AI features work on your content too."
  },
  "personalization": {
    "title": "Personalize Your Experience",
    "subtitle": "Help us recommend the best content for you",
    "languages": "Content Languages",
    "genres": "Favorite Genres",
    "hasChildren": "Do you have children?",
    "done": "Done"
  }
}
```

**Step 2: Add Hebrew translations to he.json**

Same structure under `"onboarding" > "tour"` with Hebrew text. Key translations:

```json
"tour": {
  "title": "גלה את בית פלוס",
  "skipButton": "דלג על הסיור",
  "getStarted": "בוא נתחיל",
  "continuePrompt": "להמשיך מאיפה שהפסקת?",
  "replayLabel": "הפעל מחדש את סיור התכונות",
  "tryItNow": "נסה עכשיו",
  "cardProgress": "כרטיס {current} מתוך {total}",
  "dubbing": {
    "title": "דיבוב AI חי",
    "tagline": "צפה בטלוויזיה ישראלית בשפה שלך",
    "description": "כל ערוץ חי מדובב בזמן אמת לאנגלית, צרפתית, ספרדית, איטלקית, בנגלית, הינדית, יפנית, טמילית וסינית."
  },
  "trivia": {
    "title": "טריוויה חיה",
    "tagline": "למד תוך כדי צפייה",
    "description": "עובדות וטריוויה שנוצרו בינה מלאכותית צצות במהלך שידור חי, מותאמות למה שמוצג על המסך."
  },
  "subtitles": {
    "title": "כתוביות חכמות",
    "tagline": "ארבעה מצבי כתוביות",
    "description": "החלף בין עברית מקורית, ניקוד, אנגרו והבליש על כל תוכן.",
    "mode": {
      "original": "מקור",
      "nikud": "ניקוד",
      "engrew": "אנגרו",
      "heblish": "הבליש"
    }
  },
  "engrewHeblish": {
    "title": "אנגרו והבליש",
    "tagline": "גשר בין שתי שפות",
    "description": "אנגרו כותב מילים באנגלית באותיות עבריות. הבליש כותב מילים בעברית באותיות לטיניות."
  },
  "pauseAndAsk": {
    "title": "עצור ושאל",
    "tagline": "דבר עם כל סצנה",
    "description": "עצור כל רגע ושאל שאלות על מה שקורה. הבינה המלאכותית עונה לפי הקשר הסצנה."
  },
  "interaction": {
    "title": "אינטראקציות עם סרטים",
    "tagline": "שוחח עם דמויות",
    "description": "הקש על דמויות מודגשות ברגעים נבחרים כדי להתחיל שיחה. חפש את סמל הכוכב במהלך הצפייה.",
    "creditInfo": "כל חילופי דברים משתמש בקרדיט AI אחד. מנויי פרימיום מקבלים אינטראקציות ללא הגבלה.",
    "tapCharacter": "הקש על דמות כדי להתחיל לדבר",
    "curatedMoments": "חפש את סמל הכוכב במהלך הצפייה לרגעים אינטראקטיביים"
  },
  "zehAni": {
    "title": "זה אני - מראה קסם",
    "tagline": "האווטאר האישי שלך",
    "description": "צור אווטאר תלת-ממדי מסלפי. השתמש בו לתכונות אינטראקטיביות, תרגול אוצר מילים וקשרים חברתיים.",
    "consent": "גישה למצלמה משמשת רק במכשיר. אין תמונות שנשלחות לשרתים שלנו.",
    "enableCamera": "הפעל מצלמה",
    "noDataSent": "כל העיבוד מתבצע במכשיר שלך",
    "vocabWord": "מילת היום",
    "vocabTransliteration": "תעתיק",
    "vocabTranslation": "תרגום"
  },
  "catchup": {
    "title": "השלמת 7 ימים",
    "tagline": "אל תפספס רגע",
    "description": "גלול אחורה עד 7 ימים בכל ערוץ. סיכומי AI עוזרים לך לקפוץ לרגעים הטובים ביותר. תוכניות עד 4 שעות נתמכות."
  },
  "byoc": {
    "title": "הבא תוכן משלך",
    "tagline": "המדיה שלך, הבינה המלאכותית שלנו",
    "description": "חבר Plex, YouTube, IPTV, Xtream, USB או אחסון ענן. כל תכונות הבינה המלאכותית עובדות על התוכן שלך."
  },
  "personalization": {
    "title": "התאם אישית את החוויה שלך",
    "subtitle": "עזור לנו להמליץ על התוכן הטוב ביותר עבורך",
    "languages": "שפות תוכן",
    "genres": "ז'אנרים מועדפים",
    "hasChildren": "יש לך ילדים?",
    "done": "סיום"
  }
}
```

**Step 3: Add English fallback to remaining 8 language files**

For fr.json, es.json, it.json, bn.json, hi.json, ja.json, ta.json, zh.json: copy the English `"tour"` block into each file's `"onboarding"` section. The localization system falls back to English for untranslated keys, but having the structure ensures no missing key errors.

**Step 4: Verify keys resolve**

```bash
cd ios-app && python3 -c "
import json
with open('Packages/BayitLocalization/Sources/Resources/en.json') as f:
    d = json.load(f)
tour = d['onboarding']['tour']
for card in ['dubbing','trivia','subtitles','engrewHeblish','pauseAndAsk','interaction','zehAni','catchup','byoc']:
    assert card in tour, f'Missing card: {card}'
    assert 'title' in tour[card], f'Missing title for {card}'
    assert 'tagline' in tour[card], f'Missing tagline for {card}'
print('All 9 cards verified with title+tagline+description')
"
```

**Step 5: Commit**

```bash
git add ios-app/Packages/BayitLocalization/Sources/Resources/*.json
git commit -m "feat(i18n): add onboarding tour localization keys for all 9 feature cards across 10 languages"
```

---

## Task 4: Add Analytics Events to BayitAnalytics.swift

**Files:**

- Modify: `ios-app/Packages/BayitAnalytics/Sources/BayitAnalytics/BayitAnalytics.swift:87` (after `downloadStarted`)

**Step 1: Add 7 onboarding event constants**

After `public static let downloadStarted = "download_started"` (line 86), add:

```swift
    // Onboarding tour events
    public static let onboardingTourStart = "onboarding_tour_start"
    public static let onboardingCardView = "onboarding_card_view"
    public static let onboardingDemoTap = "onboarding_demo_tap"
    public static let onboardingDemoComplete = "onboarding_demo_complete"
    public static let onboardingTourComplete = "onboarding_tour_complete"
    public static let onboardingTourSkip = "onboarding_tour_skip"
    public static let onboardingTourResume = "onboarding_tour_resume"
```

**Step 2: Add onboarding parameter constants**

After `public static let position = "position"` in `BayitAnalyticsParam` (line 102), add:

```swift
    public static let featureKey = "feature_key"
    public static let cardIndex = "card_index"
    public static let tourVersion = "tour_version"
    public static let completionStatus = "completion_status"
```

**Step 3: Build BayitAnalytics package**

```bash
cd ios-app && xcodebuild -project BayitPlusApp.xcodeproj -scheme BayitPlusApp -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -derivedDataPath /tmp/bayit-derived build 2>&1 | tail -5
```

Expected: BUILD SUCCEEDED

**Step 4: Commit**

```bash
git add ios-app/Packages/BayitAnalytics/Sources/BayitAnalytics/BayitAnalytics.swift
git commit -m "feat(analytics): add 7 onboarding tour event constants to BayitAnalytics"
```

---

## Task 5: Wire FeatureTourView into OnboardingAIView (iOS)

**Files:**

- Modify: `ios-app/BayitPlusApp/Views/Onboarding/OnboardingAIView.swift`

The current file is a 34-line stub. It needs to check `FeatureTourViewModel.shouldShowTour` and present `FeatureTourView` as a fullScreenCover before the existing onboarding steps.

**Step 1: Add tour state check**

Replace the current `OnboardingAIView` body to wrap with tour presentation:

```swift
import SwiftUI

struct OnboardingAIView: View {
    @State private var viewModel = OnboardingAIViewModel()
    @State private var tourViewModel = FeatureTourViewModel(
        platform: "ios",
        apiClient: APIClient.shared,
        analytics: AnalyticsService.shared
    )
    @State private var showTour = false

    var body: some View {
        content
            .onAppear {
                showTour = tourViewModel.shouldShowTour
            }
            .fullScreenCover(isPresented: $showTour) {
                FeatureTourView(viewModel: tourViewModel, onComplete: {
                    showTour = false
                })
            }
    }

    @ViewBuilder
    private var content: some View {
        // Existing onboarding AI flow (preserved from original)
        if viewModel.isLoading {
            ScreenLoadingView()
        } else {
            VStack(spacing: DesignTokens.Spacing.lg) {
                viewModel.progressIndicator()
                viewModel.stepContent()
                viewModel.navigationButtons()
            }
            .padding(DesignTokens.Spacing.lg)
        }
    }
}
```

**NOTE:** The exact existing body content must be read from the file at implementation time and preserved inside the `content` computed property. The above is the structural pattern.

**Step 2: Build and verify**

```bash
cd ios-app && xcodebuild -project BayitPlusApp.xcodeproj -scheme BayitPlusApp -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -derivedDataPath /tmp/bayit-derived build 2>&1 | tail -5
```

**Step 3: Commit**

```bash
git add ios-app/BayitPlusApp/Views/Onboarding/OnboardingAIView.swift
git commit -m "feat(ios): wire FeatureTourView into OnboardingAIView as fullScreenCover"
```

---

## Task 6: Wire TVFeatureTourView into TVOnboardingView (tvOS)

**Files:**

- Modify: `ios-app/BayitPlusTVApp/Views/Onboarding/TVOnboardingView.swift`

Same pattern as Task 5 but for tvOS. The current file has 6 onboarding steps (welcome -> language -> culture -> interests -> byoc -> complete) but no tour integration.

**Step 1: Add tour state and fullScreenCover**

Add to the TVOnboardingView:

- `@State private var tourViewModel = TVFeatureTourViewModel(...)`
- `@State private var showTour = false`
- `.onAppear { showTour = tourViewModel.shouldShowTour }`
- `.fullScreenCover(isPresented: $showTour) { TVFeatureTourView(...) }`

The tour should present BEFORE the existing step flow. When dismissed, the normal onboarding continues.

**Step 2: Build tvOS target**

```bash
cd ios-app && xcodebuild -project BayitPlusTVApp.xcodeproj -scheme BayitPlusTVApp -destination 'platform=tvOS Simulator,name=Apple TV 4K (3rd generation)' build 2>&1 | tail -5
```

**Step 3: Commit**

```bash
git add ios-app/BayitPlusTVApp/Views/Onboarding/TVOnboardingView.swift
git commit -m "feat(tvos): wire TVFeatureTourView into TVOnboardingView as fullScreenCover"
```

---

## Task 7: Add Vocab Overlay to ZehAni Demo Views

**Files:**

- Modify: `ios-app/BayitPlusApp/Views/Onboarding/Tour/DemoViews/ZehAniDemoView.swift`
- Modify: `android-app/feature/feature-onboarding/src/main/java/tv/bayit/plus/feature/onboarding/demos/ZehAniDemoComposable.kt`

The demo currently shows camera placeholder + consent text. Task requires a vocabulary word highlight overlay showing word, transliteration, and translation.

**Step 1: Add vocab overlay to iOS ZehAniDemoView**

After the camera view (active or placeholder), add a vocabulary card at the bottom:

```swift
private var vocabOverlay: some View {
    GlassCard {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            Text(localization.t("onboarding.tour.zehAni.vocabWord"))
                .font(DesignTokens.Typography.caption)
                .foregroundStyle(DesignTokens.Colors.textSecondary)
            Text("שלום")
                .font(DesignTokens.Typography.h2)
            Text("sha-LOM")
                .font(DesignTokens.Typography.body)
                .foregroundStyle(DesignTokens.Colors.accentPrimary)
            Text("Hello / Peace")
                .font(DesignTokens.Typography.body)
                .foregroundStyle(DesignTokens.Colors.textSecondary)
        }
        .padding(DesignTokens.Spacing.md)
    }
}
```

Add this view in the main body VStack after the camera section but inside the ZStack.

**Step 2: Add vocab overlay to Android ZehAniDemoComposable**

Same concept using Compose. The Android `strings.xml` already defines `demo_zeh_ani_vocab_word`, `demo_zeh_ani_vocab_transliteration`, `demo_zeh_ani_vocab_translation` but they're unused. Wire them:

```kotlin
GlassCard(modifier = Modifier.padding(DesignTokens.Spacing.md)) {
    Column(modifier = Modifier.padding(DesignTokens.Spacing.md)) {
        Text(
            text = stringResource(R.string.demo_zeh_ani_vocab_label),
            style = DesignTokens.Typography.caption,
            color = DesignTokens.Colors.Semantic.textSecondary,
        )
        Text(text = stringResource(R.string.demo_zeh_ani_vocab_word), style = DesignTokens.Typography.h2)
        Text(
            text = stringResource(R.string.demo_zeh_ani_vocab_transliteration),
            color = DesignTokens.Colors.Semantic.accentPrimary,
        )
        Text(
            text = stringResource(R.string.demo_zeh_ani_vocab_translation),
            color = DesignTokens.Colors.Semantic.textSecondary,
        )
    }
}
```

**Step 3: Build both platforms**

**Step 4: Commit**

```bash
git add ios-app/BayitPlusApp/Views/Onboarding/Tour/DemoViews/ZehAniDemoView.swift
git add android-app/feature/feature-onboarding/src/main/java/tv/bayit/plus/feature/onboarding/demos/ZehAniDemoComposable.kt
git commit -m "feat(onboarding): add vocabulary highlight overlay to Zeh Ani demo views"
```

---

## Task 8: Add creditInfo and Curated Moments to Interaction Demo

**Files:**

- Modify: `ios-app/BayitPlusApp/Views/Onboarding/Tour/DemoViews/InteractionDemoView.swift`
- Modify: `android-app/feature/feature-onboarding/src/main/java/tv/bayit/plus/feature/onboarding/demos/InteractionDemoComposable.kt`

**Step 1: Add credit info footer to iOS InteractionDemoView**

After the message exchange completes (all messages shown), display a credit info card:

```swift
private var creditInfoFooter: some View {
    VStack(spacing: DesignTokens.Spacing.xs) {
        HStack(spacing: DesignTokens.Spacing.xs) {
            Image(systemName: "star.fill")
                .foregroundStyle(DesignTokens.Colors.accentPrimary)
            Text(localization.t("onboarding.tour.interaction.curatedMoments"))
                .font(DesignTokens.Typography.caption)
        }
        Text(localization.t("onboarding.tour.interaction.creditInfo"))
            .font(DesignTokens.Typography.caption)
            .foregroundStyle(DesignTokens.Colors.textSecondary)
    }
    .padding(DesignTokens.Spacing.sm)
}
```

Show this view after `messageIndex >= messages.count` (all messages displayed).

**Step 2: Mirror in Android InteractionDemoComposable**

Add equivalent Compose UI after the chat messages are fully revealed, using the localization keys `onboarding.tour.interaction.creditInfo` and `onboarding.tour.interaction.curatedMoments`.

**Step 3: Build and commit**

```bash
git add ios-app/BayitPlusApp/Views/Onboarding/Tour/DemoViews/InteractionDemoView.swift
git add android-app/feature/feature-onboarding/src/main/java/tv/bayit/plus/feature/onboarding/demos/InteractionDemoComposable.kt
git commit -m "feat(onboarding): add credit info and curated moments guidance to interaction demo"
```

---

## Task 9: Add iOS Tooltip System (Parity with Android)

**Files:**

- Create: `ios-app/BayitPlusApp/Views/Components/FeatureTooltipModifier.swift`
- Modify: `ios-app/BayitPlusApp/Views/Player/PlayerView.swift` (or equivalent player view)
- Modify: `ios-app/BayitPlusApp/Views/LiveTV/EPGView.swift` (or equivalent EPG view)
- Modify: `ios-app/BayitPlusApp/Views/ZehAni/ZehAniDashboardView.swift` (or equivalent)

The Android system works as:

1. `WithFeatureTooltip(featureKey, message) { content() }` wraps a screen
2. `TooltipManager.shouldShow(featureKey)` checks DataStore
3. `GlassTooltip` appears once, dismissed via `markShown(featureKey)`

iOS already has `TooltipManager.swift` and `GlassTooltip.swift`. Missing: the SwiftUI modifier and screen integration.

**Step 1: Create FeatureTooltipModifier.swift**

```swift
import SwiftUI

struct FeatureTooltipModifier: ViewModifier {
    let featureKey: String
    let message: String
    @State private var showTooltip = false

    func body(content: Content) -> some View {
        ZStack(alignment: .top) {
            content
            if showTooltip {
                GlassTooltip(
                    message: message,
                    arrowDirection: .top,
                    onDismiss: {
                        TooltipManager.shared.markShown(featureKey)
                        withAnimation { showTooltip = false }
                    }
                )
                .padding(.top, DesignTokens.Spacing.xxl)
                .padding(.horizontal, DesignTokens.Spacing.lg)
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .onAppear {
            if TooltipManager.shared.shouldShow(featureKey) {
                withAnimation(.easeIn(duration: 0.3).delay(1.0)) {
                    showTooltip = true
                }
            }
        }
    }
}

extension View {
    func featureTooltip(featureKey: String, message: String) -> some View {
        modifier(FeatureTooltipModifier(featureKey: featureKey, message: message))
    }
}
```

**Step 2: Integrate into 4 iOS screens**

Use the existing `tooltip.*` localization keys that already exist in en.json:

- `tooltip.dubbing.description` -> Live TV player
- `tooltip.pauseAndAsk.description` -> VOD player pause
- `tooltip.zehAni.description` -> Zeh Ani dashboard
- `tooltip.catchup.description` -> EPG view

Example usage pattern (find the correct view files at implementation time):

```swift
PlayerView(...)
    .featureTooltip(
        featureKey: isLive ? "live_dubbing" : "pause_and_ask",
        message: localization.t(isLive ? "tooltip.dubbing.description" : "tooltip.pauseAndAsk.description")
    )
```

**Step 3: Add iOS Settings "Show Feature Tips" toggle**

Find the iOS Settings view and add a toggle wired to `TooltipManager.shared.tipsDisabled`.

**Step 4: Build and commit**

```bash
git add ios-app/BayitPlusApp/Views/Components/FeatureTooltipModifier.swift
git add <modified player/epg/zehani/settings views>
git commit -m "feat(ios): add contextual tooltip system with 4 screen integrations"
```

---

## Task 10: Add Android "What's New" Version Tracking

**Files:**

- Modify: `android-app/feature/feature-onboarding/src/main/java/tv/bayit/plus/feature/onboarding/FeatureTourViewModel.kt`
- Modify: `android-app/feature/feature-onboarding/src/main/java/tv/bayit/plus/feature/onboarding/TourDataStore.kt`

iOS already has `lastSeenVersion` and `currentTourVersion` with `hasNewCards` computed property. Android needs the same.

**Step 1: Add version fields to TourDataStore**

Add `lastSeenVersion` Int preference to TourDataStore alongside existing preferences.

**Step 2: Add version logic to FeatureTourViewModel**

```kotlin
companion object {
    private const val PLATFORM = "android"
    private const val TOUR_VERSION = 1
}

val hasNewCards: Boolean get() = lastSeenVersion < TOUR_VERSION

private var lastSeenVersion: Int = 0

// In loadLocalState():
lastSeenVersion = tourDataStore.getLastSeenVersion()

// In completeTour or sync:
tourDataStore.setLastSeenVersion(TOUR_VERSION)
```

**Step 3: Build and commit**

```bash
git add android-app/feature/feature-onboarding/src/main/java/tv/bayit/plus/feature/onboarding/FeatureTourViewModel.kt
git add android-app/feature/feature-onboarding/src/main/java/tv/bayit/plus/feature/onboarding/TourDataStore.kt
git commit -m "feat(android): add What's New version tracking to tour ViewModel"
```

---

## Task 11: Add Android Cross-Device Sync

**Files:**

- Modify: `android-app/feature/feature-onboarding/src/main/java/tv/bayit/plus/feature/onboarding/FeatureTourViewModel.kt`

iOS has `syncWithServer()` that calls `GET /tour/state` on launch and reconciles. Android needs the same.

**Step 1: Add syncWithServer method**

```kotlin
private fun syncWithServer() {
    viewModelScope.launch {
        try {
            val response = api.getTourState()
            if (response.isSuccessful) {
                val serverState = response.body()
                if (serverState?.completion_status == "completed" &&
                    _completionStatus.value == "not_started") {
                    _completionStatus.value = "completed"
                    tourDataStore.setCompletionStatus("completed")
                    logger.debug("Tour completed on another device, skipping")
                }
                serverState?.tour_version?.let { version ->
                    lastSeenVersion = version
                    tourDataStore.setLastSeenVersion(version)
                }
            }
        } catch (e: Exception) {
            logger.debug("Cross-device sync failed (non-blocking)", mapOf("error" to e.message.orEmpty()))
        }
    }
}
```

**Step 2: Call on init**

In the ViewModel `init` block, after `loadLocalState()`, call `syncWithServer()`.

**Step 3: Build and commit**

```bash
git add android-app/feature/feature-onboarding/src/main/java/tv/bayit/plus/feature/onboarding/FeatureTourViewModel.kt
git commit -m "feat(android): add cross-device tour state sync on launch"
```

---

## Execution Order and Dependencies

```
Task 1 (Backend model) ──> Task 2 (Backend routes) ──> [Backend complete]
                                                          |
Task 3 (Localization) ─────────────────────────────────> [All platforms can render cards]
                                                          |
Task 4 (Analytics) ──────────[P]──────────────────────> [Independent]
Task 5 (iOS tour wiring) ───[P]──────────────────────> [Independent]
Task 6 (tvOS tour wiring) ──[P]──────────────────────> [Independent]
Task 7 (Zeh Ani vocab) ─────[P]──> depends on Task 3 localization keys
Task 8 (Interaction credit) ─[P]──> depends on Task 3 localization keys
Task 9 (iOS tooltips) ──────[P]──────────────────────> [Independent]
Task 10 (Android version) ──[P]──────────────────────> [Independent]
Task 11 (Android sync) ─────[P]──> depends on Task 2 (backend routes)
```

**Phase 1 (Blockers):** Tasks 1, 2, 3 (sequential)
**Phase 2 (Parallel):** Tasks 4, 5, 6, 9, 10 (all independent)
**Phase 3 (Depends on localization):** Tasks 7, 8
**Phase 4 (Depends on backend):** Task 11

---

## Unmark False Completions in tasks.md

After all tasks are implemented, update `/Users/olorin/Documents/Projects/olorin/specs/031-ai-onboarding-experience/tasks.md`:

These tasks should be verified and genuinely marked [x]:

- T001, T004, T005, T006 (backend + localization blockers)
- T015 (analytics)
- T020 (iOS OnboardingAIView)
- T032 (tvOS TVOnboardingView)
- T065-T067 (interaction credit info)
- T068-T070 (Zeh Ani vocab)
- T083-T086 (iOS tooltips)
- T094-T095 (What's New)
- T097 (cross-device sync)
