#if os(tvOS)
import BayitDesignSystem
import BayitLocalization
import SceneKit
import SwiftUI

struct TVMagicMirrorView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization

    let profileId: String

    @State private var greeting: MagicMirrorGreeting?
    @State private var isLoading = true
    @State private var error: String?
    @State private var sceneView: SCNView?
    @State private var avatarNode: SCNNode?
    @State private var isAnimating = false
    @FocusState private var refreshButtonFocused: Bool

    var body: some View {
        ZStack {
            DesignTokens.Colors.Background.primary.ignoresSafeArea()

            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: TVDesignTokens.Spacing.xl) {
                    if isLoading && greeting == nil {
                        ProgressView()
                            .tint(.white)
                            .padding(.top, TVDesignTokens.Spacing.xxxl)
                    } else if let errorMsg = error, greeting == nil {
                        TVMagicMirrorErrorView(message: errorMsg) {
                            Task { await loadGreeting() }
                        }
                    } else if let greeting = greeting {
                        greetingContent(greeting)
                    }
                }
                .padding(.vertical, TVDesignTokens.Spacing.xl)
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            }
        }
        .task {
            await loadGreeting()
        }
    }

    @ViewBuilder
    private func greetingContent(_ greeting: MagicMirrorGreeting) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Text(localization.t("zehAni.magicMirror.title"))
                .font(.system(size: TVDesignTokens.FontSize.hero, weight: .bold))
                .foregroundStyle(DesignTokens.Colors.Text.primary)

            avatarSceneView

            TVMagicMirrorGreetingCard(greeting: greeting)

            TVMagicMirrorVocabularyCard(greeting: greeting)

            TVMagicMirrorRefreshButton(isFocused: $refreshButtonFocused) {
                Task { await loadGreeting() }
            }
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
        .frame(width: 360, height: 360)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                .stroke(DesignTokens.Colors.Glass.border, lineWidth: 2)
        )
        .shadow(color: DesignTokens.Colors.Glass.purpleGlow, radius: 12, x: 0, y: 4)
    }

    private func createAvatarScene() -> SCNScene {
        let scene = SCNScene()

        let cameraNode = SCNNode()
        cameraNode.camera = SCNCamera()
        cameraNode.position = SCNVector3(x: 0, y: 0, z: 80)
        scene.rootNode.addChildNode(cameraNode)

        let ambientLight = SCNNode()
        ambientLight.light = SCNLight()
        ambientLight.light?.type = .ambient
        ambientLight.light?.intensity = 400
        scene.rootNode.addChildNode(ambientLight)

        let directionalLight = SCNNode()
        directionalLight.light = SCNLight()
        directionalLight.light?.type = .directional
        directionalLight.light?.intensity = 600
        directionalLight.position = SCNVector3(x: 0, y: 30, z: 80)
        scene.rootNode.addChildNode(directionalLight)

        return scene
    }

    private func startGreetingAnimation() {
        isAnimating = true
    }

    private func loadGreeting() async {
        isLoading = true
        error = nil

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
#endif
