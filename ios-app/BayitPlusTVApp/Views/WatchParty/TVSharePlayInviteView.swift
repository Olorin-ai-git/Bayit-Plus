#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// UI for starting a SharePlay session from a content detail view.
    /// Shows "Watch Together" button and FaceTime participant info.
    struct TVSharePlayInviteView: View {
        @Environment(LocalizationManager.self) private var localization

        let contentId: String
        let contentType: String
        let contentTitle: String
        let onStartSharePlay: () -> Void
        let onStartBayitParty: () -> Void

        var body: some View {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                headerSection
                optionsSection
            }
            .padding(TVDesignTokens.Spacing.xl)
        }

        // MARK: - Header

        private var headerSection: some View {
            VStack(spacing: TVDesignTokens.Spacing.sm) {
                Image(systemName: "person.2.fill")
                    .font(.system(size: TVDesignTokens.FontSize.xxl))
                    .foregroundStyle(DesignTokens.Primary.default)

                Text(localization.t("sharePlay.watchTogether"))
                    .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(localization.t("sharePlay.inviteDescription"))
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 500)
            }
        }

        // MARK: - Options

        private var optionsSection: some View {
            HStack(spacing: TVDesignTokens.Spacing.xl) {
                sharePlayOption
                bayitPartyOption
            }
        }

        private var sharePlayOption: some View {
            Button(action: onStartSharePlay) {
                VStack(spacing: TVDesignTokens.Spacing.md) {
                    Image(systemName: "shareplay")
                        .font(.system(size: TVDesignTokens.FontSize.xxl))
                        .foregroundStyle(DesignTokens.Primary.default)

                    Text(localization.t("sharePlay.viaFaceTime"))
                        .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Text(localization.t("sharePlay.faceTimeDescription"))
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)
                        .multilineTextAlignment(.center)
                }
                .frame(width: 280, height: 200)
                .padding(TVDesignTokens.Spacing.lg)
            }
            .buttonStyle(WatchTogetherCardStyle())
            .accessibilityLabel(localization.t("sharePlay.viaFaceTime"))
        }

        private var bayitPartyOption: some View {
            Button(action: onStartBayitParty) {
                VStack(spacing: TVDesignTokens.Spacing.md) {
                    Image(systemName: "party.popper")
                        .font(.system(size: TVDesignTokens.FontSize.xxl))
                        .foregroundStyle(DesignTokens.Colors.Semantic.success)

                    Text(localization.t("sharePlay.bayitParty"))
                        .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Text(localization.t("sharePlay.bayitPartyDescription"))
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)
                        .multilineTextAlignment(.center)
                }
                .frame(width: 280, height: 200)
                .padding(TVDesignTokens.Spacing.lg)
            }
            .buttonStyle(WatchTogetherCardStyle())
            .accessibilityLabel(localization.t("sharePlay.bayitParty"))
        }
    }

    // MARK: - Card Style

    private struct WatchTogetherCardStyle: ButtonStyle {
        @Environment(\.isFocused) private var isFocused

        func makeBody(configuration: Configuration) -> some View {
            configuration.label
                .background(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                        .fill(DesignTokens.Glass.bg)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                        .stroke(
                            isFocused
                                ? DesignTokens.Primary.default
                                : DesignTokens.Glass.border,
                            lineWidth: isFocused
                                ? TVDesignTokens.Focus.ringWidth : 1
                        )
                )
                .scaleEffect(isFocused ? TVDesignTokens.Focus.scaleAmount : 1.0)
                .shadow(
                    color: isFocused
                        ? DesignTokens.Primary.default.opacity(0.3)
                        : .clear,
                    radius: isFocused ? TVDesignTokens.Focus.shadowRadius : 0
                )
                .animation(
                    .easeInOut(duration: TVDesignTokens.Focus.animationDuration),
                    value: isFocused
                )
        }
    }
#endif
