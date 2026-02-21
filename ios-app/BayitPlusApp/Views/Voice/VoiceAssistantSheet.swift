import BayitDesignSystem
import BayitLocalization
import BayitVoice
import SwiftUI
import UIKit

/// Voice assistant modal sheet - equivalent to the mobile web VoiceChatModal.
///
/// Presents a voice-first interface with speech recognition, animated waveform,
/// live transcript display, and AI response. Activated by the wizard hat FAB.
///
/// Voice orb and button controls are in `VoiceAssistantControls.swift`.
/// Conversation area and speech actions are in `VoiceAssistantResponse.swift`.
struct VoiceAssistantSheet: View {
    let chatRepository: any ChatRepository
    let onDismiss: () -> Void

    @State var speechService = SpeechRecognitionService()
    @State var stopClosure: (@Sendable () -> Void)?
    @State var isListening = false
    @State var transcript = ""
    @State var aiResponse = ""
    @State var isProcessing = false
    @State var errorMessage: String?
    @State var audioLevel: CGFloat = 0

    @Environment(LocalizationManager.self) var localization

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            VStack(spacing: DesignTokens.Spacing.xl) {
                header

                Spacer()

                voiceOrb

                Spacer()

                conversationArea

                voiceButton

                Text(localization.t("voice.tapToClose"))
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .padding(.bottom, DesignTokens.Spacing.md)
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .padding(.top, DesignTokens.Spacing.lg)
        }
    }

    // MARK: - Header

    private var header: some View {
        HStack {
            Text(localization.t("voice.voiceAssistant"))
                .font(.system(size: DesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)

            Spacer()

            Button {
                stopListeningIfNeeded()
                onDismiss()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .frame(width: 36, height: 36)
                    .background(DesignTokens.Glass.bgMedium)
                    .clipShape(Circle())
            }
            .accessibilityLabel(localization.t("voice.closeAssistant"))
        }
    }
}
