import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct OnboardingLaunchView: View {
    @Environment(LocalizationManager.self) var localization
    let onComplete: () -> Void

    @State private var overlayOpacity: Double = 1.0
    @State private var overlayOffset: CGFloat = 0

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            welcomeOverlay
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .onAppear {
            withAnimation(.easeOut(duration: 0.8).delay(4.0)) {
                overlayOpacity = 0
                overlayOffset = -20
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) {
                onComplete()
            }
        }
        .onTapGesture {
            withAnimation(.easeOut(duration: 0.3)) {
                overlayOpacity = 0
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
                onComplete()
            }
        }
    }

    private var welcomeOverlay: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            Spacer()

            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 64))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(localization.t("onboarding.launch.title"))
                .font(.system(
                    size: DesignTokens.FontSize.xxl,
                    weight: .bold
                ))
                .foregroundStyle(DesignTokens.Text.primary)
                .multilineTextAlignment(.center)

            Text(localization.t("onboarding.launch.hint"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, DesignTokens.Spacing.xxl)

            Spacer()
            Spacer()
        }
        .opacity(overlayOpacity)
        .offset(y: overlayOffset)
    }
}
