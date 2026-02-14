import BayitDesignSystem
import BayitLocalization
import ModelIO
import SceneKit
import SceneKit.ModelIO
import SwiftUI

struct Avatar3DPreviewView: View {
    @Environment(RepositoryProvider.self) private var repositories
    @Environment(LocalizationManager.self) private var localization
    @Environment(\.dismiss) private var dismiss

    let avatarId: String

    @State private var loadingState: LoadingState = .loading
    @State private var glbData: Data?
    @State private var error: String?

    enum LoadingState {
        case loading
        case ready
        case failed
    }

    var body: some View {
        NavigationStack {
            ZStack {
                DesignTokens.Background.primary.ignoresSafeArea()

                VStack {
                    ZehAniBreadcrumb(currentLabel: "3D Avatar")
                    Spacer()
                }
                .zIndex(1)

                switch loadingState {
                case .loading:
                    loadingView
                case .ready:
                    if let glbData = glbData {
                        SceneKitView(glbData: glbData)
                            .edgesIgnoringSafeArea(.all)
                    }
                case .failed:
                    errorView
                }
            }
            .navigationTitle(localization.t("zehAni.preview.title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(localization.t("common.close")) {
                        dismiss()
                    }
                }
            }
            .task {
                await loadGlb()
            }
        }
    }

    private var loadingView: some View {
        VStack(spacing: DesignTokens.Spacing.base) {
            ProgressView()
                .progressViewStyle(.circular)
                .scaleEffect(1.5)
                .tint(.white)
            Text(localization.t("zehAni.preview.loading"))
                .foregroundStyle(DesignTokens.Text.muted)
                .font(.system(size: DesignTokens.FontSize.sm))
        }
    }

    private var errorView: some View {
        VStack(spacing: DesignTokens.Spacing.base) {
            Text(localization.t("zehAni.preview.error"))
                .foregroundStyle(DesignTokens.ErrorColor.default)
                .font(.system(size: DesignTokens.FontSize.base))
            if let error = error {
                Text(error)
                    .foregroundStyle(DesignTokens.Text.muted)
                    .font(.system(size: DesignTokens.FontSize.sm))
            }
            GlassButton(localization.t("common.retry"), variant: .secondary, size: .medium) {
                Task { await loadGlb() }
            }
        }
        .padding(DesignTokens.Spacing.xl)
    }

    private func loadGlb() async {
        loadingState = .loading
        do {
            let meshGlb = try await repositories.avatarMeshRepository.fetchGlbUrl(avatarId: avatarId)
            guard let url = URL(string: meshGlb.signedUrl) else {
                throw URLError(.badURL)
            }
            let (data, _) = try await URLSession.shared.data(from: url)
            await MainActor.run {
                glbData = data
                loadingState = .ready
            }
        } catch {
            await MainActor.run {
                self.error = error.localizedDescription
                loadingState = .failed
            }
        }
    }
}

struct SceneKitView: UIViewRepresentable {
    let glbData: Data

    func makeUIView(context: Context) -> SCNView {
        let scnView = SCNView()
        scnView.backgroundColor = UIColor(DesignTokens.Background.primary)
        scnView.allowsCameraControl = true
        scnView.autoenablesDefaultLighting = true
        scnView.antialiasingMode = .multisampling4X

        let scene = SCNScene()
        scnView.scene = scene

        if let loadedScene = loadGLB(from: glbData) {
            for child in loadedScene.rootNode.childNodes {
                scene.rootNode.addChildNode(child)
            }
            frameCameraToFit(scene: scene, in: scnView)
            setupLighting(in: scene)
        }

        return scnView
    }

    func updateUIView(_ uiView: SCNView, context: Context) {}

    private func loadGLB(from data: Data) -> SCNScene? {
        let tempDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("bayit-glb-\(UUID().uuidString)")
        try? FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
        let tempURL = tempDir.appendingPathComponent("avatar.glb")
        do {
            try data.write(to: tempURL)
            let asset = MDLAsset(url: tempURL)
            asset.loadTextures()
            let scene = SCNScene(mdlAsset: asset)
            return scene
        } catch {
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
