import BayitAuth
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// View for managing connected authentication providers
struct ConnectedAccountsView: View {
    @Environment(AuthManager.self) var authManager
    @Environment(LocalizationManager.self) var localization
    @Environment(\.dismiss) private var dismiss

    @State var linkedProviders: [LinkedProvider] = []
    @State var isLoading = false
    @State var error: AuthError?
    @State var showingError = false
    @State var providerToUnlink: LinkedProvider?
    @State var showingUnlinkConfirmation = false

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            LazyVStack(spacing: DesignTokens.Spacing.lg) {
                headerSection

                if isLoading && linkedProviders.isEmpty {
                    loadingView
                } else {
                    linkedProvidersSection
                    availableProvidersSection
                }
            }
            .padding(.vertical, DesignTokens.Spacing.lg)
        }
        .background(DesignTokens.Background.primary)
        .navigationTitle(localization.t("settings.connectedAccounts"))
        .task {
            await loadLinkedProviders()
        }
        .alert(
            localization.t("common.error"),
            isPresented: $showingError,
            presenting: error
        ) { _ in
            Button(localization.t("common.ok"), role: .cancel) {
                error = nil
            }
        } message: { error in
            Text(error.userFacingMessage)
        }
        .alert(
            localization.t("settings.unlinkAccountConfirmTitle"),
            isPresented: $showingUnlinkConfirmation,
            presenting: providerToUnlink
        ) { provider in
            Button(localization.t("common.cancel"), role: .cancel) {
                providerToUnlink = nil
            }
            Button(localization.t("settings.unlinkConfirm"), role: .destructive) {
                Task {
                    await unlinkProvider(provider)
                }
            }
        } message: { provider in
            Text(localization.t("settings.unlinkConfirmation", ["provider": provider.provider.displayName]))
        }
    }
}

#Preview {
    NavigationStack {
        ConnectedAccountsView()
            .environment(AuthManager(
                configuration: AppAuthConfiguration(
                    googleClientID: "preview-client-id",
                    googleServerClientID: "preview-server-client-id",
                    bundleID: "tv.bayit.plus.preview",
                    keychainServiceName: "tv.bayit.plus.preview"
                ),
                logger: AppAPILogger()
            ))
            .environment(LocalizationManager())
    }
}
