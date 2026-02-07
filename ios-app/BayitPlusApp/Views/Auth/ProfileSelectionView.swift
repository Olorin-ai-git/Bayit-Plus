import BayitAuth
import BayitDesignSystem
import SwiftUI

/// Profile selection screen - choose user profile after login
struct ProfileSelectionView: View {
    @Environment(AuthManager.self) private var authManager
    let onProfileSelected: () -> Void

    var body: some View {
        VStack(spacing: 40) {
            Spacer()

            Text("Who's watching?")
                .font(.system(size: 28, weight: .bold))
                .foregroundStyle(.white)

            LazyVGrid(
                columns: [
                    GridItem(.flexible(), spacing: 20),
                    GridItem(.flexible(), spacing: 20),
                ],
                spacing: 20
            ) {
                ForEach(authManager.profiles) { profile in
                    profileCard(profile)
                }

                addProfileButton
            }
            .padding(.horizontal, 40)

            Spacer()
        }
    }

    private func profileCard(_ profile: UserProfile) -> some View {
        Button {
            Task {
                try? await authManager.selectProfile(profile)
                onProfileSelected()
            }
        } label: {
            VStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(DesignTokens.Colors.Primary.base.opacity(0.3))
                        .frame(width: 80, height: 80)

                    Text(String(profile.name.prefix(1)).uppercased())
                        .font(.system(size: 32, weight: .bold))
                        .foregroundStyle(DesignTokens.Colors.Primary.base)
                }

                Text(profile.name)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(.white)

                if profile.isChild {
                    Text("Kids")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(DesignTokens.Colors.Semantic.info)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(DesignTokens.Colors.Semantic.info.opacity(0.15))
                        .clipShape(Capsule())
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 20)
            .background(DesignTokens.Colors.Glass.background)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.xl))
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.xl)
                    .stroke(DesignTokens.Colors.Glass.border, lineWidth: 1)
            )
        }
    }

    private var addProfileButton: some View {
        Button {
            // Profile creation flow - Phase 4
        } label: {
            VStack(spacing: 12) {
                ZStack {
                    Circle()
                        .stroke(DesignTokens.Colors.Text.muted, lineWidth: 2)
                        .frame(width: 80, height: 80)

                    Image(systemName: "plus")
                        .font(.system(size: 28))
                        .foregroundStyle(DesignTokens.Colors.Text.muted)
                }

                Text("Add Profile")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(DesignTokens.Colors.Text.muted)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 20)
            .background(Color.black.opacity(0.3))
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.xl))
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.xl)
                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
            )
        }
    }
}
