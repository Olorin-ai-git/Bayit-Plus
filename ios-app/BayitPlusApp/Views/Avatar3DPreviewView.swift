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
        VStack(spacing: 16) {
            ProgressView()
                .progressViewStyle(.circular)
                .scaleEffect(1.5)
                .tint(.white)
            Text(localization.t("zehAni.preview.loading"))
                .foregroundColor(.white.opacity(0.7))
                .font(.system(size: 15))
        }
    }

    private var errorView: some View {
        VStack(spacing: 16) {
            Text(localization.t("zehAni.preview.error"))
                .foregroundColor(DesignTokens.Colors.Semantic.error)
                .font(.system(size: 16))
            if let error = error {
                Text(error)
                    .foregroundColor(.white.opacity(0.6))
                    .font(.system(size: 14))
            }
            Button {
                Task { await loadGlb() }
            } label: {
                Text(localization.t("common.retry"))
            }
            .buttonStyle(.bordered)
        }
        .padding(24)
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
        let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent("avatar.glb")
        do {
            try data.write(to: tempURL)
            let scene = try SCNScene(url: tempURL, options: nil)
            try? FileManager.default.removeItem(at: tempURL)
            return scene
        } catch {
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
