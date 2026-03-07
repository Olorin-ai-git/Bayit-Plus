#if os(tvOS)

    import BayitBYOC
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    struct TVBYOCSourceListView: View {
        @Environment(BYOCSourceManager.self) private var byocManager
        @Environment(LocalizationManager.self) private var localization

        let onDismiss: () -> Void

        @State private var showAddIPTV = false
        @State private var showPlexAuth = false
        @State private var showAddYouTube = false
        @State private var plexAuthToken: String?
        @State private var sourceToRemove: BYOCSourceConfig?

        var body: some View {
            ZStack {
                DesignTokens.Glass.bg.ignoresSafeArea()

                VStack(spacing: TVDesignTokens.Spacing.xl) {
                    headerSection
                    ScrollView {
                        VStack(spacing: TVDesignTokens.Spacing.lg) {
                            iptvSection
                            plexSection
                            youtubeSection
                            existingSourcesList
                        }
                        .padding(TVDesignTokens.Spacing.md)
                    }
                    closeButton
                }
                .padding(TVDesignTokens.Spacing.xl)
            }
            .fullScreenCover(isPresented: $showAddIPTV) {
                TVAddIPTVSourceSheet(onDismiss: { showAddIPTV = false })
            }
            .fullScreenCover(isPresented: $showAddYouTube) {
                TVAddYouTubeSheet(onDismiss: { showAddYouTube = false })
            }
            .fullScreenCover(isPresented: $showPlexAuth) {
                TVPlexAuthSheet(
                    onAuthenticated: { token in
                        plexAuthToken = token
                        showPlexAuth = false
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
                Button { onDismiss() } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 40))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
                .tvCardStyle()
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

        private var plexSection: some View {
            addSourceRow(
                icon: "server.rack",
                title: localization.t("byoc.addPlex"),
                subtitle: localization.t("byoc.plexConnectDesc"),
                color: .orange
            ) { showPlexAuth = true }
        }

        private var youtubeSection: some View {
            addSourceRow(
                icon: "play.rectangle.fill",
                title: localization.t("byoc.addYouTube"),
                subtitle: localization.t("byoc.youtubeConnectDesc"),
                color: .red
            ) { showAddYouTube = true }
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

        private func addSourceRow(
            icon: String,
            title: String,
            subtitle: String,
            color: Color,
            action: @escaping () -> Void
        ) -> some View {
            Button(action: action) {
                HStack(spacing: TVDesignTokens.Spacing.lg) {
                    Image(systemName: icon)
                        .font(.system(size: 32))
                        .foregroundStyle(color)
                        .frame(width: 50)
                    VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xxs) {
                        Text(title)
                            .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                            .foregroundStyle(DesignTokens.Text.primary)
                        Text(subtitle)
                            .font(.system(size: TVDesignTokens.FontSize.md))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }
                    Spacer()
                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: 30))
                        .foregroundStyle(color)
                }
                .padding(TVDesignTokens.Spacing.lg)
                .background(DesignTokens.Background.elevated)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
            }
            .tvCardStyle()
        }

        private var closeButton: some View {
            Button { onDismiss() } label: {
                Text(localization.t("common.close"))
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .padding(TVDesignTokens.Spacing.lg)
                    .frame(maxWidth: .infinity)
                    .background(DesignTokens.Glass.purpleLight)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
            }
            .tvCardStyle()
        }
    }

#endif
