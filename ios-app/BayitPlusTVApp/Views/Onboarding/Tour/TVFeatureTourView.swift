import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS feature tour using Siri Remote swipe navigation between cards.
struct TVFeatureTourView: View {
    @Bindable var viewModel: TVFeatureTourViewModel
    @Environment(LocalizationManager.self) var localization
    let onComplete: () -> Void

    var body: some View {
        ZStack {
            backgroundGradient

            VStack(spacing: TVDesignTokens.Spacing.lg) {
                topBar
                    .focusSection()
                cardContent
                    .focusSection()
                bottomControls
                    .focusSection()
            }
        }
        .onAppear {
            if viewModel.completionStatus == "not_started" {
                viewModel.startTour()
            }
        }
        .fullScreenCover(item: $viewModel.showingDemo) { card in
            TVDemoRouter(card: card) {
                viewModel.dismissDemo()
            }
            .environment(localization)
        }
    }

    // MARK: - Top Bar

    private var topBar: some View {
        HStack {
            Text(localization.t("onboarding.tour.title"))
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Spacer()

            Button(action: {
                viewModel.skipTour()
                onComplete()
            }) {
                Text(localization.t("onboarding.tour.skip"))
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .padding(.horizontal, TVDesignTokens.Spacing.lg)
                    .padding(.vertical, TVDesignTokens.Spacing.md)
            }
            .buttonStyle(.card)
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxxxl)
        .padding(.top, TVDesignTokens.Spacing.xl)
    }

    // MARK: - Card Content

    private var cardContent: some View {
        TabView(selection: $viewModel.currentIndex) {
            ForEach(
                Array(viewModel.cards.enumerated()),
                id: \.element.id
            ) { index, card in
                TVFeatureCardView(card: card) {
                    viewModel.tapDemo(card: card)
                }
                .tag(index)
                .padding(.horizontal, TVDesignTokens.Spacing.xxxxl)
            }
        }
        .tabViewStyle(.page(indexDisplayMode: .never))
        .frame(maxHeight: .infinity)
    }

    // MARK: - Bottom Controls

    private var bottomControls: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            TVTourProgressIndicator(
                currentIndex: viewModel.currentIndex,
                totalCount: viewModel.cards.count
            )

            HStack(spacing: TVDesignTokens.Spacing.xxl) {
                if viewModel.currentIndex > 0 {
                    Button(action: { viewModel.goToPreviousCard() }) {
                        HStack(spacing: TVDesignTokens.Spacing.sm) {
                            Image(systemName: "chevron.left")
                            Text(localization.t("common.back"))
                        }
                        .font(.system(size: TVDesignTokens.FontSize.base))
                        .foregroundStyle(DesignTokens.Text.secondary)
                    }
                    .buttonStyle(.card)
                }

                if viewModel.isLastCard {
                    Button(action: {
                        viewModel.finalizeTour()
                        onComplete()
                    }) {
                        Text(localization.t("onboarding.tour.getStarted"))
                            .font(.system(size: TVDesignTokens.FontSize.md, weight: .bold))
                            .foregroundStyle(DesignTokens.Text.primary)
                            .padding(.horizontal, TVDesignTokens.Spacing.xxxl)
                            .padding(.vertical, TVDesignTokens.Spacing.md)
                            .background(DesignTokens.Colors.Primary.base)
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.card)
                } else {
                    Button(action: { viewModel.advanceToNextCard() }) {
                        HStack(spacing: TVDesignTokens.Spacing.sm) {
                            Text(localization.t("common.next"))
                            Image(systemName: "chevron.right")
                        }
                        .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
                        .padding(.vertical, TVDesignTokens.Spacing.md)
                        .background(DesignTokens.Colors.Primary.base)
                        .clipShape(Capsule())
                    }
                    .buttonStyle(.card)
                }
            }
        }
        .padding(.bottom, TVDesignTokens.Spacing.xxl)
    }

    // MARK: - Background

    private var backgroundGradient: some View {
        LinearGradient(
            colors: [
                DesignTokens.Colors.Background.primary,
                Color.black,
            ],
            startPoint: .top,
            endPoint: .bottom
        )
        .ignoresSafeArea()
    }
}
