import BayitAuth
import BayitDesignSystem
import SwiftUI

/// Fixed top navigation bar with brand name, playlist, and profile avatar.
struct TopNavigationBar: View {
    @Environment(AuthManager.self) private var authManager
    @Environment(NavigationCoordinator.self) private var coordinator

    var body: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            Text("Bayit+")
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundColor(DesignTokens.Primary.p400)

            Spacer()

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

            Button {
                coordinator.navigate(to: .profile)
            } label: {
                profileAvatar
            }
            .accessibilityLabel("Profile")
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.vertical, DesignTokens.Spacing.sm)
        .background(DesignTokens.Background.primary)
    }

    @ViewBuilder
    private var profileAvatar: some View {
        if let photoURL = authManager.user?.photoURL {
            AsyncImage(url: photoURL) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(width: 32, height: 32)
                        .clipShape(Circle())
                default:
                    avatarFallback
                }
            }
        } else {
            avatarFallback
        }
    }

    private var avatarFallback: some View {
        Circle()
            .fill(DesignTokens.Glass.bgMedium)
            .frame(width: 32, height: 32)
            .overlay(
                Image(systemName: "person.fill")
                    .font(.system(size: 14))
                    .foregroundColor(DesignTokens.Text.secondary)
            )
    }
}
