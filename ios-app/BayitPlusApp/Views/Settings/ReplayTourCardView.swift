import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Individual feature card displayed during the replay tour.
/// Shows the feature title, tagline, and description inside a glass card.
struct ReplayTourCardView: View {
    let card: FeatureTourViewModel.FeatureCard
    @Environment(LocalizationManager.self) var localization

    var body: some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.lg) {
                featureIcon
                titleSection
                descriptionSection
            }
            .padding(DesignTokens.Spacing.xl)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(localization.t(card.titleKey))
    }

    private var featureIcon: some View {
        Image(systemName: iconName)
            .font(.system(size: 48))
            .foregroundStyle(DesignTokens.Primary.default)
            .frame(height: 64)
    }

    private var titleSection: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            Text(localization.t(card.titleKey))
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .multilineTextAlignment(.center)

            Text(localization.t(card.taglineKey))
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
    }

    private var descriptionSection: some View {
        Text(localization.t(card.descriptionKey))
            .font(.system(size: DesignTokens.FontSize.sm))
            .foregroundStyle(DesignTokens.Text.muted)
            .multilineTextAlignment(.center)
            .lineLimit(6)
    }

    private var iconName: String {
        let iconMap: [String: String] = [
            "live_dubbing": "waveform.and.mic",
            "live_trivia": "questionmark.bubble",
            "subtitles_split": "captions.bubble",
            "engrew_heblish": "character.textbox",
            "pause_and_ask": "pause.circle",
            "movie_interaction": "bubble.left.and.text.bubble.right",
            "zeh_ani": "person.crop.circle",
            "catchup": "clock.arrow.circlepath",
            "byoc": "play.tv",
        ]
        return iconMap[card.featureKey] ?? "star"
    }
}
