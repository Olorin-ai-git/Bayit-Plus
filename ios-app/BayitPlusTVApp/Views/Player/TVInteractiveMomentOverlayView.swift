#if os(tvOS)
import AVKit
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Full-screen overlay for VOD interactive moments.
/// Shows predefined dialogue choices, processing spinner, lip-sync video response,
/// and continue-watching button. All navigation is focus-based (Siri Remote).
struct TVInteractiveMomentOverlayView: View {
    @Environment(LocalizationManager.self) private var localization

    @Bindable var viewModel: VODInteractionViewModel
    let contentId: String
    let profileId: String
    let avatarId: String
    let onDismiss: () -> Void

    @State private var responsePlayer: AVPlayer?

    var body: some View {
        ZStack {
            Color.black.opacity(0.7).ignoresSafeArea()

            switch viewModel.phase {
            case .prompting:
                promptingContent
            case .processing:
                processingContent
            case .responding:
                respondingContent
            case .done:
                doneContent
            case .idle:
                EmptyView()
            }
        }
        .focusSection()
        .accessibilityAddTraits(.isModal)
        .onExitCommand { dismiss() }
    }

    // MARK: - Prompting Phase

    private var promptingContent: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            if let moment = viewModel.activeMoment {
                characterHeader(moment)

                Text(moment.interactionPrompt)
                    .font(.system(
                        size: TVDesignTokens.FontSize.lg, weight: .medium
                    ))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 700)

                dialogueButtons(moment)

                GlassButton(
                    localization.t("player.interactive.skip"),
                    variant: .ghost,
                    size: .medium
                ) {
                    dismiss()
                }
                .tvFocusStyle()
            }
        }
        .padding(TVDesignTokens.Spacing.xxl)
        .frame(maxWidth: 800)
        .background(DesignTokens.Glass.bgStrong)
        .clipShape(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
        )
    }

    private func characterHeader(
        _ moment: InteractiveMoment
    ) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            if let frameUrl = moment.characterFrameUrl,
               let url = URL(string: frameUrl) {
                AsyncImage(url: url) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    characterPlaceholder(moment.characterName)
                }
                .frame(width: 200, height: 200)
                .clipShape(Circle())
            } else {
                characterPlaceholder(moment.characterName)
            }

            Text(moment.characterName)
                .font(.system(
                    size: TVDesignTokens.FontSize.xxl, weight: .bold
                ))
                .foregroundStyle(DesignTokens.Text.primary)
        }
    }

    private func characterPlaceholder(_ name: String) -> some View {
        ZStack {
            Circle()
                .fill(DesignTokens.Primary.p400.opacity(0.2))
                .frame(width: 200, height: 200)

            Text(String(name.prefix(1)))
                .font(.system(size: 72, weight: .bold))
                .foregroundStyle(DesignTokens.Primary.p400)
        }
    }

    private func dialogueButtons(
        _ moment: InteractiveMoment
    ) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            ForEach(
                Array(moment.dialogueOptions.enumerated()),
                id: \.offset
            ) { _, option in
                GlassButton(
                    option,
                    variant: .secondary,
                    size: .large
                ) {
                    Task { await sendDialogue(option) }
                }
                .tvFocusStyle()
                .frame(maxWidth: 600)
            }
        }
    }

    // MARK: - Processing Phase

    private var processingContent: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(2.0)

            if let moment = viewModel.activeMoment {
                Text(
                    localization.t(
                        "player.interactive.thinking",
                        ["character": moment.characterName]
                    )
                )
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
            }
        }
        .padding(TVDesignTokens.Spacing.xxl)
        .frame(maxWidth: 500)
        .background(DesignTokens.Glass.bgStrong)
        .clipShape(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
        )
    }

    // MARK: - Responding Phase

    private var respondingContent: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            if let response = viewModel.characterResponse {
                if let videoUrl = URL(string: response.animatedVideoUrl) {
                    let player = makeOrReusePlayer(url: videoUrl)
                    VideoPlayer(player: player)
                        .frame(width: 280, height: 280)
                        .clipShape(
                            RoundedRectangle(
                                cornerRadius: TVDesignTokens.Radius.lg
                            )
                        )
                        .onAppear { player.play() }
                        .onDisappear { player.pause() }
                }

                Text(response.responseText)
                    .font(.system(
                        size: TVDesignTokens.FontSize.lg, weight: .medium
                    ))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 600)
                    .padding(.horizontal, TVDesignTokens.Spacing.lg)

                GlassButton(
                    localization.t("player.interactive.continue"),
                    variant: .primary,
                    size: .large
                ) {
                    Task { await finishAndDismiss() }
                }
                .tvFocusStyle()
            }
        }
        .padding(TVDesignTokens.Spacing.xxl)
        .frame(maxWidth: 800)
        .background(DesignTokens.Glass.bgStrong)
        .clipShape(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
        )
    }

    // MARK: - Done Phase

    private var doneContent: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "checkmark.circle")
                .font(.system(size: 48))
                .foregroundStyle(DesignTokens.Success.default)

            GlassButton(
                localization.t("player.interactive.continue"),
                variant: .primary,
                size: .large
            ) {
                onDismiss()
            }
            .tvFocusStyle()
        }
        .padding(TVDesignTokens.Spacing.xxl)
        .frame(maxWidth: 400)
        .background(DesignTokens.Glass.bgStrong)
        .clipShape(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
        )
    }

    // MARK: - Actions

    private func sendDialogue(_ message: String) async {
        if viewModel.sessionId == nil {
            await viewModel.startSession(
                profileId: profileId,
                avatarId: avatarId,
                contentId: contentId
            )
        }
        await viewModel.sendMessage(message)
    }

    private func finishAndDismiss() async {
        await viewModel.completeSession()
        responsePlayer?.pause()
        responsePlayer = nil
        onDismiss()
    }

    private func dismiss() {
        responsePlayer?.pause()
        responsePlayer = nil
        viewModel.dismiss()
        onDismiss()
    }

    private func makeOrReusePlayer(url: URL) -> AVPlayer {
        if let existing = responsePlayer {
            return existing
        }
        let player = AVPlayer(url: url)
        responsePlayer = player
        return player
    }
}
#endif
