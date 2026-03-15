import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Main container for the feature discovery tour. Hosts a paged TabView
/// of FeatureCardView instances with skip/complete navigation.
struct FeatureTourView: View {
    @Bindable var viewModel: FeatureTourViewModel
    @Environment(LocalizationManager.self) var localization
    let onComplete: () -> Void

    @State private var selectedLanguages: Set<String> = []
    @State private var selectedGenres: Set<String> = []
    @State private var hasChildren = false

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            if viewModel.showPersonalization {
                PersonalizationStepView(
                    selectedLanguages: $selectedLanguages,
                    selectedGenres: $selectedGenres,
                    hasChildren: $hasChildren
                ) {
                    let prefs: [String: Any] = [
                        "content_languages": Array(selectedLanguages),
                        "genres": Array(selectedGenres),
                        "has_children": hasChildren,
                    ]
                    viewModel.finalizeTour(preferences: prefs)
                    onComplete()
                }
            } else {
                VStack(spacing: DesignTokens.Spacing.md) {
                    topBar
                    cardPager
                    progressDots
                }
            }
        }
        .sheet(item: $viewModel.showingDemo) { card in
            demoSheet(for: card)
        }
        .onAppear {
            if viewModel.completionStatus == "not_started" {
                viewModel.startTour()
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel(localization.t("onboarding.featureTour"))
    }

    // MARK: - Top Bar

    private var topBar: some View {
        HStack {
            Text(localization.t("onboarding.tour.title"))
                .font(DesignTokens.Typography.headline)
                .foregroundStyle(DesignTokens.Colors.textPrimary)

            Spacer()

            GlassButton(
                localization.t("onboarding.tour.skip"),
                variant: .ghost,
                size: .small
            ) {
                viewModel.skipTour()
                onComplete()
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.xl)
        .padding(.top, DesignTokens.Spacing.md)
    }

    // MARK: - Card Pager

    private var cardPager: some View {
        TabView(selection: $viewModel.currentIndex) {
            ForEach(
                Array(viewModel.cards.enumerated()),
                id: \.element.id
            ) { index, card in
                FeatureCardView(card: card) {
                    viewModel.tapDemo(card: card)
                }
                .tag(index)
                .padding(.horizontal, DesignTokens.Spacing.lg)
            }
        }
        .tabViewStyle(.page(indexDisplayMode: .never))
        .frame(maxHeight: .infinity)
        .onChange(of: viewModel.currentIndex) { _, newValue in
            if newValue > 0 {
                viewModel.advanceToNextCard()
            }
        }
    }

    // MARK: - Progress & Action

    private var progressDots: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            TourProgressIndicator(
                currentIndex: viewModel.currentIndex,
                totalCount: viewModel.cards.count
            )

            if viewModel.isLastCard {
                GlassButton(
                    localization.t("onboarding.tour.getStarted"),
                    variant: .primary,
                    size: .large
                ) {
                    viewModel.completeTour()
                }
            }
        }
        .padding(.bottom, DesignTokens.Spacing.xl)
    }

    // MARK: - Demo Sheet

    private func demoSheet(for card: FeatureTourViewModel.FeatureCard) -> some View {
        NavigationStack {
            DemoRouter(featureKey: card.featureKey)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button(action: { viewModel.dismissDemo() }) {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundStyle(
                                    DesignTokens.Colors.textSecondary
                                )
                        }
                    }
                }
        }
    }
}

/// Routes to the correct demo view based on feature key.
private struct DemoRouter: View {
    let featureKey: String

    var body: some View {
        switch featureKey {
        case "live_dubbing":
            DubbingDemoView()
        case "live_trivia":
            TriviaDemoView()
        case "subtitles_split", "engrew_heblish":
            SubtitleDemoView()
        case "pause_and_ask", "movie_interaction":
            InteractionDemoView()
        case "zeh_ani":
            ZehAniDemoView()
        case "catchup":
            CatchupDemoView()
        case "byoc":
            BYOCDemoView()
        default:
            Text(featureKey)
        }
    }
}
