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
                    assetName: "byoc-youtube",
                    title: localization.t("byoc.youtube"),
                    subtitle: localization.t("byoc.youtubeConnectDesc")
                ) { showAddYouTube = true }

                sourceCard(
                    assetName: "byoc-iptv",
                    title: localization.t("byoc.iptv"),
                    subtitle: localization.t("byoc.iptvConnectDesc")
                ) { showAddIPTV = true }

                sourceCard(
                    assetName: "byoc-xtream",
                    title: localization.t("byoc.addXtream"),
                    subtitle: localization.t("byoc.xtreamConnectDesc")
                ) { showAddXtream = true }

                sourceCard(
                    assetName: "byoc-plex",
                    title: localization.t("byoc.plex.label"),
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
            .shadow(
                color: DesignTokens.Primary.p600.opacity(0.15),
                radius: 40, x: 0, y: 8
            )
        }

        private func sourceCard(
            assetName: String,
            title: String,
            subtitle: String,
            action: @escaping () -> Void
        ) -> some View {
            Button(action: action) {
                HStack(spacing: TVDesignTokens.Spacing.lg) {
                    Image(assetName)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 140, height: 140)
                        .clipShape(Circle())
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
