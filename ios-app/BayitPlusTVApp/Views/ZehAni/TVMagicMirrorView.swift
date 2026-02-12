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
            TVDesignTokens.Background.primary.ignoresSafeArea()

            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: TVDesignTokens.Spacing.xl) {
                    if isLoading && greeting == nil {
                        ProgressView()
                            .tint(.white)
                            .padding(.top, TVDesignTokens.Spacing.xxxl)
                    } else if let errorMsg = error, greeting == nil {
                        errorView(errorMsg)
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
                .foregroundStyle(TVDesignTokens.Text.primary)

            avatarSceneView

            greetingCard(greeting)

            vocabularyCard(greeting)

            refreshButton
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
                .stroke(TVDesignTokens.Glass.border, lineWidth: 2)
        )
        .shadow(color: TVDesignTokens.Glass.purpleGlow, radius: 12, x: 0, y: 4)
    }

    @ViewBuilder
    private func greetingCard(_ greeting: MagicMirrorGreeting) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            Text(greeting.greetingTextHe)
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(TVDesignTokens.Text.primary)
                .multilineTextAlignment(.center)

            Text(greeting.greetingTextEn)
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(TVDesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(TVDesignTokens.Spacing.xl)
        .frame(maxWidth: .infinity)
        .background(TVDesignTokens.Glass.bgLight)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                .stroke(TVDesignTokens.Glass.border, lineWidth: 1)
        )
    }

    @ViewBuilder
    private func vocabularyCard(_ greeting: MagicMirrorGreeting) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text(localization.t("zehAni.magicMirror.vocabOfDay"))
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(TVDesignTokens.Text.primary)

            VStack(spacing: TVDesignTokens.Spacing.md) {
                ForEach(greeting.vocabularyWords, id: \.wordHe) { word in
                    HStack {
                        Text(word.wordHe)
                            .font(.system(size: TVDesignTokens.FontSize.md, weight: .medium))
                            .foregroundStyle(TVDesignTokens.Text.primary)

                        Text(word.transliteration)
                            .font(.system(size: TVDesignTokens.FontSize.base))
                            .foregroundStyle(TVDesignTokens.Text.muted)

                        Spacer()

                        Text(word.translation)
                            .font(.system(size: TVDesignTokens.FontSize.base))
                            .foregroundStyle(TVDesignTokens.Text.secondary)
                    }
                    .padding(.vertical, TVDesignTokens.Spacing.sm)
                }
            }
        }
        .padding(TVDesignTokens.Spacing.xl)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(TVDesignTokens.Glass.bgLight)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                .stroke(TVDesignTokens.Glass.border, lineWidth: 1)
        )
    }

    @ViewBuilder
    private func errorView(_ message: String) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            Text(message)
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.ErrorColor.default)
                .multilineTextAlignment(.center)

            Button {
                Task { await loadGreeting() }
            } label: {
                Text(localization.t("common.retry"))
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                    .padding(.horizontal, TVDesignTokens.Spacing.xl)
                    .padding(.vertical, TVDesignTokens.Spacing.md)
            }
            .buttonStyle(.card)
        }
    }

    @ViewBuilder
    private var refreshButton: some View {
        Button {
            Task { await loadGreeting() }
        } label: {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "arrow.clockwise")
                    .font(.system(size: TVDesignTokens.FontSize.base))
                Text(localization.t("zehAni.magicMirror.refresh"))
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
            }
            .foregroundStyle(TVDesignTokens.Text.primary)
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.vertical, TVDesignTokens.Spacing.md)
        }
        .buttonStyle(.card)
        .focused($refreshButtonFocused)
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
            let fetchedGreeting = try await fetchGreetingFromAPI()
            greeting = fetchedGreeting
            isLoading = false
        } catch {
            self.error = error.localizedDescription
            isLoading = false
        }
    }

    private func fetchGreetingFromAPI() async throws -> MagicMirrorGreeting {
        let baseURL = repos.configuration.apiBaseURL
        let url = baseURL.appendingPathComponent("/api/v1/zeh-ani/magic-mirror/\(profileId)")
        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode(MagicMirrorGreeting.self, from: data)
    }
}

struct SceneKitViewWrapper: UIViewRepresentable {
    let scene: SCNScene
    let onUpdate: ((SCNView) -> Void)?

    func makeUIView(context: Context) -> SCNView {
        let sceneView = SCNView()
        sceneView.scene = scene
        sceneView.autoenablesDefaultLighting = false
        sceneView.allowsCameraControl = false
        sceneView.backgroundColor = .clear
        onUpdate?(sceneView)
        return sceneView
    }

    func updateUIView(_ uiView: SCNView, context: Context) {}
}
#endif
