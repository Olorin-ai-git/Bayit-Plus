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

@MainActor
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

    private enum PromptPhase { case reading, awaiting, holding }

    private(set) var phase: CapturePhase = .waiting
    private(set) var currentPromptKey: String = "zehAni.arCapture.holdStill"
    private(set) var expressionDetected = false
    private(set) var captureResult: FaceCaptureResult?

    private var arSession: ARSession?
    private var neutralVertices: [SIMD3<Float>]?
    private var triangleIndices: [UInt32]?
    private var textureCoordinates: [SIMD2<Float>]?
    private var collectedDeltas: [[SIMD3<Float>]] = []
    private var collectedNames: [String] = []
    private var capturedTexture: Data?
    private var stabilityFrameCount = 0
    private var currentPromptPhase: PromptPhase = .reading
    private var promptPhaseStartTime: Date?
    private var expressionHeldFrames = 0
    private let logger = BayitLogger(category: "ARFaceCapture")

    private let requiredStabilityFrames = 15
    private let promptReadDelay: TimeInterval = 1.5
    private let expressionThreshold: Float = 0.35
    private let requiredHoldFrames = 20
    private let neutralHoldDuration: TimeInterval = 1.0
    private let maxPromptWaitDuration: TimeInterval = 10.0

    private let promptSequence: [(key: String, blendShape: String?)] = [
        ("zehAni.arCapture.holdStill", nil),
        ("zehAni.arCapture.smile", "mouthSmile_L"),
        ("zehAni.arCapture.openMouth", "jawOpen"),
        ("zehAni.arCapture.raiseBrows", "browInnerUp"),
    ]
    private var promptIndex = 0

    func startSession(using existingSession: ARSession? = nil) {
        guard ARFaceTrackingConfiguration.isSupported else {
            phase = .unsupported
            return
        }

        clearBiometricData()
        let session = existingSession ?? arSession ?? ARSession()
        session.delegate = self
        let config = ARFaceTrackingConfiguration()
        config.maximumNumberOfTrackedFaces = 1
        config.isWorldTrackingEnabled = false
        session.run(config, options: [.resetTracking, .removeExistingAnchors])
        arSession = session
        phase = .waiting
        currentPromptKey = promptSequence[0].key
        logger.info("ARKit face tracking session started")
    }

    func stopSession() {
        arSession?.pause()
        arSession = nil
    }

    func clearBiometricData() {
        captureResult = nil
        capturedTexture = nil
        neutralVertices = nil
        triangleIndices = nil
        textureCoordinates = nil
        collectedDeltas.removeAll()
        collectedNames.removeAll()
        stabilityFrameCount = 0
        promptIndex = 0
        currentPromptPhase = .reading
        promptPhaseStartTime = nil
        expressionHeldFrames = 0
        expressionDetected = false
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

    // MARK: - Prompt State Machine

    private func updateCaptureProgress() {
        let promptFraction: Float
        switch currentPromptPhase {
        case .reading: promptFraction = 0.0
        case .awaiting: promptFraction = 0.3
        case .holding:
            let holdProgress = min(Float(expressionHeldFrames) / Float(requiredHoldFrames), 1.0)
            promptFraction = 0.3 + 0.7 * holdProgress
        }
        let overall = (Float(promptIndex) + promptFraction) / Float(promptSequence.count)
        phase = .capturing(progress: overall)
    }

    private func beginNextPrompt() {
        currentPromptPhase = .reading
        promptPhaseStartTime = Date()
        expressionDetected = false
        expressionHeldFrames = 0
    }

    private func finishCurrentPrompt(session: ARSession) {
        promptIndex += 1
        if promptIndex < promptSequence.count {
            currentPromptKey = promptSequence[promptIndex].key
            beginNextPrompt()
        } else {
            if let frame = session.currentFrame {
                captureTextureFromFrame(frame)
            }
            stopSession()
            completeFaceCapture()
        }
    }

    private func handleCapturing(
        faceAnchor: ARFaceAnchor, session: ARSession
    ) {
        if promptPhaseStartTime == nil { beginNextPrompt() }
        guard let phaseStart = promptPhaseStartTime else { return }
        let elapsed = Date().timeIntervalSince(phaseStart)
        updateCaptureProgress()

        switch currentPromptPhase {
        case .reading:
            if elapsed >= promptReadDelay {
                currentPromptPhase = .awaiting
                promptPhaseStartTime = Date()
            }

        case .awaiting:
            let target = promptSequence[promptIndex]
            if target.blendShape == nil {
                if let frame = session.currentFrame {
                    captureTextureFromFrame(frame)
                }
                if elapsed >= neutralHoldDuration {
                    finishCurrentPrompt(session: session)
                }
            } else if let blendShapeKey = target.blendShape {
                let location = ARFaceAnchor.BlendShapeLocation(
                    rawValue: blendShapeKey
                )
                let value = faceAnchor.blendShapes[location]?.floatValue ?? 0
                if value > expressionThreshold {
                    expressionDetected = true
                    currentPromptPhase = .holding
                    promptPhaseStartTime = Date()
                    expressionHeldFrames = 0
                } else if elapsed >= maxPromptWaitDuration {
                    collectMorphTargetDeltas(from: faceAnchor)
                    finishCurrentPrompt(session: session)
                }
            }

        case .holding:
            guard let blendShapeKey = promptSequence[promptIndex].blendShape else {
                finishCurrentPrompt(session: session)
                return
            }
            let location = ARFaceAnchor.BlendShapeLocation(rawValue: blendShapeKey)
            let value = faceAnchor.blendShapes[location]?.floatValue ?? 0
            if value > expressionThreshold {
                expressionHeldFrames += 1
                if expressionHeldFrames >= requiredHoldFrames {
                    collectMorphTargetDeltas(from: faceAnchor)
                    finishCurrentPrompt(session: session)
                }
            } else {
                expressionDetected = false
                expressionHeldFrames = 0
                currentPromptPhase = .awaiting
                promptPhaseStartTime = Date()
            }
        }
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
                logger.info("Face detected and stabilized")
            }

        case .detected:
            phase = .capturing(progress: 0)
            currentPromptKey = promptSequence[0].key
            beginNextPrompt()

        case .capturing:
            handleCapturing(faceAnchor: faceAnchor, session: session)

        case .complete, .failed, .unsupported:
            break
        }
    }

    func session(_ session: ARSession, didFailWithError error: Error) {
        logger.error("ARSession failed", error: error)
        phase = .failed("zehAni.arCapture.noFace")
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
