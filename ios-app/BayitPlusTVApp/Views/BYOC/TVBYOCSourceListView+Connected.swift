#if os(tvOS)

    import BayitBYOC
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - Already Connected Sources

    extension TVBYOCSourceListView {
        @ViewBuilder
        var connectedSourcesSection: some View {
            if !byocManager.sources.isEmpty {
                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                    Text(localization.t("byoc.alreadyConnected"))
                        .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    HStack(spacing: TVDesignTokens.Spacing.md) {
                        ForEach(byocManager.sources) { source in
                            connectedSourcePill(source)
                        }
                    }
                }
            }
        }

        private func connectedSourcePill(_ source: BYOCSourceConfig) -> some View {
            Button {
                sourceToRemove = source
            } label: {
                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    ZStack {
                        Circle()
                            .fill(sourceTypeColor(source).opacity(0.15))
                            .frame(width: 44, height: 44)
                        Image(systemName: sourceTypeIcon(source))
                            .font(.system(size: 20))
                            .foregroundStyle(sourceTypeColor(source))
                    }
                    Text(source.name)
                        .font(.system(size: TVDesignTokens.FontSize.sm, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.primary)
                    Text("- \(localization.t("status.connected"))")
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Success.default)
                    Spacer(minLength: 0)
                    Circle()
                        .fill(DesignTokens.Success.default)
                        .frame(width: 12, height: 12)
                }
                .padding(.horizontal, TVDesignTokens.Spacing.lg)
                .padding(.vertical, TVDesignTokens.Spacing.md)
                .background(DesignTokens.Glass.bgMedium)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
                .overlay(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                        .stroke(Color.white.opacity(0.1), lineWidth: 1)
                )
            }
            .tvCardStyle()
        }

        func sourceTypeIcon(_ source: BYOCSourceConfig) -> String {
            switch source.type {
            case .youtube: return "play.fill"
            case .iptv: return "wifi"
            case .xtream: return "tv"
            case .plex: return "arrowtriangle.right.fill"
            }
        }

        func sourceTypeColor(_ source: BYOCSourceConfig) -> Color {
            switch source.type {
            case .youtube: return .red
            case .iptv: return DesignTokens.Primary.p400
            case .xtream: return .purple
            case .plex: return .orange
            }
        }
    }

#endif
