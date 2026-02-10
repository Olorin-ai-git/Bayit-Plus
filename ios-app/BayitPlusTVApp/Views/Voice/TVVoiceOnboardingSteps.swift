import BayitDesignSystem
import SwiftUI

/// Welcome step content for tvOS voice onboarding.
struct TVVoiceWelcomeStep: View {

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            voiceOrbIcon

            Text("AI Features")
                .font(.system(size: TVDesignTokens.FontSize.hero, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text("Ask questions, get recommendations, and explore content with AI.")
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)

            featureList
        }
    }

    private var featureList: some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            featureRow(icon: "magnifyingglass", text: "Search with AI")
            featureRow(icon: "play.circle", text: "Get content recommendations")
            featureRow(icon: "globe", text: "Multiple languages supported")
            featureRow(icon: "person.crop.circle", text: "Personalized avatar assistant")
        }
        .padding(.top, TVDesignTokens.Spacing.lg)
    }

    private func featureRow(icon: String, text: String) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: icon)
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Primary.p400)
                .frame(width: 48, height: 48)

            Text(text)
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.primary)

            Spacer()
        }
        .padding(TVDesignTokens.Spacing.md)
        .background(DesignTokens.Glass.bgLight)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
    }

    private var voiceOrbIcon: some View {
        ZStack {
            Circle()
                .fill(DesignTokens.Glass.purpleLight)
                .frame(width: 160, height: 160)

            Circle()
                .fill(DesignTokens.Glass.purpleStrong)
                .frame(width: 110, height: 110)

            Image(systemName: "sparkles")
                .font(.system(size: TVDesignTokens.FontSize.xxxl, weight: .medium))
                .foregroundStyle(DesignTokens.Primary.p300)
        }
    }
}

/// Language selection step for tvOS voice onboarding.
struct TVVoiceLanguageSelectStep: View {

    @Binding var selectedLanguage: SupportedLanguage
    let availableLanguages: [SupportedLanguage]

    private let columns = [
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
    ]

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "globe")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text("Choose Language")
                .font(.system(size: TVDesignTokens.FontSize.xxxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text("Select your preferred language for AI features.")
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)

            LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(availableLanguages) { language in
                    languageCard(language)
                }
            }
        }
    }

    private func languageCard(_ language: SupportedLanguage) -> some View {
        let isSelected = selectedLanguage == language

        return Button {
            selectedLanguage = language
        } label: {
            VStack(spacing: TVDesignTokens.Spacing.xs) {
                Text(language.displayName)
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                    .foregroundStyle(
                        isSelected ? DesignTokens.Text.primary : DesignTokens.Text.secondary
                    )

                Text(language.nativeName)
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, TVDesignTokens.Spacing.lg)
            .background(isSelected ? DesignTokens.Glass.purpleLight : DesignTokens.Glass.bgLight)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                    .stroke(
                        isSelected ? DesignTokens.Primary.default : DesignTokens.Glass.border,
                        lineWidth: isSelected ? 2 : 1
                    )
            )
        }
        .buttonStyle(.plain)
        .tvFocusStyle()
    }
}
