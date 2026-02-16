import BayitDesignSystem
import BayitLocalization
import SwiftUI
import UIKit

/// Settings view for configuring the "Hey Bayit" wake word detection.
///
/// Provides controls for enabling/disabling wake word listening,
/// adjusting sensitivity, and testing microphone access.
struct WakeWordSettingsView: View {

    @Environment(LocalizationManager.self) private var localization
    @State private var wakeWordService: WakeWordService
    @State private var isEnabled = false
    @State private var testResult: TestResult?

    init(wakeWordService: WakeWordService) {
        _wakeWordService = State(initialValue: wakeWordService)
    }

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            ScrollView {
                VStack(spacing: DesignTokens.Spacing.xl) {
                    headerSection
                    toggleSection
                    sensitivitySection
                    statusSection
                    testSection
                }
                .padding(.horizontal, DesignTokens.Spacing.base)
                .padding(.vertical, DesignTokens.Spacing.xl)
            }
        }
        .navigationTitle("Wake Word")
        .navigationBarTitleDisplayMode(.large)
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            ZStack {
                Circle()
                    .fill(DesignTokens.Glass.purpleLight)
                    .frame(width: 80, height: 80)

                Image(systemName: "waveform.badge.mic")
                    .font(.system(size: 32, weight: .medium))
                    .foregroundStyle(DesignTokens.Primary.p300)
            }

            Text(localization.t("settings.wakeWord"))
                .font(.system(size: DesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("settings.wakeWordDescription"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
    }

    // MARK: - Toggle

    private var toggleSection: some View {
        HStack {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                Text(localization.t("tvos.settings.wakeWord"))
                    .font(.system(size: DesignTokens.FontSize.base, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(localization.t("tvos.settings.wakeWordSubtitle"))
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
            }

            Spacer()

            Toggle("", isOn: $isEnabled)
                .labelsHidden()
                .tint(DesignTokens.Primary.default)
                .onChange(of: isEnabled) { _, newValue in
                    handleToggle(newValue)
                }
        }
        .glassCard(radius: DesignTokens.Radius.lg, padding: DesignTokens.Spacing.base)
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
            GlassButton("Test Microphone", variant: .secondary) {
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
        if wakeWordService.isDetected { return "Wake word detected!" }
        if wakeWordService.isListening { return "Listening..." }
        return "Idle"
    }

    // MARK: - Actions

    @MainActor
    private func handleToggle(_ enabled: Bool) {
        let generator = UIImpactFeedbackGenerator(style: .light)
        generator.impactOccurred()

        if enabled {
            wakeWordService.startListening()
        } else {
            wakeWordService.stopListening()
        }
    }

    private func testMicrophone() {
        Task {
            let status = await AVAudioApplication.shared.recordPermission
            await MainActor.run {
                switch status {
                case .granted:
                    testResult = TestResult(
                        icon: "checkmark.circle.fill",
                        message: "Microphone access granted",
                        color: DesignTokens.Success.default
                    )
                case .denied:
                    testResult = TestResult(
                        icon: "xmark.circle.fill",
                        message: "Microphone access denied. Check Settings.",
                        color: DesignTokens.ErrorColor.default
                    )
                case .undetermined:
                    Task {
                        let granted = await AVAudioApplication.requestRecordPermission()
                        await MainActor.run {
                            testResult = TestResult(
                                icon: granted ? "checkmark.circle.fill" : "xmark.circle.fill",
                                message: granted ? "Microphone access granted" : "Microphone access denied",
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

private struct TestResult {
    let icon: String
    let message: String
    let color: Color
}

import AVFoundation
