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

    enum PromptPhase { case reading, awaiting, holding }

    var phase: CapturePhase = .waiting
    var currentPromptKey: String = "zehAni.arCapture.holdStill"
    var expressionDetected = false
    var captureResult: FaceCaptureResult?

    private var arSession: ARSession?
    var neutralVertices: [SIMD3<Float>]?
    var triangleIndices: [UInt32]?
    var textureCoordinates: [SIMD2<Float>]?
    var collectedDeltas: [[SIMD3<Float>]] = []
    var collectedNames: [String] = []
    var capturedTexture: Data?
    var stabilityFrameCount = 0
    var currentPromptPhase: PromptPhase = .reading
    var promptPhaseStartTime: Date?
    var expressionHeldFrames = 0
    let logger = BayitLogger(category: "ARFaceCapture")
    let ciContext = CIContext()

    let requiredStabilityFrames = 15
    let promptReadDelay: TimeInterval = 1.5
    let expressionThreshold: Float = 0.35
    let requiredHoldFrames = 20
    let neutralHoldDuration: TimeInterval = 1.0
    let maxPromptWaitDuration: TimeInterval = 10.0

    let promptSequence: [(key: String, blendShape: String?)] = [
        ("zehAni.arCapture.holdStill", nil),
        ("zehAni.arCapture.smile", "mouthSmile_L"),
        ("zehAni.arCapture.openMouth", "jawOpen"),
        ("zehAni.arCapture.raiseBrows", "browInnerUp"),
    ]
    var promptIndex = 0

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
}
