import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct AvatarManagementView: View {
    @Environment(RepositoryProvider.self) var repos
    @Environment(LocalizationManager.self) var localization
    @Environment(\.dismiss) private var dismiss

    let profileId: String
    let onDismiss: () -> Void

    @State private var avatars: [StarStoryAvatar] = []
    @State private var isLoading = true
    @State private var error: String?
    @State private var showStylePicker = false

    var body: some View {
        NavigationStack {
            ZStack {
                DesignTokens.Background.primary.ignoresSafeArea()

                if isLoading {
                    ProgressView().tint(.white)
                } else if let error {
                    Text(error)
                        .foregroundStyle(DesignTokens.ErrorColor.default)
                        .font(.system(size: DesignTokens.FontSize.md))
                } else {
                    avatarList
                }
            }
            .navigationTitle(localization.t("zehAni.avatarManagement.title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(localization.t("common.done")) {
                        onDismiss()
                        dismiss()
                    }
                }
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showStylePicker = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
        }
        .onAppear { loadAvatars() }
        .sheet(isPresented: $showStylePicker) {
            AvatarStylePickerView(profileId: profileId) {
                loadAvatars()
            }
        }
    }

    private var avatarList: some View {
        ScrollView {
            LazyVGrid(
                columns: [GridItem(.adaptive(minimum: 140), spacing: DesignTokens.Spacing.md)],
                spacing: DesignTokens.Spacing.md
            ) {
                ForEach(avatars) { avatar in
                    AvatarManagementCard(
                        avatar: avatar,
                        canDelete: avatars.count > 1,
                        onSetActive: { setActive(avatar) },
                        onDelete: { deleteAvatar(avatar) }
                    )
                }
            }
            .padding(DesignTokens.Spacing.lg)
        }
    }

    private func loadAvatars() {
        isLoading = true
        Task {
            do {
                let response = try await repos.starStory.fetchAvatars(
                    profileId: profileId
                )
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
