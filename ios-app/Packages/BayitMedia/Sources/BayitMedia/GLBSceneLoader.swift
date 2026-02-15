import Foundation
import GLTFKit2
import SceneKit

public enum GLBSceneLoader {

    public static func loadScene(from data: Data) throws -> SCNScene {
        let tempDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("bayit-glb-\(UUID().uuidString)")
        try FileManager.default.createDirectory(
            at: tempDir, withIntermediateDirectories: true
        )
        let tempURL = tempDir.appendingPathComponent("model.glb")
        try data.write(to: tempURL)
        NSLog("BAYIT_GLB dataSize=\(data.count) tempURL=\(tempURL.path)")
        let asset = try GLTFAsset(url: tempURL)
        NSLog("BAYIT_GLB asset meshes=\(asset.meshes.count) nodes=\(asset.nodes.count) scenes=\(asset.scenes.count)")
        let scene = SCNScene(gltfAsset: asset)
        NSLog("BAYIT_GLB scnChildren=\(scene.rootNode.childNodes.count)")
        func countNodes(_ node: SCNNode, depth: Int = 0) {
            let geo = node.geometry != nil ? "HAS_GEO" : "no_geo"
            NSLog("BAYIT_GLB   \(String(repeating: " ", count: depth))\(node.name ?? "unnamed") \(geo)")
            for child in node.childNodes { countNodes(child, depth: depth + 1) }
        }
        countNodes(scene.rootNode)
        return scene
    }

    public static func loadNode(from data: Data) throws -> SCNNode? {
        let scene = try loadScene(from: data)
        return scene.rootNode.childNodes.first
    }
}
