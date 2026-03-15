#if os(tvOS)
    import BayitDesignSystem
    import SwiftUI

    // MARK: - Card Thumbnail (per card type)

    struct TVZehAniCardThumbnail: View {
        let card: ZehAniFeatureCard

        var body: some View {
            ZStack {
                switch card {
                case .magicMirror: magicMirrorContent
                case .highlights: highlightReelsContent
                case .movieInteractions: movieInteractionsContent
                }
            }
        }

        private var magicMirrorContent: some View {
            ZStack {
                LinearGradient(
                    colors: [Color(hex: 0x1E3A5F), Color(hex: 0x2D1B69)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                RoundedRectangle(cornerRadius: 8)
                    .stroke(DesignTokens.Primary.p500.opacity(0.5), lineWidth: 1.5)
                    .frame(width: 120, height: 150)
                    .overlay(
                        Image(systemName: "person.fill")
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(width: 50, height: 60)
                            .foregroundColor(Color(hex: 0x60A5FA).opacity(0.5))
                    )
                TVZehAniSparkleOverlay()
            }
        }

        private var highlightReelsContent: some View {
            ZStack {
                LinearGradient(
                    colors: [Color(hex: 0x2D1B69), Color(hex: 0x4C1D95)],
                    startPoint: .leading,
                    endPoint: .trailing
                )
                HStack(spacing: 8) {
                    ForEach(0 ..< 3, id: \.self) { i in
                        RoundedRectangle(cornerRadius: 8)
                            .fill(Color.white.opacity(0.1))
                            .frame(width: 90, height: 120)
                            .overlay(
                                Image(systemName: "play.circle.fill")
                                    .foregroundColor(.white.opacity(0.6))
                                    .font(.system(size: 24))
                            )
                            .rotationEffect(.degrees(Double(i - 1) * 5))
                    }
                }
            }
        }

        private var movieInteractionsContent: some View {
            ZStack {
                LinearGradient(
                    colors: [Color(hex: 0x1A0E2E), Color(hex: 0x2D1B69)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                VStack(alignment: .trailing, spacing: 8) {
                    TVZehAniChatBubble(text: "What would you do?", isUser: false)
                    TVZehAniChatBubble(text: "Join the scene!", isUser: true)
                }
                .padding()
                HStack {
                    Spacer()
                    Image(systemName: "person.fill")
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 40, height: 50)
                        .foregroundColor(DesignTokens.Primary.p500.opacity(0.3))
                        .padding(.trailing, 16)
                        .padding(.bottom, 8)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
            }
        }
    }

    // MARK: - Chat Bubble

    struct TVZehAniChatBubble: View {
        let text: String
        let isUser: Bool

        var body: some View {
            Text(text)
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(.white)
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(
                            isUser
                                ? Color(hex: 0x7C3AED).opacity(0.6)
                                : Color.white.opacity(0.15)
                        )
                )
        }
    }

    // MARK: - Sparkle Overlay

    struct TVZehAniSparkleOverlay: View {
        var body: some View {
            ZStack {
                Image(systemName: "sparkle")
                    .foregroundColor(DesignTokens.Primary.p400.opacity(0.7))
                    .font(.system(size: 14))
                    .offset(x: -60, y: -40)
                Image(systemName: "sparkle")
                    .foregroundColor(DesignTokens.Primary.p500.opacity(0.5))
                    .font(.system(size: 10))
                    .offset(x: 70, y: -50)
                Image(systemName: "sparkle")
                    .foregroundColor(Color(hex: 0xE9D5FF).opacity(0.4))
                    .font(.system(size: 12))
                    .offset(x: 50, y: 40)
            }
        }
    }
#endif
