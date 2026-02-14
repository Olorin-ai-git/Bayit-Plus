import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct AvatarSettingsView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization

    let profileId: String
    let avatarId: String

    @State private var meshStatus: AvatarMeshStatus?
    @State private var avatar: StarStoryAvatar?
    @State private var isLoading = true
    @State private var error: String?
    @State private var showDeleteConfirmation = false
    @State private var showReRecord = false
    @State private var isDeleting = false

    private let logger = BayitLogger(category: "AvatarSettingsView")

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            if isLoading {
                ProgressView().tint(.white)
            } else {
                scrollContent
            }
        }
        .navigationTitle(localization.t("avatar.settings.title"))
        .onAppear { loadData() }
        .confirmationDialog(
            localization.t("avatar.settings.deleteConfirmTitle"),
            isPresented: $showDeleteConfirmation,
            titleVisibility: .visible
        ) {
            Button(localization.t("avatar.settings.deleteConfirm"), role: .destructive) {
                Task { await deleteAvatar() }
            }
        } message: {
            Text(localization.t("avatar.settings.deleteConfirmDesc"))
        }
        .sheet(isPresented: $showReRecord) {
            AvatarCreationView(
                profileId: profileId,
                viewModel: StarStoryViewModel(repository: repos.starStory),
                skipConsent: true,
                existingAvatarId: avatarId
            )
        }
    }

    private var scrollContent: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: DesignTokens.Spacing.lg) {
                avatarInfoCard
                meshStatusCard
                actionsSection
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .padding(.vertical, DesignTokens.Spacing.xl)
        }
    }

    private var avatarInfoCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                HStack {
                    Image(systemName: "person.crop.circle")
                        .font(.system(size: DesignTokens.FontSize.xxl))
                        .foregroundStyle(DesignTokens.Primary.p400)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(avatar?.childFirstName ?? avatarId)
                            .font(.system(size: DesignTokens.FontSize.lg, weight: .semibold))
                            .foregroundStyle(DesignTokens.Text.primary)
                        if let avatar {
                            Text(avatar.style.displayName)
                                .font(.system(size: DesignTokens.FontSize.sm))
                                .foregroundStyle(DesignTokens.Text.muted)
                        }
                    }
                    Spacer()
                }
            }
        }
    }

    private var meshStatusCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                Text(localization.t("avatar.settings.meshStatus"))
                    .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.secondary)

                HStack {
                    Circle()
                        .fill(meshStatusColor)
                        .frame(width: 10, height: 10)
                    Text(meshStatusLabel)
                        .font(.system(size: DesignTokens.FontSize.base))
                        .foregroundStyle(DesignTokens.Text.primary)
                    Spacer()
                }

                if let error {
                    Text(error)
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.ErrorColor.default)
                }
            }
        }
    }

    private var actionsSection: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            GlassButton(localization.t("avatar.settings.reRecord"), variant: .secondary, size: .large) {
                showReRecord = true
            }
            let deleteLabel = isDeleting ? localization.t("avatar.settings.deleting") : localization.t("avatar.settings.delete")
            GlassButton(deleteLabel, variant: .destructive, size: .large) {
                showDeleteConfirmation = true
            }
            .disabled(isDeleting)
        }
    }

    private var meshStatusColor: Color {
        switch meshStatus?.status.lowercased() {
        case "ready", "completed": return DesignTokens.Success.default
        case "generating", "rigging", "pending": return DesignTokens.Warning.default
        case "failed", "error": return DesignTokens.ErrorColor.default
        default: return DesignTokens.Text.muted
        }
    }

    private var meshStatusLabel: String {
        switch meshStatus?.status.lowercased() {
        case "ready", "completed": return localization.t("avatar.settings.statusReady")
        case "generating": return localization.t("avatar.settings.statusGenerating")
        case "rigging": return localization.t("avatar.settings.statusRigging")
        case "pending": return localization.t("avatar.settings.statusPending")
        case "failed", "error": return localization.t("avatar.settings.statusFailed")
        default: return localization.t("avatar.settings.statusUnknown")
        }
    }

    // MARK: - Data

    private func loadData() {
        isLoading = true
        Task {
            do {
                async let avatarsTask = repos.starStory.fetchAvatars(profileId: profileId)
                async let meshTask = repos.avatarMeshRepository.fetchMeshStatus(avatarId: avatarId)

                let avatarsResponse = try await avatarsTask
                avatar = avatarsResponse.avatars.first { $0.avatarId == avatarId }

                meshStatus = try? await meshTask
            } catch {
                logger.error("Failed to load avatar settings", error: error)
                self.error = error.localizedDescription
            }
            isLoading = false
        }
    }

    private func deleteAvatar() async {
        isDeleting = true
        do {
            try await repos.starStory.revokeConsent(profileId: profileId)
            logger.info("Avatar deleted for profile \(profileId)")
            coordinator.pop()
        } catch {
            self.error = error.localizedDescription
            logger.error("Failed to delete avatar", error: error)
        }
        isDeleting = false
    }
}
