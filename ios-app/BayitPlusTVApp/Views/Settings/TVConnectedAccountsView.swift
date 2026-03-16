#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    struct TVConnectedAccountsView: View {
        @Environment(TVRepositoryProvider.self) private var repos
        @Environment(LocalizationManager.self) private var localization
        let onDismiss: () -> Void

        @State private var viewModel: ProfileViewModel?

        var body: some View {
            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: TVDesignTokens.Spacing.lg) {
                    if let vm = viewModel {
                        providerCard(
                            icon: "g.circle.fill",
                            iconColor: Color(hex: 0x4285F4),
                            name: "Google",
                            description: localization.t("settings.connectedAccountsPage.googleDesc"),
                            isConnected: vm.profile?.authProvider?.lowercased() == "google",
                            onConnect: {}
                        )
                        providerCard(
                            icon: "applelogo",
                            iconColor: .white,
                            name: "Apple",
                            description: localization.t("settings.connectedAccountsPage.appleDesc"),
                            isConnected: vm.profile?.authProvider?.lowercased() == "apple",
                            onConnect: {}
                        )
                        providerCard(
                            icon: "f.circle.fill",
                            iconColor: Color(hex: 0x1877F2),
                            name: "Facebook",
                            description: localization.t("settings.connectedAccountsPage.facebookDesc"),
                            isConnected: vm.profile?.authProvider?.lowercased() == "facebook",
                            onConnect: {}
                        )
                    } else {
                        ProgressView().tint(DesignTokens.Primary.default).scaleEffect(1.5)
                            .frame(maxWidth: .infinity, minHeight: 200)
                    }
                }
                .padding(.horizontal, 60)
                .padding(.bottom, TVDesignTokens.Spacing.xxxl)
            }
            .task { await initializeViewModel() }
        }

        // MARK: - Header

        private var headerSection: some View {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                    Text(localization.t("settings.connectedAccounts"))
                        .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)
                    Text(localization.t("settings.connectedAccountsPage.subtitle"))
                        .font(.system(size: TVDesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
                Spacer()
                Button { onDismiss() } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.muted)
                        .frame(width: 44, height: 44)
                        .background(DesignTokens.Glass.bg)
                        .clipShape(Circle())
                }
                .tvCardStyle()
            }
        }

        // MARK: - Provider Card

        private func providerCard(
            icon: String,
            iconColor: Color,
            name: String,
            description: String,
            isConnected: Bool,
            onConnect: @escaping () -> Void
        ) -> some View {
            HStack(spacing: TVDesignTokens.Spacing.xl) {
                ZStack {
                    Circle()
                        .fill(iconColor.opacity(0.15))
                        .frame(width: 80, height: 80)
                    Image(systemName: icon)
                        .font(.system(size: 36, weight: .medium))
                        .foregroundStyle(iconColor)
                }

                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                    Text(name)
                        .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)
                    Text(description)
                        .font(.system(size: TVDesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .lineLimit(2)
                }

                Spacer()

                if isConnected {
                    HStack(spacing: TVDesignTokens.Spacing.sm) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 20))
                            .foregroundStyle(DesignTokens.Success.default)
                        Text(localization.t("status.connected"))
                            .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                            .foregroundStyle(DesignTokens.Success.default)
                    }
                    .padding(.horizontal, TVDesignTokens.Spacing.lg)
                    .padding(.vertical, TVDesignTokens.Spacing.md)
                    .background(DesignTokens.Success.default.opacity(0.1))
                    .clipShape(Capsule())
                    .overlay(Capsule().stroke(DesignTokens.Success.default.opacity(0.3), lineWidth: 1))
                } else {
                    Button(action: onConnect) {
                        Text(localization.t("settings.connectedAccountsPage.connect"))
                            .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, TVDesignTokens.Spacing.xl)
                            .padding(.vertical, TVDesignTokens.Spacing.md)
                            .background(DesignTokens.Primary.default)
                            .clipShape(Capsule())
                    }
                    .tvCardStyle()
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.vertical, TVDesignTokens.Spacing.lg)
            .background(
                isConnected
                    ? DesignTokens.Success.default.opacity(0.06)
                    : DesignTokens.Glass.bgMedium
            )
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl))
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                    .stroke(
                        isConnected
                            ? DesignTokens.Success.default.opacity(0.3)
                            : Color.white.opacity(0.08),
                        lineWidth: 1
                    )
            )
        }

        private func initializeViewModel() async {
            viewModel = ProfileViewModel(repository: repos.user)
            await viewModel?.load()
        }
    }
#endif
