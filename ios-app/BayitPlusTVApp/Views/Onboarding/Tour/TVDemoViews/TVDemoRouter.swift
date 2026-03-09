import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Routes a feature card to the correct tvOS demo view.
/// Used by TVFeatureTourView to present the right demo as a sheet.
struct TVDemoRouter: View {
    let card: TVFeatureTourViewModel.FeatureCard
    let onDismiss: () -> Void
    @Environment(LocalizationManager.self) var localization

    var body: some View {
        ZStack {
            backgroundGradient

            VStack(spacing: TVDesignTokens.Spacing.md) {
                dismissBar
                demoContent
            }
        }
    }

    // MARK: - Dismiss Bar

    private var dismissBar: some View {
        HStack {
            Spacer()
            Button(action: onDismiss) {
                Text(localization.t("onboarding.tour.dismiss"))
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .padding(.horizontal, TVDesignTokens.Spacing.lg)
                    .padding(.vertical, TVDesignTokens.Spacing.sm)
            }
            .buttonStyle(.card)
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
        .padding(.top, TVDesignTokens.Spacing.lg)
    }

    // MARK: - Demo Content

    @ViewBuilder
    private var demoContent: some View {
        switch card.featureKey {
        case "live_dubbing":
            TVDubbingDemoView()
        case "live_trivia":
            TVTriviaDemoView()
        case "subtitles_split", "engrew_heblish":
            TVSubtitleDemoView()
        case "pause_and_ask", "movie_interaction":
            TVInteractionDemoView()
        case "zeh_ani":
            TVZehAniDemoView()
        case "catchup":
            TVCatchupDemoView()
        case "byoc":
            TVBYOCDemoView()
        default:
            fallbackView
        }
    }

    private var fallbackView: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: "sparkles.tv")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Colors.Primary.base)

            Text(localization.t(card.titleKey))
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t(card.descriptionKey))
                .font(.system(size: TVDesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 800)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
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
