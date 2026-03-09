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
        ZStack(alignment: .bottom) {
            featureImage
            glassOverlay
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .ignoresSafeArea(edges: .bottom)
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

    private var featureImage: some View {
        Image(imageName)
            .resizable()
            .aspectRatio(contentMode: .fill)
            .scaleEffect(imageScale)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .clipped()
            .overlay(
                LinearGradient(
                    colors: [.clear, .clear, .black.opacity(0.8)],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
    }

    private var glassOverlay: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            title

            Text(localization.t(subtitleKey))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)

            pillRow

            GlassButton(
                localization.t("onboarding.welcome.continue"),
                variant: .primary,
                size: .medium
            ) { onContinue() }
        }
        .padding(DesignTokens.Spacing.xl)
        .padding(.bottom, DesignTokens.Spacing.lg)
        .frame(maxWidth: .infinity)
        .background(.ultraThinMaterial)
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 30)
    }

    @ViewBuilder
    private var title: some View {
        if titleArgs.isEmpty {
            Text(localization.t(titleKey))
                .font(.system(
                    size: DesignTokens.FontSize.xl,
                    weight: .bold
                ))
                .foregroundStyle(DesignTokens.Text.primary)
                .multilineTextAlignment(.center)
        } else {
            Text(localization.t(titleKey, titleArgs))
                .font(.system(
                    size: DesignTokens.FontSize.xl,
                    weight: .bold
                ))
                .foregroundStyle(DesignTokens.Text.primary)
                .multilineTextAlignment(.center)
        }
    }

    private var pillRow: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            ForEach(pills, id: \.self) { pillKey in
                Text(localization.t(pillKey))
                    .font(.system(
                        size: DesignTokens.FontSize.xs,
                        weight: .medium
                    ))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .padding(.horizontal, DesignTokens.Spacing.md)
                    .padding(.vertical, DesignTokens.Spacing.sm)
                    .background(DesignTokens.Glass.bgLight)
                    .clipShape(Capsule())
            }
        }
    }
}
