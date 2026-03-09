import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Full-screen feature card for tvOS onboarding, matching iOS OnboardingFeatureCard.
/// Shows background image with Ken Burns effect, gradient overlay, title, subtitle, pills.
struct TVOnboardingFeatureCard: View {
    @Environment(LocalizationManager.self) var localization

    let imageName: String
    let titleKey: String
    var titleArgs: [String: String] = [:]
    let subtitleKey: String
    let pills: [String]
    let onContinue: () -> Void

    @State private var imageScale: CGFloat = 1.0
    @State private var appeared = false

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .bottom) {
                featureImage(size: geo.size)
                contentOverlay
            }
        }
        .ignoresSafeArea()
        .onAppear {
            withAnimation(
                .easeInOut(duration: 30).repeatForever(autoreverses: true)
            ) {
                imageScale = 1.08
            }
            withAnimation(.easeOut(duration: 0.6).delay(0.2)) {
                appeared = true
            }
        }
        .onDisappear { appeared = false }
    }

    // MARK: - Background Image

    private func featureImage(size: CGSize) -> some View {
        Image(imageName)
            .resizable()
            .aspectRatio(contentMode: .fill)
            .scaleEffect(imageScale)
            .frame(width: size.width, height: size.height, alignment: .top)
            .clipped()
            .overlay(
                LinearGradient(
                    stops: [
                        .init(color: .clear, location: 0.0),
                        .init(color: .clear, location: 0.35),
                        .init(color: .black.opacity(0.4), location: 0.50),
                        .init(color: .black.opacity(0.85), location: 0.62),
                        .init(color: .black.opacity(0.96), location: 0.72),
                        .init(color: .black, location: 0.80),
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
    }

    // MARK: - Content Overlay

    private var contentOverlay: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            title

            Text(localization.t(subtitleKey))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(.white.opacity(0.7))
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: 900)

            pillRow
                .padding(.top, TVDesignTokens.Spacing.xs)

            GlassButton(
                localization.t("onboarding.welcome.continue"),
                variant: .primary,
                size: .large,
                icon: Image(systemName: "arrow.right")
            ) { onContinue() }
                .padding(.top, TVDesignTokens.Spacing.sm)
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxxxl)
        .padding(.bottom, TVDesignTokens.Spacing.xxxl)
        .frame(maxWidth: .infinity)
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 40)
    }

    // MARK: - Title

    @ViewBuilder
    private var title: some View {
        let text = titleArgs.isEmpty
            ? localization.t(titleKey)
            : localization.t(titleKey, titleArgs)

        Text(text)
            .font(.system(size: TVDesignTokens.FontSize.xxxl, weight: .bold))
            .foregroundStyle(.white)
            .multilineTextAlignment(.center)
    }

    // MARK: - Pills

    private var pillRow: some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            ForEach(pills, id: \.self) { pillKey in
                Text(localization.t(pillKey))
                    .font(.system(
                        size: TVDesignTokens.FontSize.base,
                        weight: .medium
                    ))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
                    .padding(.horizontal, TVDesignTokens.Spacing.lg)
                    .padding(.vertical, TVDesignTokens.Spacing.md)
                    .background(.white.opacity(0.15))
                    .clipShape(Capsule())
            }
        }
    }
}
