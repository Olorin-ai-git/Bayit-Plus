#if os(tvOS)
    import BayitAuth
    import BayitDesignSystem
    import SwiftUI

    /// Persistent profile pill button overlaid at the top-right of TVMainTabView.
    /// Always visible across all tabs. Shows user avatar, name, and subscription tier.
    /// Primary tap navigates to Profile tab; long-press context menu for quick actions.
    struct TVProfilePillView: View {
        @Environment(AuthManager.self) private var authManager
        @Environment(TVNavigationCoordinator.self) private var coordinator

        var body: some View {
            Button {
                coordinator.selectedTab = .profile
            } label: {
                HStack(spacing: TVDesignTokens.Spacing.md) {
                    avatarView

                    VStack(alignment: .leading, spacing: 2) {
                        Text(displayName)
                            .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                            .foregroundStyle(DesignTokens.Text.primary)
                            .lineLimit(1)

                        Text(subtitleText)
                            .font(.system(size: TVDesignTokens.FontSize.xs, weight: .medium))
                            .foregroundStyle(subtitleColor)
                            .lineLimit(1)
                    }
                }
                .padding(.leading, TVDesignTokens.Spacing.sm)
                .padding(.trailing, TVDesignTokens.Spacing.lg)
                .padding(.vertical, TVDesignTokens.Spacing.sm)
                .background(.ultraThinMaterial.opacity(0.8))
                .background(Color.black.opacity(0.3))
                .clipShape(Capsule())
                .overlay(
                    Capsule().stroke(Color.white.opacity(0.12), lineWidth: 1)
                )
            }
            .tvCardStyle()
            .contextMenu {
                Button {
                    coordinator.selectedTab = .profile
                } label: {
                    Label("My Profile", systemImage: "person")
                }

                Button {
                    coordinator.selectedTab = .profile
                } label: {
                    Label("Favorites", systemImage: "star")
                }

                Button {
                    coordinator.selectedTab = .profile
                } label: {
                    Label("Settings", systemImage: "gearshape")
                }

                Divider()

                Button(role: .destructive) {
                    Task { await authManager.signOut() }
                } label: {
                    Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                }
            }
            .accessibilityLabel("Profile: \(displayName)")
        }

        // MARK: - Avatar

        private var avatarView: some View {
            Group {
                if let photoURL = authManager.user?.photoURL {
                    CachedAsyncImage(url: photoURL) { phase in
                        if case let .success(image) = phase {
                            image.resizable().aspectRatio(contentMode: .fill)
                        } else {
                            avatarFallback
                        }
                    }
                } else {
                    avatarFallback
                }
            }
            .frame(width: 56, height: 56)
            .clipShape(Circle())
            .overlay(
                Circle().stroke(DesignTokens.Primary.p400.opacity(0.5), lineWidth: 2)
            )
        }

        private var avatarFallback: some View {
            ZStack {
                LinearGradient(
                    colors: [DesignTokens.Primary.p400, DesignTokens.Primary.p600],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )

                if authManager.isAuthenticated {
                    Text(initials)
                        .font(.system(size: 22, weight: .bold))
                        .foregroundStyle(.white)
                } else {
                    Image(systemName: "person.fill")
                        .font(.system(size: 24))
                        .foregroundStyle(.white.opacity(0.8))
                }
            }
        }

        // MARK: - Helpers

        private var displayName: String {
            if let name = authManager.user?.displayName, !name.isEmpty {
                return name
            }
            if let email = authManager.user?.email {
                return email.components(separatedBy: "@").first ?? "Profile"
            }
            return authManager.isAuthenticated ? "Profile" : "Sign In"
        }

        private var initials: String {
            guard let name = authManager.user?.displayName, !name.isEmpty else {
                return "?"
            }
            let parts = name.split(separator: " ")
            if parts.count >= 2 {
                return String(parts[0].prefix(1) + parts[1].prefix(1)).uppercased()
            }
            return String(name.prefix(1)).uppercased()
        }

        private var subtitleText: String {
            guard authManager.isAuthenticated, let user = authManager.user else {
                return "Tap to sign in"
            }
            if user.isBetaUser { return "Beta Tester" }
            switch user.subscriptionTier {
            case .plus: return "Plus"
            case .free, .nonRegistered: return "Free"
            }
        }

        private var subtitleColor: Color {
            guard authManager.isAuthenticated, let user = authManager.user else {
                return DesignTokens.Text.muted
            }
            if user.isBetaUser { return DesignTokens.Primary.p400 }
            switch user.subscriptionTier {
            case .plus: return DesignTokens.Subscription.premium
            case .free, .nonRegistered: return DesignTokens.Text.muted
            }
        }
    }
#endif
