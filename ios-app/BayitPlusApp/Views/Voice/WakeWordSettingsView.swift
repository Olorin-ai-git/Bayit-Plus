import AVFoundation
import BayitDesignSystem
import BayitLocalization
import SwiftUI
import UIKit

/// Settings view for configuring the "Hey Bayit" wake word detection.
///
/// Provides controls for enabling/disabling wake word listening,
/// adjusting sensitivity, and testing microphone access.
struct WakeWordSettingsView: View {
    @Environment(LocalizationManager.self) var localization
    @State var wakeWordService: WakeWordService
    @State var isEnabled = false
    @State var testResult: WakeWordTestResult?

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
        .navigationTitle(localization.t("voice.wakeWord.title"))
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
}
