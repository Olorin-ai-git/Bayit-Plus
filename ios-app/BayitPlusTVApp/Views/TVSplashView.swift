import AVKit
import BayitDesignSystem
import BayitLocalization
import SwiftUI
import UIKit

/// Full-screen splash view that plays a language-specific intro video
/// with the animated Bayit+ logo and slogan, matching the web app experience.
struct TVSplashView: View {
    @Environment(LocalizationManager.self) var localization

    let onFinished: () -> Void

    @State var player: AVPlayer?
    @State var showLogo = false
    @State var showSlogan = false
    @State var fadeOut = false
    @State var videoFinished = false

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if let player {
                SplashVideoLayer(player: player)
                    .ignoresSafeArea()
            }

            Color.black.opacity(0.3).ignoresSafeArea()

            // Slogan positioned below the video animation (~78% down)
            VStack {
                Spacer()
                    .frame(maxHeight: .infinity)

                if showSlogan {
                    sloganSection
                        .transition(.opacity.combined(with: .move(edge: .bottom)))
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
            .padding(.bottom, 80)

            // Powered by pinned to very bottom
            VStack {
                Spacer()
                poweredByFooter
                    .opacity(showLogo ? 1 : 0)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding(.bottom, TVDesignTokens.Spacing.md)
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
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.vertical, TVDesignTokens.Spacing.md)
            .background(Color.black.opacity(0.6))
            .clipShape(Capsule())
    }

    // MARK: - Footer

    private var poweredByFooter: some View {
        (Text("Powered by ")
            .foregroundColor(DesignTokens.Text.muted)
            + Text("Olorin.ai")
            .foregroundColor(DesignTokens.Colors.Primary.dark)
            + Text(" LLC")
            .foregroundColor(DesignTokens.Text.muted))
            .font(.system(size: TVDesignTokens.FontSize.sm))
    }
}
