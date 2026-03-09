import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Dubbing demo: split-screen video showing original vs dubbed audio.
/// Tap the language toggle to switch between Hebrew and English dub.
struct DubbingDemoView: View {
    @Environment(LocalizationManager.self) var localization
    @State private var showDubbed = false

    private let originalAsset = "demo_dubbing_original"
    private let dubbedAsset = "demo_dubbing_dubbed"

    var body: some View {
        VStack(spacing: 0) {
            headerSection
            videoSection
            languageToggle
        }
        .background(DesignTokens.Background.primary)
    }

    private var headerSection: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            Text(localization.t("onboarding.tour.dubbing.title"))
                .font(DesignTokens.Typography.title2)
                .foregroundStyle(DesignTokens.Colors.textPrimary)

            Text(localization.t("onboarding.tour.dubbing.tagline"))
                .font(DesignTokens.Typography.body)
                .foregroundStyle(DesignTokens.Colors.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(.top, DesignTokens.Spacing.xl)
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private var videoSection: some View {
        ZStack {
            InlineVideoPlayer(
                assetName: showDubbed ? dubbedAsset : originalAsset
            )
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))

            VStack {
                HStack {
                    Spacer()
                    languageBadge
                }
                Spacer()
            }
            .padding(DesignTokens.Spacing.md)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.vertical, DesignTokens.Spacing.md)
    }

    private var languageBadge: some View {
        Text(showDubbed
            ? localization.t("onboarding.tour.dubbing.dubbed")
            : localization.t("onboarding.tour.dubbing.original"))
            .font(DesignTokens.Typography.caption)
            .foregroundStyle(DesignTokens.Colors.textPrimary)
            .padding(.horizontal, DesignTokens.Spacing.md)
            .padding(.vertical, DesignTokens.Spacing.xs)
            .background(.ultraThinMaterial)
            .clipShape(Capsule())
    }

    private var languageToggle: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            toggleButton(
                label: localization.t("onboarding.tour.dubbing.original"),
                isActive: !showDubbed
            ) {
                withAnimation { showDubbed = false }
            }

            toggleButton(
                label: localization.t("onboarding.tour.dubbing.dubbed"),
                isActive: showDubbed
            ) {
                withAnimation { showDubbed = true }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.xl)
        .padding(.bottom, DesignTokens.Spacing.xl)
    }

    private func toggleButton(
        label: String, isActive: Bool, action: @escaping () -> Void
    ) -> some View {
        GlassButton(
            label,
            variant: isActive ? .primary : .ghost,
            size: .medium
        ) {
            action()
        }
    }
}
