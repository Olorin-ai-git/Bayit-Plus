import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Account linking screen for tvOS - connect Google, Apple, Facebook providers.
struct TVLinkAccountView: View {
    @Environment(LocalizationManager.self) private var localization
    @Environment(TVRepositoryProvider.self) private var repos

    let currentProvider: String?
    let onDismiss: () -> Void

    private let providers: [(id: String, name: String, icon: String)] = [
        ("google", "Google", "g.circle.fill"),
        ("apple", "Apple", "apple.logo"),
        ("facebook", "Facebook", "f.circle.fill"),
    ]

    @State private var linkedProviders: [String] = []
    @State private var isLoading = true
    @State private var error: String?

    var body: some View {
        Group {
            if isLoading {
                loadingView
            } else {
                contentView
            }
        }
        .task { await loadLinkedProviders() }
    }

    private var contentView: some View {
        ScrollView {
            VStack(spacing: TVDesignTokens.Spacing.xl) {
                Text(localization.t("settings.connectedAccountsDescription"))
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 700)
                    .padding(.top, TVDesignTokens.Spacing.xl)

                if let error {
                    Text(error)
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Colors.Semantic.error)
                }

                ForEach(providers, id: \.id) { provider in
                    providerRow(provider)
                }
            }
            .padding(TVDesignTokens.Spacing.xl)
        }
    }

    private func providerRow(_ provider: (id: String, name: String, icon: String)) -> some View {
        let isLinked = linkedProviders.contains(where: { $0.lowercased() == provider.id })
        let isPrimary = currentProvider?.lowercased() == provider.id

        return HStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: provider.icon)
                .font(.system(size: 40))
                .foregroundStyle(providerColor(provider.id))
                .frame(width: 60)

            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                Text(provider.name)
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(isLinked
                    ? (isPrimary ? localization.t("profile.primarySignIn") : localization.t("settings.connected"))
                    : localization.t("settings.not_connected"))
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(isLinked ? DesignTokens.Success.default : DesignTokens.Text.muted)
            }

            Spacer()

            if isLinked {
                if isPrimary {
                    Text(localization.t("settings.primary"))
                        .font(.system(size: TVDesignTokens.FontSize.sm, weight: .bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, TVDesignTokens.Spacing.md)
                        .padding(.vertical, TVDesignTokens.Spacing.xs)
                        .background(DesignTokens.Primary.p400)
                        .clipShape(Capsule())
                } else {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 28))
                        .foregroundStyle(DesignTokens.Success.default)
                }
            }
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bg)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        .frame(maxWidth: 700)
    }

    private func providerColor(_ id: String) -> Color {
        switch id {
        case "google": return DesignTokens.ErrorColor.e400
        case "apple": return DesignTokens.Text.primary
        case "facebook": return DesignTokens.Info.default
        default: return DesignTokens.Primary.p400
        }
    }

    private var loadingView: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView().tint(DesignTokens.Primary.default).scaleEffect(2.0)
            Text(localization.t("common.loading"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func loadLinkedProviders() async {
        isLoading = true
        if let provider = currentProvider {
            linkedProviders = [provider.lowercased()]
        }
        isLoading = false
    }
}
