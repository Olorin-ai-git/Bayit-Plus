import AVKit
import BayitDesignSystem
import BayitLocalization
import BayitNetworking
import SwiftUI

/// Magic Mirror view showing personalized avatar greeting.
///
/// Avatar display and video player are in `MagicMirrorCamera.swift`.
/// Greeting content, data loading, and result views are in `MagicMirrorResult.swift`.
struct MagicMirrorView: View {
    @Environment(RepositoryProvider.self) var repos
    @Environment(LocalizationManager.self) var localization

    let profileId: String

    @State var greeting: MagicMirrorGreeting?
    @State var isLoading = true
    @State var error: String?
    @State var noAvatar = false
    @State var showAvatarCreation = false
    @State var starStoryVM: StarStoryViewModel?
    @State var existingAvatarId: String?
    @State var avatarImageUrl: String?
    @State var isPlayingVideo = false
    @State var player: AVPlayer?
    @State var avatars: [StarStoryAvatar] = []
    @State var selectedAvatarId: String?
    @State var showAvatarManagement = false

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            VStack(spacing: DesignTokens.Spacing.lg) {
                ZehAniBreadcrumb(currentLabel: "Magic Mirror")

                if isLoading {
                    Spacer()
                    ProgressView().tint(.white)
                    Spacer()
                } else if noAvatar {
                    createAvatarPrompt
                } else if let error = error {
                    Spacer()
                    errorView(error)
                    refreshButton
                    Spacer()
                } else if let greeting = greeting {
                    greetingContent(greeting)
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
        }
        .sheet(isPresented: $showAvatarCreation) {
            AvatarCreationView(
                profileId: profileId,
                viewModel: starStoryVM,
                skipConsent: existingAvatarId != nil,
                existingAvatarId: existingAvatarId
            )
        }
        .sheet(isPresented: $showAvatarManagement) {
            AvatarManagementView(profileId: profileId) {
                loadGreeting()
            }
        }
        .onChange(of: showAvatarCreation) { _, isShowing in
            if !isShowing { loadGreeting() }
        }
        .onAppear { loadGreeting() }
    }

    // MARK: - Create Avatar Prompt

    private var createAvatarPrompt: some View {
        VStack(spacing: DesignTokens.Spacing.xl) {
            Spacer()

            Image(systemName: "wand.and.stars")
                .font(.system(size: 56))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(localization.t("zehAni.magicMirror.noAvatar"))
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .multilineTextAlignment(.center)

            Text(localization.t("zehAni.magicMirror.noAvatarDesc"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
                .multilineTextAlignment(.center)
                .padding(.horizontal, DesignTokens.Spacing.xl)

            GlassButton(
                localization.t("zehAni.magicMirror.createAvatar"),
                variant: .primary
            ) {
                starStoryVM = StarStoryViewModel(
                    repository: repos.starStory
                )
                showAvatarCreation = true
            }

            Spacer()
        }
    }
}
