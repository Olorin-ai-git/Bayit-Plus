import BayitCore
import SwiftUI

private struct WalkthroughOverlayModifier: ViewModifier {
    let featureIds: Set<String>
    let localize: (String) -> String
    let isReady: Bool

    @State private var targetFrames: [String: CGRect] = [:]

    func body(content: Content) -> some View {
        content
            .onPreferenceChange(WalkthroughTargetPreferenceKey.self) { frames in
                targetFrames = frames
            }
            .overlay { overlayContent }
            .onDisappear {
                let manager = WalkthroughSessionManager.shared
                if let currentId = manager.currentFeatureId,
                   featureIds.contains(currentId)
                {
                    manager.end()
                }
            }
    }

    @MainActor
    @ViewBuilder
    private var overlayContent: some View {
        let manager = WalkthroughSessionManager.shared
        if let currentId = manager.currentFeatureId,
           featureIds.contains(currentId),
           let stateMachine = manager.stateMachine,
           stateMachine.isActive, isReady
        {
            let steps = buildVisibleSteps(stateMachine: stateMachine)
            if !steps.isEmpty {
                CoachMarkOverlay(
                    steps: steps,
                    currentStepIndex: stateMachine.displayStepIndex,
                    onNext: { stateMachine.advance() },
                    onSkip: { manager.end() },
                    onDone: {
                        stateMachine.complete()
                        manager.end()
                    }
                )
            }
        }
    }

    private func buildVisibleSteps(stateMachine: WalkthroughStateMachine) -> [CoachMarkOverlayStep] {
        stateMachine.feature.walkthroughSteps
            .filter { $0.expectedAction != .navigate }
            .map { step in
                let frame = targetFrames[step.targetAccessibilityId] ?? centeredFallbackFrame
                return CoachMarkOverlayStep(
                    instructionText: localize(step.instructionKey),
                    targetFrame: frame,
                    targetCornerRadius: DesignTokens.Radius.md
                )
            }
    }

    private var centeredFallbackFrame: CGRect {
        #if os(tvOS)
            let screenWidth: CGFloat = 1920
            let screenHeight: CGFloat = 1080
        #else
            let screenWidth = UIScreen.main.bounds.width
            let screenHeight = UIScreen.main.bounds.height
        #endif
        let size: CGFloat = 1
        return CGRect(
            x: screenWidth / 2,
            y: screenHeight / 2,
            width: size,
            height: size
        )
    }
}

public extension View {
    func walkthroughOverlay(
        featureId: String,
        localize: @escaping (String) -> String,
        isReady: Bool = true
    ) -> some View {
        modifier(WalkthroughOverlayModifier(
            featureIds: [featureId],
            localize: localize,
            isReady: isReady
        ))
    }

    func walkthroughOverlay(
        featureIds: Set<String>,
        localize: @escaping (String) -> String,
        isReady: Bool = true
    ) -> some View {
        modifier(WalkthroughOverlayModifier(
            featureIds: featureIds,
            localize: localize,
            isReady: isReady
        ))
    }
}
