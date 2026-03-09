#if os(tvOS)

    import BayitBYOC
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    struct TVBYOCSourceListView: View {
        @Environment(BYOCSourceManager.self) var byocManager
        @Environment(LocalizationManager.self) var localization

        var isEmbedded: Bool = false
        let onDismiss: () -> Void

        @State private var showAddIPTV = false
        @State private var showAddXtream = false
        @State private var showPlexAuth = false
        @State private var showAddYouTube = false
        @State private var plexAuthToken: String?
        @State private var sourceToRemove: BYOCSourceConfig?

        var body: some View {
            ZStack {
                DesignTokens.Background.primary.ignoresSafeArea()

                VStack(spacing: TVDesignTokens.Spacing.xl) {
                    headerSection
                    ScrollView {
                        VStack(spacing: TVDesignTokens.Spacing.lg) {
                            iptvSection
                            xtreamSection
                            plexSection
                            youtubeSection
                            existingSourcesList
                        }
                        .padding(TVDesignTokens.Spacing.md)
                    }
                    if !isEmbedded {
                        closeButton
                    }
                }
                .padding(TVDesignTokens.Spacing.xl)
            }
            .fullScreenCover(isPresented: $showAddIPTV) {
                TVAddIPTVSourceSheet(onDismiss: { showAddIPTV = false })
            }
            .fullScreenCover(isPresented: $showAddXtream) {
                TVAddXtreamSourceSheet(onDismiss: { showAddXtream = false })
            }
            .fullScreenCover(isPresented: $showAddYouTube) {
                TVAddYouTubeSheet(onDismiss: { showAddYouTube = false })
            }
            .fullScreenCover(isPresented: $showPlexAuth) {
                TVPlexAuthSheet(
                    onAuthenticated: { token in
                        showPlexAuth = false
                        Task { @MainActor in
                            try? await Task.sleep(for: .milliseconds(600))
                            plexAuthToken = token
                        }
                    },
                    onDismiss: { showPlexAuth = false }
                )
            }
            .fullScreenCover(
                isPresented: Binding(
                    get: { plexAuthToken != nil },
                    set: { if !$0 { plexAuthToken = nil } }
                )
            ) {
                if let token = plexAuthToken {
                    TVPlexServerPickerSheet(
                        authToken: token,
                        onDismiss: { plexAuthToken = nil }
                    )
                }
            }
            .onExitCommand {
                if !isEmbedded { onDismiss() }
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

        private var headerSection: some View {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "play.tv")
                    .font(.system(size: 50))
                    .foregroundStyle(DesignTokens.Primary.p400)
                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xxs) {
                    Text(localization.t("byoc.connectedSources"))
                        .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)
                    Text(localization.t("byoc.connectContentDesc"))
                        .font(.system(size: TVDesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
                Spacer()
                if !isEmbedded {
                    Button { onDismiss() } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 40))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }
                    .tvCardStyle()
                }
            }
        }

        private var iptvSection: some View {
            addSourceRow(
                icon: "antenna.radiowaves.left.and.right",
                title: localization.t("byoc.addIPTV"),
                subtitle: localization.t("byoc.enterURL"),
                color: DesignTokens.Primary.p400
            ) { showAddIPTV = true }
        }

        @ViewBuilder
        private var xtreamSection: some View {
            if byocManager.hasXtream {
                let count = byocManager.xtreamChannels.count
                    + byocManager.xtreamVODItems.count
                connectedRow(
                    icon: "tv.and.mediabox",
                    title: localization.t("byoc.addXtream"),
                    subtitle: "\(count) \(localization.t("byoc.itemsLoaded"))",
                    color: .purple
                )
            } else {
                addSourceRow(
                    icon: "tv.and.mediabox",
                    title: localization.t("byoc.addXtream"),
                    subtitle: localization.t("byoc.xtreamConnectDesc"),
                    color: .purple
                ) { showAddXtream = true }
            }
        }

        @ViewBuilder
        private var plexSection: some View {
            if byocManager.hasPlex {
                connectedRow(
                    icon: "server.rack",
                    title: localization.t("byoc.addPlex"),
                    subtitle: "\(byocManager.plexItems.count) \(localization.t("byoc.itemsLoaded"))",
                    color: .orange
                )
            } else {
                addSourceRow(
                    icon: "server.rack",
                    title: localization.t("byoc.addPlex"),
                    subtitle: localization.t("byoc.plexConnectDesc"),
                    color: .orange
                ) { showPlexAuth = true }
            }
        }

        @ViewBuilder
        private var youtubeSection: some View {
            if byocManager.hasYouTube {
                connectedRow(
                    icon: "play.rectangle.fill",
                    title: localization.t("byoc.addYouTube"),
                    subtitle: "\(byocManager.youtubeItems.count) \(localization.t("byoc.itemsLoaded"))",
                    color: .red
                )
            } else {
                addSourceRow(
                    icon: "play.rectangle.fill",
                    title: localization.t("byoc.addYouTube"),
                    subtitle: localization.t("byoc.youtubeConnectDesc"),
                    color: .red
                ) { showAddYouTube = true }
            }
        }

        @ViewBuilder
        private var existingSourcesList: some View {
            if !byocManager.sources.isEmpty {
                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                    Text(localization.t("byoc.connectedSources"))
                        .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.secondary)

                    ForEach(byocManager.sources) { source in
                        TVBYOCSourceCard(source: source) {
                            sourceToRemove = source
                        }
                    }
                }
            }
        }
    }

#endif
