import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Final onboarding step showing a summary of selections and "Start Watching" CTA.
struct TVOnboardingCompleteStep: View {
    @Environment(LocalizationManager.self) private var localization

    let viewModel: TVOnboardingViewModel
    let onFinish: () -> Void

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.xxxl) {
            Spacer()

            completionIcon
            titleSection
            summarySection

            if let error = viewModel.error {
                errorBanner(error)
            }

            Spacer()

            finishButton
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxxxl)
    }

    // MARK: - Completion Icon

    private var completionIcon: some View {
        ZStack {
            Circle()
                .fill(DesignTokens.Success.default.opacity(0.15))
                .frame(width: 160, height: 160)

            Circle()
                .fill(
                    RadialGradient(
                        colors: [DesignTokens.Success.default.opacity(0.6), DesignTokens.Success.default.opacity(0.2)],
                        center: .center,
                        startRadius: 0,
                        endRadius: 60
                    )
                )
                .frame(width: 120, height: 120)

            Image(systemName: "checkmark")
                .font(.system(size: TVDesignTokens.FontSize.display, weight: .bold))
                .foregroundStyle(.white)
        }
    }

    // MARK: - Title

    private var titleSection: some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("onboarding.complete.title"))
                .font(.system(size: TVDesignTokens.FontSize.xxxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("onboarding.complete.subtitle"))
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 700)
        }
    }

    // MARK: - Summary

    private var summarySection: some View {
        HStack(spacing: TVDesignTokens.Spacing.xxxl) {
            summaryCard(
                icon: "globe",
                title: localization.t("onboarding.complete.language"),
                value: localization.currentLanguage.displayName
            )

            if !viewModel.userName.isEmpty {
                summaryCard(
                    icon: "person.fill",
                    title: localization.t("onboarding.complete.name"),
                    value: viewModel.userName
                )
            }
        }
    }

    private func summaryCard(icon: String, title: String, value: String) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: 36))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(value)
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .lineLimit(1)

            Text(title)
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(minWidth: 140)
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bgMedium)
        .cornerRadius(TVDesignTokens.Radius.lg)
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                .stroke(DesignTokens.Glass.border, lineWidth: 1)
        )
    }

    // MARK: - Error

    private func errorBanner(_ message: String) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.sm) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(DesignTokens.Colors.Semantic.error)
            Text(message)
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(.white)
        }
        .padding(.horizontal, TVDesignTokens.Spacing.md)
        .padding(.vertical, TVDesignTokens.Spacing.sm)
        .background(Capsule().fill(DesignTokens.Colors.Semantic.error.opacity(0.9)))
    }

    // MARK: - Finish

    private var finishButton: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            GlassButton(
                viewModel.isSaving
                    ? localization.t("onboarding.complete.saving")
                    : localization.t("onboarding.complete.startWatching"),
                variant: .primary,
                size: .large,
                isLoading: viewModel.isSaving,
                icon: Image(systemName: "play.fill")
            ) {
                onFinish()
            }

            GlassButton(
                localization.t("common.back"),
                variant: .secondary,
                size: .medium
            ) {
                viewModel.previousStep()
            }
        }
        .padding(.bottom, TVDesignTokens.Spacing.xl)
    }
}
