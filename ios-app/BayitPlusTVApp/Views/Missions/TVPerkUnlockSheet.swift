#if os(tvOS)
import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct TVPerkUnlockSheet: View {
    @Environment(LocalizationManager.self) private var localization

    let perkName: String
    let perkDescription: String
    let perkIcon: String
    let onDismiss: () -> Void

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            RadialGradient(
                colors: [
                    DesignTokens.Glass.purpleGlow,
                    Color.clear
                ],
                center: .center,
                startRadius: 50,
                endRadius: 600
            )
            .ignoresSafeArea()

            VStack(spacing: TVDesignTokens.Spacing.xxl) {
                Spacer()

                celebrationIcon

                perkDetails

                Spacer()

                dismissButton

                Spacer()
            }
            .padding(TVDesignTokens.Spacing.xxl)
        }
    }

    private var celebrationIcon: some View {
        ZStack {
            Circle()
                .fill(
                    RadialGradient(
                        colors: [
                            DesignTokens.Primary.p500,
                            DesignTokens.Primary.p700
                        ],
                        center: .center,
                        startRadius: 0,
                        endRadius: 150
                    )
                )
                .frame(width: 300, height: 300)
                .shadow(
                    color: DesignTokens.Primary.p500.opacity(0.5),
                    radius: 40,
                    x: 0,
                    y: 0
                )

            Image(systemName: perkIcon)
                .font(.system(size: 140, weight: .bold))
                .foregroundStyle(.white)
        }
        .padding(.top, TVDesignTokens.Spacing.xxxl)
    }

    private var perkDetails: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            Text(localization.t("gamification.perkUnlocked"))
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.secondary)
                .textCase(.uppercase)
                .tracking(2)

            Text(perkName)
                .font(.system(size: TVDesignTokens.FontSize.display, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .multilineTextAlignment(.center)
                .lineLimit(2)

            Text(perkDescription)
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .lineLimit(4)
                .frame(maxWidth: 800)
                .padding(.top, TVDesignTokens.Spacing.md)
        }
    }

    private var dismissButton: some View {
        Button {
            onDismiss()
        } label: {
            Text(localization.t("gamification.awesome"))
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 400, height: 80)
                .background(
                    LinearGradient(
                        colors: [
                            DesignTokens.Primary.p500,
                            DesignTokens.Primary.p700
                        ],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl))
                .shadow(
                    color: DesignTokens.Primary.p500.opacity(0.4),
                    radius: 20,
                    x: 0,
                    y: 10
                )
        }
        .buttonStyle(.card)
        .tvFocusStyle()
    }
}
#endif
