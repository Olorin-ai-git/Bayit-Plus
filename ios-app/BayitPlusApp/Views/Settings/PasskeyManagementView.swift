import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Lists registered passkeys with add/remove capabilities.
///
/// Shows device names, creation dates, last-used dates, and provides
/// registration of new passkeys and deletion of existing ones.
struct PasskeyManagementView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: PasskeyViewModel?
    @State private var showingAddSheet = false
    @State private var deviceName = ""

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.credentials.isEmpty {
                    ProgressView()
                        .tint(.white)
                        .padding(.top, DesignTokens.Spacing.xxxxl)
                } else if let error = vm.error, vm.credentials.isEmpty {
                    ErrorStateView(message: error) {
                        Task { await vm.loadCredentials() }
                    }
                } else {
                    content(vm)
                }
            }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = PasskeyViewModel(repository: repos.passkey)
            }
            await viewModel?.loadCredentials()
        }
    }

    // MARK: - Content

    private func content(_ vm: PasskeyViewModel) -> some View {
        LazyVStack(spacing: DesignTokens.Spacing.lg) {
            headerSection
            addButton(vm)
            statusMessages(vm)
            credentialsList(vm)
        }
        .padding(.vertical, DesignTokens.Spacing.lg)
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: "person.badge.key.fill")
                .font(.system(size: DesignTokens.FontSize.display))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(localization.t("passkeys.title"))
                .font(.system(
                    size: DesignTokens.FontSize.xl,
                    weight: .bold
                ))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("passkeys.description"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, DesignTokens.Spacing.xl)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Add

    private func addButton(_ vm: PasskeyViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            if showingAddSheet {
                GlassCard {
                    VStack(spacing: DesignTokens.Spacing.md) {
                        GlassTextField(
                            localization.t("passkeys.deviceNamePlaceholder"),
                            text: $deviceName
                        )

                        HStack(spacing: DesignTokens.Spacing.md) {
                            GlassButton(
                                localization.t("common.cancel"),
                                variant: .ghost,
                                size: .small
                            ) {
                                showingAddSheet = false
                                deviceName = ""
                            }

                            GlassButton(
                                localization.t("passkeys.register"),
                                variant: .primary,
                                size: .small,
                                isDisabled: deviceName.isEmpty,
                                isLoading: vm.isRegistering
                            ) {
                                Task {
                                    await vm.registerPasskey(
                                        deviceName: deviceName
                                    )
                                    if vm.error == nil {
                                        showingAddSheet = false
                                        deviceName = ""
                                    }
                                }
                            }
                        }
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
            } else {
                GlassButton(
                    localization.t("passkeys.addPasskey"),
                    variant: .primary,
                    icon: Image(systemName: "plus.circle")
                ) {
                    showingAddSheet = true
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
            }
        }
    }

    // MARK: - Status Messages

    private func statusMessages(_ vm: PasskeyViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            if let success = vm.successMessage {
                GlassAlert(type: .success, title: success)
                    .padding(.horizontal, DesignTokens.Spacing.lg)
            }

            if let error = vm.error, !vm.credentials.isEmpty {
                GlassAlert(type: .error, title: error)
                    .padding(.horizontal, DesignTokens.Spacing.lg)
            }
        }
    }

    // MARK: - Credentials List

    private func credentialsList(_ vm: PasskeyViewModel) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            if !vm.credentials.isEmpty {
                sectionHeader(localization.t("passkeys.registered"))

                ForEach(vm.credentials) { credential in
                    credentialRow(credential, vm: vm)
                }
            } else {
                GlassCard {
                    Text(localization.t("passkeys.noPasskeys"))
                        .font(.system(size: DesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .frame(maxWidth: .infinity)
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
            }
        }
    }

    private func credentialRow(
        _ credential: PasskeyCredential,
        vm: PasskeyViewModel
    ) -> some View {
        GlassCard {
            HStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: "key.fill")
                    .font(.system(size: DesignTokens.FontSize.xl))
                    .foregroundStyle(DesignTokens.Primary.p400)
                    .frame(width: 36)

                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                    Text(credential.deviceName ?? localization.t("passkeys.unknownDevice"))
                        .font(.system(size: DesignTokens.FontSize.base, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.primary)

                    HStack(spacing: DesignTokens.Spacing.sm) {
                        if let created = credential.createdAt {
                            Label(created, systemImage: "calendar")
                                .font(.system(size: DesignTokens.FontSize.xs))
                                .foregroundStyle(DesignTokens.Text.muted)
                        }

                        if let lastUsed = credential.lastUsedAt {
                            Label(lastUsed, systemImage: "clock")
                                .font(.system(size: DesignTokens.FontSize.xs))
                                .foregroundStyle(DesignTokens.Text.muted)
                        }
                    }
                }

                Spacer()

                Button {
                    Task { await vm.deleteCredential(credential) }
                } label: {
                    Image(systemName: "trash.fill")
                        .font(.system(size: DesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.ErrorColor.default)
                }
                .disabled(vm.isDeleting)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Helpers

    private func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
            .foregroundStyle(DesignTokens.Text.muted)
            .textCase(.uppercase)
            .padding(.horizontal, DesignTokens.Spacing.lg)
    }
}
