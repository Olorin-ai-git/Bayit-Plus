#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - Hero Content Extension (Layer 2)

    extension TVZehAniHubView {
        var tvZehAniHeroLayer: some View {
            VStack(spacing: 8) {
                TVZehAniHolographicAvatar()
                    .frame(width: 500, height: 460)
                Text(localization.t("zehAni.subtitle"))
                    .font(.system(size: 36, weight: .semibold))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [.white, Color.white.opacity(0.85)],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .shadow(
                        color: Color(hex: 0x7B2FBE).opacity(0.5),
                        radius: 20, x: 0, y: 0
                    )
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .padding(.top, 80)
        }
    }

    // MARK: - Holographic Avatar

    struct TVZehAniHolographicAvatar: View {
        @State private var glowPhase: CGFloat = 0

        var body: some View {
            ZStack {
                Ellipse()
                    .stroke(
                        AngularGradient(
                            gradient: Gradient(colors: [
                                DesignTokens.Primary.p500.opacity(0.6),
                                Color(hex: 0x7C3AED).opacity(0.3),
                                DesignTokens.Primary.p400.opacity(0.5),
                                Color(hex: 0x8B5CF6).opacity(0.2),
                                DesignTokens.Primary.p500.opacity(0.6),
                            ]),
                            center: .center,
                            startAngle: .degrees(glowPhase),
                            endAngle: .degrees(glowPhase + 360)
                        ),
                        lineWidth: 4
                    )
                    .frame(width: 440, height: 440)
                    .blur(radius: 12)
                Ellipse()
                    .stroke(
                        AngularGradient(
                            gradient: Gradient(colors: [
                                DesignTokens.Primary.p400.opacity(0.4),
                                Color(hex: 0x7C3AED).opacity(0.6),
                                DesignTokens.Primary.p500.opacity(0.3),
                                DesignTokens.Primary.p400.opacity(0.4),
                            ]),
                            center: .center,
                            startAngle: .degrees(-glowPhase),
                            endAngle: .degrees(-glowPhase + 360)
                        ),
                        lineWidth: 2
                    )
                    .frame(width: 420, height: 420)
                Image("zehani-avatar")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 400, height: 400)
            }
            .onAppear {
                withAnimation(.linear(duration: 8).repeatForever(autoreverses: false)) {
                    glowPhase = 360
                }
            }
        }
    }
#endif
