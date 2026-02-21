import AVFoundation
import BayitDesignSystem
import BayitLocalization
import SwiftUI
import UIKit

/// Full-screen splash view with centered logo, slogan, staggered animations,
/// and language-specific MP3 intro audio. Mobile-optimized: ~3 seconds total, tap to skip.
struct SplashView: View {
    @Environment(LocalizationManager.self) var localization

    let onFinished: () -> Void

    @State var showLogo = false
    @State var showTextAnimation = false
    @State var showSlogan = false
    @State var fadeOut = false
    @State var audioPlayer: AVAudioPlayer?

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

    var isHebrew: Bool {
        localization.currentLanguage == .hebrew
    }

    /// Slide offset for the word part ("Bayit" or "בית").
    /// Hebrew (RTL): word enters from the right (+300 -> 0).
    /// LTR: word enters from the left (-300 -> 0).
    private var wordOffset: CGFloat {
        showTextAnimation ? 0 : (isHebrew ? 300 : -300)
    }

    /// Slide offset for the "+" sign.
    /// Hebrew (RTL): "+" enters from the left (-300 -> 0).
    /// LTR: "+" enters from the right (+300 -> 0).
    private var plusOffset: CGFloat {
        showTextAnimation ? 0 : (isHebrew ? -300 : 300)
    }

    private var logoSection: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            if let logoImage = UIImage(named: "logo") ?? loadBundleLogo() {
                Image(uiImage: logoImage)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 120, height: 60)
            }

            HStack(spacing: 0) {
                if isHebrew {
                    // Hebrew RTL: "+" first (from left), then "בית" (from right)
                    Text(localization.t("splash.plus"))
                        .foregroundColor(DesignTokens.Colors.Primary.base)
                        .font(.system(size: DesignTokens.FontSize.display, weight: .bold))
                        .offset(x: plusOffset)

                    Text(localization.t("splash.bayit"))
                        .foregroundColor(.white)
                        .font(.system(size: DesignTokens.FontSize.display, weight: .bold))
                        .offset(x: wordOffset)
                } else {
                    // LTR: "Bayit" first (from left), then "+" (from right)
                    Text(localization.t("splash.bayit"))
                        .foregroundColor(.white)
                        .font(.system(size: DesignTokens.FontSize.display, weight: .bold))
                        .offset(x: wordOffset)

                    Text(localization.t("splash.plus"))
                        .foregroundColor(DesignTokens.Colors.Primary.base)
                        .font(.system(size: DesignTokens.FontSize.display, weight: .bold))
                        .offset(x: plusOffset)
                }
            }
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

        // 0.3s delay then logo scales in
        try? await Task.sleep(for: .seconds(0.3))
        withAnimation(.easeOut(duration: 0.8)) {
            showLogo = true
        }

        // 0.4s after logo: text slides in from opposite sides
        try? await Task.sleep(for: .seconds(0.4))
        withAnimation(.easeInOut(duration: 0.6)) {
            showTextAnimation = true
        }

        // 1.2s after text: slogan fades in + slides up
        try? await Task.sleep(for: .seconds(1.2))
        withAnimation(.easeInOut(duration: 0.6)) {
            showSlogan = true
        }

        // Wait for audio to finish, then fade out
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
}
