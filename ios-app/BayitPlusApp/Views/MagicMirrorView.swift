import BayitDesignSystem
import BayitLocalization
import SceneKit
import SwiftUI

struct MagicMirrorView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization

    let profileId: String

    @State private var greeting: MagicMirrorGreeting?
    @State private var isLoading = true
    @State private var error: String?
    @State private var sceneView: SCNView?
    @State private var avatarNode: SCNNode?
    @State private var isAnimating = false

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            VStack(spacing: 20) {
                if isLoading {
                    ProgressView()
                        .tint(.white)
                } else if let error = error {
                    errorView(error)
                } else if let greeting = greeting {
                    greetingContent(greeting)
                }

                refreshButton
            }
            .padding(24)
        }
        .onAppear {
            loadGreeting()
        }
    }

    @ViewBuilder
    private func greetingContent(_ greeting: MagicMirrorGreeting) -> some View {
        VStack(spacing: 20) {
            avatarSceneView

            greetingCard(greeting)

            vocabularyCard(greeting)
        }
    }

    @ViewBuilder
    private var avatarSceneView: some View {
        SceneKitViewWrapper(
            scene: createAvatarScene(),
            onUpdate: { view in
                self.sceneView = view
                if !isAnimating {
                    startGreetingAnimation()
                }
            }
        )
        .frame(height: 200)
        .clipShape(RoundedRectangle(cornerRadius: 20))
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(.white.opacity(0.15), lineWidth: 1)
        )
    }

    @ViewBuilder
    private func greetingCard(_ greeting: MagicMirrorGreeting) -> some View {
        VStack(spacing: 12) {
            Text(greeting.greetingTextHe)
                .font(.system(size: 28, weight: .bold))
                .foregroundColor(.white)
                .multilineTextAlignment(.center)

            Text(greeting.greetingTextEn)
                .font(.system(size: 16))
                .foregroundColor(.white.opacity(0.6))
                .multilineTextAlignment(.center)
        }
        .padding(24)
        .frame(maxWidth: .infinity)
        .background(.white.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(.white.opacity(0.1), lineWidth: 1)
        )
    }

    @ViewBuilder
    private func vocabularyCard(_ greeting: MagicMirrorGreeting) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(localization.t("zehAni.magicMirror.vocabOfDay"))
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(.white.opacity(0.8))

            ForEach(greeting.vocabularyWords, id: \.wordHe) { word in
                HStack {
                    Text(word.wordHe)
                        .font(.system(size: 18, weight: .medium))
                        .foregroundColor(.white)

                    Text(word.transliteration)
                        .font(.system(size: 14))
                        .foregroundColor(.white.opacity(0.5))

                    Spacer()

                    Text(word.translation)
                        .font(.system(size: 14))
                        .foregroundColor(.white.opacity(0.7))
                }
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.white.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(.white.opacity(0.1), lineWidth: 1)
        )
    }

    @ViewBuilder
    private func errorView(_ message: String) -> some View {
        Text(message)
            .foregroundColor(DesignTokens.Colors.Semantic.error)
            .font(.system(size: 16))
    }

    private var refreshButton: some View {
        Button {
            loadGreeting()
        } label: {
            HStack {
                Image(systemName: "arrow.clockwise")
                Text(localization.t("zehAni.magicMirror.refresh"))
            }
        }
        .buttonStyle(.borderedProminent)
    }

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

    private func loadGreeting() {
        isLoading = true
        error = nil

        Task {
            do {
                let fetchedGreeting = try await repos.avatarMeshRepository.getMagicMirrorGreeting(
                    profileId: profileId
                )
                await MainActor.run {
                    greeting = fetchedGreeting
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
