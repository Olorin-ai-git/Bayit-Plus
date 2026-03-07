import BayitBYOC
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// iOS BYOC source management view listing connected sources
/// and options to add IPTV, Plex, or YouTube.
struct BYOCSourceListView: View {
    @Environment(BYOCSourceManager.self) private var byocManager
    @Environment(LocalizationManager.self) private var localization

    @State private var showAddIPTV = false
    @State private var showAddXtream = false
    @State private var showPlexAuth = false
    @State private var showYouTubeAuth = false
    @State private var sourceToRemove: BYOCSourceConfig?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            LazyVStack(spacing: DesignTokens.Spacing.lg) {
                headerSection
                addSourceButtons
                existingSourcesList
            }
            .padding(.vertical, DesignTokens.Spacing.lg)
        }
        .background(DesignTokens.Background.primary)
        .navigationTitle(localization.t("byoc.connectedSources"))
        .sheet(isPresented: $showAddIPTV) {
            AddIPTVSourceSheet()
        }
        .sheet(isPresented: $showAddXtream) {
            AddXtreamSourceSheet()
        }
        .sheet(isPresented: $showPlexAuth) {
            BYOCPlexAuthSheet()
        }
        .sheet(isPresented: $showYouTubeAuth) {
            BYOCYouTubeAuthSheet()
        }
        .alert(
            localization.t("byoc.removeConfirm"),
            isPresented: Binding(
                get: { sourceToRemove != nil },
                set: { if !$0 { sourceToRemove = nil } }
            )
        ) {
            Button(localization.t("byoc.removeSource"), role: .destructive) {
                if let source = sourceToRemove {
                    byocManager.removeSource(id: source.id)
                }
                sourceToRemove = nil
            }
            Button(localization.t("common.cancel"), role: .cancel) {
                sourceToRemove = nil
            }
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: "play.tv")
                .font(.system(size: 48))
                .foregroundStyle(DesignTokens.Primary.default)

            Text(localization.t("byoc.connectContent"))
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("byoc.connectContentDesc"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 400)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Add Source Buttons

    private var addSourceButtons: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            sourceRow(
                icon: "antenna.radiowaves.left.and.right",
                title: localization.t("byoc.addIPTV"),
                subtitle: localization.t("byoc.enterURL"),
                color: DesignTokens.Primary.default
            ) { showAddIPTV = true }

            sourceRow(
                icon: "tv.and.mediabox",
                title: localization.t("byoc.addXtream"),
                subtitle: localization.t("byoc.xtreamConnectDesc"),
                color: .purple
            ) { showAddXtream = true }

            sourceRow(
                icon: "server.rack",
                title: localization.t("byoc.addPlex"),
                subtitle: localization.t("byoc.plexConnectDesc"),
                color: .orange
            ) { showPlexAuth = true }

            sourceRow(
                icon: "play.rectangle.fill",
                title: localization.t("byoc.addYouTube"),
                subtitle: localization.t("byoc.youtubeConnectDesc"),
                color: .red
            ) { showYouTubeAuth = true }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Existing Sources

    @ViewBuilder
    private var existingSourcesList: some View {
        if !byocManager.sources.isEmpty {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                Text(localization.t("byoc.connectedSources"))
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .textCase(.uppercase)

                ForEach(byocManager.sources) { source in
                    BYOCSourceRow(source: source) {
                        sourceToRemove = source
                    }
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
        }
    }

    // MARK: - Row Builder

    private func sourceRow(
        icon: String,
        title: String,
        subtitle: String,
        color: Color,
        action: @escaping () -> Void
    ) -> some View {
        GlassCard {
            Button(action: action) {
                HStack(spacing: DesignTokens.Spacing.md) {
                    Image(systemName: icon)
                        .font(.system(size: DesignTokens.FontSize.xl))
                        .foregroundStyle(color)
                        .frame(width: 32)

                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                        Text(title)
                            .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                            .foregroundStyle(DesignTokens.Text.primary)
                        Text(subtitle)
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }

                    Spacer()

                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: DesignTokens.FontSize.xl))
                        .foregroundStyle(color)
                }
                .padding(DesignTokens.Spacing.md)
            }
        }
    }
}
