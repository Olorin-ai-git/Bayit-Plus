#if os(tvOS)

    import BayitBYOC
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - Source Grid

    extension TVBYOCSourceListView {
        private var connectedTypes: Set<BYOCSourceType> {
            Set(byocManager.sources.filter { $0.status == .active }.map(\.type))
        }

        var sourceGrid: some View {
            LazyVGrid(columns: gridColumns, spacing: TVDesignTokens.Spacing.lg) {
                sourceCard(
                    icon: "play.fill",
                    iconColor: .white,
                    iconBg: Color(red: 0.8, green: 0, blue: 0),
                    title: localization.t("byoc.youtube"),
                    subtitle: localization.t("byoc.youtubeConnectDesc"),
                    type: .youtube
                ) { showAddYouTube = true }

                sourceCard(
                    icon: "wifi",
                    iconColor: DesignTokens.Primary.p400,
                    iconBg: DesignTokens.Primary.p700.opacity(0.35),
                    title: localization.t("byoc.iptv"),
                    subtitle: localization.t("byoc.iptvConnectDesc"),
                    type: .iptv
                ) { showAddIPTV = true }

                sourceCard(
                    icon: "display",
                    iconColor: DesignTokens.Primary.p400,
                    iconBg: DesignTokens.Primary.p700.opacity(0.35),
                    title: localization.t("byoc.addXtream"),
                    subtitle: localization.t("byoc.xtreamConnectDesc"),
                    type: .xtream
                ) { showAddXtream = true }

                sourceCard(
                    icon: "chevron.right",
                    iconColor: Color(red: 0.9, green: 0.63, blue: 0.05),
                    iconBg: Color(white: 0.12),
                    title: localization.t("byoc.plex.label"),
                    subtitle: localization.t("byoc.plexConnectDesc"),
                    type: .plex
                ) { showPlexAuth = true }
            }
        }

        private func sourceCard(
            icon: String,
            iconColor: Color,
            iconBg: Color,
            title: String,
            subtitle: String,
            type: BYOCSourceType,
            action: @escaping () -> Void
        ) -> some View {
            let isConnected = connectedTypes.contains(type)
            return Button(action: action) {
                HStack(spacing: TVDesignTokens.Spacing.lg) {
                    ZStack {
                        Circle()
                            .fill(iconBg)
                            .frame(width: 80, height: 80)
                        Image(systemName: icon)
                            .font(.system(size: 30, weight: .semibold))
                            .foregroundStyle(iconColor)
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        Text(title)
                            .font(.system(size: 28, weight: .bold))
                            .foregroundStyle(DesignTokens.Text.primary)
                        Text(subtitle)
                            .font(.system(size: 20))
                            .foregroundStyle(DesignTokens.Text.secondary)
                            .lineLimit(2)
                        Spacer(minLength: 4)
                        if isConnected {
                            manageLabel
                        } else {
                            addLabel
                        }
                    }

                    Spacer(minLength: 0)

                    if isConnected {
                        connectedBadge
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.lg)
                .padding(.vertical, TVDesignTokens.Spacing.md)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(
                    isConnected
                        ? DesignTokens.Success.default.opacity(0.07)
                        : DesignTokens.Glass.bg
                )
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
                .overlay(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                        .stroke(
                            isConnected
                                ? DesignTokens.Success.default.opacity(0.4)
                                : Color.white.opacity(0.08),
                            lineWidth: isConnected ? 1.5 : 1
                        )
                )
            }
            .tvCardStyle()
        }

        private var connectedBadge: some View {
            HStack(spacing: 5) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 14, weight: .bold))
                Text(localization.t("status.connected"))
                    .font(.system(size: 16, weight: .semibold))
            }
            .foregroundStyle(.white)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(DesignTokens.Success.default.opacity(0.85))
            .clipShape(Capsule())
        }

        private var addLabel: some View {
            HStack(spacing: 5) {
                Image(systemName: "plus.circle.fill")
                    .font(.system(size: 18, weight: .bold))
                Text(localization.t("byoc.addButton"))
                    .font(.system(size: 20, weight: .semibold))
            }
            .foregroundStyle(DesignTokens.Primary.p400)
        }

        private var manageLabel: some View {
            HStack(spacing: 5) {
                Image(systemName: "slider.horizontal.3")
                    .font(.system(size: 18))
                Text(localization.t("byoc.manageSource"))
                    .font(.system(size: 20, weight: .semibold))
            }
            .foregroundStyle(DesignTokens.Success.default)
        }
    }

#endif
