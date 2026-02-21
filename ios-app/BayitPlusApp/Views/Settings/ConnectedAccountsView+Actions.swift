import BayitAuth
import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - Actions and Helpers

extension ConnectedAccountsView {
    var headerSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text(localization.t("settings.connectedAccountsDescription"))
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.leading)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    var loadingView: some View {
        ProgressView()
            .tint(DesignTokens.Primary.default)
            .padding(.top, DesignTokens.Spacing.xxxxl)
    }

    func sectionHeader(_ title: String) -> some View {
        HStack {
            Text(title)
                .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.muted)
                .textCase(.uppercase)
            Spacer()
        }
    }

    var isGoogleLinked: Bool {
        linkedProviders.contains { $0.provider == .google }
    }

    var isAppleLinked: Bool {
        linkedProviders.contains { $0.provider == .apple }
    }

    func loadLinkedProviders() async {
        isLoading = true
        defer { isLoading = false }

        do {
            linkedProviders = try await authManager.fetchLinkedProviders()
        } catch let authError as AuthError {
            error = authError
            showingError = true
        } catch {
            self.error = .linkedProvidersFetchFailed(underlying: error.localizedDescription)
            showingError = true
        }
    }

    #if os(iOS)
        func linkGoogle() async {
            isLoading = true
            defer { isLoading = false }

            do {
                try await authManager.linkGoogleAccount()
                await loadLinkedProviders()
            } catch let authError as AuthError {
                error = authError
                showingError = true
            } catch {
                self.error = .linkProviderFailed(underlying: error.localizedDescription)
                showingError = true
            }
        }
    #endif

    func linkApple() async {
        isLoading = true
        defer { isLoading = false }

        do {
            try await authManager.linkAppleAccount()
            await loadLinkedProviders()
        } catch let authError as AuthError {
            error = authError
            showingError = true
        } catch {
            self.error = .linkProviderFailed(underlying: error.localizedDescription)
            showingError = true
        }
    }

    func unlinkProvider(_ provider: LinkedProvider) async {
        isLoading = true
        defer { isLoading = false }

        do {
            try await authManager.unlinkProvider(provider.provider)
            await loadLinkedProviders()
        } catch let authError as AuthError {
            error = authError
            showingError = true
        } catch {
            self.error = .unlinkProviderFailed(underlying: error.localizedDescription)
            showingError = true
        }

        providerToUnlink = nil
    }
}
