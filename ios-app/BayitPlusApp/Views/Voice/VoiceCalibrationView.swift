#if os(iOS)
import AVFoundation
import BayitDesignSystem
import BayitLocalization
import BayitVoice
import SwiftUI

/// Three-step microphone calibration wizard for voice recognition.
/// Guides through ambient noise measurement, sample phrase recording, and sensitivity tuning.
struct VoiceCalibrationView: View {
    let speechService: SpeechRecognitionService
    @Environment(LocalizationManager.self) private var localization
    @Environment(\.dismiss) private var dismiss
    @AppStorage("voiceCalibrationComplete") private var calibrationComplete = false
    @AppStorage("voiceCalibrationSensitivity") private var sensitivity: Double = 0.5
    @State private var currentStep = CalibrationStep.ambientNoise
    @State private var isRecording = false
    @State private var audioLevel: CGFloat = 0
    @State private var ambientNoiseFloor: Double = 0
    @State private var spokenPeakLevel: Double = 0
    @State private var audioEngine: AVAudioEngine?

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()
            VStack(spacing: DesignTokens.Spacing.xl) {
                dismissRow
                progressIndicator
                stepHeader
                Spacer()
                amplitudeBar
                Spacer()
                Text(localization.t(currentStep.descriptionKey))
                    .font(.system(size: DesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, DesignTokens.Spacing.base)
                GlassButton(localization.t(currentStep.buttonKey),
                            variant: .primary, isLoading: isRecording) { handleStepAction() }
                    .padding(.bottom, DesignTokens.Spacing.lg)
            }
            .padding(.horizontal, DesignTokens.Spacing.base)
            .padding(.vertical, DesignTokens.Spacing.xl)
        }
    }

    private var dismissRow: some View {
        HStack {
            Spacer()
            Button { dismiss() } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .frame(width: 36, height: 36)
                    .background(DesignTokens.Glass.bgMedium)
                    .clipShape(Circle())
            }
            .accessibilityLabel(localization.t("common.close"))
        }
    }

    private var progressIndicator: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            ForEach(CalibrationStep.allCases, id: \.self) { step in
                RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                    .fill(step.rawValue <= currentStep.rawValue
                          ? DesignTokens.Primary.p300 : DesignTokens.Glass.bgMedium)
                    .frame(height: 4)
            }
        }
    }

    private var stepHeader: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: currentStep.iconName)
                .font(.system(size: 40, weight: .medium))
                .foregroundStyle(DesignTokens.Primary.p300)
            Text(localization.t(currentStep.titleKey))
                .font(.system(size: DesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
        }
    }

    private var amplitudeBar: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            GeometryReader { proxy in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                        .fill(DesignTokens.Glass.bgMedium)
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                        .fill(DesignTokens.Primary.p300)
                        .frame(width: proxy.size.width * audioLevel)
                        .animation(.easeOut(duration: 0.08), value: audioLevel)
                }
            }
            .frame(height: 12)
            Text(localization.t("voice.calibration.levelLabel"))
                .font(.system(size: DesignTokens.FontSize.xs))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .glassCard(radius: DesignTokens.Radius.lg, padding: DesignTokens.Spacing.base)
        .opacity(isRecording ? 1.0 : 0.4)
    }

    private func handleStepAction() {
        switch currentStep {
        case .ambientNoise:
            startMetering { level in
                ambientNoiseFloor = level
                stopMetering()
                withAnimation { currentStep = .samplePhrase }
            }
        case .samplePhrase:
            startMetering { level in
                spokenPeakLevel = level
                stopMetering()
                sensitivity = computeSensitivity()
                withAnimation { currentStep = .sensitivityTuning }
            }
        case .sensitivityTuning:
            calibrationComplete = true
            dismiss()
        }
    }

    private func startMetering(completion: @escaping (Double) -> Void) {
        isRecording = true
        let engine = AVAudioEngine()
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.record, mode: .measurement, options: .duckOthers)
        try? session.setActive(true, options: .notifyOthersOnDeactivation)
        let format = engine.inputNode.outputFormat(forBus: 0)
        var peakLevel: Double = 0
        var sampleCount = 0
        let targetSamples = 30
        engine.inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
            let level = Self.rmsLevel(from: buffer)
            Task { @MainActor in
                audioLevel = CGFloat(min(level * 3.0, 1.0))
                peakLevel = max(peakLevel, level)
                sampleCount += 1
                if sampleCount >= targetSamples { completion(peakLevel) }
            }
        }
        engine.prepare()
        try? engine.start()
        audioEngine = engine
    }

    private func stopMetering() {
        audioEngine?.inputNode.removeTap(onBus: 0)
        audioEngine?.stop()
        audioEngine = nil
        isRecording = false
        audioLevel = 0
    }

    private func computeSensitivity() -> Double {
        guard spokenPeakLevel > ambientNoiseFloor else { return 0.5 }
        let range = spokenPeakLevel - ambientNoiseFloor
        return min(max(ambientNoiseFloor + range * 0.4, 0.0), 1.0)
    }

    private static func rmsLevel(from buffer: AVAudioPCMBuffer) -> Double {
        guard let data = buffer.floatChannelData, buffer.frameLength > 0 else { return 0 }
        let count = Int(buffer.frameLength)
        var sum: Float = 0
        for i in 0..<count { sum += data[0][i] * data[0][i] }
        return Double(sqrtf(sum / Float(count)))
    }
}

private enum CalibrationStep: Int, CaseIterable {
    case ambientNoise = 0, samplePhrase = 1, sensitivityTuning = 2

    private var keys: (icon: String, title: String, desc: String, button: String) {
        switch self {
        case .ambientNoise:
            return ("ear", "voice.calibration.ambientTitle",
                    "voice.calibration.ambientDesc", "voice.calibration.measureNoise")
        case .samplePhrase:
            return ("mic.fill", "voice.calibration.sampleTitle",
                    "voice.calibration.sampleDesc", "voice.calibration.recordPhrase")
        case .sensitivityTuning:
            return ("slider.horizontal.3", "voice.calibration.tuningTitle",
                    "voice.calibration.tuningDesc", "voice.calibration.finish")
        }
    }

    var iconName: String { keys.icon }
    var titleKey: String { keys.title }
    var descriptionKey: String { keys.desc }
    var buttonKey: String { keys.button }
}
#endif
