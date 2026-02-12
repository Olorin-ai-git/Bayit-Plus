import AVFoundation
import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct SceneTriggerPromptCard: View {
    @Environment(LocalizationManager.self) private var localization

    let targetWordHe: String
    let promptText: String

    var body: some View {
        VStack(spacing: 12) {
            Text(localization.t("zehAni.trigger.prompt"))
                .font(.system(size: 18, weight: .medium))
                .foregroundColor(.white.opacity(0.7))

            Text(targetWordHe)
                .font(.system(size: 48, weight: .heavy))
                .foregroundColor(.white)
                .multilineTextAlignment(.center)

            Text(promptText)
                .font(.system(size: 16))
                .foregroundColor(.white.opacity(0.6))
                .multilineTextAlignment(.center)
        }
        .padding(32)
        .frame(maxWidth: .infinity)
        .background(.white.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 24))
        .overlay(
            RoundedRectangle(cornerRadius: 24)
                .stroke(.white.opacity(0.15), lineWidth: 1)
        )
    }
}

struct SceneTriggerRecordButton: View {
    let isRecording: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            ZStack {
                Circle()
                    .fill(isRecording ? Color.red.opacity(0.5) : Color.green.opacity(0.2))
                    .frame(width: 100, height: 100)
                    .overlay(
                        Circle().stroke(
                            isRecording ? Color.red : Color.green.opacity(0.6),
                            lineWidth: 3
                        )
                    )

                Image(systemName: isRecording ? "mic.slash.fill" : "mic.fill")
                    .font(.system(size: 40))
                    .foregroundColor(isRecording ? .red : .green)
            }
        }
    }
}

struct SceneTriggerErrorView: View {
    @Environment(LocalizationManager.self) private var localization

    let message: String
    let onDismiss: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 60))
                .foregroundColor(DesignTokens.Color.error)

            Text(message)
                .font(.system(size: 16))
                .foregroundColor(.white.opacity(0.8))
                .multilineTextAlignment(.center)

            Button(localization.t("zehAni.trigger.dismiss")) {
                onDismiss()
            }
            .buttonStyle(.borderedProminent)
        }
    }
}

struct SceneTriggerSuccessView: View {
    @Environment(LocalizationManager.self) private var localization

    let onContinue: () -> Void
    let autoAdvanceDelay: TimeInterval

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 80))
                .foregroundColor(DesignTokens.Color.success)

            Text(localization.t("zehAni.trigger.success"))
                .font(.system(size: 24, weight: .bold))
                .foregroundColor(.white)

            Button(localization.t("zehAni.trigger.continue")) {
                onContinue()
            }
            .buttonStyle(.borderedProminent)
            .tint(DesignTokens.Color.success)
        }
        .onAppear {
            DispatchQueue.main.asyncAfter(deadline: .now() + autoAdvanceDelay) {
                onContinue()
            }
        }
    }
}

struct SceneTriggerRetryView: View {
    @Environment(LocalizationManager.self) private var localization

    let correctTransliteration: String
    let onTryAgain: () -> Void
    let onSkip: () -> Void

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "xmark.circle.fill")
                .font(.system(size: 60))
                .foregroundColor(DesignTokens.Color.error)

            Text(localization.t("zehAni.trigger.incorrect"))
                .font(.system(size: 20, weight: .semibold))
                .foregroundColor(.white)

            if !correctTransliteration.isEmpty {
                Text("\(localization.t("zehAni.trigger.correct")): \(correctTransliteration)")
                    .font(.system(size: 16))
                    .foregroundColor(.white.opacity(0.7))
            }

            HStack(spacing: 12) {
                Button(localization.t("zehAni.trigger.tryAgain")) {
                    onTryAgain()
                }
                .buttonStyle(.bordered)

                Button(localization.t("zehAni.trigger.skip")) {
                    onSkip()
                }
                .buttonStyle(.borderedProminent)
            }
        }
    }
}
