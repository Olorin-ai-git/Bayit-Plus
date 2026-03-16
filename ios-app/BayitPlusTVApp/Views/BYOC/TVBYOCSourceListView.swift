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

        @State var showAddIPTV = false
        @State var showAddXtream = false
        @State var showPlexAuth = false
        @State var showAddYouTube = false
        @State var plexAuthToken: String?
        @State var sourceToRemove: BYOCSourceConfig?

        let gridColumns = [
            GridItem(.flexible(), spacing: TVDesignTokens.Spacing.lg),
            GridItem(.flexible(), spacing: TVDesignTokens.Spacing.lg),
        ]

        var body: some View {
            ZStack {
                DesignTokens.Background.primary.ignoresSafeArea()

                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: TVDesignTokens.Spacing.xl) {
                        headerSection
                        sourceGrid
                        connectedSourcesSection
                    }
                    .padding(.horizontal, 60)
                    .padding(.vertical, TVDesignTokens.Spacing.lg)
                }
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

        // MARK: - Header

        private var headerSection: some View {
            VStack(spacing: TVDesignTokens.Spacing.sm) {
                Text(localization.t("byoc.connectedSources"))
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
                Text(localization.t("byoc.connectContentDesc"))
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
        }
    }

#endif
