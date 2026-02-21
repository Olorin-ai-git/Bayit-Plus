#if os(tvOS)
    import AVFoundation
    import AVKit
    import BayitDesignSystem
    import BayitLocalization
    import BayitMedia
    import SwiftUI

    /// tvOS adaptation of the free-form character dialogue overlay.
    /// Larger circles (160pt) for 10-foot UI. Supports voice via Siri Remote
    /// and multi-character interactions with focusable navigation.
    struct TVAvatarDialogueOverlayView: View {
        @Environment(LocalizationManager.self) var localization
        @Environment(MediaPlayer.self) var mediaPlayer

        let avatarImageUrl: String
        let character: ContentCharacter
        @Bindable var viewModel: AvatarDialogueViewModel
        let voiceService: TVVoiceInteractionService?
        let avatarPlacement: AvatarPlacement?
        let onDismiss: () -> Void

        @State var messageText = ""
        @State var characterPlayer: AVPlayer?
        @State var isCharacterVideoReady = false
        @FocusState var isInputFocused: Bool
        @State var wasPlayingBeforeResponse = false
        @State var resumeTask: Task<Void, Never>?

        let circleSize: CGFloat = 160

        var body: some View {
            VStack {
                if positionIsTop { overlayPanel; Spacer() }
                else { Spacer(); overlayPanel }
            }
        }

        var positionIsTop: Bool {
            avatarPlacement?.position.hasPrefix("top") ?? false
        }

        private var overlayPanel: some View {
            HStack {
                if positionIsRight { Spacer() }
                overlayContent
                    .frame(maxWidth: 520)
                    .padding(TVDesignTokens.Spacing.xxl)
                if !positionIsRight { Spacer() }
            }
        }

        var positionIsRight: Bool {
            avatarPlacement?.position.hasSuffix("right") ?? true
        }

        private var overlayContent: some View {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                headerRow
                if viewModel.isMultiCharacterMode {
                    TVMultiCharacterCirclesView(
                        characters: viewModel.multiCharacters,
                        addressedCharacter: viewModel.addressedCharacterName,
                        onSelectCharacter: { viewModel.addressedCharacterName = $0 }
                    )
                }
                circlesRow
                conversationList
                inputRow
            }
            .padding(TVDesignTokens.Spacing.xl)
            .background(DesignTokens.Glass.bgStrong)
            .clipShape(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
            )
        }

        // MARK: - Header

        var headerRow: some View {
            HStack {
                Text(character.name)
                    .font(.system(
                        size: TVDesignTokens.FontSize.lg, weight: .semibold
                    ))
                    .foregroundStyle(DesignTokens.Text.primary)
                Spacer()
                if let service = voiceService {
                    voiceButton(service)
                }
                Button { onDismiss() } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: TVDesignTokens.FontSize.xl))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
                .accessibilityLabel(
                    localization.t("player.dialogue.endDialogue")
                )
            }
        }

        func voiceButton(
            _ service: TVVoiceInteractionService
        ) -> some View {
            Button {
                if service.isListening {
                    Task {
                        guard let sessionId = viewModel.sessionId else { return }
                        let wasPlaying = mediaPlayer.state == .playing
                        wasPlayingBeforeResponse = wasPlaying
                        let response = await service.stopListeningAndSend(
                            sessionId: sessionId
                        )
                        if wasPlaying { mediaPlayer.pause() }
                        if let videoUrl = response?.animatedVideoUrl {
                            playCharacterVideo(urlString: videoUrl)
                        } else if wasPlaying {
                            scheduleResume()
                        }
                    }
                } else {
                    service.startListening()
                }
            } label: {
                Image(systemName: service.isListening
                    ? "mic.fill" : "mic")
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(service.isListening
                        ? DesignTokens.ErrorColor.default
                        : DesignTokens.Text.secondary)
            }
            .accessibilityLabel(
                localization.t("player.dialogue.voiceMode")
            )
        }
    }
#endif
