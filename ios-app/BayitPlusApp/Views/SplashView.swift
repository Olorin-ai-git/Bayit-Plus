import AVFoundation
import BayitDesignSystem
import BayitLocalization
import SwiftUI
import UIKit

/// Full-screen splash view with centered logo, slogan, staggered animations,
/// and language-specific MP3 intro audio. Mobile-optimized: ~3 seconds total, tap to skip.
struct SplashView: View {
    @Environment(LocalizationManager.self) private var localization

    let onFinished: () -> Void

    @State private var showLogo = false
    @State private var showSlogan = false
    @State private var fadeOut = false
    @State private var audioPlayer: AVAudioPlayer?

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: DesignTokens.Spacing.xl) {
                Spacer()

                logoSection
                    .scaleEffect(showLogo ? 1.0 : 0.85)
                    .opacity(showLogo ? 1 : 0)

                if showSlogan {
                    sloganSection
                        .transition(.opacity.combined(with: .move(edge: .bottom)))
                }

                Spacer()

                poweredByFooter
                    .opacity(showLogo ? 1 : 0)
                    .padding(.bottom, DesignTokens.Spacing.lg)
            }
            .padding(.horizontal, DesignTokens.Spacing.xl)
        }
        .opacity(fadeOut ? 0 : 1)
        .onTapGesture { skipSplash() }
        .task { await startSplash() }
    }

    // MARK: - Logo

    private var logoSection: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            if let logoImage = UIImage(named: "logo") ?? loadBundleLogo() {
                Image(uiImage: logoImage)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 120, height: 60)
            }

            (Text(localization.t("splash.bayit"))
                .foregroundColor(.white)
            + Text(localization.t("splash.plus"))
                .foregroundColor(DesignTokens.Colors.Primary.base))
                .font(.system(size: DesignTokens.FontSize.display, weight: .bold))
        }
    }

    // MARK: - Slogan

    private var sloganSection: some View {
        Text(localizedSlogan)
            .font(.system(size: DesignTokens.FontSize.xl, weight: .medium))
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
        Text(localization.t("splash.poweredBy"))
            .font(.system(size: DesignTokens.FontSize.sm))
            .foregroundStyle(DesignTokens.Text.muted)
    }

    // MARK: - Logic

    private func startSplash() async {
        playIntroAudio()

        // 0.5s delay then logo scales in
        try? await Task.sleep(for: .seconds(0.5))
        withAnimation(.easeOut(duration: 0.8)) {
            showLogo = true
        }

        // ~2s mark: slogan fades in + slides up
        try? await Task.sleep(for: .seconds(1.5))
        withAnimation(.easeInOut(duration: 0.6)) {
            showSlogan = true
        }

        // Wait for audio to finish (~7-8s total), then fade out
        try? await Task.sleep(for: .seconds(5.0))
        withAnimation(.easeInOut(duration: 0.5)) {
            fadeOut = true
        }

        try? await Task.sleep(for: .seconds(0.5))
        stopAudioAndFinish()
    }

    private func skipSplash() {
        guard !fadeOut else { return }
        withAnimation(.easeInOut(duration: 0.4)) {
            fadeOut = true
        }
        Task {
            try? await Task.sleep(for: .seconds(0.4))
            stopAudioAndFinish()
        }
    }

    // MARK: - Audio

    private func playIntroAudio() {
        let isHebrew = localization.currentLanguage == .hebrew
        let fileName = isHebrew ? "Bayit_Intro_Hebrew" : "Bayit_Intro_English"
        guard let url = Bundle.main.url(forResource: fileName, withExtension: "mp3") else { return }
        do {
            let player = try AVAudioPlayer(contentsOf: url)
            player.prepareToPlay()
            player.play()
            audioPlayer = player
        } catch {
            // Audio is non-critical; splash continues without sound
        }
    }

    private func stopAudioAndFinish() {
        audioPlayer?.stop()
        audioPlayer = nil
        onFinished()
    }

    // MARK: - Helpers

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
        return slogans[localization.currentLanguage]
            ?? slogans[.english]
            ?? "Your Home. Anywhere."
    }

    private func loadBundleLogo() -> UIImage? {
        guard let url = Bundle.main.url(forResource: "logo", withExtension: "png"),
              let data = try? Data(contentsOf: url) else { return nil }
        return UIImage(data: data)
    }
}
