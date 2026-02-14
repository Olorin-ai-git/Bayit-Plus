import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS language selection screen with a 2-column grid of focusable language cards.
/// Changing language immediately updates the app UI and persists the choice.
struct TVLanguageSettingsView: View {
    @Environment(LocalizationManager.self) private var localization

    private let columns = [
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
    ]

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: TVDesignTokens.Spacing.xl) {
                headerSection

                languageGrid
            }
            .padding(.vertical, TVDesignTokens.Spacing.xxl)
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
        }
        .background(DesignTokens.Background.primary)
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            Image(systemName: "globe")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(localization.t("settings.chooseLanguage"))
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("settings.languageDescription"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 800)
        }
    }

    // MARK: - Grid

    private var languageGrid: some View {
        LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
            ForEach(Language.allCases, id: \.rawValue) { language in
                languageCard(language)
            }
        }
    }

    // MARK: - Card

    private func languageCard(_ language: Language) -> some View {
        let isSelected = localization.currentLanguage == language

        return Button {
            withAnimation(.easeInOut(duration: 0.2)) {
                localization.setLanguage(language)
            }
        } label: {
            VStack(spacing: TVDesignTokens.Spacing.sm) {
                Text(language.displayName)
                    .font(.system(
                        size: TVDesignTokens.FontSize.lg,
                        weight: .semibold
                    ))
                    .foregroundStyle(
                        isSelected
                            ? DesignTokens.Text.primary
                            : DesignTokens.Text.secondary
                    )

                Text(language.rawValue.uppercased())
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)

                if language.isRTL {
                    Text(localization.t("settings.rtl"))
                        .font(.system(size: TVDesignTokens.FontSize.xs, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .padding(.horizontal, TVDesignTokens.Spacing.sm)
                        .padding(.vertical, TVDesignTokens.Spacing.xxs)
                        .background(DesignTokens.Primary.p400.opacity(0.3))
                        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Glass.bgLight)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                    .stroke(
                        isSelected
                            ? DesignTokens.Primary.default
                            : DesignTokens.Glass.border,
                        lineWidth: isSelected ? 2 : 1
                    )
            )
        }
        .buttonStyle(.plain)
        .tvFocusStyle()
    }
}
