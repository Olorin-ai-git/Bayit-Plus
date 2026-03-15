#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - Background Layer (Layer 0)

    struct TVZehAniBackgroundLayer: View {
        var body: some View {
            LinearGradient(
                colors: [Color(hex: 0x0D0B1A), Color(hex: 0x1A0E2E)],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
        }
    }

    // MARK: - Ambient Glow Layer (Layer 1)

    struct TVZehAniAmbientGlowLayer: View {
        var body: some View {
            ZStack {
                RadialGradient(
                    gradient: Gradient(stops: [
                        .init(color: Color(hex: 0x7B2FBE).opacity(0.35), location: 0.0),
                        .init(color: Color(hex: 0x5B1F9E).opacity(0.15), location: 0.4),
                        .init(color: Color.clear, location: 0.75),
                    ]),
                    center: .init(x: 0.5, y: 0.35),
                    startRadius: 10,
                    endRadius: 450
                )
                RadialGradient(
                    gradient: Gradient(stops: [
                        .init(color: DesignTokens.Primary.p500.opacity(0.12), location: 0.0),
                        .init(color: Color.clear, location: 0.6),
                    ]),
                    center: .init(x: 0.5, y: 0.3),
                    startRadius: 5,
                    endRadius: 350
                )
                LinearGradient(
                    colors: [
                        Color.clear,
                        Color(hex: 0x2D1B69).opacity(0.2),
                        Color(hex: 0x1A0E2E).opacity(0.4),
                    ],
                    startPoint: .init(x: 0.5, y: 0.5),
                    endPoint: .bottom
                )
            }
        }
    }

    // MARK: - Status Bar Layer (Layer 5)

    struct TVZehAniStatusBarLayer: View {
        let localization: LocalizationManager

        @State private var currentTime: String = ""

        private let clock = Timer.publish(every: 60, on: .main, in: .common).autoconnect()

        var body: some View {
            VStack {
                HStack(alignment: .top) {
                    Text(localization.t("zehAni.title"))
                        .font(.system(size: 36, weight: .bold))
                        .foregroundColor(.white)
                        .padding(.leading, 80)
                        .padding(.top, 50)
                    Spacer()
                    HStack(spacing: 14) {
                        tvZehAniProfileRing
                        Text(currentTime)
                            .font(.system(size: 24, weight: .medium))
                            .foregroundColor(Color.white.opacity(0.85))
                    }
                    .padding(.trailing, 80)
                    .padding(.top, 50)
                }
                Spacer()
            }
            .onAppear { refreshTime() }
            .onReceive(clock) { _ in refreshTime() }
        }

        private var tvZehAniProfileRing: some View {
            ZStack {
                Circle()
                    .stroke(
                        LinearGradient(
                            colors: [DesignTokens.Primary.p500, Color(hex: 0x7C3AED)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 2.5
                    )
                    .frame(width: 44, height: 44)
                Image(systemName: "person.crop.circle.fill")
                    .resizable()
                    .frame(width: 36, height: 36)
                    .foregroundStyle(
                        LinearGradient(
                            colors: [DesignTokens.Primary.p400, Color(hex: 0x8B5CF6)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
            }
        }

        private func refreshTime() {
            let fmt = DateFormatter()
            fmt.timeStyle = .short
            currentTime = fmt.string(from: Date())
        }
    }
#endif
