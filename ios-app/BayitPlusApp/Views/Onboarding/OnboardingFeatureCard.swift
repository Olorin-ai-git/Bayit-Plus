import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct OnboardingFeatureCard: View {
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
        .contentShape(Rectangle())
        .gesture(
            DragGesture(minimumDistance: 50)
                .onEnded { value in
                    if value.translation.width < -50 {
                        onContinue()
                    }
                }
        )
        .onAppear {
            withAnimation(
                .easeInOut(duration: 25).repeatForever(autoreverses: true)
            ) {
                imageScale = 1.1
            }
            withAnimation(.easeOut(duration: 0.6).delay(0.2)) {
                appeared = true
            }
        }
        .onDisappear { appeared = false }
    }

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
                        .init(color: .clear, location: 0.45),
                        .init(color: .black.opacity(0.4), location: 0.58),
                        .init(color: .black.opacity(0.85), location: 0.70),
                        .init(color: .black.opacity(0.96), location: 0.80),
                        .init(color: .black, location: 0.88),
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
    }

    private var contentOverlay: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            title

            Text(localization.t(subtitleKey))
                .font(.system(size: DesignTokens.FontSize.base))
                .foregroundStyle(.white.opacity(0.7))
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)

            pillRow

            GlassButton(
                localization.t("onboarding.welcome.continue"),
                variant: .primary,
                size: .large
            ) { onContinue() }
                .padding(.top, 4)
        }
        .padding(.horizontal, DesignTokens.Spacing.xl)
        .padding(.bottom, 50)
        .frame(maxWidth: .infinity)
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 30)
    }

    @ViewBuilder
    private var title: some View {
        let text = titleArgs.isEmpty
            ? localization.t(titleKey)
            : localization.t(titleKey, titleArgs)

        Text(text)
            .font(.system(size: DesignTokens.FontSize.xxl, weight: .bold))
            .foregroundStyle(.white)
            .multilineTextAlignment(.center)
    }

    private var pillRow: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            ForEach(pills, id: \.self) { pillKey in
                Text(localization.t(pillKey))
                    .font(.system(
                        size: DesignTokens.FontSize.sm,
                        weight: .medium
                    ))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
                    .padding(.horizontal, DesignTokens.Spacing.md)
                    .padding(.vertical, DesignTokens.Spacing.sm)
                    .background(.white.opacity(0.15))
                    .clipShape(Capsule())
            }
        }
    }
}
