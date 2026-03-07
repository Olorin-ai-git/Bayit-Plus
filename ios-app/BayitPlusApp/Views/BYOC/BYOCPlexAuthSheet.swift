import BayitBYOC
import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Sheet for Plex PIN-based authentication on iOS.
/// Two phases: PIN auth, then server selection.
struct BYOCPlexAuthSheet: View {
    @Environment(BYOCSourceManager.self) private var byocManager
    @Environment(LocalizationManager.self) private var localization
    @Environment(\.dismiss) private var dismiss

    @State private var pin: PlexPIN?
    @State private var authToken: String?
    @State private var servers: [PlexServer] = []
    @State private var isPolling = false
    @State private var isDiscovering = false
    @State private var isSuccess = false
    @State private var error: String?

    private let logger = BayitLogger(category: "BYOCPlexAuth")

    var body: some View {
        NavigationStack {
            VStack(spacing: DesignTokens.Spacing.xl) {
                Spacer()
                if isSuccess {
                    successView
                } else if !servers.isEmpty {
                    serverPickerView
                } else if let pin {
                    pinView(pin)
                } else {
                    ProgressView().tint(.white)
                    Text(localization.t("byoc.plexRequestingPin"))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
                if let error {
                    Text(error)
                        .foregroundStyle(DesignTokens.ErrorColor.default)
                        .font(.system(size: DesignTokens.FontSize.sm))
                }
                Spacer()
            }
            .padding(DesignTokens.Spacing.xl)
            .background(DesignTokens.Background.primary)
            .navigationTitle(localization.t("byoc.addPlex"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(localization.t("common.cancel")) { dismiss() }
                }
            }
            .task { await requestPIN() }
        }
    }

    private func pinView(_ pin: PlexPIN) -> some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Image(systemName: "server.rack")
                .font(.system(size: 48)).foregroundStyle(.orange)

            Text(localization.t("byoc.plexVisitLink"))
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.secondary)

            Link("plex.tv/link", destination: URL(string: "https://plex.tv/link")!)
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))

            Text(pin.code)
                .font(.system(size: 40, weight: .bold, design: .monospaced))
                .foregroundStyle(DesignTokens.Text.primary).tracking(6)

            if isPolling {
                HStack(spacing: DesignTokens.Spacing.sm) {
                    ProgressView().tint(.white)
                    Text(localization.t("byoc.plexWaiting"))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
            }
        }
    }

    private var serverPickerView: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Text(localization.t("byoc.plexSelectServer"))
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            if isDiscovering {
                ProgressView().tint(.white)
            }

            ForEach(servers, id: \.name) { server in
                Button { Task { await selectServer(server) } } label: {
                    GlassCard {
                        HStack {
                            Image(systemName: "server.rack")
                                .foregroundStyle(.orange)
                            Text(server.name)
                                .foregroundStyle(DesignTokens.Text.primary)
                            Spacer()
                            Image(systemName: "chevron.right")
                                .foregroundStyle(DesignTokens.Text.muted)
                        }
                        .padding(DesignTokens.Spacing.md)
                    }
                }
            }
        }
    }

    private var successView: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 64))
                .foregroundStyle(DesignTokens.Success.default)
            Text(localization.t("byoc.sourceAdded"))
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
            GlassButton(localization.t("common.done"), variant: .primary, size: .medium) {
                dismiss()
            }
        }
    }

    private func requestPIN() async {
        let authService = PlexAuthService(
            clientId: byocManager.plexClientId,
            productName: "Bayit+"
        )
        do {
            let plexPIN = try await authService.requestPIN()
            pin = plexPIN
            isPolling = true
            let token = try await authService.pollForToken(pinId: plexPIN.id)
            authToken = token
            isPolling = false
            isDiscovering = true
            let client = PlexAPIClient(authToken: token, clientId: byocManager.plexClientId)
            servers = try await client.discoverServers()
            isDiscovering = false
        } catch {
            self.error = error.localizedDescription
            logger.error("Plex auth failed", error: error)
            isPolling = false
        }
    }

    private func selectServer(_ server: PlexServer) async {
        guard let token = authToken else { return }
        do {
            try await byocManager.addPlexSource(name: server.name, server: server, authToken: token)
            isSuccess = true
        } catch {
            self.error = error.localizedDescription
            logger.error("Plex server import failed", error: error)
        }
    }
}
