#if os(iOS)
    import AVFoundation
    import AVKit
    import BayitAuth
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Phase-based overlay for the full Pause & Ask interaction.
    /// Movie is paused. User selects a character, asks a question,
    /// then watches their avatar speak followed by the character's response.
    struct PauseAskDialogueOverlayView: View {
        @Environment(LocalizationManager.self) var localization
        @Environment(AuthManager.self) var authManager

        let avatarId: String?
        let contentId: String
        let currentTimestamp: Double
        let characters: [ContentCharacter]
        @Bindable var viewModel: AvatarDialogueViewModel
        let voiceService: VoiceInteractionService?
        let onResumePlayback: () -> Void
        let onPausePlayback: () -> Void
        let onDismiss: () -> Void

        @State var phase: PauseAskPhase = .selecting
        @State var messageText = ""
        @State var inputMode: DialogueInputView.InputMode = .text
        @State var characterPlayer: AVPlayer?
        @State var isCharacterVideoReady = false
        @State var lastResponse: PauseAskResponse?
        @State var characterEndObserver: NSObjectProtocol?
        @State var characterStatusObserver: NSKeyValueObservation?
        @State var polishingStageIndex = 0
        @State var polishingTimer: Timer?

        let circleSize: CGFloat = 140
        let logger = BayitLogger(category: "PauseAskOverlay")

        var body: some View {
            ZStack {
                if phase != .polishing {
                    Color.black.opacity(0.4).ignoresSafeArea()
                }
                phaseContent
            }
            .animation(.easeInOut(duration: 0.3), value: phase)
            .onAppear {
                if characters.isEmpty { phase = .input }
            }
        }

        // MARK: - Phase Router

        @ViewBuilder
        private var phaseContent: some View {
            switch phase {
            case .selecting:
                PauseAskCharacterOverlayView(
                    characters: characters,
                    onSelectCharacter: { character in
                        Task { await selectCharacter(character) }
                    },
                    onDismiss: onDismiss
                )
            case .input:
                inputPanel
            case .polishing:
                polishingProgressView
            case .userSpeaking, .transition:
                EmptyView()
            case .characterSpeaking:
                videoPlaybackView()
            case .idle:
                idlePanel
            case .error:
                idlePanel
            }
        }
    }
#endif
