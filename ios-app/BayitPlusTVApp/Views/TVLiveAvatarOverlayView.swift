import BayitDesignSystem
import BayitLocalization
import SceneKit
import SwiftUI

struct TVLiveAvatarOverlayView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization

    let avatarId: String
    let contentId: String

    @State private var scene: SCNScene?
    @State private var isLoading = true
    @State private var error: String?

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            if isLoading {
                ProgressView()
                    .tint(.white)
                    .frame(width: 280, height: 280)
            } else if let error {
                Text(error)
                    .foregroundColor(DesignTokens.Colors.Semantic.error)
                    .font(.system(size: 24))
                    .frame(width: 280, height: 280)
            } else if let scene {
                SceneView(
                    scene: scene,
                    options: [.autoenablesDefaultLighting]
                )
                .frame(width: 280, height: 280)
                .clipShape(RoundedRectangle(cornerRadius: 24))
                .overlay(
                    RoundedRectangle(cornerRadius: 24)
                        .stroke(.white.opacity(0.15), lineWidth: 2)
                )
                .shadow(color: .black.opacity(0.5), radius: 12, x: 0, y: 6)
            }
        }
        .padding(40)
        .onAppear { loadMesh() }
    }

    private func loadMesh() {
        Task {
            do {
                let glbUrl = try await repos.avatarMeshRepository.fetchGlbUrl(
                    avatarId: avatarId
                )
                guard let url = URL(string: glbUrl.signedUrl) else {
                    error = localization.t("zehAni.preview3d.error")
                    isLoading = false
                    return
                }

                let loadedScene = try SCNScene(url: url, options: [
                    .checkConsistency: true,
                ])

                let ambient = SCNLight()
                ambient.type = .ambient
                ambient.intensity = 800
                let ambientNode = SCNNode()
                ambientNode.light = ambient
                loadedScene.rootNode.addChildNode(ambientNode)

                let key = SCNLight()
                key.type = .directional
                key.intensity = 600
                let keyNode = SCNNode()
                keyNode.light = key
                keyNode.eulerAngles = SCNVector3(-Float.pi / 4, Float.pi / 6, 0)
                loadedScene.rootNode.addChildNode(keyNode)

                scene = loadedScene
                isLoading = false
            } catch {
                self.error = localization.t("zehAni.preview3d.error")
                isLoading = false
            }
        }
    }
}
