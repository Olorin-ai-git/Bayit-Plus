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
                .foregroundStyle(DesignTokens.Text.primary)
                .multilineTextAlignment(.center)

            Text(greeting.greetingTextEn)
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(TVDesignTokens.Spacing.xl)
        .frame(maxWidth: .infinity)
        .background(DesignTokens.Glass.bgMedium)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                .stroke(DesignTokens.Glass.border, lineWidth: 1)
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
                .foregroundStyle(DesignTokens.Text.primary)

            if let vocab = greeting.vocabularyOfTheDay {
                Text(vocab)
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .padding(.vertical, TVDesignTokens.Spacing.sm)
            }
        }
        .padding(TVDesignTokens.Spacing.xl)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DesignTokens.Glass.bgMedium)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                .stroke(DesignTokens.Glass.border, lineWidth: 1)
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
            .foregroundStyle(DesignTokens.Text.primary)
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
        scnView.backgroundColor = UIColor(red: 0.11, green: 0.11, blue: 0.15, alpha: 1.0)
        scnView.allowsCameraControl = true
        scnView.autoenablesDefaultLighting = true
        scnView.antialiasingMode = .multisampling4X

        let scene = SCNScene()
        scnView.scene = scene

        if let loadedScene = loadGLB(from: glbData, in: scnView) {
            let children = loadedScene.rootNode.childNodes
            for child in children {
                scene.rootNode.addChildNode(child)
            }
            if !children.isEmpty {
                frameCameraToFit(scene: scene, in: scnView)
                setupLighting(in: scene)
                addDebugLabel(to: scnView, text: "nodes: \(children.count)")
            }
        } else {
            addDebugLabel(to: scnView, text: "GLB LOAD FAILED")
        }

        return scnView
    }

    func updateUIView(_ uiView: SCNView, context: Context) {}

    private func addDebugLabel(to view: SCNView, text: String) {
        let label = UILabel()
        label.text = text
        label.textColor = .green
        label.font = .systemFont(ofSize: 12)
        label.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(label)
        NSLayoutConstraint.activate([
            label.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: -8),
            label.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 8),
        ])
    }

    private func loadGLB(from data: Data, in view: SCNView) -> SCNScene? {
        do {
            let scene = try GLBSceneLoader.loadScene(from: data)
            NSLog("BAYIT_TV_3D loadGLB success children=\(scene.rootNode.childNodes.count)")
            return scene
        } catch {
            NSLog("BAYIT_TV_3D loadGLB error: \(error.localizedDescription)")
            return nil
        }
    }

    private func frameCameraToFit(scene: SCNScene, in scnView: SCNView) {
        let (minVec, maxVec) = scene.rootNode.boundingBox
        let center = SCNVector3(
            x: (minVec.x + maxVec.x) / 2,
            y: (minVec.y + maxVec.y) / 2,
            z: (minVec.z + maxVec.z) / 2
        )
        let height = maxVec.y - minVec.y
        let depth = maxVec.z - minVec.z
        let cameraDistance = max(height, depth) * 2.0

        let cameraNode = SCNNode()
        cameraNode.camera = SCNCamera()
        cameraNode.camera?.automaticallyAdjustsZRange = true
        cameraNode.position = SCNVector3(
            x: center.x,
            y: center.y,
            z: center.z + Float(cameraDistance)
        )
        cameraNode.look(at: center)
        scene.rootNode.addChildNode(cameraNode)
        scnView.pointOfView = cameraNode
    }

    private func setupLighting(in scene: SCNScene) {
        let ambientLight = SCNNode()
        ambientLight.light = SCNLight()
        ambientLight.light?.type = .ambient
        ambientLight.light?.intensity = 800
        ambientLight.light?.color = UIColor.white
        scene.rootNode.addChildNode(ambientLight)

        let directionalLight = SCNNode()
        directionalLight.light = SCNLight()
        directionalLight.light?.type = .directional
        directionalLight.light?.intensity = 1200
        directionalLight.position = SCNVector3(x: 2, y: 5, z: 4)
        directionalLight.look(at: SCNVector3(0, 0, 0))
        scene.rootNode.addChildNode(directionalLight)
    }
}
#endif
