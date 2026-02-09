import BayitAuth
import BayitDesignSystem
import SwiftUI

/// Top navigation bar with logout, language selector, profile, beta credits, and search
struct TopNavigationBar: View {
    @Environment(AuthManager.self) private var authManager
    @Environment(NavigationCoordinator.self) private var coordinator

    var body: some View {
        HStack(spacing: DesignTokens.Spacing.xl) {
            Spacer()

            // Playlist button
            Button {
                coordinator.navigate(to: .playlist)
            } label: {
                Image(systemName: "music.note.list")
                    .font(.system(size: 20))
                    .foregroundColor(DesignTokens.Text.primary)
                    .frame(width: 44, height: 44)
                    .background(DesignTokens.Glass.bgMedium)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
            }
            .accessibilityLabel("Playlist")

            // Language selector button (flag)
            Button {
                coordinator.navigate(to: .languageSettings)
            } label: {
                Image(systemName: "globe")
                    .font(.system(size: 20))
                    .foregroundColor(DesignTokens.Text.primary)
                    .frame(width: 44, height: 44)
                    .background(DesignTokens.Glass.bgMedium)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
            }
            .accessibilityLabel("Language settings")

            // Profile button
            Button {
                coordinator.navigate(to: .profile)
            } label: {
                Image(systemName: "person.circle")
                    .font(.system(size: 20))
                    .foregroundColor(DesignTokens.Text.primary)
                    .frame(width: 44, height: 44)
                    .background(DesignTokens.Glass.bgMedium)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
            }
            .accessibilityLabel("Profile")

            // Beta credits button - only visible to beta users
            if authManager.user?.isBetaUser == true {
                Button {
                    coordinator.navigate(to: .betaCredits)
                } label: {
                    Image(systemName: "sparkles")
                        .font(.system(size: 20))
                        .foregroundColor(DesignTokens.Primary.p400)
                        .frame(width: 44, height: 44)
                        .background(DesignTokens.Glass.bgMedium)
                        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
                }
                .accessibilityLabel("Beta Credits")
            }

            // Search button
            Button {
                coordinator.presentFullscreen(.search)
            } label: {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 20))
                    .foregroundColor(DesignTokens.Text.primary)
                    .frame(width: 44, height: 44)
                    .background(DesignTokens.Glass.bgMedium)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
            }
            .accessibilityLabel("Search")
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.vertical, DesignTokens.Spacing.sm)
        .background(DesignTokens.Background.primary)
    }
}
