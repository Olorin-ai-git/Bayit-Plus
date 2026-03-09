import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Lightweight tour replay view presented from Settings.
/// Shows the feature cards in a pager with skip/complete navigation.
struct ReplayTourView: View {
    @Bindable var viewModel: FeatureTourViewModel
    @Environment(LocalizationManager.self) var localization
    let onComplete: () -> Void

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            VStack(spacing: DesignTokens.Spacing.md) {
                topBar
                cardPager
                bottomControls
            }
        }
        .onAppear {
            if viewModel.completionStatus == "not_started" {
                viewModel.startTour()
            }
        }
    }

    // MARK: - Top Bar

    private var topBar: some View {
        HStack {
            Text(localization.t("onboarding.tour.title"))
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

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
                ReplayTourCardView(card: card)
                    .tag(index)
                    .padding(.horizontal, DesignTokens.Spacing.lg)
            }
        }
        .tabViewStyle(.page(indexDisplayMode: .never))
        .frame(maxHeight: .infinity)
    }

    // MARK: - Bottom Controls

    private var bottomControls: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            progressIndicator

            if viewModel.isLastCard {
                GlassButton(
                    localization.t("onboarding.tour.getStarted"),
                    variant: .primary,
                    size: .large
                ) {
                    viewModel.finalizeTour()
                    onComplete()
                }
            }
        }
        .padding(.bottom, DesignTokens.Spacing.xl)
    }

    private var progressIndicator: some View {
        HStack(spacing: DesignTokens.Spacing.xs) {
            ForEach(0 ..< viewModel.cards.count, id: \.self) { idx in
                Circle()
                    .fill(
                        idx == viewModel.currentIndex
                            ? DesignTokens.Primary.default
                            : DesignTokens.Text.muted.opacity(0.4)
                    )
                    .frame(
                        width: idx == viewModel.currentIndex ? 10 : 6,
                        height: idx == viewModel.currentIndex ? 10 : 6
                    )
                    .animation(.easeInOut, value: viewModel.currentIndex)
            }
        }
    }
}
