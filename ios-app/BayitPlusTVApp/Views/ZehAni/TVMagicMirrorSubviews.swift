#if os(tvOS)
import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SceneKit
import SwiftUI

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

struct TVMagicMirrorGreetingCard: View {
    @Environment(LocalizationManager.self) private var localization

    let greeting: MagicMirrorGreeting

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            Text(greeting.greetingTextHe)
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Colors.Text.primary)
                .multilineTextAlignment(.center)

            Text(greeting.greetingTextEn)
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Colors.Text.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(TVDesignTokens.Spacing.xl)
        .frame(maxWidth: .infinity)
        .background(DesignTokens.Colors.Glass.backgroundLight)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                .stroke(DesignTokens.Colors.Glass.border, lineWidth: 1)
        )
    }
}

struct TVMagicMirrorVocabularyCard: View {
    @Environment(LocalizationManager.self) private var localization

    let greeting: MagicMirrorGreeting

    var body: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text(localization.t("zehAni.magicMirror.vocabOfDay"))
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(DesignTokens.Colors.Text.primary)

            if let vocab = greeting.vocabularyOfTheDay {
                Text(vocab)
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .medium))
                    .foregroundStyle(DesignTokens.Colors.Text.primary)
                    .padding(.vertical, TVDesignTokens.Spacing.sm)
            }
        }
        .padding(TVDesignTokens.Spacing.xl)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DesignTokens.Colors.Glass.backgroundLight)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                .stroke(DesignTokens.Colors.Glass.border, lineWidth: 1)
        )
    }
}

struct TVMagicMirrorErrorView: View {
    @Environment(LocalizationManager.self) private var localization

    let message: String
    let onRetry: () -> Void

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            Text(message)
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.ErrorColor.default)
                .multilineTextAlignment(.center)

            Button {
                onRetry()
            } label: {
                Text(localization.t("common.retry"))
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                    .padding(.horizontal, TVDesignTokens.Spacing.xl)
                    .padding(.vertical, TVDesignTokens.Spacing.md)
            }
            .buttonStyle(.card)
        }
    }
}

struct TVMagicMirrorRefreshButton: View {
    @Environment(LocalizationManager.self) private var localization

    @FocusState.Binding var isFocused: Bool
    let onRefresh: () -> Void

    var body: some View {
        Button {
            onRefresh()
        } label: {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "arrow.clockwise")
                    .font(.system(size: TVDesignTokens.FontSize.base))
                Text(localization.t("zehAni.magicMirror.refresh"))
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
            }
            .foregroundStyle(DesignTokens.Colors.Text.primary)
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.vertical, TVDesignTokens.Spacing.md)
        }
        .buttonStyle(.card)
        .focused($isFocused)
    }
}

struct MagicMirrorAvatarSceneView: UIViewRepresentable {
    let glbData: Data

    func makeUIView(context: Context) -> SCNView {
        let scnView = SCNView()
        scnView.backgroundColor = .clear
        scnView.allowsCameraControl = false
        scnView.autoenablesDefaultLighting = false
        scnView.antialiasingMode = .multisampling4X

        let scene = SCNScene()
        configureCamera(scene: scene)
        configureLighting(scene: scene)
        loadModel(into: scene)
        scnView.scene = scene

        return scnView
    }

    func updateUIView(_ uiView: SCNView, context: Context) {}

    private func configureCamera(scene: SCNScene) {
        let cameraNode = SCNNode()
        cameraNode.camera = SCNCamera()
        cameraNode.camera?.zNear = 0.1
        cameraNode.camera?.zFar = 100
        cameraNode.camera?.fieldOfView = 45
        cameraNode.position = SCNVector3(x: 0, y: 1.2, z: 3.0)
        cameraNode.look(at: SCNVector3(x: 0, y: 0.8, z: 0))
        scene.rootNode.addChildNode(cameraNode)
    }

    private func configureLighting(scene: SCNScene) {
        let ambient = SCNNode()
        ambient.light = SCNLight()
        ambient.light?.type = .ambient
        ambient.light?.intensity = 400
        ambient.light?.color = UIColor(white: 0.85, alpha: 1.0)
        scene.rootNode.addChildNode(ambient)

        let directional = SCNNode()
        directional.light = SCNLight()
        directional.light?.type = .directional
        directional.light?.intensity = 800
        directional.light?.castsShadow = true
        directional.position = SCNVector3(x: 2, y: 4, z: 3)
        directional.look(at: SCNVector3(0, 0, 0))
        scene.rootNode.addChildNode(directional)
    }

    private func loadModel(into scene: SCNScene) {
        guard let loadedScene = try? GLBSceneLoader.loadScene(from: glbData) else {
            return
        }
        for child in loadedScene.rootNode.childNodes {
            scene.rootNode.addChildNode(child)
        }
    }
}
#endif
