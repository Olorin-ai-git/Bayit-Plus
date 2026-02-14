import SwiftUI
import BayitAuth
import BayitDesignSystem
import BayitLocalization

/// View for managing connected authentication providers
struct ConnectedAccountsView: View {
    @Environment(AuthManager.self) private var authManager
    @Environment(LocalizationManager.self) private var localization
    @Environment(\.dismiss) private var dismiss

    @State private var linkedProviders: [LinkedProvider] = []
    @State private var isLoading = false
    @State private var error: AuthError?
    @State private var showingError = false
    @State private var providerToUnlink: LinkedProvider?
    @State private var showingUnlinkConfirmation = false

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
            Text("Are you sure you want to unlink your \(provider.provider.displayName) account?")
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text(localization.t("settings.connectedAccountsDescription"))
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.leading)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Loading

    private var loadingView: some View {
        ProgressView()
            .tint(DesignTokens.Primary.default)
            .padding(.top, DesignTokens.Spacing.xxxxl)
    }

    // MARK: - Linked Providers

    private var linkedProvidersSection: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            sectionHeader(localization.t("settings.linkedAccounts"))

            if linkedProviders.isEmpty {
                emptyState
            } else {
                ForEach(linkedProviders) { provider in
                    linkedProviderRow(provider)
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private var emptyState: some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: "link.circle")
                    .font(.system(size: 48))
                    .foregroundStyle(DesignTokens.Text.muted)

                Text(localization.t("settings.noLinkedAccounts"))
                    .font(.system(size: DesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
            .padding(DesignTokens.Spacing.xl)
        }
    }

    private func linkedProviderRow(_ provider: LinkedProvider) -> some View {
        GlassCard {
            HStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: provider.provider.iconName)
                    .font(.system(size: DesignTokens.FontSize.xl))
                    .foregroundStyle(DesignTokens.Primary.default)
                    .frame(width: 40)

                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                    HStack(spacing: DesignTokens.Spacing.sm) {
                        Text(provider.provider.displayName)
                            .font(.system(size: DesignTokens.FontSize.md, weight: .medium))
                            .foregroundStyle(DesignTokens.Text.primary)

                        if provider.isPrimary {
                            Text(localization.t("settings.primary"))
                                .font(.system(size: DesignTokens.FontSize.xs, weight: .semibold))
                                .foregroundStyle(.white)
                                .padding(.horizontal, DesignTokens.Spacing.sm)
                                .padding(.vertical, DesignTokens.Spacing.xxs)
                                .background(DesignTokens.Primary.default)
                                .clipShape(Capsule())
                        }
                    }

                    if let email = provider.providerEmail {
                        Text(email)
                            .font(.system(size: DesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }
                }

                Spacer()

                if !provider.isPrimary && linkedProviders.count > 1 {
                    Button {
                        providerToUnlink = provider
                        showingUnlinkConfirmation = true
                    } label: {
                        Text(localization.t("settings.unlink"))
                            .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                            .foregroundStyle(DesignTokens.ErrorColor.default)
                    }
                }
            }
            .padding(DesignTokens.Spacing.md)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(provider.provider.displayName) account\(provider.isPrimary ? ", primary" : "")")
        .accessibilityHint(provider.isPrimary ? "Primary sign-in method" : "Double tap to unlink")
    }

    // MARK: - Available Providers

    private var availableProvidersSection: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            sectionHeader(localization.t("settings.linkNewAccount"))

            if !isGoogleLinked {
                #if os(iOS)
                linkProviderButton(
                    icon: "g.circle.fill",
                    title: "Link Google Account"
                ) {
                    await linkGoogle()
                }
                #endif
            }

            if !isAppleLinked {
                linkProviderButton(
                    icon: "apple.logo",
                    title: "Link Apple Account"
                ) {
                    await linkApple()
                }
            }

            if isGoogleLinked && isAppleLinked {
                GlassCard {
                    Text(localization.t("settings.allAccountsLinked"))
                        .font(.system(size: DesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .padding(DesignTokens.Spacing.md)
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func linkProviderButton(
        icon: String,
        title: String,
        action: @escaping () async -> Void
    ) -> some View {
        GlassCard {
            Button {
                Task { await action() }
            } label: {
                HStack(spacing: DesignTokens.Spacing.md) {
                    Image(systemName: icon)
                        .font(.system(size: DesignTokens.FontSize.xl))
                        .foregroundStyle(DesignTokens.Primary.default)
                        .frame(width: 40)

                    Text(title)
                        .font(.system(size: DesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Spacer()

                    if isLoading {
                        ProgressView()
                            .tint(DesignTokens.Primary.default)
                    } else {
                        Image(systemName: "plus.circle")
                            .font(.system(size: DesignTokens.FontSize.lg))
                            .foregroundStyle(DesignTokens.Primary.default)
                    }
                }
                .padding(DesignTokens.Spacing.md)
            }
            .disabled(isLoading)
        }
    }

    // MARK: - Helpers

    private func sectionHeader(_ title: String) -> some View {
        HStack {
            Text(title)
                .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.muted)
                .textCase(.uppercase)
            Spacer()
        }
    }

    private var isGoogleLinked: Bool {
        linkedProviders.contains { $0.provider == .google }
    }

    private var isAppleLinked: Bool {
        linkedProviders.contains { $0.provider == .apple }
    }

    // MARK: - Actions

    private func loadLinkedProviders() async {
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
    private func linkGoogle() async {
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

    private func linkApple() async {
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

    private func unlinkProvider(_ provider: LinkedProvider) async {
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

