#if os(tvOS)

    import BayitBYOC
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Dismissable banner on the Home screen prompting users to connect content sources.
    /// Hidden once dismissed or when sources are already connected.
    struct TVBYOCBannerView: View {
        @Environment(BYOCSourceManager.self) private var byocManager
        @Environment(LocalizationManager.self) private var localization
        @Environment(TVOnboardingPreferences.self) private var prefs

        let onConnect: () -> Void

        @State private var isDismissed = false

        private var shouldShow: Bool {
            !isDismissed && !prefs.byocBannerDismissed && byocManager.sources.isEmpty
        }

        var body: some View {
            if shouldShow {
                bannerContent
            }
        }

        private var bannerContent: some View {
            Button(action: onConnect) {
                HStack(spacing: TVDesignTokens.Spacing.lg) {
                    iconSection
                    textSection
                    Spacer()
                    connectButton
                }
                .padding(TVDesignTokens.Spacing.lg)
                .background(bannerBackground)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
            }
            .tvCardStyle()
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .contextMenu {
                Button {
                    dismiss()
                } label: {
                    Label(
                        localization.t("byoc.bannerDismiss"),
                        systemImage: "xmark.circle"
                    )
                }
            }
        }

        private var iconSection: some View {
            ZStack {
                Circle()
                    .fill(DesignTokens.Primary.p400.opacity(0.15))
                    .frame(width: 70, height: 70)

                Image(systemName: "play.tv")
                    .font(.system(size: 32))
                    .foregroundStyle(DesignTokens.Primary.p400)
            }
        }

        private var textSection: some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xxs) {
                Text(localization.t("byoc.bannerTitle"))
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(localization.t("byoc.bannerSubtitle"))
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .lineLimit(2)
            }
        }

        private var connectButton: some View {
            HStack(spacing: TVDesignTokens.Spacing.xs) {
                Text(localization.t("byoc.bannerConnect"))
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))

                Image(systemName: "arrow.right")
                    .font(.system(size: TVDesignTokens.FontSize.base))
            }
            .foregroundStyle(DesignTokens.Primary.p400)
        }

        private var bannerBackground: some View {
            LinearGradient(
                colors: [
                    DesignTokens.Primary.p400.opacity(0.08),
                    DesignTokens.Glass.bgMedium,
                ],
                startPoint: .leading,
                endPoint: .trailing
            )
        }

        private func dismiss() {
            isDismissed = true
            prefs.byocBannerDismissed = true
        }
    }

#endif
