import ARKit
import Foundation
import UIKit

// MARK: - Geometry Capture

extension ARFaceCaptureSession {
    func captureNeutralGeometry(from anchor: ARFaceAnchor) {
        let geometry = anchor.geometry
        neutralVertices = (0 ..< geometry.vertices.count).map { geometry.vertices[$0] }
        triangleIndices = (0 ..< geometry.triangleCount).flatMap { i in
            let base = i * 3
            return [
                UInt32(geometry.triangleIndices[base]),
                UInt32(geometry.triangleIndices[base + 1]),
                UInt32(geometry.triangleIndices[base + 2]),
            ]
        }
        textureCoordinates = (0 ..< geometry.textureCoordinates.count).map {
            geometry.textureCoordinates[$0]
        }
    }

    func collectMorphTargetDeltas(from anchor: ARFaceAnchor) {
        guard let neutral = neutralVertices else { return }
        let geometry = anchor.geometry
        let currentVerts = (0 ..< geometry.vertices.count).map { geometry.vertices[$0] }

        for (location, weight) in anchor.blendShapes {
            let value = weight.floatValue
            guard value > 0.1 else { continue }
            let name = location.rawValue
            guard !collectedNames.contains(name) else { continue }
            let morphDelta = zip(currentVerts, neutral).map { c, b in
                SIMD3<Float>(c.x - b.x, c.y - b.y, c.z - b.z)
            }
            collectedNames.append(name)
            collectedDeltas.append(morphDelta)
        }
    }

    func captureTextureFromFrame(_ frame: ARFrame) {
        guard capturedTexture == nil else { return }
        let pixelBuffer = frame.capturedImage
        let ciImage = CIImage(cvPixelBuffer: pixelBuffer)
        guard let cgImage = ciContext.createCGImage(ciImage, from: ciImage.extent) else {
            return
        }
        let uiImage = UIImage(cgImage: cgImage)
        capturedTexture = uiImage.pngData()
    }

    func completeFaceCapture() {
        guard let verts = neutralVertices,
              let indices = triangleIndices,
              let uvs = textureCoordinates
        else {
            phase = .failed("zehAni.arCapture.noFace")
            return
        }

        captureResult = FaceCaptureResult(
            vertices: verts,
            triangleIndices: indices,
            textureCoordinates: uvs,
            morphTargetDeltas: collectedDeltas,
            morphTargetNames: collectedNames,
            faceTexture: capturedTexture
        )
        phase = .complete
        currentPromptKey = "zehAni.arCapture.complete"
        logger.info(
            "Face capture complete: \(verts.count) vertices, "
                + "\(collectedNames.count) morph targets"
        )
    }
}
