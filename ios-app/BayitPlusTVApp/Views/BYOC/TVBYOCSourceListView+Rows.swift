#if os(tvOS)

    import BayitBYOC
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - Source Grid + Connected Sources

    extension TVBYOCSourceListView {
        var sourceGrid: some View {
            LazyVGrid(columns: gridColumns, spacing: TVDesignTokens.Spacing.lg) {
                sourceCard(
                    icon: "play.fill",
                    iconColor: .red,
                    title: localization.t("byoc.youtube"),
                    subtitle: localization.t("byoc.youtubeConnectDesc")
                ) { showAddYouTube = true }

                sourceCard(
                    icon: "wifi",
                    iconColor: DesignTokens.Primary.p400,
                    title: localization.t("byoc.iptv"),
                    subtitle: localization.t("byoc.iptvConnectDesc")
                ) { showAddIPTV = true }

                sourceCard(
                    icon: "tv",
                    iconColor: DesignTokens.Primary.p400,
                    title: localization.t("byoc.addXtream"),
                    subtitle: localization.t("byoc.xtreamConnectDesc")
                ) { showAddXtream = true }

                sourceCard(
                    icon: "arrowtriangle.right.fill",
                    iconColor: .orange,
                    title: localization.t("byoc.plex"),
                    subtitle: localization.t("byoc.plexConnectDesc")
                ) { showPlexAuth = true }
            }
            .padding(TVDesignTokens.Spacing.xl)
            .background(DesignTokens.Glass.bgMedium)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl))
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
            )
        }

        private func sourceCard(
            icon: String,
            iconColor: Color,
            title: String,
            subtitle: String,
            action: @escaping () -> Void
        ) -> some View {
            Button(action: action) {
                HStack(spacing: TVDesignTokens.Spacing.lg) {
                    sourceIcon(icon, color: iconColor)
                    VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                        Text(title)
                            .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                            .foregroundStyle(DesignTokens.Text.primary)
                        Text(subtitle)
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.secondary)
                            .lineLimit(2)
                        addButton
                    }
                    Spacer(minLength: 0)
                }
                .padding(TVDesignTokens.Spacing.lg)
                .background(DesignTokens.Glass.bg)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
                .overlay(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                        .stroke(Color.white.opacity(0.08), lineWidth: 1)
                )
            }
            .tvCardStyle()
        }

        private func sourceIcon(_ name: String, color: Color) -> some View {
            ZStack {
                Circle()
                    .fill(color.opacity(0.15))
                    .frame(width: 140, height: 140)
                Image(systemName: name)
                    .font(.system(size: 56))
                    .foregroundStyle(color)
            }
        }

        private var addButton: some View {
            HStack(spacing: TVDesignTokens.Spacing.xs) {
                Image(systemName: "plus")
                    .font(.system(size: 14, weight: .bold))
                Text(localization.t("byoc.addButton"))
                    .font(.system(size: TVDesignTokens.FontSize.xs, weight: .semibold))
            }
            .foregroundStyle(DesignTokens.Primary.default)
            .padding(.horizontal, TVDesignTokens.Spacing.md)
            .padding(.vertical, TVDesignTokens.Spacing.xs)
            .background(DesignTokens.Primary.default.opacity(0.15))
            .clipShape(Capsule())
        }
    }

#endif
