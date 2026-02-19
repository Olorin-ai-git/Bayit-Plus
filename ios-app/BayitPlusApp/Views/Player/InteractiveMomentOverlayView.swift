#if os(iOS)
import AVFoundation
import AVKit
import BayitCore
import BayitDesignSystem
import SwiftUI

/// Dual-circle overlay for interactive moments: child avatar (left) and
/// movie character (right). The movie never pauses -- volume ducks while
/// the conversation plays, then restores on dismiss.
struct InteractiveMomentOverlayView: View {

    let avatarVideoUrl: String
    let avatarImageUrl: String
    let characterVideoUrl: String?
    let characterImageUrl: String?
    let onDismiss: () -> Void

    private let circleSize: CGFloat = 120
    private let transitionDelay: TimeInterval = 0.5
    private let logger = BayitLogger(category: "InteractiveMoment")

    @State private var phase: InteractionOverlayPhase = .avatarSpeaking
    @State private var avatarPlayer: AVPlayer?
    @State private var characterPlayer: AVPlayer?
    @State private var isAvatarVideoReady = false
    @State private var isCharacterVideoReady = false

    var body: some View {
        VStack {
            Spacer()
            HStack(spacing: DesignTokens.Spacing.xl) {
                Spacer()
                avatarCircle
                    .opacity(phase != .done ? 1 : 0)
                    .scaleEffect(phase != .done ? 1 : 0.8)

                if characterVideoUrl != nil || characterImageUrl != nil {
                    characterCircle
                        .opacity(phase == .characterSpeaking ? 1 : 0)
                        .scaleEffect(phase == .characterSpeaking ? 1 : 0.8)
                }
                Spacer()
            }
            .padding(.bottom, 80)
        }
        .animation(.easeInOut(duration: 0.4), value: phase)
        .allowsHitTesting(false)
        .onAppear { setupAvatarPlayer() }
        .onDisappear { cleanupPlayers() }
    }

    // MARK: - Circles

    private var avatarCircle: some View {
        ZStack {
            stillImage(url: avatarImageUrl)
            if isAvatarVideoReady, let player = avatarPlayer {
                VideoPlayer(player: player)
                    .scaleEffect(2)
            }
        }
        .frame(width: circleSize, height: circleSize)
        .clipShape(Circle())
        .overlay(Circle().stroke(.white.opacity(0.3), lineWidth: 2))
        .shadow(
            color: DesignTokens.Primary.default.opacity(0.4),
            radius: 12, x: 0, y: 4
        )
    }

    private var characterCircle: some View {
        ZStack {
            if let imgUrl = characterImageUrl {
                stillImage(url: imgUrl)
            }
            if isCharacterVideoReady, let player = characterPlayer {
                VideoPlayer(player: player)
                    .scaleEffect(2)
            }
        }
        .frame(width: circleSize, height: circleSize)
        .clipShape(Circle())
        .overlay(Circle().stroke(.white.opacity(0.3), lineWidth: 2))
        .shadow(
            color: DesignTokens.Primary.default.opacity(0.4),
            radius: 12, x: 0, y: 4
        )
    }

    private func stillImage(url: String) -> some View {
        AsyncImage(url: URL(string: url)) { phase in
            switch phase {
            case .success(let image):
                image.resizable().scaledToFill()
            default:
                Color.black
            }
        }
    }

    // MARK: - Avatar Player

    private func setupAvatarPlayer() {
        guard let url = URL(string: avatarVideoUrl) else {
            logger.error("Invalid avatar video URL: \(avatarVideoUrl)")
            onDismiss()
            return
        }

        let player = AVPlayer(url: url)
        avatarPlayer = player

        NotificationCenter.default.addObserver(
            forName: .AVPlayerItemDidPlayToEndTime,
            object: player.currentItem,
            queue: .main
        ) { _ in
            Task { @MainActor in onAvatarFinished() }
        }

        Task {
            let ready = await waitForPlayerReady(player, label: "avatar")
            await MainActor.run {
                guard ready else {
                    logger.error("Avatar video failed to load")
                    onDismiss()
                    return
                }
                withAnimation(.easeIn(duration: 0.3)) {
                    isAvatarVideoReady = true
                }
                player.play()
            }
        }
    }

    private func onAvatarFinished() {
        guard let charUrl = characterVideoUrl,
              URL(string: charUrl) != nil else {
            logger.info(
                "No character response video, dismissing"
            )
            dismissAfterDelay()
            return
        }

        logger.info("Avatar finished, transitioning to character")
        phase = .transition
        Task {
            try? await Task.sleep(for: .seconds(transitionDelay))
            await MainActor.run {
                setupCharacterPlayer(urlString: charUrl)
            }
        }
    }

    // MARK: - Character Player

    private func setupCharacterPlayer(urlString: String) {
        guard let url = URL(string: urlString) else {
            logger.error("Invalid character video URL: \(urlString)")
            dismissAfterDelay()
            return
        }

        logger.info("Setting up character player: \(urlString)")
        let player = AVPlayer(url: url)
        characterPlayer = player
        phase = .characterSpeaking

        NotificationCenter.default.addObserver(
            forName: .AVPlayerItemDidPlayToEndTime,
            object: player.currentItem,
            queue: .main
        ) { _ in
            Task { @MainActor in dismissAfterDelay() }
        }

        Task {
            let ready = await waitForPlayerReady(player, label: "character")
            await MainActor.run {
                guard ready else {
                    logger.error("Character video failed to load")
                    dismissAfterDelay()
                    return
                }
                withAnimation(.easeIn(duration: 0.3)) {
                    isCharacterVideoReady = true
                }
                player.play()
                logger.info("Character video playing")
            }
        }
    }

    // MARK: - Player Readiness

    private func waitForPlayerReady(
        _ player: AVPlayer,
        label: String
    ) async -> Bool {
        guard let item = player.currentItem else {
            logger.error("\(label) player has no current item")
            return false
        }

        let maxWaitSeconds = 10.0
        let pollInterval = 0.1
        var elapsed = 0.0

        while elapsed < maxWaitSeconds {
            switch item.status {
            case .readyToPlay:
                logger.info(
                    "\(label) video ready after \(String(format: "%.1f", elapsed))s"
                )
                return true
            case .failed:
                let errorDesc = item.error?.localizedDescription ?? "unknown"
                logger.error(
                    "\(label) video failed to load: \(errorDesc)"
                )
                return false
            case .unknown:
                try? await Task.sleep(for: .seconds(pollInterval))
                elapsed += pollInterval
            @unknown default:
                try? await Task.sleep(for: .seconds(pollInterval))
                elapsed += pollInterval
            }
        }

        logger.error(
            "\(label) video timed out after \(maxWaitSeconds)s"
        )
        return false
    }

    // MARK: - Lifecycle

    private func dismissAfterDelay() {
        phase = .done
        Task {
            try? await Task.sleep(for: .seconds(0.3))
            await MainActor.run { onDismiss() }
        }
    }

    private func cleanupPlayers() {
        avatarPlayer?.pause()
        avatarPlayer = nil
        characterPlayer?.pause()
        characterPlayer = nil
    }
}

// MARK: - Overlay Phase

enum InteractionOverlayPhase {
    case avatarSpeaking
    case transition
    case characterSpeaking
    case done
}
#endif
