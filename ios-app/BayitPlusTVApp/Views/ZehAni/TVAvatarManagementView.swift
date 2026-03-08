#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    struct TVAvatarManagementView: View {
        @Environment(TVRepositoryProvider.self) var repos
        @Environment(LocalizationManager.self) var localization

        let profileId: String

        @State private var avatars: [StarStoryAvatar] = []
        @State private var isLoading = true
        @State private var error: String?
        @State private var showStylePicker = false
        @State private var showWardrobe = false
        @State private var wardrobeAvatarId: String = ""

        var body: some View {
            ZStack {
                DesignTokens.Background.primary.ignoresSafeArea()

                if isLoading {
                    ProgressView().tint(.white).scaleEffect(1.5)
                } else if let error {
                    Text(error)
                        .foregroundStyle(DesignTokens.ErrorColor.default)
                        .font(.system(size: TVDesignTokens.FontSize.lg))
                } else {
                    avatarGrid
                }
            }
            .onAppear { loadAvatars() }
            .sheet(isPresented: $showStylePicker) {
                TVAvatarStylePickerView(profileId: profileId) {
                    loadAvatars()
                }
            }
            .sheet(isPresented: $showWardrobe) {
                TVAvatarWardrobeView(
                    avatarId: wardrobeAvatarId,
                    profileId: profileId
                )
            }
        }

        private var avatarGrid: some View {
            ScrollView {
                LazyVGrid(
                    columns: [GridItem(.adaptive(minimum: 240), spacing: TVDesignTokens.Spacing.lg)],
                    spacing: TVDesignTokens.Spacing.lg
                ) {
                    ForEach(avatars) { avatar in
                        TVAvatarManagementCard(
                            avatar: avatar,
                            canDelete: avatars.count > 1,
                            onSetActive: { setActive(avatar) },
                            onDelete: { deleteAvatar(avatar) },
                            onWardrobe: {
                                wardrobeAvatarId = avatar.avatarId
                                showWardrobe = true
                            }
                        )
                    }

                    createNewAvatarCard
                }
                .padding(TVDesignTokens.Spacing.xxl)
            }
        }

        private var createNewAvatarCard: some View {
            Button { showStylePicker = true } label: {
                VStack(spacing: TVDesignTokens.Spacing.md) {
                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: 48))
                        .foregroundStyle(DesignTokens.Primary.p400)

                    Text(localization.t("zehAni.avatarManagement.createNew"))
                        .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)
                }
                .frame(height: 200)
                .frame(maxWidth: .infinity)
            }
            .tvCardStyle()
        }

        private func loadAvatars() {
            isLoading = true
            Task {
                do {
                    let response = try await repos.starStory.fetchAvatars(profileId: profileId)
                    await MainActor.run {
                        avatars = response.avatars
                        isLoading = false
                    }
                } catch {
                    await MainActor.run {
                        self.error = error.localizedDescription
                        isLoading = false
                    }
                }
            }
        }

        private func setActive(_ avatar: StarStoryAvatar) {
            Task {
                try? await repos.starStory.setActiveAvatar(avatarId: avatar.avatarId)
                loadAvatars()
            }
        }

        private func deleteAvatar(_ avatar: StarStoryAvatar) {
            Task {
                try? await repos.starStory.deleteAvatar(avatarId: avatar.avatarId)
                loadAvatars()
            }
        }
    }
#endif
