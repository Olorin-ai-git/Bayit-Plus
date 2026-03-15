#if os(tvOS)
    import AVKit
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - Tutorials Sheet

    struct TVHelpTutorialsSheet: View {
        let tutorials: [VideoTutorial]
        let onDismiss: () -> Void

        @Environment(LocalizationManager.self) private var localization
        @State private var playingTutorial: VideoTutorial?

        var body: some View {
            ZStack {
                LinearGradient(
                    stops: [
                        .init(color: Color(hex: 0x0D0B1A), location: 0.00),
                        .init(color: Color(hex: 0x1A1040), location: 0.35),
                        .init(color: Color(hex: 0x120E2E), location: 0.60),
                        .init(color: Color(hex: 0x0A0818), location: 1.00),
                    ],
                    startPoint: UnitPoint(x: 0.33, y: 0.03),
                    endPoint: UnitPoint(x: 0.67, y: 0.97)
                )
                .ignoresSafeArea()

                VStack(spacing: 0) {
                    TVProfileSheetHeader(
                        title: localization.t("settings.help.videoTutorials"),
                        onDismiss: onDismiss
                    )
                    if tutorials.isEmpty {
                        Spacer()
                        Text(localization.t("settings.help.noTutorialsAvailable"))
                            .font(.system(size: 28))
                            .foregroundColor(.white.opacity(0.4))
                        Spacer()
                    } else {
                        ScrollView(.horizontal, showsIndicators: false) {
                            LazyHStack(spacing: 32) {
                                ForEach(Array(tutorials.enumerated()), id: \.element.id) { i, tutorial in
                                    TVTutorialCard(tutorial: tutorial, delay: Double(i) * 0.07) {
                                        playingTutorial = tutorial
                                    }
                                }
                            }
                            .padding(.horizontal, 80)
                            .padding(.vertical, 48)
                        }
                    }
                }
            }
            .preferredColorScheme(.dark)
            .onExitCommand { onDismiss() }
            .fullScreenCover(item: $playingTutorial) { tutorial in
                TVTutorialPlayerView(tutorial: tutorial) { playingTutorial = nil }
            }
        }
    }

    // MARK: - Tutorial Card

    private struct TVTutorialCard: View {
        let tutorial: VideoTutorial
        let delay: Double
        let onPlay: () -> Void

        @State private var appeared = false

        @ViewBuilder
        private var thumbnailView: some View {
            if UIImage(named: tutorial.thumbnailAssetName) != nil {
                Image(tutorial.thumbnailAssetName)
                    .resizable()
                    .aspectRatio(16 / 9, contentMode: .fill)
                    .frame(width: 380, height: 214)
                    .clipped()
            } else {
                LinearGradient(
                    colors: [Color(hex: 0x1E1040), Color(hex: 0x0D0820)],
                    startPoint: .topLeading, endPoint: .bottomTrailing
                )
                .frame(width: 380, height: 214)
                .overlay(
                    Image(systemName: "play.circle")
                        .font(.system(size: 56))
                        .foregroundColor(.white.opacity(0.25))
                )
            }
        }

        var body: some View {
            Button(action: onPlay) {
                VStack(alignment: .leading, spacing: 0) {
                    ZStack(alignment: .bottomTrailing) {
                        thumbnailView

                        Text(tutorial.formattedDuration)
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 5)
                            .background(Color.black.opacity(0.75))
                            .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
                            .padding(10)
                    }
                    .frame(width: 380, height: 214)
                    .clipShape(UnevenRoundedRectangle(topLeadingRadius: 16, bottomLeadingRadius: 0, bottomTrailingRadius: 0, topTrailingRadius: 16))

                    VStack(alignment: .leading, spacing: 6) {
                        Text(tutorial.title)
                            .font(.system(size: 26, weight: .bold))
                            .foregroundColor(.white)
                            .lineLimit(1)
                        Text(tutorial.description)
                            .font(.system(size: 20, weight: .regular))
                            .foregroundColor(.white.opacity(0.55))
                            .lineLimit(2)
                    }
                    .padding(.horizontal, 20)
                    .padding(.vertical, 18)
                    .frame(width: 380, alignment: .leading)
                }
                .frame(width: 380)
                .background(Color.white.opacity(0.05))
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .stroke(Color.white.opacity(0.09), lineWidth: 1)
                )
            }
            .tvCardStyle()
            .opacity(appeared ? 1 : 0)
            .offset(y: appeared ? 0 : 32)
            .onAppear {
                withAnimation(.easeOut(duration: 0.5).delay(delay)) { appeared = true }
            }
        }
    }

    // MARK: - AVPlayer Full-Screen Wrapper

    struct TVTutorialPlayerView: UIViewControllerRepresentable {
        let tutorial: VideoTutorial
        let onDismiss: () -> Void

        func makeUIViewController(context: Context) -> AVPlayerViewController {
            guard let url = URL(string: tutorial.videoUrl) else {
                return AVPlayerViewController()
            }
            let player = AVPlayer(url: url)
            let vc = AVPlayerViewController()
            vc.player = player
            vc.showsPlaybackControls = true
            player.play()
            context.coordinator.vc = vc
            context.coordinator.onDismiss = onDismiss
            NotificationCenter.default.addObserver(
                context.coordinator,
                selector: #selector(Coordinator.playerDidFinish),
                name: .AVPlayerItemDidPlayToEndTime,
                object: player.currentItem
            )
            return vc
        }

        func updateUIViewController(_: AVPlayerViewController, context _: Context) {}

        func makeCoordinator() -> Coordinator {
            Coordinator()
        }

        final class Coordinator: NSObject {
            weak var vc: AVPlayerViewController?
            var onDismiss: (() -> Void)?

            @objc func playerDidFinish() {
                onDismiss?()
            }
        }
    }

    private extension VideoTutorial {
        var formattedDuration: String {
            let m = durationSeconds / 60
            let s = durationSeconds % 60
            return String(format: "%d:%02d", m, s)
        }
    }
#endif
