#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Zeh Ani hub for tvOS - consolidates interactive and social features.
    /// Sub-sections: Avatar, Watch Party, Trivia, Chess, AI Chat, Rewards, Beta Credits.
    struct TVZehAniHubView: View {
        @Environment(LocalizationManager.self) private var localization
        @Environment(TVNavigationCoordinator.self) private var coordinator
        @Environment(TVRepositoryProvider.self) private var repos

        @State private var profileId: String?
        @State private var isLoading = true
        @State private var error: String?

        var body: some View {
            NavigationStack {
                ZStack {
                    DesignTokens.Background.primary.ignoresSafeArea()

                    if isLoading {
                        ProgressView()
                            .tint(.white)
                            .scaleEffect(1.5)
                    } else if let error = error {
                        errorView(message: error)
                    } else if let profileId = profileId {
                        hubContent(profileId: profileId)
                    }
                }
                .task {
                    await loadProfile()
                }
            }
        }

        private func hubContent(profileId: String) -> some View {
            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: TVDesignTokens.Spacing.xl) {
                    headerSection
                    featureList(profileId: profileId)
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)
                .padding(.bottom, TVDesignTokens.Spacing.xxl)
            }
        }

        private func errorView(message: String) -> some View {
            VStack(spacing: TVDesignTokens.Spacing.xl) {
                Image(systemName: "exclamationmark.triangle")
                    .font(.system(size: 80))
                    .foregroundStyle(DesignTokens.ErrorColor.default)

                Text(message)
                    .font(.system(size: TVDesignTokens.FontSize.xl))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .multilineTextAlignment(.center)

                Button {
                    Task { await loadProfile() }
                } label: {
                    Text(localization.t("common.retry"))
                        .padding(.horizontal, TVDesignTokens.Spacing.xl)
                        .padding(.vertical, TVDesignTokens.Spacing.md)
                }
                .buttonStyle(.card)
                .tvFocusStyle()
            }
        }

        private var headerSection: some View {
            VStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "person.fill.viewfinder")
                    .font(.system(size: 64))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [DesignTokens.Primary.p400, DesignTokens.Secondary.s400],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )

                Text("Zeh Ani")
                    .font(.system(size: TVDesignTokens.FontSize.hero, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(localization.t("zehAni.subtitle"))
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
            .padding(.top, TVDesignTokens.Spacing.xxl)
        }

        private func featureList(profileId: String) -> some View {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                featureCard(
                    icon: "wand.and.stars",
                    title: localization.t("zehAni.hub.magicMirror"),
                    subtitle: localization.t("zehAni.hub.magicMirrorDesc")
                ) {
                    TVMagicMirrorView(profileId: profileId)
                }

                featureCard(
                    icon: "film.fill",
                    title: localization.t("zehAni.hub.highlights"),
                    subtitle: localization.t("zehAni.hub.highlightsDesc")
                ) {
                    TVHighlightsView(profileId: profileId)
                }

                featureCard(
                    icon: "film.stack",
                    title: localization.t("zehAni.hub.movieInteractions"),
                    subtitle: localization.t("zehAni.hub.movieInteractionsDesc")
                ) {
                    TVMovieInteractionsView()
                }

                featureCard(
                    icon: "person.2.fill",
                    title: localization.t("zehAni.hub.contacts"),
                    subtitle: localization.t("zehAni.hub.contactsDesc")
                ) {
                    TVContactsView(profileId: profileId)
                }

                featureCard(
                    icon: "tray.full.fill",
                    title: localization.t("zehAni.hub.feedback"),
                    subtitle: localization.t("zehAni.hub.feedbackDesc")
                ) {
                    TVFeedbackView(profileId: profileId)
                }
            }
        }

        @MainActor
        private func loadProfile() async {
            isLoading = true
            error = nil
            do {
                let profile = try await repos.user.fetchProfile()
                profileId = profile.id
                isLoading = false
            } catch {
                self.error = error.localizedDescription
                isLoading = false
            }
        }

        private func featureCard<Destination: View>(
            icon: String,
            title: String,
            subtitle: String,
            @ViewBuilder destination: @escaping () -> Destination
        ) -> some View {
            NavigationLink {
                destination()
                    .tvBreadcrumb(title, icon: icon)
            } label: {
                HStack(spacing: TVDesignTokens.Spacing.lg) {
                    Image(systemName: icon)
                        .font(.system(size: TVDesignTokens.FontSize.xxxl))
                        .foregroundStyle(DesignTokens.Primary.default)
                        .frame(width: 60)

                    VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                        Text(title)
                            .font(.system(size: TVDesignTokens.FontSize.xl, weight: .semibold))
                            .foregroundStyle(DesignTokens.Text.primary)

                        Text(subtitle)
                            .font(.system(size: TVDesignTokens.FontSize.base))
                            .foregroundStyle(DesignTokens.Text.secondary)
                            .lineLimit(2)
                    }

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.system(size: TVDesignTokens.FontSize.lg))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
                .padding(TVDesignTokens.Spacing.xl)
                .frame(maxWidth: .infinity)
                .background(DesignTokens.Glass.bgMedium)
                .cornerRadius(TVDesignTokens.Radius.lg)
                .overlay(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                        .stroke(DesignTokens.Glass.border, lineWidth: 1)
                )
            }
            .buttonStyle(.card)
            .tvFocusStyle()
        }
    }

#endif
