import ARKit
import Foundation

// MARK: - Prompt State Machine

extension ARFaceCaptureSession {
    func updateCaptureProgress() {
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

    func beginNextPrompt() {
        currentPromptPhase = .reading
        promptPhaseStartTime = Date()
        expressionDetected = false
        expressionHeldFrames = 0
    }

    func finishCurrentPrompt(session: ARSession) {
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

    func handleCapturing(
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

    func session(_: ARSession, didFailWithError error: Error) {
        logger.error("ARSession failed", error: error)
        phase = .failed("zehAni.arCapture.noFace")
    }
}
