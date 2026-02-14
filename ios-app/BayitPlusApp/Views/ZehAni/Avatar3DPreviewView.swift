import BayitDesignSystem
import BayitLocalization
import SceneKit
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

        if let glbScene = loadGLB(from: glbData) {
            scene.rootNode.addChildNode(glbScene.rootNode)
            setupCamera(in: scene)
            setupLighting(in: scene)
        }

        return scnView
    }

    func updateUIView(_ uiView: SCNView, context: Context) {}

    private func loadGLB(from data: Data) -> SCNScene? {
        let tempURL = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString + ".glb")
        do {
            try data.write(to: tempURL, options: [.completeFileProtection])
            defer { try? FileManager.default.removeItem(at: tempURL) }
            return try SCNScene(url: tempURL, options: nil)
        } catch {
            try? FileManager.default.removeItem(at: tempURL)
            return nil
        }
    }

    private func setupCamera(in scene: SCNScene) {
        let cameraNode = SCNNode()
        cameraNode.camera = SCNCamera()
        cameraNode.position = SCNVector3(x: 0, y: 1.5, z: 3)
        cameraNode.look(at: SCNVector3(x: 0, y: 1, z: 0))
        scene.rootNode.addChildNode(cameraNode)
    }

    private func setupLighting(in scene: SCNScene) {
        let ambientLight = SCNNode()
        ambientLight.light = SCNLight()
        ambientLight.light?.type = .ambient
        ambientLight.light?.intensity = 500
        ambientLight.light?.color = UIColor.white
        scene.rootNode.addChildNode(ambientLight)

        let directionalLight = SCNNode()
        directionalLight.light = SCNLight()
        directionalLight.light?.type = .directional
        directionalLight.light?.intensity = 1000
        directionalLight.position = SCNVector3(x: 2, y: 3, z: 2)
        directionalLight.look(at: SCNVector3(x: 0, y: 1, z: 0))
        scene.rootNode.addChildNode(directionalLight)
    }
}
