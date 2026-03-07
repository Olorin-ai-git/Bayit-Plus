import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Language selection step: primary UI language (single) and content languages (multi).
struct TVOnboardingLanguageStep: View {
    @Environment(LocalizationManager.self) private var localization
    @Bindable var viewModel: TVOnboardingViewModel

    /// All supported languages from the Language enum.
    private let supportedLanguages = Language.allCases

    private let columns = [
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
    ]

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Spacer()

            Text(localization.t("onboarding.language.title"))
                .font(.system(size: TVDesignTokens.FontSize.xxxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("onboarding.language.subtitle"))
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)

            // Primary language
            primaryLanguageSection

            // Content languages
            contentLanguagesSection

            Spacer()

            navigationButtons
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxxxl)
    }

    // MARK: - Primary Language

    private var primaryLanguageSection: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("onboarding.language.primary"))
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: TVDesignTokens.Spacing.md) {
                    ForEach(supportedLanguages, id: \.rawValue) { lang in
                        languageButton(
                            name: lang.displayName,
                            isSelected: viewModel.primaryLanguage == lang.rawValue
                        ) {
                            viewModel.primaryLanguage = lang.rawValue
                        }
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.md)
            }
        }
    }

    // MARK: - Content Languages

    private var contentLanguagesSection: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("onboarding.language.content"))
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)

            LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.md) {
                ForEach(supportedLanguages, id: \.rawValue) { lang in
                    languageButton(
                        name: lang.displayName,
                        isSelected: viewModel.selectedLanguages.contains(lang.rawValue)
                    ) {
                        viewModel.toggleLanguage(lang.rawValue)
                    }
                }
            }
        }
    }

    // MARK: - Language Button

    private func languageButton(
        name: String,
        isSelected: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Text(name)
                .font(.system(size: TVDesignTokens.FontSize.base, weight: .medium))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.horizontal, TVDesignTokens.Spacing.lg)
                .padding(.vertical, TVDesignTokens.Spacing.md)
                .background(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                        .fill(
                            isSelected
                                ? DesignTokens.Primary.p400.opacity(0.2)
                                : DesignTokens.Glass.bgLight
                        )
                )
                .overlay(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                        .stroke(
                            isSelected
                                ? DesignTokens.Primary.p400
                                : DesignTokens.Glass.border,
                            lineWidth: isSelected ? 2 : 1
                        )
                )
        }
        .tvCardStyle()
    }

    // MARK: - Navigation

    private var navigationButtons: some View {
        HStack(spacing: TVDesignTokens.Spacing.xl) {
            GlassButton(
                localization.t("common.back"),
                variant: .secondary,
                size: .medium
            ) {
                viewModel.previousStep()
            }

            GlassButton(
                localization.t("common.next"),
                variant: .primary,
                size: .medium,
                icon: Image(systemName: "arrow.right")
            ) {
                viewModel.nextStep()
            }
        }
        .padding(.bottom, TVDesignTokens.Spacing.xl)
    }
}
