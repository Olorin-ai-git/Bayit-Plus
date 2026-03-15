import AVFoundation
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Sensitivity slider, status indicator, and microphone test controls
/// for wake word detection settings.
struct WakeWordSensitivityView: View {
    @Environment(LocalizationManager.self) private var localization

    let wakeWordService: WakeWordService
    let isEnabled: Bool
    @State private var testResult: WakeWordTestResult?

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.xl) {
            sensitivitySection
            statusSection
            testSection
        }
    }

    // MARK: - Sensitivity

    private var sensitivitySection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            HStack {
                Text(localization.t("settings.sensitivity"))
                    .font(.system(size: DesignTokens.FontSize.base, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Spacer()

                Text(sensitivityLabel)
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
            }

            Slider(
                value: Binding(
                    get: { wakeWordService.sensitivity },
                    set: { wakeWordService.setSensitivity($0) }
                ),
                in: 0.0 ... 1.0,
                step: 0.1
            )
            .tint(DesignTokens.Primary.default)

            HStack {
                Text(localization.t("common.low"))
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.disabled)

                Spacer()

                Text(localization.t("common.high"))
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.disabled)
            }
        }
        .glassCard(radius: DesignTokens.Radius.lg, padding: DesignTokens.Spacing.base)
        .opacity(isEnabled ? 1.0 : 0.5)
        .allowsHitTesting(isEnabled)
    }

    // MARK: - Status

    private var statusSection: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            Circle()
                .fill(statusColor)
                .frame(width: 12, height: 12)

            Text(statusText)
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)

            Spacer()

            if wakeWordService.isDetected {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(DesignTokens.Success.default)
            }
        }
        .glassCard(radius: DesignTokens.Radius.lg, padding: DesignTokens.Spacing.md)
    }

    // MARK: - Test Button

    private var testSection: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            GlassButton(localization.t("voiceAssistant.testMicrophone"), variant: .secondary) {
                testMicrophone()
            }

            if let testResult {
                HStack(spacing: DesignTokens.Spacing.sm) {
                    Image(systemName: testResult.icon)
                        .foregroundStyle(testResult.color)

                    Text(testResult.message)
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(testResult.color)
                }
            }
        }
    }

    // MARK: - Computed

    private var sensitivityLabel: String {
        let value = wakeWordService.sensitivity
        if value < 0.33 { return localization.t("common.low") }
        if value < 0.66 { return localization.t("common.medium") }
        return localization.t("common.high")
    }

    private var statusColor: Color {
        if wakeWordService.isDetected { return DesignTokens.Success.default }
        if wakeWordService.isListening { return DesignTokens.Primary.default }
        return DesignTokens.Text.disabled
    }

    private var statusText: String {
        if wakeWordService.isDetected { return localization.t("voiceAssistant.wakeWordDetected") }
        if wakeWordService.isListening { return localization.t("voiceAssistant.listening") }
        return localization.t("voiceAssistant.idle")
    }

    // MARK: - Actions

    private func testMicrophone() {
        Task {
            let status = AVAudioApplication.shared.recordPermission
            await MainActor.run {
                switch status {
                case .granted:
                    testResult = WakeWordTestResult(
                        icon: "checkmark.circle.fill",
                        message: localization.t("voiceOnboarding.permissionsGranted"),
                        color: DesignTokens.Success.default
                    )
                case .denied:
                    testResult = WakeWordTestResult(
                        icon: "xmark.circle.fill",
                        message: localization.t("voiceAssistant.microphoneDenied"),
                        color: DesignTokens.ErrorColor.default
                    )
                case .undetermined:
                    Task {
                        let granted = await AVAudioApplication.requestRecordPermission()
                        await MainActor.run {
                            testResult = WakeWordTestResult(
                                icon: granted ? "checkmark.circle.fill" : "xmark.circle.fill",
                                message: granted ? localization.t("voiceOnboarding.permissionsGranted") : localization.t("voiceAssistant.microphoneDenied"),
                                color: granted ? DesignTokens.Success.default : DesignTokens.ErrorColor.default
                            )
                        }
                    }
                @unknown default:
                    break
                }
            }
        }
    }
}

// MARK: - Test Result

struct WakeWordTestResult {
    let icon: String
    let message: String
    let color: Color
}
