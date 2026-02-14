import ARKit
import BayitCore
import Foundation
import Observation
import UIKit

struct FaceCaptureResult: Sendable {
    let vertices: [SIMD3<Float>]
    let triangleIndices: [UInt32]
    let textureCoordinates: [SIMD2<Float>]
    let morphTargetDeltas: [[SIMD3<Float>]]
    let morphTargetNames: [String]
    let faceTexture: Data?
}

@Observable
final class ARFaceCaptureSession: NSObject, @preconcurrency ARSessionDelegate {

    enum CapturePhase: Equatable, Sendable {
        case waiting
        case detected
        case capturing(progress: Float)
        case complete
        case failed(String)
        case unsupported
    }

    private(set) var phase: CapturePhase = .waiting
    private(set) var currentPromptKey: String = "zehAni.arCapture.holdStill"
    private(set) var captureResult: FaceCaptureResult?

    private var arSession: ARSession?
    private var neutralVertices: [SIMD3<Float>]?
    private var triangleIndices: [UInt32]?
    private var textureCoordinates: [SIMD2<Float>]?
    private var collectedDeltas: [[SIMD3<Float>]] = []
    private var collectedNames: [String] = []
    private var capturedTexture: Data?
    private var stabilityFrameCount = 0
    private var captureStartTime: Date?
    private let logger = BayitLogger(category: "ARFaceCapture")

    private let requiredStabilityFrames = 15
    private let captureDurationSeconds: TimeInterval = 3.0

    private let promptSequence: [(key: String, blendShape: String?)] = [
        ("zehAni.arCapture.holdStill", nil),
        ("zehAni.arCapture.smile", "mouthSmile_L"),
        ("zehAni.arCapture.openMouth", "jawOpen"),
        ("zehAni.arCapture.raiseBrows", "browInnerUp"),
    ]
    private var promptIndex = 0

    func startSession() {
        guard ARFaceTrackingConfiguration.isSupported else {
            phase = .unsupported
            return
        }

        let session = ARSession()
        session.delegate = self
        let config = ARFaceTrackingConfiguration()
        config.maximumNumberOfTrackedFaces = 1
        config.isWorldTrackingEnabled = false
        session.run(config, options: [.resetTracking, .removeExistingAnchors])
        arSession = session
        phase = .waiting
        logger.info("ARKit face tracking session started")
    }

    func stopSession() {
        arSession?.pause()
        arSession = nil
    }

    private func captureNeutralGeometry(from anchor: ARFaceAnchor) {
        let geometry = anchor.geometry
        neutralVertices = (0..<geometry.vertices.count).map { geometry.vertices[$0] }
        triangleIndices = (0..<geometry.triangleCount).flatMap { i in
            let base = i * 3
            return [
                UInt32(geometry.triangleIndices[base]),
                UInt32(geometry.triangleIndices[base + 1]),
                UInt32(geometry.triangleIndices[base + 2]),
            ]
        }
        textureCoordinates = (0..<geometry.textureCoordinates.count).map {
            geometry.textureCoordinates[$0]
        }
    }

    private func collectMorphTargetDeltas(from anchor: ARFaceAnchor) {
        guard let neutral = neutralVertices else { return }
        let geometry = anchor.geometry
        let currentVerts = (0..<geometry.vertices.count).map { geometry.vertices[$0] }

        let deltas = zip(currentVerts, neutral).map { current, base in
            SIMD3<Float>(
                current.x - base.x,
                current.y - base.y,
                current.z - base.z
            )
        }

        let dominantBlendShape = anchor.blendShapeLocation(
            for: currentPromptBlendShape()
        )
        let hasMeaningfulDelta = deltas.contains { simd_length($0) > 0.0005 }

        if dominantBlendShape > 0.3 || hasMeaningfulDelta {
            let blendShapeEntries = Array(anchor.blendShapes.keys)
            for location in blendShapeEntries {
                let weight = anchor.blendShapes[location]?.floatValue ?? 0.0
                if weight > 0.1 {
                    let name = location.rawValue
                    if !collectedNames.contains(name) {
                        let morphDelta = zip(currentVerts, neutral).map { c, b in
                            SIMD3<Float>(c.x - b.x, c.y - b.y, c.z - b.z)
                        }
                        collectedNames.append(name)
                        collectedDeltas.append(morphDelta)
                    }
                }
            }
        }
    }

    private func currentPromptBlendShape() -> ARFaceAnchor.BlendShapeLocation {
        guard promptIndex < promptSequence.count,
              let key = promptSequence[promptIndex].blendShape else {
            return .jawOpen
        }
        return ARFaceAnchor.BlendShapeLocation(rawValue: key)
    }

    private func advancePrompt() {
        promptIndex += 1
        if promptIndex < promptSequence.count {
            currentPromptKey = promptSequence[promptIndex].key
        }
    }

    private func captureTextureFromFrame(_ frame: ARFrame) {
        guard capturedTexture == nil else { return }
        let pixelBuffer = frame.capturedImage
        let ciImage = CIImage(cvPixelBuffer: pixelBuffer)
        let context = CIContext()
        guard let cgImage = context.createCGImage(ciImage, from: ciImage.extent) else {
            return
        }
        let uiImage = UIImage(cgImage: cgImage)
        capturedTexture = uiImage.pngData()
    }

    private func completeFaceCapture() {
        guard let verts = neutralVertices,
              let indices = triangleIndices,
              let uvs = textureCoordinates else {
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

// MARK: - ARSessionDelegate

extension ARFaceCaptureSession {

    func session(_ session: ARSession, didUpdate anchors: [ARAnchor]) {
        guard let faceAnchor = anchors.compactMap({ $0 as? ARFaceAnchor }).first else {
            return
        }

        switch phase {
        case .waiting:
            stabilityFrameCount += 1
            if stabilityFrameCount >= requiredStabilityFrames {
                captureNeutralGeometry(from: faceAnchor)
                phase = .detected
                captureStartTime = Date()
                logger.info("Face detected and stabilized")
            }

        case .detected:
            phase = .capturing(progress: 0)
            currentPromptKey = promptSequence[0].key
            captureStartTime = Date()

        case .capturing:
            guard let startTime = captureStartTime else { return }
            let elapsed = Date().timeIntervalSince(startTime)
            let progress = Float(min(elapsed / captureDurationSeconds, 1.0))
            phase = .capturing(progress: progress)

            let promptDuration = captureDurationSeconds / Double(promptSequence.count)
            let expectedPromptIndex = min(
                Int(elapsed / promptDuration),
                promptSequence.count - 1
            )
            if expectedPromptIndex > promptIndex {
                advancePrompt()
            }

            collectMorphTargetDeltas(from: faceAnchor)

            if let frame = session.currentFrame {
                captureTextureFromFrame(frame)
            }

            if elapsed >= captureDurationSeconds {
                stopSession()
                completeFaceCapture()
            }

        case .complete, .failed, .unsupported:
            break
        }
    }

    func session(_ session: ARSession, didFailWithError error: Error) {
        logger.error("ARSession failed", error: error)
        phase = .failed("zehAni.arCapture.noFace")
    }
}

private extension ARFaceAnchor {
    func blendShapeLocation(
        for location: ARFaceAnchor.BlendShapeLocation
    ) -> Float {
        blendShapes[location]?.floatValue ?? 0.0
    }
}

// MARK: - Simulator Synthetic Data

#if targetEnvironment(simulator)
extension ARFaceCaptureSession {

    static func syntheticResult() -> FaceCaptureResult {
        let rows = 10
        let cols = 10
        let halfWidth: Float = 0.075
        let halfHeight: Float = 0.10

        var vertices: [SIMD3<Float>] = []
        var uvs: [SIMD2<Float>] = []

        for r in 0..<rows {
            let v = Float(r) / Float(rows - 1)
            let y = halfHeight - v * 2 * halfHeight
            for c in 0..<cols {
                let u = Float(c) / Float(cols - 1)
                let x = -halfWidth + u * 2 * halfWidth
                let nx = x / halfWidth
                let ny = y / halfHeight
                let z: Float = max(0, 0.03 * (1.0 - nx * nx - ny * ny))
                vertices.append(SIMD3<Float>(x, y, z))
                uvs.append(SIMD2<Float>(u, v))
            }
        }

        var indices: [UInt32] = []
        for r in 0..<(rows - 1) {
            for c in 0..<(cols - 1) {
                let tl = UInt32(r * cols + c)
                let tr = tl + 1
                let bl = tl + UInt32(cols)
                let br = bl + 1
                indices.append(contentsOf: [tl, bl, tr, tr, bl, br])
            }
        }

        let count = vertices.count
        let morphs = buildSyntheticMorphTargets(
            rows: rows, cols: cols, vertexCount: count
        )

        return FaceCaptureResult(
            vertices: vertices,
            triangleIndices: indices,
            textureCoordinates: uvs,
            morphTargetDeltas: morphs.deltas,
            morphTargetNames: morphs.names,
            faceTexture: nil
        )
    }

    private static func buildSyntheticMorphTargets(
        rows: Int, cols: Int, vertexCount: Int
    ) -> (deltas: [[SIMD3<Float>]], names: [String]) {
        var jawOpen = [SIMD3<Float>](repeating: .zero, count: vertexCount)
        for r in (rows - 3)..<rows {
            for c in 0..<cols {
                let strength = Float(r - (rows - 3) + 1) / 3.0
                jawOpen[r * cols + c] = SIMD3<Float>(0, -0.02 * strength, 0)
            }
        }

        var smile = [SIMD3<Float>](repeating: .zero, count: vertexCount)
        for r in (rows / 2 - 1)...(rows / 2 + 1) {
            for c in 0..<cols {
                let laterality = abs(Float(c) / Float(cols - 1) - 0.5) * 2.0
                smile[r * cols + c] = SIMD3<Float>(
                    0, 0.01 * laterality, 0.005 * laterality
                )
            }
        }

        var browUp = [SIMD3<Float>](repeating: .zero, count: vertexCount)
        for r in 0..<2 {
            for c in 0..<cols {
                let strength = Float(2 - r) / 2.0
                browUp[r * cols + c] = SIMD3<Float>(0, 0.01 * strength, 0)
            }
        }

        return (
            deltas: [jawOpen, smile, browUp],
            names: ["jawOpen", "mouthSmile_L", "browInnerUp"]
        )
    }
}
#endif
