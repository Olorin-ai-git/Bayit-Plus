#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    struct TVDiscoverAvatarPrerequisiteView: View {
        let onScanQR: () -> Void
        let onAIAvatar: () -> Void
        let onSkip: () -> Void
        @Environment(LocalizationManager.self) private var localization
        @FocusState private var focusedButton: AvatarButton?

        private enum AvatarButton: Hashable { case scanQR, aiAvatar, skip }

        var body: some View {
            VStack(spacing: TVDesignTokens.Spacing.xxl) {
                Image(systemName: "person.crop.circle.badge.plus")
                    .font(.system(size: TVDesignTokens.FontSize.hero))
                    .foregroundStyle(DesignTokens.Primary.default)
                Text(localization.t("discover.walkthrough.avatarNeeded"))
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .multilineTextAlignment(.center)
                HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                    avatarButton("discover.walkthrough.scanQR", icon: "qrcode.viewfinder",
                                 tag: .scanQR, bg: DesignTokens.Primary.default, action: onScanQR)
                    avatarButton("discover.walkthrough.aiAvatar", icon: "sparkles",
                                 tag: .aiAvatar, bg: DesignTokens.Glass.bgMedium, action: onAIAvatar)
                }
                Button(action: onSkip) {
                    Text(localization.t("discover.walkthrough.skipAvatar"))
                        .font(.system(size: TVDesignTokens.FontSize.base))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
                .buttonStyle(.plain)
                .focused($focusedButton, equals: .skip)
                .accessibilityIdentifier("tv_discover_skip_avatar")
            }
            .padding(TVDesignTokens.Spacing.xxl)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(DesignTokens.Glass.bgStrong.ignoresSafeArea())
        }

        private func avatarButton(
            _ titleKey: String, icon: String, tag: AvatarButton, bg: Color, action: @escaping () -> Void
        ) -> some View {
            Button(action: action) {
                HStack(spacing: TVDesignTokens.Spacing.md) {
                    Image(systemName: icon)
                        .font(.system(size: TVDesignTokens.FontSize.lg))
                    Text(localization.t(titleKey))
                        .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                }
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.horizontal, TVDesignTokens.Spacing.lg)
                .padding(.vertical, TVDesignTokens.Spacing.md)
                .background(bg)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.default))
            }
            .buttonStyle(.plain)
            .focused($focusedButton, equals: tag)
            .scaleEffect(focusedButton == tag ? TVDesignTokens.Focus.scaleAmount : 1.0)
            .animation(.easeInOut(duration: TVDesignTokens.Focus.animationDuration), value: focusedButton)
            .accessibilityIdentifier("tv_discover_\(tag)")
        }
    }
#endif
