# tvOS Hardcoded String Localization Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all hardcoded UI strings in the tvOS app with `localization.t()` calls, adding any missing locale keys to all 10 language files.

**Architecture:** The tvOS app uses `LocalizationManager` injected via `@Environment`. All locale keys live in `packages/ui/bayit-i18n/locales/`. 6 new keys are required; the rest reuse existing keys.

**Tech Stack:** Swift/SwiftUI, `BayitLocalization`, `packages/ui/bayit-i18n/locales/*.json` (10 files)

---

## Summary of Changes

### New locale keys to add (all 10 language files)

Under `tvos.judaism`:

- `categoriesShelf` → "Categories"
- `contentShelf` → "Jewish Content"

Under `tvos.subtitles` (new sub-section):

- `position.top` → "Top"
- `position.bottom` → "Bottom"
- `splitPicker.primary` → "Primary"
- `splitPicker.secondary` → "Secondary"

### Swift files to modify

| File                                           | Line    | Change                                                             |
| ---------------------------------------------- | ------- | ------------------------------------------------------------------ |
| `Views/TVWidgetsView.swift`                    | 151     | `"Now Playing..."` → `localization.t("tvos.radio.nowPlaying")`     |
| `Views/TVCultureView.swift`                    | 44      | `"Jerusalem"` → `localization.t("cultures.jerusalem.name")`        |
| `Views/TVCultureView.swift`                    | 48      | `"Tel Aviv"` → `localization.t("cultures.telAviv.name")`           |
| `Views/TVCultureView.swift`                    | 56      | `"All"` → `localization.t("common.all")`                           |
| `Views/TVCultureView.swift`                    | 92      | `"Content"` fallback → `localization.t("common.content")`          |
| `Views/TVFavoritesView.swift`                  | 38      | `"Favorites"` → `localization.t("tvos.favorites.title")`           |
| `Views/TVFavoritesView.swift`                  | 41      | `"Content"` fallback → `localization.t("common.content")`          |
| `Views/Shared/TVSkeletonLoaders.swift`         | 68–70   | Add `@Environment` + localize 3 titles                             |
| `Views/TVJudaismView.swift`                    | 103     | `"Categories"` → `localization.t("tvos.judaism.categoriesShelf")`  |
| `Views/TVJudaismView.swift`                    | 106     | `"Category"` fallback → `localization.t("tvos.judaism.category")`  |
| `Views/TVJudaismView.swift`                    | 113     | `"Jewish Content"` → `localization.t("tvos.judaism.contentShelf")` |
| `Views/TVJudaismView.swift`                    | 116     | `"Content"` fallback → `localization.t("common.content")`          |
| `Views/Player/TVSubtitleSettingsView.swift`    | 112,117 | `"Top"`/`"Bottom"` → localized                                     |
| `Views/Player/TVSplitLanguagePickerView.swift` | 36,37   | `"Primary"`/`"Secondary"` → localized                              |

### Skipped (not in scope)

- `TVWidgetsView.swift:214,217` — `"72°F"` / `"Sunny, Tel Aviv"` are hardcoded weather **data**, not UI copy. Requires a weather service integration.

---

## Task 1: Add new locale keys to all 10 JSON files

**Files:** `packages/ui/bayit-i18n/locales/{en,he,es,fr,hi,bn,ja,zh,it,ta}.json`

- [ ] Add `tvos.judaism.categoriesShelf` and `tvos.judaism.contentShelf` to all 10 files
- [ ] Add `tvos.subtitles` block (`position.top`, `position.bottom`, `splitPicker.primary`, `splitPicker.secondary`) to all 10 files
- [ ] Verify JSON is valid after edits

Translations:

| Key                                    | en             | he         | es              | fr           | hi            | bn               | ja               | zh       | it                | ta             |
| -------------------------------------- | -------------- | ---------- | --------------- | ------------ | ------------- | ---------------- | ---------------- | -------- | ----------------- | -------------- |
| `tvos.judaism.categoriesShelf`         | Categories     | קטגוריות   | Categorías      | Catégories   | श्रेणियाँ     | বিভাগ            | カテゴリー       | 分类     | Categorie         | வகைகள்         |
| `tvos.judaism.contentShelf`            | Jewish Content | תוכן יהודי | Contenido judío | Contenu juif | यहूदी सामग्री | ইহুদি বিষয়বস্তু | ユダヤコンテンツ | 犹太内容 | Contenuti ebraici | யூத உள்ளடக்கம் |
| `tvos.subtitles.position.top`          | Top            | למעלה      | Arriba          | Haut         | ऊपर           | উপরে             | 上               | 顶部     | In alto           | மேலே           |
| `tvos.subtitles.position.bottom`       | Bottom         | למטה       | Abajo           | Bas          | नीचे          | নীচে             | 下               | 底部     | In basso          | கீழே           |
| `tvos.subtitles.splitPicker.primary`   | Primary        | ראשי       | Principal       | Principal    | प्राथमिक      | প্রাথমিক         | プライマリ       | 主要     | Principale        | முதன்மை        |
| `tvos.subtitles.splitPicker.secondary` | Secondary      | משני       | Secundario      | Secondaire   | माध्यमिक      | মাধ্যমিক         | セカンダリ       | 次要     | Secondario        | இரண்டாம்       |

- [ ] Run `olorin-core/scripts/validate-i18n.sh --mode quick --dir packages/ui/bayit-i18n/locales`
- [ ] Commit: `git commit -m "feat(bayit/tvos/i18n): add missing tvos localization keys"`

---

## Task 2: Fix TVWidgetsView.swift

**File:** `ios-app/BayitPlusTVApp/Views/TVWidgetsView.swift`

- [ ] Line 151: replace `Text("Now Playing...")` with `Text(localization.t("tvos.radio.nowPlaying"))`
- [ ] Commit: `git commit -m "fix(bayit/tvos): localize now playing label in widgets view"`

---

## Task 3: Fix TVCultureView.swift

**File:** `ios-app/BayitPlusTVApp/Views/TVCultureView.swift`

- [ ] Line 44: `cultureShelf(title: "Jerusalem", ...)` → `cultureShelf(title: localization.t("cultures.jerusalem.name"), ...)`
- [ ] Line 48: `cultureShelf(title: "Tel Aviv", ...)` → `cultureShelf(title: localization.t("cultures.telAviv.name"), ...)`
- [ ] Line 56: `categoryChip("All", ...)` → `categoryChip(localization.t("common.all"), ...)`
- [ ] Line 92: `item.title ?? "Content"` → `item.title ?? localization.t("common.content")`
- [ ] Commit: `git commit -m "fix(bayit/tvos): localize culture view shelf titles and filters"`

---

## Task 4: Fix TVFavoritesView.swift

**File:** `ios-app/BayitPlusTVApp/Views/TVFavoritesView.swift`

- [ ] Line 38: `GlassContentShelf(title: "Favorites", ...)` → `localization.t("tvos.favorites.title")`
- [ ] Line 41: `item.title ?? "Content"` → `item.title ?? localization.t("common.content")`
- [ ] Commit: `git commit -m "fix(bayit/tvos): localize favorites shelf title"`

---

## Task 5: Fix TVSkeletonLoaders.swift

**File:** `ios-app/BayitPlusTVApp/Views/Shared/TVSkeletonLoaders.swift`

`TVSkeletonHomeView` has no `localization` environment. Add it.

- [ ] Add `import BayitLocalization` at top
- [ ] Add `@Environment(LocalizationManager.self) private var localization` to `TVSkeletonHomeView`
- [ ] Replace hardcoded titles:
  - `"Continue Watching"` → `localization.t("tvos.home.continueWatching")`
  - `"Live TV"` → `localization.t("tvos.home.liveTV")`
  - `"Trending"` → `localization.t("tvos.home.trendingNow")`
- [ ] Commit: `git commit -m "fix(bayit/tvos): localize skeleton loader shelf titles"`

---

## Task 6: Fix TVJudaismView.swift

**File:** `ios-app/BayitPlusTVApp/Views/TVJudaismView.swift`

- [ ] Line 103: `"Categories"` → `localization.t("tvos.judaism.categoriesShelf")`
- [ ] Line 106: `"Category"` fallback → `localization.t("tvos.judaism.category")`
- [ ] Line 113: `"Jewish Content"` → `localization.t("tvos.judaism.contentShelf")`
- [ ] Line 116: `"Content"` fallback → `localization.t("common.content")`
- [ ] Commit: `git commit -m "fix(bayit/tvos): localize judaism view shelf titles"`

---

## Task 7: Fix TVSubtitleSettingsView.swift

**File:** `ios-app/BayitPlusTVApp/Views/Player/TVSubtitleSettingsView.swift`

- [ ] Line 112: `GlassChip(title: "Top", ...)` → `GlassChip(title: localization.t("tvos.subtitles.position.top"), ...)`
- [ ] Line 115: accessibility label `"Position subtitles at top"` → `localization.t("tvos.subtitles.position.top")`
- [ ] Line 117: `GlassChip(title: "Bottom", ...)` → `GlassChip(title: localization.t("tvos.subtitles.position.bottom"), ...)`
- [ ] Line 120: accessibility label `"Position subtitles at bottom"` → `localization.t("tvos.subtitles.position.bottom")`
- [ ] Commit: `git commit -m "fix(bayit/tvos): localize subtitle position chip labels"`

---

## Task 8: Fix TVSplitLanguagePickerView.swift

**File:** `ios-app/BayitPlusTVApp/Views/Player/TVSplitLanguagePickerView.swift`

- [ ] Line 36: `languageColumn(title: "Primary", ...)` → `languageColumn(title: localization.t("tvos.subtitles.splitPicker.primary"), ...)`
- [ ] Line 37: `languageColumn(title: "Secondary", ...)` → `languageColumn(title: localization.t("tvos.subtitles.splitPicker.secondary"), ...)`
- [ ] Commit: `git commit -m "fix(bayit/tvos): localize split language picker column headers"`

---

## Task 9: Final validation

- [ ] Run `olorin-core/scripts/validate-i18n.sh --mode full --dir packages/ui/bayit-i18n/locales`
- [ ] Verify 0 missing/extra key errors
