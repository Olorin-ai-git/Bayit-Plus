import AVKit
import BayitDesignSystem
import BayitLocalization
import SwiftUI
import UIKit

/// Full-screen splash view that plays a language-specific intro video
/// with the animated Bayit+ logo and slogan, matching the web app experience.
struct TVSplashView: View {
    @Environment(LocalizationManager.self) private var localization

    let onFinished: () -> Void

    @State private var player: AVPlayer?
    @State private var showLogo = false
    @State private var showSlogan = false
    @State private var fadeOut = false
    @State private var videoFinished = false

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if let player {
                SplashVideoLayer(player: player)
                    .ignoresSafeArea()
            }

            Color.black.opacity(0.3).ignoresSafeArea()

            VStack(spacing: TVDesignTokens.Spacing.md) {
                Spacer()

                if showSlogan {
                    sloganSection
                        .transition(.opacity.combined(with: .move(edge: .bottom)))
                }

                poweredByFooter
                    .opacity(showLogo ? 1 : 0)
                    .padding(.top, TVDesignTokens.Spacing.lg)
            }
            .padding(TVDesignTokens.Spacing.xxl)
        }
        .opacity(fadeOut ? 0 : 1)
        .task {
            await startSplash()
        }
    }

    // MARK: - Logo Section

    private var logoSection: some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            if let logoImage = UIImage(named: "logo") ?? loadBundleLogo() {
                Image(uiImage: logoImage)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 240, height: 120)
            }

            (Text("Bayit")
                .foregroundColor(.white)
            + Text("+")
                .foregroundColor(DesignTokens.Colors.Primary.base))
                .font(.system(size: TVDesignTokens.FontSize.hero, weight: .bold))
        }
    }

    // MARK: - Slogan Section

    private var sloganSection: some View {
        Text(localizedSlogan)
            .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .medium))
            .foregroundStyle(
                LinearGradient(
                    colors: [
                        DesignTokens.Colors.Primary.light,
                        DesignTokens.Colors.Primary.base,
                    ],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .multilineTextAlignment(.center)
    }

    // MARK: - Footer

    private var poweredByFooter: some View {
        Text("Powered by Olorin.ai")
            .font(.system(size: TVDesignTokens.FontSize.sm))
            .foregroundStyle(DesignTokens.Text.muted)
    }

    // MARK: - Logic

    private func startSplash() async {
        guard let url = introVideoURL else {
            showLogoAndFinish()
            return
        }

        let avPlayer = AVPlayer(url: url)
        player = avPlayer

        withAnimation(.easeOut(duration: 0.7)) {
            showLogo = true
        }

        avPlayer.play()

        // Wait for video to finish or timeout after 10 seconds
        await withTaskGroup(of: Void.self) { group in
            group.addTask {
                await waitForVideoEnd(avPlayer)
            }
            group.addTask {
                try? await Task.sleep(for: .seconds(10))
            }
            // First one to complete wins
            await group.next()
            group.cancelAll()
        }

        // Show slogan briefly
        withAnimation(.easeInOut(duration: 0.5)) {
            showSlogan = true
        }

        try? await Task.sleep(for: .seconds(1.5))

        // Fade out and finish
        withAnimation(.easeInOut(duration: 0.5)) {
            fadeOut = true
        }

        try? await Task.sleep(for: .seconds(0.5))
        onFinished()
    }

    private func showLogoAndFinish() {
        withAnimation(.easeOut(duration: 0.7)) {
            showLogo = true
        }

        Task {
            try? await Task.sleep(for: .seconds(2))

            withAnimation(.easeInOut(duration: 0.5)) {
                showSlogan = true
            }

            try? await Task.sleep(for: .seconds(1.5))

            withAnimation(.easeInOut(duration: 0.5)) {
                fadeOut = true
            }

            try? await Task.sleep(for: .seconds(0.5))
            onFinished()
        }
    }

    private func waitForVideoEnd(_ avPlayer: AVPlayer) async {
        await withCheckedContinuation { continuation in
            NotificationCenter.default.addObserver(
                forName: AVPlayerItem.didPlayToEndTimeNotification,
                object: avPlayer.currentItem,
                queue: .main
            ) { _ in
                continuation.resume()
            }
        }
    }

    // MARK: - Helpers

    private var introVideoURL: URL? {
        let isHebrew = localization.currentLanguage == .hebrew
        let fileName = isHebrew ? "Bayit_Intro_Hebrew" : "Bayit_Intro_English"
        return Bundle.main.url(forResource: fileName, withExtension: "mp4")
    }

    private var localizedSlogan: String {
        let slogans: [Language: String] = [
            .hebrew: "\u{05D4}\u{05D1}\u{05D9}\u{05EA} \u{05E9}\u{05DC}\u{05DA}. \u{05D1}\u{05DB}\u{05DC} \u{05DE}\u{05E7}\u{05D5}\u{05DD}.",
            .english: "Your Home. Anywhere.",
            .spanish: "Tu Casa. En Todas Partes.",
            .chinese: "\u{60A8}\u{7684}\u{5BB6}\u{FF0C}\u{968F}\u{5904}\u{53EF}\u{53CA}\u{3002}",
            .french: "Votre Maison. Partout.",
            .italian: "La Tua Casa. Ovunque.",
            .hindi: "\u{0906}\u{092A}\u{0915}\u{093E} \u{0918}\u{0930}\u{0964} \u{0915}\u{0939}\u{0940}\u{0902} \u{092D}\u{0940}\u{0964}",
            .tamil: "\u{0B89}\u{0B99}\u{0BCD}\u{0B95}\u{0BB3}\u{0BCD} \u{0BB5}\u{0BC0}\u{0B9F}\u{0BC1}. \u{0B8E}\u{0B99}\u{0BCD}\u{0B95}\u{0BC1}\u{0BAE}\u{0BCD}.",
            .bengali: "\u{0986}\u{09AA}\u{09A8}\u{09BE}\u{09B0} \u{09AC}\u{09BE}\u{09A1}\u{09BC}\u{09BF}\u{0964} \u{09AF}\u{09C7}\u{0995}\u{09CB}\u{09A8}\u{09CB} \u{099C}\u{09BE}\u{09AF}\u{09BC}\u{0997}\u{09BE}\u{09AF}\u{09BC}\u{0964}",
            .japanese: "\u{3042}\u{306A}\u{305F}\u{306E}\u{5BB6}\u{3001}\u{3069}\u{3053}\u{3067}\u{3082}\u{3002}",
        ]
        return slogans[localization.currentLanguage] ?? slogans[.english] ?? "Your Home. Anywhere."
    }

    private func loadBundleLogo() -> UIImage? {
        guard let url = Bundle.main.url(forResource: "logo", withExtension: "png"),
              let data = try? Data(contentsOf: url) else { return nil }
        return UIImage(data: data)
    }
}

// MARK: - Video Layer (no controls)

private struct SplashVideoLayer: UIViewRepresentable {
    let player: AVPlayer

    func makeUIView(context: Context) -> UIView {
        let view = SplashPlayerView()
        view.player = player
        return view
    }

    func updateUIView(_ uiView: UIView, context: Context) {}
}

private final class SplashPlayerView: UIView {
    var player: AVPlayer? {
        didSet { playerLayer.player = player }
    }

    override class var layerClass: AnyClass { AVPlayerLayer.self }

    private var playerLayer: AVPlayerLayer {
        layer as! AVPlayerLayer
    }

    override init(frame: CGRect) {
        super.init(frame: frame)
        playerLayer.videoGravity = .resizeAspectFill
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { nil }
}
