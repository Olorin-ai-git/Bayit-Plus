import BayitDesignSystem
import BayitLocalization
import SceneKit
import SwiftUI

struct LiveAvatarOverlayView: View {
    @Environment(LocalizationManager.self) private var localization
    @Environment(RepositoryProvider.self) private var repos

    let avatarId: String
    let contentId: String

    @State private var sceneView: SCNView?
    @State private var avatarNode: SCNNode?
    @State private var blendShapeWeights: [String: Float] = [:]
    @State private var isLoading = true
    @State private var error: String?

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            if isLoading {
                ProgressView()
                    .tint(.white)
            } else if let error = error {
                Text(error)
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.ErrorColor.default)
                    .padding(DesignTokens.Spacing.sm)
            } else {
                avatarOverlay
            }
        }
        .onAppear {
            loadAvatarMesh()
        }
    }

    @ViewBuilder
    private var avatarOverlay: some View {
        SceneKitViewWrapper(
            scene: createScene(),
            onUpdate: { view in
                self.sceneView = view
                applyBlendShapes()
            }
        )
        .frame(width: 160, height: 160)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .stroke(DesignTokens.Glass.border, lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.3), radius: DesignTokens.Spacing.sm, x: 0, y: 4)
        .padding(DesignTokens.Spacing.base)
    }

    private func createScene() -> SCNScene {
        let scene = SCNScene()

        let cameraNode = SCNNode()
        cameraNode.camera = SCNCamera()
        cameraNode.position = SCNVector3(x: 0, y: 0, z: 50)
        scene.rootNode.addChildNode(cameraNode)

        let lightNode = SCNNode()
        lightNode.light = SCNLight()
        lightNode.light?.type = .omni
        lightNode.position = SCNVector3(x: 0, y: 10, z: 50)
        scene.rootNode.addChildNode(lightNode)

        let ambientLightNode = SCNNode()
        ambientLightNode.light = SCNLight()
        ambientLightNode.light?.type = .ambient
        ambientLightNode.light?.color = UIColor.white.withAlphaComponent(0.3)
        scene.rootNode.addChildNode(ambientLightNode)

        return scene
    }

    private func loadAvatarMesh() {
        Task {
            do {
                let meshURL = try await fetchMeshURL()
                let node = try await loadGLBNode(from: meshURL)
                await MainActor.run {
                    avatarNode = node
                    sceneView?.scene?.rootNode.addChildNode(node)
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

    private func fetchMeshURL() async throws -> URL {
        let response = try await repos.avatarMeshRepository.getMeshGlbUrl(avatarId: avatarId)
        guard let meshURL = URL(string: response.signedUrl) else {
            throw URLError(.badURL)
        }
        return meshURL
    }

    private func loadGLBNode(from url: URL) async throws -> SCNNode {
        let (data, _) = try await URLSession.shared.data(from: url)
        let tempURL = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString + ".glb")
        try data.write(to: tempURL, options: [.completeFileProtection])
        defer { try? FileManager.default.removeItem(at: tempURL) }
        let scene = try SCNScene(url: tempURL, options: nil)
        return scene.rootNode.childNodes.first ?? SCNNode()
    }

    private func applyBlendShapes() {
        guard let node = avatarNode else { return }
        for (key, weight) in blendShapeWeights {
            if let morpher = node.morpher,
               let index = morpher.targets.firstIndex(where: { $0.name == key }) {
                morpher.setWeight(CGFloat(weight), forTargetAt: index)
            }
        }
    }

    func updateBlendShapes(_ weights: [String: Float]) {
        blendShapeWeights = weights
        applyBlendShapes()
    }
}

struct SceneKitViewWrapper: UIViewRepresentable {
    let scene: SCNScene
    let onUpdate: (SCNView) -> Void

    func makeUIView(context: Context) -> SCNView {
        let view = SCNView()
        view.scene = scene
        view.autoenablesDefaultLighting = false
        view.backgroundColor = .clear
        view.allowsCameraControl = false
        onUpdate(view)
        return view
    }

    func updateUIView(_ uiView: SCNView, context: Context) {
        onUpdate(uiView)
    }
}
