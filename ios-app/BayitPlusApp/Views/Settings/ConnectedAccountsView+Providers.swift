import BayitAuth
import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - Provider Sections

extension ConnectedAccountsView {
    var linkedProvidersSection: some View {
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

    var emptyState: some View {
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

    func linkedProviderRow(_ provider: LinkedProvider) -> some View {
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

    var availableProvidersSection: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            sectionHeader(localization.t("settings.linkNewAccount"))

            if !isGoogleLinked {
                #if os(iOS)
                    linkProviderButton(
                        icon: "g.circle.fill",
                        title: localization.t("settings.linkGoogleAccount")
                    ) {
                        await linkGoogle()
                    }
                #endif
            }

            if !isAppleLinked {
                linkProviderButton(
                    icon: "apple.logo",
                    title: localization.t("settings.linkAppleAccount")
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

    func linkProviderButton(
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
}
