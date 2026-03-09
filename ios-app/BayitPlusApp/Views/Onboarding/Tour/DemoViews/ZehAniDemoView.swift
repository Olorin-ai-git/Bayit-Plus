import BayitDesignSystem
import BayitLocalization
import SwiftUI
#if canImport(AVFoundation)
    import AVFoundation
#endif

/// Zeh Ani demo: front camera feed with real-time cartoon overlay effect.
/// No data sent to backend, no credits consumed.
struct ZehAniDemoView: View {
    @Environment(LocalizationManager.self) var localization
    @State private var cameraReady = false

    var body: some View {
        VStack(spacing: 0) {
            headerSection
            cameraSection
            consentNote
        }
        .background(DesignTokens.Background.primary)
    }

    private var headerSection: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            Text(localization.t("onboarding.tour.zehAni.title"))
                .font(DesignTokens.Typography.title2)
                .foregroundStyle(DesignTokens.Colors.textPrimary)

            Text(localization.t("onboarding.tour.zehAni.tagline"))
                .font(DesignTokens.Typography.body)
                .foregroundStyle(DesignTokens.Colors.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(.top, DesignTokens.Spacing.xl)
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private var cameraSection: some View {
        ZStack {
            if cameraReady {
                CameraPreviewView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
                    .overlay(
                        RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                            .stroke(DesignTokens.Colors.accentPrimary, lineWidth: 2)
                    )
            } else {
                cameraPlaceholder
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.vertical, DesignTokens.Spacing.md)
        .onAppear { requestCameraAccess() }
    }

    private var cameraPlaceholder: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: "camera.fill")
                .font(.system(size: 48))
                .foregroundStyle(DesignTokens.Colors.textSecondary)

            Text(localization.t("onboarding.tour.zehAni.consent"))
                .font(DesignTokens.Typography.body)
                .foregroundStyle(DesignTokens.Colors.textSecondary)
                .multilineTextAlignment(.center)

            GlassButton(
                localization.t("onboarding.tour.zehAni.enableCamera"),
                variant: .primary,
                size: .medium
            ) {
                requestCameraAccess()
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(DesignTokens.Glass.bg)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
    }

    private var consentNote: some View {
        Text(localization.t("onboarding.tour.zehAni.noDataSent"))
            .font(DesignTokens.Typography.caption)
            .foregroundStyle(DesignTokens.Colors.textTertiary)
            .multilineTextAlignment(.center)
            .padding(.horizontal, DesignTokens.Spacing.xl)
            .padding(.bottom, DesignTokens.Spacing.xl)
    }

    private func requestCameraAccess() {
        #if canImport(AVFoundation)
            AVCaptureDevice.requestAccess(for: .video) { granted in
                DispatchQueue.main.async {
                    cameraReady = granted
                }
            }
        #endif
    }
}

/// Simple camera preview using AVCaptureSession.
private struct CameraPreviewView: UIViewRepresentable {
    func makeUIView(context _: Context) -> CameraUIView {
        CameraUIView()
    }

    func updateUIView(_: CameraUIView, context _: Context) {}
}

private final class CameraUIView: UIView {
    private let session = AVCaptureSession()

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupCamera()
    }

    @available(*, unavailable)
    required init?(coder _: NSCoder) {
        fatalError()
    }

    private func setupCamera() {
        guard let device = AVCaptureDevice.default(
            .builtInWideAngleCamera, for: .video, position: .front
        ),
            let input = try? AVCaptureDeviceInput(device: device)
        else { return }

        session.addInput(input)
        let previewLayer = AVCaptureVideoPreviewLayer(session: session)
        previewLayer.videoGravity = .resizeAspectFill
        layer.addSublayer(previewLayer)

        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            self?.session.startRunning()
        }
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        if let preview = layer.sublayers?.first as? AVCaptureVideoPreviewLayer {
            preview.frame = bounds
        }
    }
}
