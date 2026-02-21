import BayitAuth
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// User profile screen showing avatar, stats, and preferences
struct ProfileView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) var coordinator
    @Environment(LocalizationManager.self) var localization
    @Environment(AuthManager.self) var authManager
    @State var viewModel: ProfileViewModel?
    @State var biometricVM: BiometricViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                LazyVStack(spacing: DesignTokens.Spacing.lg) {
                    if vm.isLoading && vm.profile == nil {
                        loadingState
                    } else if let error = vm.error, vm.profile == nil {
                        ErrorStateView(message: error) {
                            Task { await viewModel?.load() }
                        }
                    } else if let profile = vm.profile {
                        profileHeader(profile)
                        creditBalanceSection(profile)
                        accountInfoSection(profile)
                        securitySection(profile)
                        statsSection(vm.stats)
                        menuSection
                    }
                }
                .padding(.top, DesignTokens.Spacing.lg)
                .padding(.bottom, 100)
            } else {
                ScreenLoadingView()
            }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = ProfileViewModel(repository: repos.user)
            }
            if biometricVM == nil {
                biometricVM = BiometricViewModel(
                    securityRepository: repos.securitySettings
                )
            }
            await viewModel?.load()
            await biometricVM?.load()
        }
    }

    private func profileHeader(_ profile: ProfileResponse) -> some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            avatarView(profile.avatar)

            Text(profile.displayName ?? profile.email ?? "")
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)

            if let email = profile.email {
                Text(email)
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundColor(DesignTokens.Text.secondary)
            }

            if profile.isBetaUser == true, let credits = profile.betaCredits {
                GlassBadge(
                    text: "Beta 500 - \(credits) credits",
                    variant: .primary
                )
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func avatarView(_ url: String?) -> some View {
        Group {
            if let urlStr = url, let imageURL = URL(string: urlStr) {
                CachedAsyncImage(url: imageURL) { phase in
                    switch phase {
                    case let .success(image):
                        image.resizable().aspectRatio(contentMode: .fill)
                    default:
                        avatarPlaceholder
                    }
                }
            } else {
                avatarPlaceholder
            }
        }
        .frame(width: 96, height: 96)
        .clipShape(Circle())
        .overlay(Circle().stroke(DesignTokens.Glass.border, lineWidth: 2))
    }

    private var avatarPlaceholder: some View {
        Circle()
            .fill(DesignTokens.Glass.bg)
            .overlay(
                Image(systemName: "person.fill")
                    .font(.system(size: 36))
                    .foregroundColor(DesignTokens.Text.secondary)
            )
    }

    private func statsSection(_ stats: ProfileStats?) -> some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            statCard(
                label: localization.t("profile.watched"),
                value: "\(stats?.totalWatched ?? 0)"
            )
            statCard(
                label: localization.t("profile.favorites"),
                value: "\(stats?.totalFavorites ?? 0)"
            )
            statCard(
                label: localization.t("profile.streak"),
                value: "\(stats?.streakDays ?? 0)"
            )
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func statCard(label: String, value: String) -> some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.xs) {
                Text(value)
                    .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                    .foregroundColor(DesignTokens.Primary.default)

                Text(label)
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundColor(DesignTokens.Text.secondary)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity)
            .padding(DesignTokens.Spacing.md)
        }
    }

    @ViewBuilder
    private func creditBalanceSection(_ profile: ProfileResponse) -> some View {
        if profile.isBetaUser == true {
            GlassCard {
                Button {
                    coordinator.pushToCurrentTab(.betaCredits)
                } label: {
                    HStack(spacing: DesignTokens.Spacing.md) {
                        Image(systemName: "sparkles")
                            .font(.system(size: DesignTokens.FontSize.xl))
                            .foregroundColor(DesignTokens.Primary.default)

                        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                            Text(localization.t("profile.betaCredits"))
                                .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                                .foregroundColor(DesignTokens.Text.primary)

                            if let credits = profile.betaCredits {
                                Text("\(credits) \(localization.t("profile.creditsRemaining"))")
                                    .font(.system(size: DesignTokens.FontSize.sm))
                                    .foregroundColor(DesignTokens.Text.secondary)
                            }
                        }

                        Spacer()

                        Image(systemName: "chevron.right")
                            .font(.system(size: DesignTokens.FontSize.sm))
                            .foregroundColor(DesignTokens.Text.muted)
                    }
                    .padding(DesignTokens.Spacing.md)
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
        }
    }
}
