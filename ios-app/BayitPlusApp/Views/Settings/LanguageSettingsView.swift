import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Language selection screen with a grid of all 10 supported languages.
/// Changing language immediately updates the app UI and persists the choice.
struct LanguageSettingsView: View {
    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: DesignTokens.Spacing.xl) {
                headerSection

                languageGrid
            }
            .padding(.vertical, DesignTokens.Spacing.lg)
        }
        .background(DesignTokens.Background.primary)
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: "globe")
                .font(.system(size: 48))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(localization.t("settings.chooseLanguage"))
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("settings.languageDescription"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Grid

    private var languageGrid: some View {
        LazyVGrid(
            columns: [GridItem(.flexible()), GridItem(.flexible())],
            spacing: DesignTokens.Spacing.md
        ) {
            ForEach(Language.allCases, id: \.rawValue) { language in
                languageCard(language)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func languageCard(_ language: Language) -> some View {
        let isSelected = localization.currentLanguage == language

        return Button {
            withAnimation(.easeInOut(duration: 0.2)) {
                localization.setLanguage(language)
            }
        } label: {
            VStack(spacing: DesignTokens.Spacing.xs) {
                Text(language.displayName)
                    .font(.system(
                        size: DesignTokens.FontSize.md,
                        weight: .semibold
                    ))
                    .foregroundStyle(
                        isSelected
                            ? DesignTokens.Text.primary
                            : DesignTokens.Text.secondary
                    )

                Text(language.rawValue.uppercased())
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.muted)

                if language.isRTL {
                    GlassBadge(text: "RTL", variant: .info)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, DesignTokens.Spacing.base)
            .glassCard(radius: DesignTokens.Radius.md, padding: 0)
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .stroke(
                        isSelected
                            ? DesignTokens.Primary.default
                            : Color.clear,
                        lineWidth: 2
                    )
            )
        }
    }
}
