import AVKit
import BayitDesignSystem
import BayitLocalization
import BayitNetworking
import SwiftUI

struct MagicMirrorView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization

    let profileId: String

    @State private var greeting: MagicMirrorGreeting?
    @State private var isLoading = true
    @State private var error: String?
    @State private var noAvatar = false
    @State private var showAvatarCreation = false
    @State private var starStoryVM: StarStoryViewModel?
    @State private var existingAvatarId: String?
    @State private var avatarImageUrl: String?
    @State private var isPlayingVideo = false
    @State private var player: AVPlayer?

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
                    reRecordButton
                    refreshButton
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

    // MARK: - Greeting Content

    @ViewBuilder
    private func greetingContent(_ greeting: MagicMirrorGreeting) -> some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: DesignTokens.Spacing.lg) {
                avatarDisplayView(greeting)
                greetingCard(greeting)
                vocabularyCard(greeting)
            }
        }
    }

    @ViewBuilder
    private func avatarDisplayView(_ greeting: MagicMirrorGreeting) -> some View {
        ZStack {
            if isPlayingVideo, let player = player {
                VideoPlayer(player: player)
                    .frame(height: 280)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
                    .overlay(
                        RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                            .stroke(DesignTokens.Glass.border, lineWidth: 1)
                    )
                    .onReceive(NotificationCenter.default.publisher(
                        for: .AVPlayerItemDidPlayToEndTime
                    )) { _ in
                        isPlayingVideo = false
                        self.player = nil
                    }
            } else if let imageUrlString = avatarImageUrl,
                      let imageUrl = URL(string: imageUrlString) {
                AsyncImage(url: imageUrl) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().scaledToFill()
                    case .failure:
                        avatarPlaceholder
                    default:
                        ProgressView().tint(.white)
                    }
                }
                .frame(height: 280)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
                .overlay(
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                        .stroke(DesignTokens.Glass.border, lineWidth: 1)
                )
                .overlay(alignment: .bottom) {
                    if greeting.lipsyncVideoUrl != nil {
                        playGreetingButton(greeting)
                    }
                }
            } else {
                avatarPlaceholder
                    .frame(height: 280)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
            }
        }
    }

    private func playGreetingButton(_ greeting: MagicMirrorGreeting) -> some View {
        GlassButton(
            localization.t("zehAni.magicMirror.playGreeting"),
            variant: .primary,
            size: .small
        ) {
            guard let videoUrlString = greeting.lipsyncVideoUrl,
                  let videoUrl = URL(string: videoUrlString) else { return }
            let avPlayer = AVPlayer(url: videoUrl)
            player = avPlayer
            isPlayingVideo = true
            avPlayer.play()
        }
        .padding(DesignTokens.Spacing.sm)
    }

    private var avatarPlaceholder: some View {
        RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
            .fill(DesignTokens.Glass.bg.opacity(0.3))
            .overlay {
                Image(systemName: "person.crop.circle")
                    .font(.system(size: 48))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
    }

    @ViewBuilder
    private func greetingCard(_ greeting: MagicMirrorGreeting) -> some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.sm) {
                Text(greeting.greetingTextHe)
                    .font(.system(size: DesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .multilineTextAlignment(.center)

                Text(greeting.greetingTextEn)
                    .font(.system(size: DesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)
            }
        }
    }

    @ViewBuilder
    private func vocabularyCard(_ greeting: MagicMirrorGreeting) -> some View {
        if let vocab = greeting.vocabularyOfTheDay {
            MagicMirrorVocabCard(vocabulary: vocab)
        }
    }

    // MARK: - Error & Refresh

    @ViewBuilder
    private func errorView(_ message: String) -> some View {
        Text(message)
            .foregroundStyle(DesignTokens.ErrorColor.default)
            .font(.system(size: DesignTokens.FontSize.md))
    }

    private var refreshButton: some View {
        GlassButton(
            localization.t("zehAni.magicMirror.refresh"),
            variant: .secondary
        ) {
            loadGreeting()
        }
    }

    private var reRecordButton: some View {
        GlassButton(localization.t("avatar.settings.reRecord"), variant: .secondary) {
            starStoryVM = StarStoryViewModel(repository: repos.starStory)
            showAvatarCreation = true
        }
    }

    // MARK: - Data Loading

    private func loadGreeting() {
        isLoading = true
        error = nil
        noAvatar = false
        avatarImageUrl = nil
        isPlayingVideo = false
        player = nil

        Task {
            do {
                async let greetingTask = repos.avatarMeshRepository.getMagicMirrorGreeting(
                    profileId: profileId
                )
                async let avatarsTask = repos.starStory.fetchAvatars(profileId: profileId)

                let fetched = try await greetingTask
                let avatarsResponse = try? await avatarsTask
                let avatarId = avatarsResponse?.avatars.first?.avatarId

                await MainActor.run {
                    greeting = fetched
                    existingAvatarId = avatarId
                    isLoading = false
                }

                if let avatarId {
                    await loadAvatarImage(avatarId: avatarId)
                }
            } catch let apiError as APIError {
                await MainActor.run {
                    if case .notFound = apiError {
                        noAvatar = true
                    } else {
                        self.error = apiError.localizedDescription
                    }
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

    private func loadAvatarImage(avatarId: String) async {
        do {
            let status = try await repos.avatarMeshRepository.fetchAvatarStatus(
                avatarId: avatarId
            )
            await MainActor.run {
                avatarImageUrl = status.avatarImageUrl
            }
        } catch {
            // Avatar image is optional; greeting still works without it
        }
    }
}
