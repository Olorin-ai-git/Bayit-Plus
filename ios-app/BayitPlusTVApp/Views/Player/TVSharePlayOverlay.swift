#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Overlay showing SharePlay session status, participant count, and controls.
    /// Positioned at the top-right corner of the player during an active session.
    struct TVSharePlayOverlay: View {
        @Environment(LocalizationManager.self) private var localization
        @Bindable var service: TVSharePlayService
        let onEnd: () -> Void

        @FocusState private var isEndFocused: Bool

        var body: some View {
            VStack {
                HStack {
                    Spacer()
                    sessionPanel
                }
                Spacer()
            }
            .padding(TVDesignTokens.Spacing.xl)
            .transition(.move(edge: .trailing).combined(with: .opacity))
        }

        // MARK: - Session Panel

        private var sessionPanel: some View {
            VStack(alignment: .trailing, spacing: TVDesignTokens.Spacing.sm) {
                participantRow
                syncStatusRow
                endButton
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(.ultraThinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                    .stroke(DesignTokens.Glass.border, lineWidth: 1)
            )
            .focusSection()
        }

        // MARK: - Participants

        private var participantRow: some View {
            HStack(spacing: TVDesignTokens.Spacing.sm) {
                Image(systemName: "shareplay")
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Primary.default)

                Text(localization.t("sharePlay.watching"))
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.primary)

                participantCountBadge
            }
        }

        private var participantCountBadge: some View {
            HStack(spacing: TVDesignTokens.Spacing.xxs) {
                Image(systemName: "person.2.fill")
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                Text(String(service.participantCount))
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .bold))
            }
            .foregroundStyle(DesignTokens.Primary.p300)
            .padding(.horizontal, TVDesignTokens.Spacing.sm)
            .padding(.vertical, TVDesignTokens.Spacing.xxs)
            .background(DesignTokens.Primary.default.opacity(0.15))
            .clipShape(Capsule())
        }

        // MARK: - Sync Status

        private var syncStatusRow: some View {
            HStack(spacing: TVDesignTokens.Spacing.xs) {
                Circle()
                    .fill(service.isSynced
                        ? DesignTokens.Colors.Semantic.success
                        : DesignTokens.Warning.default)
                    .frame(width: 8, height: 8)

                Text(service.isSynced
                    ? localization.t("sharePlay.synced")
                    : localization.t("sharePlay.syncing"))
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
        }

        // MARK: - End Button

        private var endButton: some View {
            GlassButton(
                localization.t("sharePlay.end"),
                variant: .secondary,
                size: .medium,
                icon: Image(systemName: "xmark.circle")
            ) {
                onEnd()
            }
            .focused($isEndFocused)
            .accessibilityLabel(localization.t("sharePlay.end"))
        }
    }
#endif
