import BayitDesignSystem
import BayitLocalization
import SwiftUI
import UIKit

/// Welcome step with language picker that immediately switches UI language.
struct TVOnboardingWelcomeStep: View {
    @Environment(LocalizationManager.self) private var localization

    let onNext: () -> Void
    let onSkip: () -> Void

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Spacer()

            logoSection
            welcomeText
            languagePicker
            actionButtons

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.horizontal, TVDesignTokens.Spacing.xxxxl)
    }

    // MARK: - Logo

    private var logoSection: some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            if let logoImage = UIImage(named: "logo") {
                Image(uiImage: logoImage)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(
                        width: TVDesignTokens.Logo.width * 1.5,
                        height: TVDesignTokens.Logo.height * 1.5
                    )
            }

            (Text(localization.t("splash.bayit"))
                .foregroundColor(.white)
                + Text(localization.t("splash.plus"))
                .foregroundColor(DesignTokens.Colors.Primary.base))
                .font(.system(size: TVDesignTokens.FontSize.hero, weight: .bold))
        }
    }

    // MARK: - Text

    private var welcomeText: some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("onboarding.welcome.title"))
                .font(.system(size: TVDesignTokens.FontSize.xxxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("onboarding.welcome.subtitle"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 700)
        }
    }

    // MARK: - Language Picker

    private var languagePicker: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                ForEach(Language.allCases, id: \.rawValue) { lang in
                    Button {
                        localization.setLanguage(lang)
                    } label: {
                        Text(lang.displayName)
                            .font(.system(
                                size: TVDesignTokens.FontSize.base,
                                weight: isSelected(lang) ? .bold : .medium
                            ))
                            .foregroundStyle(DesignTokens.Text.primary)
                            .padding(.horizontal, TVDesignTokens.Spacing.lg)
                            .padding(.vertical, TVDesignTokens.Spacing.sm)
                            .background(
                                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                                    .fill(
                                        isSelected(lang)
                                            ? DesignTokens.Primary.p400.opacity(0.25)
                                            : DesignTokens.Glass.bgLight
                                    )
                            )
                            .overlay(
                                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                                    .stroke(
                                        isSelected(lang)
                                            ? DesignTokens.Primary.p400
                                            : Color.clear,
                                        lineWidth: 2
                                    )
                            )
                    }
                    .tvCardStyle()
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.md)
        }
    }

    private func isSelected(_ lang: Language) -> Bool {
        localization.currentLanguage == lang
    }

    // MARK: - Actions

    private var actionButtons: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            GlassButton(
                localization.t("onboarding.welcome.getStarted"),
                variant: .primary,
                size: .large,
                icon: Image(systemName: "arrow.right")
            ) {
                onNext()
            }

            Button {
                onSkip()
            } label: {
                Text(localization.t("onboarding.skip"))
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            .buttonStyle(.plain)
        }
    }
}
