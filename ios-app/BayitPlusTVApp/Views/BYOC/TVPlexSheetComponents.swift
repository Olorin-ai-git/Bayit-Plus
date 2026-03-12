#if os(tvOS)

    import BayitBYOC
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Row displaying a single Plex server for selection.
    struct TVPlexServerRow: View {
        @Environment(LocalizationManager.self) private var localization
        let server: PlexServer
        let isConnecting: Bool
        let onSelect: () -> Void

        var body: some View {
            Button(action: onSelect) {
                HStack(spacing: TVDesignTokens.Spacing.lg) {
                    Image(systemName: server.hasLocalConnection ? "desktopcomputer" : "cloud")
                        .font(.system(size: 32))
                        .foregroundStyle(.orange)
                        .frame(width: 50)

                    VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xxs) {
                        Text(server.name)
                            .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                            .foregroundStyle(DesignTokens.Text.primary)

                        Text(server.hasLocalConnection
                            ? localization.t("byoc.plexLocal")
                            : localization.t("byoc.plexRemote"))
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }

                    Spacer()

                    if isConnecting {
                        ProgressView().scaleEffect(0.7)
                    } else {
                        Image(systemName: "chevron.right")
                            .foregroundStyle(DesignTokens.Text.muted)
                    }
                }
                .padding(TVDesignTokens.Spacing.lg)
                .background(DesignTokens.Background.elevated)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
            }
            .tvCardStyle()
            .disabled(isConnecting)
        }
    }

    /// Success view shown after Plex source is added.
    struct TVPlexSuccessView: View {
        @Environment(LocalizationManager.self) private var localization
        let itemCount: Int
        let onClose: () -> Void

        var body: some View {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 80))
                    .foregroundStyle(DesignTokens.Success.default)

                Text(localization.t("byoc.sourceAdded"))
                    .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(String(format: localization.t("byoc.plexItemCount"), itemCount))
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.secondary)

                Button { onClose() } label: {
                    Text(localization.t("common.close"))
                        .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .padding(TVDesignTokens.Spacing.lg)
                        .frame(width: 200)
                        .background(DesignTokens.Primary.p400)
                        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
                }
                .tvCardStyle()
            }
        }
    }

#endif
