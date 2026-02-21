import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - Onboarding Step Views

extension OnboardingAIView {
    // MARK: - Step 1: Welcome

    func welcomeStep(_ vm: OnboardingAIViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.xl) {
            Image(systemName: "sparkles")
                .font(.system(size: DesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(localization.t("onboarding.welcomeTitle"))
                .font(.system(size: DesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .multilineTextAlignment(.center)

            Text(localization.t("onboarding.welcomeSubtitle"))
                .font(.system(size: DesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)

            GlassCard {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                    preferenceRow(
                        icon: "globe",
                        title: localization.t("onboarding.language"),
                        value: vm.preferredLanguage
                    )

                    togglePreference(
                        icon: "captions.bubble",
                        title: localization.t("onboarding.subtitles"),
                        isOn: vm.subtitlesEnabled
                    ) { vm.subtitlesEnabled = $0 }

                    togglePreference(
                        icon: "play.circle",
                        title: localization.t("onboarding.autoplay"),
                        isOn: vm.autoplayEnabled
                    ) { vm.autoplayEnabled = $0 }
                }
            }
        }
    }

    // MARK: - Step 2: Content Taste

    func contentTasteStep(_ vm: OnboardingAIViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.xl) {
            Image(systemName: "sparkle.magnifyingglass")
                .font(.system(size: 36))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(localization.t("onboarding.tasteTitle"))
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .multilineTextAlignment(.center)

            Text(localization.t("onboarding.tasteSubtitle"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)

            genreGrid(vm)
        }
    }

    func genreGrid(_ vm: OnboardingAIViewModel) -> some View {
        let genres = [
            "drama", "comedy", "documentary", "action",
            "family", "thriller", "romance", "animation",
            "music", "reality", "news", "sports",
        ]
        let columns = [
            GridItem(.flexible(), spacing: DesignTokens.Spacing.sm),
            GridItem(.flexible(), spacing: DesignTokens.Spacing.sm),
            GridItem(.flexible(), spacing: DesignTokens.Spacing.sm),
        ]

        return LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.sm) {
            ForEach(genres, id: \.self) { genre in
                let isSelected = vm.selectedGenres.contains(genre)
                Button {
                    HapticFeedbackService.selection()
                    vm.toggleGenre(genre)
                } label: {
                    Text(genre.capitalized)
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                        .foregroundStyle(
                            isSelected
                                ? DesignTokens.Text.primary
                                : DesignTokens.Text.secondary
                        )
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, DesignTokens.Spacing.md)
                        .background(
                            isSelected
                                ? DesignTokens.Primary.default
                                : DesignTokens.Glass.bgMedium
                        )
                        .clipShape(
                            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                                .stroke(
                                    isSelected
                                        ? DesignTokens.Primary.p500
                                        : DesignTokens.Glass.border,
                                    lineWidth: 1
                                )
                        )
                }
            }
        }
    }

    // MARK: - Step 3: Voice Setup

    func voiceSetupStep(_ vm: OnboardingAIViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.xl) {
            Image(systemName: "waveform.circle.fill")
                .font(.system(size: DesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(localization.t("onboarding.voiceTitle"))
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .multilineTextAlignment(.center)

            Text(localization.t("onboarding.voiceSubtitle"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)

            GlassCard {
                VStack(spacing: DesignTokens.Spacing.md) {
                    togglePreference(
                        icon: "mic.fill",
                        title: localization.t("onboarding.enableVoice"),
                        isOn: vm.voiceEnabled
                    ) { vm.voiceEnabled = $0 }

                    togglePreference(
                        icon: "text.bubble.fill",
                        title: localization.t("onboarding.wakeWord"),
                        isOn: vm.wakeWordEnabled
                    ) { vm.wakeWordEnabled = $0 }
                }
            }
        }
    }
}
