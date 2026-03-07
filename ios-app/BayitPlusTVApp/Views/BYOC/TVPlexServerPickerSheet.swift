#if os(tvOS)

    import BayitBYOC
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Sheet for selecting a Plex server after authentication.
    struct TVPlexServerPickerSheet: View {
        @Environment(BYOCSourceManager.self) private var byocManager
        @Environment(LocalizationManager.self) private var localization

        let authToken: String
        let onDismiss: () -> Void

        @State private var servers: [PlexServer] = []
        @State private var isLoading = true
        @State private var isConnecting = false
        @State private var errorMessage: String?
        @State private var didSucceed = false
        @State private var itemCount = 0

        var body: some View {
            ZStack {
                DesignTokens.Glass.bg.ignoresSafeArea()

                VStack(spacing: TVDesignTokens.Spacing.xl) {
                    headerSection
                    if didSucceed {
                        TVPlexSuccessView(itemCount: itemCount, onClose: onDismiss)
                    } else if isLoading {
                        loadingView
                    } else if let error = errorMessage {
                        errorView(error)
                    } else {
                        serverList
                    }
                }
                .padding(TVDesignTokens.Spacing.xxxxl)
            }
            .task { await discoverServers() }
        }

        private var headerSection: some View {
            VStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "server.rack")
                    .font(.system(size: 60))
                    .foregroundStyle(.orange)

                Text(localization.t("byoc.plexSelectServer"))
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                if !didSucceed && !isLoading && errorMessage == nil {
                    Text(localization.t("byoc.plexSelectServerDesc"))
                        .font(.system(size: TVDesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
            }
        }

        private var loadingView: some View {
            VStack(spacing: TVDesignTokens.Spacing.md) {
                ProgressView()
                Text(localization.t("byoc.plexDiscovering"))
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
        }

        private var serverList: some View {
            VStack(spacing: TVDesignTokens.Spacing.md) {
                ForEach(servers) { server in
                    TVPlexServerRow(
                        server: server,
                        isConnecting: isConnecting
                    ) {
                        Task { await connectServer(server) }
                    }
                }
                dismissButton
            }
            .frame(maxWidth: 800)
        }

        private func errorView(_ message: String) -> some View {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 50))
                    .foregroundStyle(DesignTokens.ErrorColor.default)
                Text(message)
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.ErrorColor.default)
                dismissButton
            }
        }

        private var dismissButton: some View {
            Button { onDismiss() } label: {
                Text(localization.t("common.cancel"))
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .padding(TVDesignTokens.Spacing.lg)
                    .frame(width: 200)
                    .background(DesignTokens.Glass.bgMedium)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
            }
            .tvCardStyle()
        }

        private func discoverServers() async {
            let client = PlexAPIClient(
                authToken: authToken,
                clientId: byocManager.plexClientId
            )
            do {
                servers = try await client.discoverServers()
                isLoading = false
                if servers.isEmpty {
                    errorMessage = localization.t("byoc.plexNoServers")
                }
            } catch {
                isLoading = false
                errorMessage = error.localizedDescription
            }
        }

        private func connectServer(_ server: PlexServer) async {
            isConnecting = true
            do {
                try await byocManager.addPlexSource(
                    name: server.name,
                    server: server,
                    authToken: authToken
                )
                itemCount = byocManager.plexItems.filter {
                    $0.sourceId == byocManager.sources.last?.id
                }.count
                didSucceed = true
            } catch {
                errorMessage = error.localizedDescription
            }
            isConnecting = false
        }
    }

#endif
