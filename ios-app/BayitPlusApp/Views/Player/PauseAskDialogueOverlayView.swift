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

        let avatarImageUrl: String
        let avatarId: String?
        let contentId: String
        let currentTimestamp: Double
        let characters: [ContentCharacter]
        @Bindable var viewModel: AvatarDialogueViewModel
        let voiceService: VoiceInteractionService?
        let onDismiss: () -> Void

        @State var phase: PauseAskPhase = .selecting
        @State var messageText = ""
        @State var inputMode: DialogueInputView.InputMode = .text
        @State var userPlayer: AVPlayer?
        @State var characterPlayer: AVPlayer?
        @State var isUserVideoReady = false
        @State var isCharacterVideoReady = false
        @State var lastResponse: PauseAskResponse?
        @State var userEndObserver: NSObjectProtocol?
        @State var characterEndObserver: NSObjectProtocol?
        @State var userStatusObserver: NSKeyValueObservation?
        @State var characterStatusObserver: NSKeyValueObservation?
        @State var polishingStageIndex = 0
        @State var polishingTimer: Timer?

        let circleSize: CGFloat = 120
        let transitionDelay: TimeInterval = 0.5
        let logger = BayitLogger(category: "PauseAskOverlay")

        var body: some View {
            ZStack {
                Color.black.opacity(0.4).ignoresSafeArea()
                phaseContent
            }
            .animation(.easeInOut(duration: 0.3), value: phase)
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
            case .userSpeaking:
                videoPlaybackView(isUserPhase: true)
            case .transition:
                videoPlaybackView(isUserPhase: false)
            case .characterSpeaking:
                videoPlaybackView(isUserPhase: false)
            case .idle:
                idlePanel
            }
        }
    }
#endif
