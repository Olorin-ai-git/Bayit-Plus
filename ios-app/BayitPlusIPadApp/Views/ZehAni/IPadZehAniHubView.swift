import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// iPad-optimized Zeh Ani hub with two-column layout:
/// left column — hero identity panel + consent button,
/// right column — 2×2 feature card grid.
struct IPadZehAniHubView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization

    @State private var profileId: String?
    @State private var isLoading = true
    @State private var error: String?
    @State private var showConsent = false
    @State private var avatarImageUrl: String?

    var body: some View {
        Group {
            if isLoading {
                ScreenLoadingView()
            } else if let error {
                ErrorStateView(message: error) {
                    Task { await loadProfile() }
                }
            } else if let profileId {
                hubContent(profileId: profileId)
            }
        }
        .background(DesignTokens.Background.primary)
        .task { await loadProfile() }
    }

    // MARK: - Hub Layout

    @ViewBuilder
    private func hubContent(profileId: String) -> some View {
        ScrollView(.vertical, showsIndicators: false) {
            PageHeader(icon: "person.fill.viewfinder", title: localization.t("zehAni.hub.title"))

            HStack(alignment: .top, spacing: DesignTokens.Spacing.xl) {
                identityPanel(profileId: profileId)
                    .frame(maxWidth: .infinity)

                featureGrid(profileId: profileId)
                    .frame(maxWidth: .infinity * 1.5)
            }
            .padding(.horizontal, DesignTokens.Spacing.xl)
            .padding(.top, DesignTokens.Spacing.lg)
            .padding(.bottom, DesignTokens.Spacing.xxl)
        }
        .sheet(isPresented: $showConsent) {
            BiometricConsentView(profileId: profileId)
        }
    }

    // MARK: - Left Column: Identity Panel

    private func identityPanel(profileId: String) -> some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            ZStack {
                DesignTokens.Glass.bgMedium
                if let urlStr = avatarImageUrl, let url = URL(string: urlStr) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let img): img.resizable().scaledToFill()
                        case .failure: avatarHeroPlaceholder
                        default: ProgressView().tint(.white)
                        }
                    }
                } else {
                    avatarHeroPlaceholder
                }
            }
            .frame(height: 180)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                    .stroke(DesignTokens.Glass.border, lineWidth: 1)
            )

            Text(localization.t("zehAni.subtitle"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)

            GlassButton(
                localization.t("zehAni.hub.consent"),
                variant: .secondary,
                size: .medium,
                icon: Image(systemName: "lock.shield.fill")
            ) {
                showConsent = true
            }
            .frame(maxWidth: .infinity)
        }
    }

    private var avatarHeroPlaceholder: some View {
        LinearGradient(colors: [DesignTokens.Primary.p400.opacity(0.18), DesignTokens.Secondary.s400.opacity(0.18)],
                       startPoint: .topLeading, endPoint: .bottomTrailing)
            .overlay {
                Image(systemName: "person.fill.viewfinder")
                    .font(.system(size: 64))
                    .foregroundStyle(LinearGradient(colors: [DesignTokens.Primary.p400, DesignTokens.Secondary.s400],
                                                   startPoint: .topLeading, endPoint: .bottomTrailing))
            }
    }

    // MARK: - Right Column: Feature Grid

    private func featureGrid(profileId: String) -> some View {
        LazyVGrid(
            columns: [GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
                      GridItem(.flexible(), spacing: DesignTokens.Spacing.md)],
            spacing: DesignTokens.Spacing.md
        ) {
            featureCard(
                icon: "wand.and.stars",
                titleKey: "zehAni.hub.magicMirror",
                descKey: "zehAni.hub.magicMirrorDesc",
                destination: .zehAniMagicMirror(profileId: profileId)
            )
            featureCard(
                icon: "film.stack.fill",
                titleKey: "zehAni.hub.movieInteractions",
                descKey: "zehAni.hub.movieInteractionsDesc",
                destination: .zehAniMovieInteractions(profileId: profileId)
            )
            featureCard(
                icon: "person.2.fill",
                titleKey: "zehAni.hub.contacts",
                descKey: "zehAni.hub.contactsDesc",
                destination: .zehAniContacts(profileId: profileId)
            )
            featureCard(
                icon: "tray.full.fill",
                titleKey: "zehAni.hub.feedback",
                descKey: "zehAni.hub.feedbackDesc",
                destination: .zehAniFeedback(profileId: profileId)
            )
        }
    }

    private func featureCard(
        icon: String, titleKey: String, descKey: String, destination: Route
    ) -> some View {
        GlassCard {
            Button {
                coordinator.pushToCurrentTab(destination)
            } label: {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                    Image(systemName: icon)
                        .font(.system(size: DesignTokens.FontSize.xl))
                        .foregroundStyle(DesignTokens.Primary.default)

                    Text(localization.t(titleKey))
                        .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Text(localization.t(descKey))
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .lineLimit(3)

                    Spacer(minLength: 0)

                    Image(systemName: "arrow.right")
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Text.muted)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                }
                .padding(DesignTokens.Spacing.md)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: - Data

    @MainActor
    private func loadProfile() async {
        isLoading = true
        error = nil
        do {
            let profile = try await repos.user.fetchProfile()
            profileId = profile.id
            if let avatars = try? await repos.starStory.fetchAvatars(profileId: profile.id),
               let avatarId = avatars.avatars.first?.avatarId,
               let status = try? await repos.avatarMeshRepository.fetchAvatarStatus(avatarId: avatarId) {
                avatarImageUrl = status.avatarImageUrl
            }
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}
