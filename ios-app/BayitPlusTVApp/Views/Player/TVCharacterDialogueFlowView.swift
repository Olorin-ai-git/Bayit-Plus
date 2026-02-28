#if os(tvOS)
    import BayitCore
    import BayitMedia
    import SwiftUI

    /// Handles the full character-selection → dialogue flow in a single fullScreenCover,
    /// avoiding the tvOS restriction that prevents presenting one fullScreenCover
    /// immediately after dismissing another.
    struct TVCharacterDialogueFlowView: View {
        @Environment(MediaPlayer.self) var mediaPlayer

        let characters: [ContentCharacter]
        @Bindable var viewModel: AvatarDialogueViewModel
        let avatarImageUrl: String
        let avatarId: String?
        let contentId: String
        let currentTimestamp: Double
        let voiceService: TVVoiceInteractionService?
        let avatarPlacement: AvatarPlacement?
        let onDismiss: () async -> Void

        private enum Phase {
            case selecting
            case starting
            case chatting(ContentCharacter)
        }

        @State private var phase: Phase = .selecting

        var body: some View {
            switch phase {
            case .selecting:
                TVCharacterSelectionView(
                    characters: characters,
                    onSelect: { character in
                        Task { await beginSession(character) }
                    },
                    onDismiss: { Task { await onDismiss() } }
                )
            case .starting:
                Color.black
                    .ignoresSafeArea()
                    .overlay {
                        ProgressView()
                            .tint(.white)
                            .scaleEffect(2)
                    }
            case let .chatting(character):
                ZStack {
                    Color.black.ignoresSafeArea()
                    TVAvatarDialogueOverlayView(
                        avatarImageUrl: character.frameUrl,
                        character: character,
                        viewModel: viewModel,
                        voiceService: voiceService,
                        avatarPlacement: avatarPlacement,
                        onDismiss: { Task { await onDismiss() } },
                        isFullScreen: true
                    )
                }
            }
        }

        private func beginSession(_ character: ContentCharacter) async {
            phase = .starting
            await viewModel.startSession(
                contentId: contentId,
                avatarId: avatarId ?? "",
                character: character,
                currentTimestamp: currentTimestamp
            )
            if viewModel.isActive {
                phase = .chatting(character)
            } else {
                await onDismiss()
            }
        }
    }
#endif
