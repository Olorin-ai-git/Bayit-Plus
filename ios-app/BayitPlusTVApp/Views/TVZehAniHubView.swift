#if os(tvOS)
import BayitAuth
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Zeh Ani hub for tvOS - consolidates interactive and social features.
/// Sub-sections: Avatar, Watch Party, Trivia, Chess, AI Chat, Rewards, Beta Credits.
struct TVZehAniHubView: View {
    @Environment(LocalizationManager.self) private var localization
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @Environment(AuthManager.self) private var authManager

    private let features: [(icon: String, title: String, color: Color, view: AnyView)] = []

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: TVDesignTokens.Spacing.xl) {
                    headerSection
                    featureList
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)
                .padding(.bottom, TVDesignTokens.Spacing.xxl)
            }
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

    private var featureList: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            featureCard(
                icon: "wand.and.stars",
                title: localization.t("zehAni.hub.magicMirror"),
                subtitle: localization.t("zehAni.hub.magicMirrorDesc")
            ) {
                if let profileId = authManager.activeProfile?.id {
                    TVMagicMirrorView(profileId: profileId)
                } else {
                    profileRequiredView
                }
            }

            featureCard(
                icon: "film.fill",
                title: localization.t("zehAni.hub.highlights"),
                subtitle: localization.t("zehAni.hub.highlightsDesc")
            ) {
                if let profileId = authManager.activeProfile?.id {
                    TVHighlightsView(profileId: profileId)
                } else {
                    profileRequiredView
                }
            }

            featureCard(
                icon: "person.2.fill",
                title: localization.t("zehAni.hub.contacts"),
                subtitle: localization.t("zehAni.hub.contactsDesc")
            ) {
                if let profileId = authManager.activeProfile?.id {
                    TVContactsView(profileId: profileId)
                } else {
                    profileRequiredView
                }
            }

            featureCard(
                icon: "tray.full.fill",
                title: localization.t("zehAni.hub.feedback"),
                subtitle: localization.t("zehAni.hub.feedbackDesc")
            ) {
                if let profileId = authManager.activeProfile?.id {
                    TVFeedbackView(profileId: profileId)
                } else {
                    profileRequiredView
                }
            }
        }
    }

    private var profileRequiredView: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: "person.crop.circle.badge.exclamationmark")
                .font(.system(size: 80))
                .foregroundStyle(DesignTokens.Text.muted)

            Text(localization.t("zehAni.profileRequired"))
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("zehAni.profileRequiredDesc"))
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(DesignTokens.Background.primary)
    }

    private func featureCard<Destination: View>(
        icon: String,
        title: String,
        subtitle: String,
        @ViewBuilder destination: @escaping () -> Destination
    ) -> some View {
        NavigationLink {
            destination()
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
    }
}

// MARK: - Placeholder Views

struct TVHighlightsView: View {
    let profileId: String

    var body: some View {
        ComingSoonView(feature: "Highlights")
    }
}

struct TVContactsView: View {
    let profileId: String

    var body: some View {
        ComingSoonView(feature: "Contacts")
    }
}

struct TVFeedbackView: View {
    let profileId: String

    var body: some View {
        ComingSoonView(feature: "Feedback")
    }
}

struct ComingSoonView: View {
    @Environment(LocalizationManager.self) private var localization
    let feature: String

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "sparkles")
                .font(.system(size: 100))
                .foregroundStyle(
                    LinearGradient(
                        colors: [DesignTokens.Primary.p400, DesignTokens.Secondary.s400],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )

            Text("\(feature) Coming Soon")
                .font(.system(size: TVDesignTokens.FontSize.hero, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text("This feature is currently in development and will be available in a future update.")
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, TVDesignTokens.Spacing.xxxl)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(DesignTokens.Background.primary)
    }
}

#endif
