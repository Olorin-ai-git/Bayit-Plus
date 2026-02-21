# tvOS Bug Fixes Plan - 2026-02-21

## BUG 1 [P0]: Zeh Ani Navigation Trap

- File: `TVMainTabView.swift` line 101
- Action: Remove empty `.onExitCommand {}` block entirely
- Rationale: SwiftUI NavigationStack handles back nav via Menu button automatically

## BUG 2 [P0]: Kids Tab Wrong Implementation

- File: `TVMainTabView.swift` line 48
- Action: Replace `TVKidsHubView()` with `TVYoungstersView()`
- Rationale: TVKidsHubView wraps TVChildrenView + TVYoungstersView but TVChildrenView hits broken endpoints (HTTP 422). TVYoungstersView works correctly on its own.
- Note: TVKidsHubView references TVChildrenView which uses ChildrenViewModel calling `fetchChildrenCategories`, `fetchChildrenFeatured`, `fetchAgeGroups` - all returning 422. The working youngsters view uses `fetchYoungsterCategories`, etc.

## BUG 3 [P1]: Tab Bar Resets on Every Appear

- File: `TVMainTabView.swift` line 56-58
- Action: Add `@State var hasAppeared = false` guard to `.onAppear`

## BUG 4 [P1]: Hero Carousel Focus Trap

- File: `GlassHeroCarousel.swift` (BayitDesignSystem package)
- Action: Add `.focusSection()` to the carousel VStack so it contains focus within itself and allows UP to escape to tab bar

## BUG 5 [P2]: Raw Markdown in AI Recommendation Text

- File: `TVCollectionPromoBannerView.swift` line 55 and `CollectionPromoBannerView.swift` line 62
- Action: Use `Text(AttributedString)` with markdown parsing for promoText display

## BUG 6 [P3]: Duplicate Files TVYoungstersView+Sections.swift and TVYoungstersView+Shelves.swift

- TVYoungstersView+Sections.swift and TVYoungstersView+Shelves.swift are identical
- Action: Delete one of them (Sections). Keep Shelves as it matches the naming convention.
- Also check for duplicate "All" filter - TVChildrenView has one but TVYoungstersView does not have filter chips at all.

## BUG 7 [P3]: Tab Bar Hidden Tabs

- Known limitation, no fix needed.
