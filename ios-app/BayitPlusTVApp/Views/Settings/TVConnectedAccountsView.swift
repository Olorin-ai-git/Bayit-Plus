#if os(tvOS)

import SwiftUI
import BayitDesignSystem
import BayitLocalization

struct TVConnectedAccountsView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization

    let onDismiss: () -> Void

    @State private var viewModel: ProfileViewModel?

    private let providers: [AccountProvider] = [
        AccountProvider(id: "google", name: "Google", icon: "g.circle.fill"),
        AccountProvider(id: "apple", name: "Apple", icon: "applelogo"),
        AccountProvider(id: "facebook", name: "Facebook", icon: "f.circle.fill")
    ]

    var body: some View {
        ZStack {
            DesignTokens.Glass.bg
                .ignoresSafeArea()

            if let viewModel {
                if viewModel.isLoading {
                    loadingView
                } else if let error = viewModel.error {
                    errorView(error)
                } else {
                    contentView(viewModel)
                }
            }
        }
        .task {
            await initializeViewModel()
        }
    }

    private var loadingView: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            ProgressView()
                .scaleEffect(1.5)
            Text(localization.t("settings.loading"))
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
    }

    private func errorView(_ error: String) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 60))
                .foregroundStyle(DesignTokens.ErrorColor.default)
            Text(error)
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)

            Button {
                onDismiss()
            } label: {
                Text(localization.t("common.close"))
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .padding(TVDesignTokens.Spacing.lg)
                    .background(DesignTokens.Glass.purpleLight)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
            }
            .buttonStyle(.card)
            .tvFocusStyle()
        }
        .padding(TVDesignTokens.Spacing.xl)
    }

    private func contentView(_ viewModel: ProfileViewModel) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            headerSection

            ScrollView {
                VStack(spacing: TVDesignTokens.Spacing.md) {
                    ForEach(providers) { provider in
                        accountRow(provider: provider, viewModel: viewModel)
                    }
                }
                .padding(TVDesignTokens.Spacing.md)
            }

            closeButton
        }
        .padding(TVDesignTokens.Spacing.xl)
    }

    private var headerSection: some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            Image(systemName: "link.circle.fill")
                .font(.system(size: 50))
                .foregroundStyle(DesignTokens.Glass.purpleLight)

            Text(localization.t("settings.connectedAccounts"))
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Spacer()

            Button {
                onDismiss()
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 40))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
            .buttonStyle(.card)
            .tvFocusStyle()
        }
    }

    private func accountRow(provider: AccountProvider, viewModel: ProfileViewModel) -> some View {
        let isConnected = viewModel.profile?.authProvider?.lowercased() == provider.id

        return HStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: provider.icon)
                .font(.system(size: 40))
                .foregroundStyle(DesignTokens.Glass.purpleLight)
                .frame(width: 60, height: 60)

            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                Text(provider.name)
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)

                if isConnected, let email = viewModel.profile?.email {
                    Text(email)
                        .font(.system(size: TVDesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Text.secondary)
                } else {
                    Text(localization.t("settings.notConnected"))
                        .font(.system(size: TVDesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
            }

            Spacer()

            Text(isConnected
                ? localization.t("settings.connected")
                : localization.t("settings.not_connected"))
                .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                .foregroundStyle(isConnected ? DesignTokens.Success.default : DesignTokens.Text.muted)
                .padding(.horizontal, TVDesignTokens.Spacing.lg)
                .padding(.vertical, TVDesignTokens.Spacing.md)
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Background.elevated)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
    }

    private var closeButton: some View {
        Button {
            onDismiss()
        } label: {
            Text(localization.t("common.close"))
                .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(TVDesignTokens.Spacing.lg)
                .frame(maxWidth: .infinity)
                .background(DesignTokens.Glass.purpleLight)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        }
        .buttonStyle(.card)
        .tvFocusStyle()
    }

    private func initializeViewModel() async {
        viewModel = ProfileViewModel(repository: repos.user)
        await viewModel?.load()
    }
}

private struct AccountProvider: Identifiable {
    let id: String
    let name: String
    let icon: String
}

#endif
