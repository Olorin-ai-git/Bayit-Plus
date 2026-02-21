import BayitAuth
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Profile selection screen matching web app design - "Who's watching?"
struct ProfileSelectionView: View {
    @Environment(AuthManager.self) private var authManager
    @Environment(LocalizationManager.self) private var localization
    @State private var isManageMode = false
    @State private var showAddProfile = false

    let onProfileSelected: () -> Void

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.xl) {
            Spacer()

            AuthComponents.LogoSection()

            titleText

            profilesGrid

            manageButton

            Spacer()
        }
        .sheet(isPresented: $showAddProfile) {
            AddProfileSheetView()
        }
        .task {
            do {
                try await authManager.loadProfiles()
            } catch {
                // Profiles will fall back to whatever is cached locally
            }
        }
    }

    // MARK: - Title

    private var titleText: some View {
        Text(isManageMode ? "Manage Profiles" : "Who's watching?")
            .font(.system(size: 28, weight: .bold))
            .foregroundStyle(.white)
    }

    // MARK: - Profiles Grid

    private var profilesGrid: some View {
        LazyVGrid(
            columns: [
                GridItem(.flexible(), spacing: DesignTokens.Spacing.lg),
                GridItem(.flexible(), spacing: DesignTokens.Spacing.lg),
            ],
            spacing: DesignTokens.Spacing.lg
        ) {
            ForEach(authManager.profiles) { profile in
                ProfileCardView(
                    profile: profile,
                    isManageMode: isManageMode,
                    onSelect: { handleProfileSelect(profile) }
                )
            }

            if authManager.profiles.count < 5, !isManageMode {
                addProfileCard
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.xxxl)
    }

    // MARK: - Add Profile

    private var addProfileCard: some View {
        Button { showAddProfile = true } label: {
            VStack(spacing: DesignTokens.Spacing.sm) {
                ZStack {
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                        .stroke(
                            Color.white.opacity(0.15),
                            style: StrokeStyle(lineWidth: 2, dash: [8])
                        )
                        .frame(width: 120, height: 120)
                        .background(
                            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                                .fill(Color.white.opacity(0.03))
                        )

                    Image(systemName: "plus")
                        .font(.system(size: 36))
                        .foregroundStyle(DesignTokens.Colors.Text.muted)
                }

                Text(localization.t("profiles.addProfile"))
                    .font(.system(size: 14))
                    .foregroundStyle(DesignTokens.Colors.Text.muted)
            }
        }
    }

    // MARK: - Manage Button

    private var manageButton: some View {
        Button { isManageMode.toggle() } label: {
            Text(isManageMode ? "Done" : "Manage Profiles")
                .font(.system(size: 14))
                .foregroundStyle(DesignTokens.Colors.Text.muted)
                .padding(.horizontal, DesignTokens.Spacing.lg)
                .padding(.vertical, DesignTokens.Spacing.sm)
                .overlay(
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                        .stroke(Color.white.opacity(0.15), lineWidth: 1)
                )
        }
    }

    // MARK: - Actions

    private func handleProfileSelect(_ profile: UserProfile) {
        guard !isManageMode else { return }
        Task {
            try? await authManager.selectProfile(profile)
            onProfileSelected()
        }
    }
}
