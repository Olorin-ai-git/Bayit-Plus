import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct ZehAniHubView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization

    @State private var profileId: String?
    @State private var isLoading = true
    @State private var error: String?
    @State private var showConsent = false

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            if isLoading {
                ProgressView()
                    .tint(.white)
            } else if let error {
                ErrorStateView(message: error) {
                    Task { await loadProfile() }
                }
            } else if let profileId {
                hubContent(profileId: profileId)
            }
        }
        .navigationTitle(localization.t("zehAni.hub.title"))
        .navigationBarTitleDisplayMode(.large)
        .task { await loadProfile() }
    }

    @ViewBuilder
    private func hubContent(profileId: String) -> some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: DesignTokens.Spacing.lg) {
                featureCard(
                    icon: "wand.and.stars",
                    titleKey: "zehAni.hub.magicMirror",
                    descKey: "zehAni.hub.magicMirrorDesc",
                    destination: .zehAniMagicMirror(profileId: profileId)
                )

                featureCard(
                    icon: "film.fill",
                    titleKey: "zehAni.hub.highlights",
                    descKey: "zehAni.hub.highlightsDesc",
                    destination: .zehAniHighlights(profileId: profileId)
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

                consentButton(profileId: profileId)
            }
            .padding(DesignTokens.Spacing.lg)
            .padding(.bottom, 100)
        }
        .sheet(isPresented: $showConsent) {
            BiometricConsentView(profileId: profileId)
        }
    }

    private func featureCard(
        icon: String, titleKey: String, descKey: String, destination: Route
    ) -> some View {
        GlassCard {
            Button {
                coordinator.pushToCurrentTab(destination)
            } label: {
                HStack(spacing: DesignTokens.Spacing.md) {
                    Image(systemName: icon)
                        .font(.system(size: DesignTokens.FontSize.xxl))
                        .foregroundStyle(DesignTokens.Primary.default)
                        .frame(width: 44)

                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                        Text(localization.t(titleKey))
                            .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                            .foregroundStyle(DesignTokens.Text.primary)

                        Text(localization.t(descKey))
                            .font(.system(size: DesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.secondary)
                            .lineLimit(2)
                    }

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
                .padding(DesignTokens.Spacing.md)
            }
        }
    }

    private func consentButton(profileId: String) -> some View {
        GlassCard {
            Button { showConsent = true } label: {
                HStack(spacing: DesignTokens.Spacing.md) {
                    Image(systemName: "lock.shield.fill")
                        .font(.system(size: DesignTokens.FontSize.xxl))
                        .foregroundStyle(DesignTokens.Warning.default)
                        .frame(width: 44)

                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                        Text(localization.t("zehAni.hub.consent"))
                            .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                            .foregroundStyle(DesignTokens.Text.primary)

                        Text(localization.t("zehAni.hub.consentDesc"))
                            .font(.system(size: DesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.secondary)
                            .lineLimit(2)
                    }

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
                .padding(DesignTokens.Spacing.md)
            }
        }
    }

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
}
