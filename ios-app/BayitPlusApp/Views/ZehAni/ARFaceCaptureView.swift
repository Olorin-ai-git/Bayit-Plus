import ARKit
import BayitCore
import BayitDesignSystem
import BayitLocalization
import SceneKit
import SwiftUI

struct ARFaceCaptureView: View {
    @Environment(LocalizationManager.self) private var localization

    let onCaptureComplete: (Data) -> Void
    let onCancel: () -> Void

    @State private var captureSession = ARFaceCaptureSession()
    @State private var isBuilding = false

    private let logger = BayitLogger(category: "ARFaceCaptureView")

    var body: some View {
        ZStack {
            ARFaceSceneView(session: captureSession)

            VStack {
                Spacer()
                promptOverlay
                progressBar
                cancelButton
            }
            .padding(.bottom, DesignTokens.Spacing.xl)

            if isBuilding {
                buildingOverlay
            }
        }
        .onDisappear {
            captureSession.stopSession()
            captureSession.clearBiometricData()
        }
        .onChange(of: captureSession.phase) { _, newPhase in
            if case .complete = newPhase {
                buildGLB()
            }
        }
    }

    private var promptOverlay: some View {
        Text(localization.t(captureSession.currentPromptKey))
            .id(captureSession.currentPromptKey)
            .font(.system(size: DesignTokens.FontSize.lg, weight: .semibold))
            .foregroundStyle(DesignTokens.Text.primary)
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .padding(.vertical, DesignTokens.Spacing.sm)
            .background(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .fill(captureSession.expressionDetected
                        ? DesignTokens.Primary.p400.opacity(0.85)
                        : DesignTokens.Glass.bg.opacity(0.85))
            )
            .padding(.bottom, DesignTokens.Spacing.md)
            .transition(.opacity.combined(with: .scale))
            .animation(.easeInOut(duration: 0.3), value: captureSession.currentPromptKey)
            .animation(.easeInOut(duration: 0.2), value: captureSession.expressionDetected)
    }

    @ViewBuilder
    private var progressBar: some View {
        switch captureSession.phase {
        case .capturing(let progress):
            ProgressView(value: progress)
                .progressViewStyle(.linear)
                .tint(DesignTokens.Primary.p400)
                .padding(.horizontal, DesignTokens.Spacing.xxl)
                .padding(.bottom, DesignTokens.Spacing.md)

        case .waiting, .detected:
            ProgressView()
                .progressViewStyle(.circular)
                .tint(DesignTokens.Primary.p400)
                .padding(.bottom, DesignTokens.Spacing.md)

        case .failed(let errorKey):
            VStack(spacing: DesignTokens.Spacing.sm) {
                Text(localization.t(errorKey))
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.ErrorColor.default)
                GlassButton(localization.t("common.retry"), variant: .secondary, size: .medium) {
                    captureSession.startSession()
                }
            }
            .padding(.bottom, DesignTokens.Spacing.md)

        default:
            EmptyView()
        }
    }

    private var cancelButton: some View {
        GlassButton(localization.t("common.cancel"), variant: .ghost, size: .medium) {
            captureSession.stopSession()
            onCancel()
        }
    }

    private var buildingOverlay: some View {
        ZStack {
            DesignTokens.Glass.bg.opacity(0.7).ignoresSafeArea()
            VStack(spacing: DesignTokens.Spacing.md) {
                ProgressView()
                    .progressViewStyle(.circular)
                    .tint(DesignTokens.Primary.p400)
                    .scaleEffect(1.5)
                Text(localization.t("zehAni.arCapture.processing"))
                    .font(.system(size: DesignTokens.FontSize.md, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.primary)
            }
        }
    }

    private func buildGLB() {
        guard let result = captureSession.captureResult else { return }
        isBuilding = true

        Task.detached(priority: .userInitiated) {
            let glbData = GLBBuilder.build(from: result)
            await MainActor.run {
                captureSession.clearBiometricData()
                isBuilding = false
                if let glbData {
                    onCaptureComplete(glbData)
                } else {
                    logger.error("GLB build failed from capture result")
                }
            }
        }
    }
}

// MARK: - ARSCNView Representable

private struct ARFaceSceneView: UIViewRepresentable {
    let session: ARFaceCaptureSession

    func makeUIView(context: Context) -> ARSCNView {
        let sceneView = ARSCNView()
        sceneView.automaticallyUpdatesLighting = true
        sceneView.scene = SCNScene()
        sceneView.delegate = context.coordinator
        session.startSession(using: sceneView.session)
        return sceneView
    }

    func updateUIView(_ sceneView: ARSCNView, context: Context) {
        context.coordinator.captureSession = session
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(session: session)
    }

    final class Coordinator: NSObject, ARSCNViewDelegate {
        var captureSession: ARFaceCaptureSession

        init(session: ARFaceCaptureSession) {
            self.captureSession = session
        }

        func renderer(
            _ renderer: SCNSceneRenderer,
            nodeFor anchor: ARAnchor
        ) -> SCNNode? {
            guard anchor is ARFaceAnchor,
                  let device = renderer.device else { return nil }

            let faceGeometry = ARSCNFaceGeometry(device: device)
            let node = SCNNode(geometry: faceGeometry)
            node.geometry?.firstMaterial?.fillMode = .lines
            node.geometry?.firstMaterial?.diffuse.contents = UIColor.cyan.withAlphaComponent(0.6)
            return node
        }

        func renderer(
            _ renderer: SCNSceneRenderer,
            didUpdate node: SCNNode,
            for anchor: ARAnchor
        ) {
            guard let faceAnchor = anchor as? ARFaceAnchor,
                  let faceGeometry = node.geometry as? ARSCNFaceGeometry else {
                return
            }
            faceGeometry.update(from: faceAnchor.geometry)
        }
    }
}
