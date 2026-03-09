import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS dubbing demo: focus-navigable language toggle between
/// Original and Dubbed audio, with InlineVideoPlayer for 10-foot UI.
struct TVDubbingDemoView: View {
    @Environment(LocalizationManager.self) var localization
    @State private var showDubbed = false

    private let originalAsset = "demo_dubbing_original"
    private let dubbedAsset = "demo_dubbing_dubbed"

    var body: some View {
        HStack(spacing: TVDesignTokens.Spacing.xxl) {
            videoSection
            controlPanel
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxxxl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Video

    private var videoSection: some View {
        ZStack(alignment: .topTrailing) {
            InlineVideoPlayer(
                assetName: showDubbed ? dubbedAsset : originalAsset
            )
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))

            languageBadge
                .padding(TVDesignTokens.Spacing.lg)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var languageBadge: some View {
        Text(
            showDubbed
                ? localization.t("onboarding.tour.dubbing.dubbed")
                : localization.t("onboarding.tour.dubbing.original")
        )
        .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
        .foregroundStyle(DesignTokens.Text.primary)
        .padding(.horizontal, TVDesignTokens.Spacing.lg)
        .padding(.vertical, TVDesignTokens.Spacing.sm)
        .background(.ultraThinMaterial)
        .clipShape(Capsule())
    }

    // MARK: - Controls

    private var controlPanel: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Text(localization.t("onboarding.tour.dubbing.title"))
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("onboarding.tour.dubbing.description"))
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)

            Text(localization.t("onboarding.tour.dubbing.selectLanguage"))
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)

            VStack(spacing: TVDesignTokens.Spacing.focusGap) {
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
        }
        .frame(maxWidth: 420)
    }

    private func toggleButton(
        label: String, isActive: Bool, action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Text(label)
                .font(.system(
                    size: TVDesignTokens.FontSize.md,
                    weight: isActive ? .bold : .regular
                ))
                .foregroundStyle(DesignTokens.Text.primary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, TVDesignTokens.Spacing.lg)
                .background(
                    isActive
                        ? DesignTokens.Colors.Primary.base.opacity(0.4)
                        : DesignTokens.Glass.bgMedium
                )
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        }
        .buttonStyle(.card)
    }
}
