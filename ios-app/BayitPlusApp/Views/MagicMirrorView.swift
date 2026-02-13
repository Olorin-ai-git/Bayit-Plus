import BayitDesignSystem
import BayitLocalization
import BayitNetworking
import SceneKit
import SwiftUI

struct MagicMirrorView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization

    let profileId: String

    @State private var greeting: MagicMirrorGreeting?
    @State private var activeAvatarId: String?
    @State private var isLoading = true
    @State private var error: String?
    @State private var noAvatar = false
    @State private var insufficientCredits = false
    @State private var showAvatarCreation = false
    @State private var starStoryVM: StarStoryViewModel?
    @State private var sceneView: SCNView?
    @State private var avatarNode: SCNNode?
    @State private var isAnimating = false

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            VStack(spacing: DesignTokens.Spacing.lg) {
                HStack {
                    ZehAniBreadcrumb(currentLabel: "Magic Mirror")
                    Spacer()
                    if greeting != nil, let avatarId = activeAvatarId {
                        Button {
                            coordinator.push(.zehAniAvatarSettings(
                                profileId: profileId, avatarId: avatarId
                            ))
                        } label: {
                            Image(systemName: "gearshape")
                                .font(.system(size: DesignTokens.FontSize.lg))
                                .foregroundStyle(DesignTokens.Text.secondary)
                        }
                    }
                }

                if isLoading {
                    Spacer()
                    ProgressView().tint(.white)
                    Spacer()
                } else if noAvatar {
                    MagicMirrorNoAvatarPrompt {
                        starStoryVM = StarStoryViewModel(repository: repos.starStory)
                        showAvatarCreation = true
                    }
                } else if insufficientCredits {
                    MagicMirrorNoCreditsPrompt()
                } else if let error = error {
                    Spacer()
                    errorView(error)
                    refreshButton
                    Spacer()
                } else if let greeting = greeting {
                    greetingContent(greeting)
                    refreshButton
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
        }
        .sheet(isPresented: $showAvatarCreation) {
            AvatarCreationView(
                profileId: profileId,
                viewModel: starStoryVM
            )
        }
        .onChange(of: showAvatarCreation) { _, isShowing in
            if !isShowing { loadGreeting() }
        }
        .onAppear { loadGreeting() }
    }

    // MARK: - Greeting Content

    @ViewBuilder
    private func greetingContent(_ greeting: MagicMirrorGreeting) -> some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: DesignTokens.Spacing.lg) {
                avatarSceneView
                MagicMirrorGreetingCard(greeting: greeting)
                if let vocab = greeting.vocabularyOfTheDay, !vocab.isEmpty {
                    MagicMirrorVocabCard(vocabulary: vocab)
                }
            }
        }
    }

    @ViewBuilder
    private var avatarSceneView: some View {
        SceneKitViewWrapper(
            scene: MagicMirrorSceneBuilder.createScene(),
            onUpdate: { view in
                self.sceneView = view
                if !isAnimating { startGreetingAnimation() }
            }
        )
        .frame(height: 200)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .stroke(DesignTokens.Glass.border, lineWidth: 1)
        )
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

    private func startGreetingAnimation() {
        isAnimating = true
    }

    // MARK: - Data Loading

    private func loadGreeting() {
        isLoading = true
        error = nil
        noAvatar = false
        insufficientCredits = false

        Task {
            do {
                async let greetingTask = repos.avatarMeshRepository.getMagicMirrorGreeting(
                    profileId: profileId
                )
                async let avatarsTask = repos.starStory.fetchAvatars(profileId: profileId)

                let fetched = try await greetingTask
                let avatarsResponse = try? await avatarsTask

                await MainActor.run {
                    greeting = fetched
                    activeAvatarId = avatarsResponse?.avatars.first?.avatarId
                    isLoading = false
                }
            } catch let apiError as APIError {
                await MainActor.run {
                    switch apiError {
                    case .notFound:
                        noAvatar = true
                    case .paymentRequired:
                        insufficientCredits = true
                    default:
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
}
