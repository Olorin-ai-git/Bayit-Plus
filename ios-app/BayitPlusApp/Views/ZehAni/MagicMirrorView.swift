import BayitDesignSystem
import BayitLocalization
import BayitNetworking
import SceneKit
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
    @State private var sceneView: SCNView?
    @State private var avatarNode: SCNNode?
    @State private var isAnimating = false

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
                avatarSceneView
                greetingCard(greeting)
                vocabularyCard(greeting)
            }
        }
    }

    @ViewBuilder
    private var avatarSceneView: some View {
        SceneKitViewWrapper(
            scene: createAvatarScene(),
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
        GlassCard {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                Text(localization.t("zehAni.magicMirror.vocabOfDay"))
                    .font(.system(
                        size: DesignTokens.FontSize.md, weight: .semibold
                    ))
                    .foregroundStyle(DesignTokens.Text.secondary)

                ForEach(greeting.vocabularyWords, id: \.wordHe) { word in
                    HStack {
                        Text(word.wordHe)
                            .font(.system(
                                size: DesignTokens.FontSize.lg, weight: .medium
                            ))
                            .foregroundStyle(DesignTokens.Text.primary)

                        Text(word.transliteration)
                            .font(.system(size: DesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.muted)

                        Spacer()

                        Text(word.translation)
                            .font(.system(size: DesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }
                }
            }
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

    // MARK: - Scene

    private func createAvatarScene() -> SCNScene {
        let scene = SCNScene()

        let cameraNode = SCNNode()
        cameraNode.camera = SCNCamera()
        cameraNode.position = SCNVector3(x: 0, y: 0, z: 60)
        scene.rootNode.addChildNode(cameraNode)

        let lightNode = SCNNode()
        lightNode.light = SCNLight()
        lightNode.light?.type = .omni
        lightNode.position = SCNVector3(x: 0, y: 20, z: 60)
        scene.rootNode.addChildNode(lightNode)

        return scene
    }

    private func startGreetingAnimation() {
        isAnimating = true
    }

    // MARK: - Data Loading

    private func loadGreeting() {
        isLoading = true
        error = nil
        noAvatar = false

        Task {
            do {
                let fetched = try await repos.avatarMeshRepository.getMagicMirrorGreeting(
                    profileId: profileId
                )
                await MainActor.run {
                    greeting = fetched
                    isLoading = false
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
}
