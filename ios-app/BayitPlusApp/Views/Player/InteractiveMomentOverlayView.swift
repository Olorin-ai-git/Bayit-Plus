#if os(iOS)
    import AVFoundation
    import AVKit
    import BayitCore
    import BayitDesignSystem
    import SwiftUI

    /// Dual-circle overlay for interactive moments: child avatar (left) and
    /// movie character (right). The movie pauses while the conversation plays
    /// and resumes automatically on dismiss.
    ///
    /// Circle display views are in `InteractiveMomentDisplay.swift`.
    /// Player setup and lifecycle logic are in `InteractiveMomentActions.swift`.
    struct InteractiveMomentOverlayView: View {
        let avatarVideoUrl: String
        let avatarImageUrl: String
        let characterVideoUrl: String?
        let characterImageUrl: String?
        let onDismiss: () -> Void

        let circleSize: CGFloat = 120
        let transitionDelay: TimeInterval = 0.5
        let logger = BayitLogger(category: "InteractiveMoment")

        @State var phase: InteractionOverlayPhase = .avatarSpeaking
        @State var avatarPlayer: AVPlayer?
        @State var characterPlayer: AVPlayer?
        @State var isAvatarVideoReady = false
        @State var isCharacterVideoReady = false
        @State var avatarEndObserver: NSObjectProtocol?
        @State var characterEndObserver: NSObjectProtocol?

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
    }
#endif
