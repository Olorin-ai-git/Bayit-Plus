import BayitDesignSystem
import BayitLocalization
import AVFoundation
import AVKit
import SwiftUI

struct LoadingView: View {
    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
            Text(localization.t("mission.loading"))
                .font(.system(size: DesignTokens.FontSize.base))
                .foregroundColor(DesignTokens.Text.secondary)
        }
    }
}

struct MissionVideoPlayerView: View {
    let player: AVPlayer
    let currentScene: Int
    let totalScenes: Int

    var body: some View {
        VStack(spacing: 0) {
            VideoPlayer(player: player)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .disabled(true)

            progressBar
        }
    }

    private var progressBar: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                Rectangle()
                    .fill(DesignTokens.Glass.bg)
                    .frame(height: 4)

                Rectangle()
                    .fill(DesignTokens.Primary.default)
                    .frame(width: geometry.size.width * (Double(currentScene) / Double(totalScenes)), height: 4)
            }
        }
        .frame(height: 4)
    }
}

struct ErrorOverlayView: View {
    let message: String

    var body: some View {
        VStack {
            Spacer()
            GlassCard {
                Text(message)
                    .font(.system(size: DesignTokens.FontSize.base))
                    .foregroundColor(DesignTokens.ErrorColor.default)
                    .padding(DesignTokens.Spacing.md)
            }
            .padding(DesignTokens.Spacing.md)
        }
    }
}

struct DecisionOverlayView: View {
    @Environment(LocalizationManager.self) private var localization

    let scene: InteractiveMission.Scene
    let countdown: Int
    let lastResult: AttemptResult?
    let currentAttempt: Int
    let isListening: Bool
    let onToggleListening: () -> Void

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.xl) {
            Spacer()

            GlassCard {
                VStack(spacing: DesignTokens.Spacing.md) {
                    Text(localization.t("mission.speak_challenge"))
                        .font(.system(size: DesignTokens.FontSize.lg, weight: .semibold))
                        .foregroundColor(DesignTokens.Text.primary)

                    Text(scene.targetPhrase)
                        .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                        .foregroundColor(DesignTokens.Primary.default)
                        .padding()
                        .background(DesignTokens.Glass.bgStrong)
                        .cornerRadius(DesignTokens.Radius.sm)

                    if countdown > 0 {
                        Text(localization.t("mission.countdown", ["seconds": String(countdown)]))
                            .font(.system(size: DesignTokens.FontSize.sm))
                            .foregroundColor(DesignTokens.Text.secondary)
                    }

                    if let result = lastResult, !result.success {
                        Text(localization.t("mission.attempt_failed", ["attempt": String(currentAttempt), "max": "3"]))
                            .font(.system(size: DesignTokens.FontSize.sm))
                            .foregroundColor(DesignTokens.ErrorColor.default)
                    }

                    GlassButton(
                        isListening ? localization.t("mission.listening") : localization.t("mission.tap_to_speak"),
                        variant: isListening ? .secondary : .primary,
                        size: .large
                    ) {
                        onToggleListening()
                    }
                    .disabled(countdown > 0 || currentAttempt > 3)
                }
                .padding(DesignTokens.Spacing.lg)
            }
            .padding(DesignTokens.Spacing.md)

            Spacer()
        }
    }
}

struct CompletionView: View {
    @Environment(LocalizationManager.self) private var localization

    let finalScore: Double
    let earnedShekels: Int
    let onComplete: () -> Void

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: DesignTokens.Spacing.xl) {
                Text(localization.t("mission.complete"))
                    .font(.system(size: DesignTokens.FontSize.hero, weight: .bold))
                    .foregroundColor(DesignTokens.Success.default)

                GlassCard {
                    VStack(spacing: DesignTokens.Spacing.md) {
                        Text(localization.t("mission.final_score"))
                            .font(.system(size: DesignTokens.FontSize.base))
                            .foregroundColor(DesignTokens.Text.secondary)

                        Text(String(format: "%.1f%%", finalScore))
                            .font(.system(size: DesignTokens.FontSize.xxxl, weight: .bold))
                            .foregroundColor(DesignTokens.Primary.default)

                        Text(localization.t("mission.earned_shekels", ["amount": String(earnedShekels)]))
                            .font(.system(size: DesignTokens.FontSize.lg))
                            .foregroundColor(DesignTokens.Text.primary)
                    }
                    .padding(DesignTokens.Spacing.lg)
                }

                GlassButton(localization.t("mission.continue"), variant: .primary, size: .large) {
                    onComplete()
                }
                .padding(.horizontal, DesignTokens.Spacing.md)
            }
            .padding(DesignTokens.Spacing.lg)
        }
    }
}
