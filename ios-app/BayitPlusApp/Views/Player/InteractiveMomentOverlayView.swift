#if os(iOS)
import AVFoundation
import AVKit
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
            try? await Task.sleep(for: .seconds(0.8))
            await MainActor.run {
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
            dismissAfterDelay()
            return
        }

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
            dismissAfterDelay()
            return
        }

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
            try? await Task.sleep(for: .seconds(0.5))
            await MainActor.run {
                withAnimation(.easeIn(duration: 0.3)) {
                    isCharacterVideoReady = true
                }
                player.play()
            }
        }
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
