import BayitAuth
import BayitDesignSystem
import SwiftUI

/// Top navigation bar with scrollable action buttons
struct TopNavigationBar: View {
    @Environment(AuthManager.self) private var authManager
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(FeatureFlags.self) private var featureFlags

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.Spacing.md) {
                navButton(icon: "music.note.list", label: "Playlist") {
                    coordinator.navigate(to: .playlist)
                }

                navButton(icon: "globe", label: "Language settings") {
                    coordinator.navigate(to: .languageSettings)
                }

                navButton(icon: "person.circle", label: "Profile") {
                    coordinator.navigate(to: .profile)
                }

                if authManager.user?.isBetaUser == true {
                    navButton(
                        icon: "sparkles",
                        label: "Beta Credits",
                        tint: DesignTokens.Primary.p400
                    ) {
                        coordinator.navigate(to: .betaCredits)
                    }
                }

                if featureFlags.isLegacyFeaturesEnabled {
                    navButton(
                        icon: "figure.and.child.holdinghands",
                        label: "Kids"
                    ) {
                        coordinator.navigate(to: .children)
                    }

                    navButton(icon: "record.circle", label: "Recordings") {
                        coordinator.navigate(to: .recordings)
                    }
                }

                navButton(icon: "magnifyingglass", label: "Search") {
                    coordinator.presentFullscreen(.search)
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.vertical, DesignTokens.Spacing.sm)
        .background(DesignTokens.Background.primary)
    }

    private func navButton(
        icon: String,
        label: String,
        tint: Color = DesignTokens.Text.primary,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundColor(tint)
                .frame(width: 44, height: 44)
                .background(DesignTokens.Glass.bgMedium)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
        }
        .accessibilityLabel(label)
    }
}
