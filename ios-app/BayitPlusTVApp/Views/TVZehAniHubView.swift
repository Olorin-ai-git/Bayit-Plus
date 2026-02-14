#if os(tvOS)
import BayitDesignSystem
import SwiftUI

/// Zeh Ani hub for tvOS - consolidates interactive and social features.
/// Sub-sections: Avatar, Watch Party, Trivia, Chess, AI Chat, Rewards, Beta Credits.
struct TVZehAniHubView: View {
    @Environment(TVNavigationCoordinator.self) private var coordinator

    private let features: [(icon: String, title: String, color: Color, view: AnyView)] = []

    var body: some View {
        NavigationStack {
            ScrollView(.vertical, showsIndicators: false) {
                LazyVStack(spacing: TVDesignTokens.Spacing.xxl) {
                    headerSection

                    featureGrid
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)
                .padding(.bottom, TVDesignTokens.Spacing.xxl)
            }
            .background(DesignTokens.Background.primary)
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

            Text("Interactive experiences and social features")
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
        .padding(.top, TVDesignTokens.Spacing.xxl)
    }

    private var featureGrid: some View {
        LazyVGrid(
            columns: [
                GridItem(.flexible(), spacing: TVDesignTokens.Spacing.xl),
                GridItem(.flexible(), spacing: TVDesignTokens.Spacing.xl),
                GridItem(.flexible(), spacing: TVDesignTokens.Spacing.xl),
                GridItem(.flexible(), spacing: TVDesignTokens.Spacing.xl)
            ],
            spacing: TVDesignTokens.Spacing.xl
        ) {
            featureCard(
                icon: "person.crop.circle.badge.moon",
                title: "Avatar",
                subtitle: "Create your digital self",
                color: DesignTokens.Primary.p400
            ) {
                TVAvatarModeView()
            }

            featureCard(
                icon: "tv.and.hifispeaker.fill",
                title: "Watch Party",
                subtitle: "Watch together",
                color: DesignTokens.Secondary.s400
            ) {
                TVWatchPartyView()
            }

            featureCard(
                icon: "questionmark.circle",
                title: "Trivia",
                subtitle: "Test your knowledge",
                color: DesignTokens.Warning.default
            ) {
                TVTriviaView()
            }

            featureCard(
                icon: "checkerboard.rectangle",
                title: "Chess",
                subtitle: "Play a match",
                color: DesignTokens.Info.default
            ) {
                TVChessView()
            }

            featureCard(
                icon: "bubble.left.and.bubble.right.fill",
                title: "AI Chat",
                subtitle: "Talk with AI",
                color: DesignTokens.Primary.p400
            ) {
                TVChatbotView()
            }

            featureCard(
                icon: "trophy",
                title: "Rewards",
                subtitle: "Your achievements",
                color: DesignTokens.Warning.w500
            ) {
                TVRewardsView()
            }

            featureCard(
                icon: "sparkles",
                title: "Beta Credits",
                subtitle: "AI feature credits",
                color: DesignTokens.Secondary.s400
            ) {
                TVBetaCreditsView()
            }
        }
    }

    private func featureCard<Destination: View>(
        icon: String,
        title: String,
        subtitle: String,
        color: Color,
        @ViewBuilder destination: @escaping () -> Destination
    ) -> some View {
        NavigationLink {
            destination()
        } label: {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                Image(systemName: icon)
                    .font(.system(size: 48))
                    .foregroundStyle(color)

                VStack(spacing: TVDesignTokens.Spacing.xs) {
                    Text(title)
                        .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Text(subtitle)
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(TVDesignTokens.Spacing.xl)
            .background(DesignTokens.Glass.bgMedium)
            .cornerRadius(TVDesignTokens.Radius.xl)
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                    .stroke(DesignTokens.Glass.border, lineWidth: 1)
            )
        }
        .buttonStyle(.card)
    }
}
#endif
