#if os(tvOS)
import BayitCore
import BayitDesignSystem
import BayitLocalization
import ModelIO
import SceneKit
import SceneKit.ModelIO
import SwiftUI

struct TVAvatar3DPreviewView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    let avatarId: String
    var onClose: (() -> Void)?

    @State private var phase: Phase = .loading
    @State private var sceneData: Data?
    @State private var error: String?
    @FocusState private var resetFocused: Bool
    @FocusState private var closeFocused: Bool
    private let logger = BayitLogger(category: "TVAvatar3DPreview")

    private enum Phase { case loading, ready, error }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            switch phase {
            case .loading: loadingBody
            case .ready: previewBody
            case .error: errorBody
            }
        }
        .onAppear { loadGlbModel() }
        .onExitCommand { onClose?() }
    }

    private var loadingBody: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            ProgressView().tint(.white)
            Text(localization.t("zehAni.avatar3d.loading"))
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundColor(.white.opacity(0.6))
        }
    }

    private var previewBody: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            Text(localization.t("zehAni.avatar3d.title"))
                .font(.system(size: TVDesignTokens.FontSize.hero, weight: .bold))
                .foregroundColor(.white)

            if let modelData = sceneData {
                AvatarSceneView(glbData: modelData)
                    .frame(width: 640, height: 640)
                    .clipShape(RoundedRectangle(cornerRadius: 24))
            }

            HStack(spacing: TVDesignTokens.Spacing.xl) {
                Button(localization.t("zehAni.avatar3d.resetCamera")) {
                    logger.info("Camera reset requested")
                }
                .buttonStyle(.card)
                .tvFocusStyle()
                .focused($resetFocused)

                Button(localization.t("common.close")) {
                    onClose?()
                }
                .buttonStyle(.card)
                .tvFocusStyle()
                .focused($closeFocused)
            }
        }
        .padding(TVDesignTokens.Spacing.xl)
    }

    private var errorBody: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            Text(localization.t("zehAni.avatar3d.errorTitle"))
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                .foregroundColor(.white)
            if let errorMsg = error {
                Text(errorMsg)
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundColor(.white.opacity(0.6))
                    .multilineTextAlignment(.center)
            }
            Button(localization.t("common.retry")) {
                loadGlbModel()
            }
            .buttonStyle(.card)
            .tvFocusStyle()
        }
    }

    private func loadGlbModel() {
        phase = .loading
        error = nil
        Task {
            do {
                let glbUrl = try await repos.avatarMeshRepository.fetchGlbUrl(avatarId: avatarId)
                guard let url = URL(string: glbUrl.signedUrl) else {
                    throw URLError(.badURL)
                }
                let (data, _) = try await URLSession.shared.data(from: url)
                await MainActor.run {
                    sceneData = data
                    phase = .ready
                }
                logger.info("Loaded GLB model for avatar \(avatarId)")
            } catch {
                await MainActor.run {
                    self.error = error.localizedDescription
                    phase = .error
                }
                logger.error("Failed to load GLB model: \(error)")
            }
        }
    }
}

private struct AvatarSceneView: UIViewRepresentable {
    let glbData: Data

    func makeUIView(context: Context) -> SCNView {
        let scnView = SCNView()
        scnView.backgroundColor = .black
        scnView.allowsCameraControl = true
        scnView.autoenablesDefaultLighting = false
        scnView.antialiasingMode = .multisampling4X

        let scene = SCNScene()
        configureCamera(scene: scene)
        configureLighting(scene: scene)
        scnView.scene = scene
        loadModel(into: scene)
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

        let key = SCNNode()
        key.light = SCNLight()
        key.light?.type = .directional
        key.light?.intensity = 800
        key.light?.castsShadow = true
        key.position = SCNVector3(x: 2, y: 4, z: 3)
        key.look(at: SCNVector3(0, 0, 0))
        scene.rootNode.addChildNode(key)
    }

    private func loadModel(into scene: SCNScene) {
        let tempDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("bayit-tvglb-\(UUID().uuidString)")
        try? FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
        let tempURL = tempDir.appendingPathComponent("avatar.glb")
        do {
            try glbData.write(to: tempURL)
            let asset = MDLAsset(url: tempURL)
            asset.loadTextures()
            let loadedScene = SCNScene(mdlAsset: asset)
            for child in loadedScene.rootNode.childNodes {
                scene.rootNode.addChildNode(child)
            }
        } catch {
            return
        }
    }
}
#endif
