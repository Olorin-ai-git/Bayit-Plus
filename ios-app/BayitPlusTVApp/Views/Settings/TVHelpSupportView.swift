#if os(tvOS)
    import BayitDesignSystem
    import SwiftUI

    // MARK: - Design Tokens

    // Extracted from Figma Make source: theme.css, App.tsx, FeatureCards.tsx, QuickTips.tsx, CommonQuestions.tsx

    private enum DS {
        // MARK: Background

        // App.tsx: linear-gradient(160deg, #0d0b1a 0%, #1a1040 35%, #120e2e 60%, #0a0818 100%)
        // CSS 160° → SwiftUI: start=(0.33, 0.03), end=(0.67, 0.97)  (sin/cos decomposition of 160°)
        static let backgroundGradient = LinearGradient(
            stops: [
                .init(color: Color(hex: 0x0D0B1A), location: 0.00),
                .init(color: Color(hex: 0x1A1040), location: 0.35),
                .init(color: Color(hex: 0x120E2E), location: 0.60),
                .init(color: Color(hex: 0x0A0818), location: 1.00),
            ],
            startPoint: UnitPoint(x: 0.33, y: 0.03),
            endPoint: UnitPoint(x: 0.67, y: 0.97)
        )

        // MARK: Feature Cards

        // FeatureCards.tsx: isHighlighted card
        static let cardHighlightedFill = Color(hex: 0xA855F7).opacity(0.08)
        static let cardHighlightedBorder = Color(hex: 0xA855F7).opacity(0.55)
        static let cardHighlightedGlow = Color(hex: 0xA855F7).opacity(0.20)
        // FeatureCards.tsx: normal card
        static let cardNormalFill = Color.white.opacity(0.04)
        static let cardNormalBorder = Color.white.opacity(0.07)

        // MARK: Icon Gradients  (FeatureCards.tsx accentColor values, 135° = top-leading → bottom-trailing)

        static let gradientAI = LinearGradient(
            colors: [Color(hex: 0x7C3AED), Color(hex: 0xA855F7)],
            startPoint: .topLeading, endPoint: .bottomTrailing
        )
        static let gradientVideo = LinearGradient(
            colors: [Color(hex: 0x16A34A), Color(hex: 0x22C55E)],
            startPoint: .topLeading, endPoint: .bottomTrailing
        )
        static let gradientContact = LinearGradient(
            colors: [Color(hex: 0x6366F1), Color(hex: 0x818CF8)],
            startPoint: .topLeading, endPoint: .bottomTrailing
        )

        // MARK: Question Mark

        // QuestionMark.tsx: linear-gradient(175deg, #f0d0ff … #8030c0) — 175° ≈ straight down
        static let gradientQuestionMark = LinearGradient(
            colors: [
                Color(hex: 0xF0D0FF),
                Color(hex: 0xD8A0F8),
                Color(hex: 0xC080F0),
                Color(hex: 0xA050E0),
                Color(hex: 0x8030C0),
            ],
            startPoint: .top, endPoint: .bottom
        )

        // MARK: Panels  (QuickTips.tsx / CommonQuestions.tsx)

        static let panelFill = Color.white.opacity(0.03)
        static let panelBorder = Color.white.opacity(0.06)
        static let rowFill = Color.white.opacity(0.05)

        // MARK: Corner Radii (scaled for tvOS)

        static let r2xl: CGFloat = 24
        static let rxl: CGFloat = 16
        static let rmd: CGFloat = 12

        // MARK: Spacing (scaled for tvOS)

        static let gap: CGFloat = 24
        static let pagePad: CGFloat = 80
    }

    // MARK: - Root View

    struct HelpSupportView: View {
        var body: some View {
            ZStack {
                DS.backgroundGradient.ignoresSafeArea()
                AmbientGlows().ignoresSafeArea()

                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: DS.gap) {
                        HeaderRow()
                        FeatureCardsSection()
                        BottomSection()
                    }
                    .padding(DS.pagePad)
                }
            }
            .preferredColorScheme(.dark)
        }
    }

    // MARK: - Ambient Glow Layers

    // App.tsx: three fixed radial gradients behind all content

    private struct AmbientGlows: View {
        var body: some View {
            GeometryReader { geo in
                ZStack {
                    // Top-centre purple haze  rgba(100,40,160,0.14)
                    RadialGradient(
                        colors: [Color(hex: 0x6428A0).opacity(0.14), .clear],
                        center: .center, startRadius: 0,
                        endRadius: geo.size.width * 0.4
                    )
                    .frame(width: geo.size.width * 0.8, height: geo.size.height * 0.55)
                    .position(x: geo.size.width * 0.55, y: -geo.size.height * 0.05)

                    // Bottom-right haze  rgba(60,20,120,0.08)
                    RadialGradient(
                        colors: [Color(hex: 0x3C1478).opacity(0.08), .clear],
                        center: .center, startRadius: 0,
                        endRadius: geo.size.width * 0.25
                    )
                    .frame(width: geo.size.width * 0.5, height: geo.size.height * 0.45)
                    .position(x: geo.size.width * 0.975, y: geo.size.height * 1.025)

                    // Top-right glow (behind question mark)  rgba(180,80,255,0.10)
                    RadialGradient(
                        colors: [Color(hex: 0xB450FF).opacity(0.10), .clear],
                        center: .center, startRadius: 0,
                        endRadius: geo.size.width * 0.15
                    )
                    .frame(width: geo.size.width * 0.30, height: geo.size.height * 0.30)
                    .position(x: geo.size.width * 0.96, y: geo.size.height * 0.17)
                }
                .allowsHitTesting(false)
            }
        }
    }

    // MARK: - Status Bar

    // StatusBar.tsx: Apple TV pill + wifi + headphones icons  (py-2, gap-4)

    private struct StatusBarRow: View {
        @State private var visible = false

        var body: some View {
            HStack(spacing: 16) {
                // Apple TV badge — px-3 py-1 rounded-md bg-white/10
                HStack(spacing: 6) {
                    Image(systemName: "apple.logo")
                        .font(.system(size: 20, weight: .medium))
                        .foregroundColor(.white.opacity(0.9))
                    Text("tv")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.white.opacity(0.9))
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 4)
                .background(Color.white.opacity(0.10))
                .clipShape(RoundedRectangle(cornerRadius: DS.rmd, style: .continuous))

                Image(systemName: "wifi")
                    .font(.system(size: 13))
                    .foregroundColor(.white.opacity(0.6))

                Image(systemName: "headphones")
                    .font(.system(size: 13))
                    .foregroundColor(.white.opacity(0.6))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
            .opacity(visible ? 1 : 0)
            .offset(y: visible ? 0 : -12)
            .onAppear {
                withAnimation(.easeOut(duration: 0.5)) { visible = true }
            }
        }
    }

    // MARK: - Header Row

    // App.tsx: 44px bold title (letterSpacing -0.02em) + animated question mark

    private struct HeaderRow: View {
        @State private var titleVisible = false

        var body: some View {
            HStack(alignment: .top) {
                Text("Help & Support")
                    .font(.system(size: 72, weight: .bold, design: .default))
                    .foregroundColor(.white)
                    .kerning(-1.44)
                    .opacity(titleVisible ? 1 : 0)
                    .offset(x: titleVisible ? 0 : -24)
                    .onAppear {
                        withAnimation(.easeOut(duration: 0.6).delay(0.15)) { titleVisible = true }
                    }

                Spacer()
                QuestionMarkView()
            }
            .frame(minHeight: 160)
        }
    }

    // MARK: - Question Mark

    // QuestionMark.tsx: pulsing radial glow + floating gradient "?" glyph (110px weight-800)

    private struct QuestionMarkView: View {
        @State private var appeared = false
        @State private var floatOffset: CGFloat = 0
        @State private var pulseScale: CGFloat = 1.0
        @State private var pulseOpacity: Double = 0.8

        var body: some View {
            ZStack {
                // Outer pulsing radial glow  rgba(200,120,255,0.35) → transparent
                RadialGradient(
                    colors: [
                        Color(hex: 0xC878FF).opacity(0.35),
                        Color(hex: 0xA050DC).opacity(0.15),
                        .clear,
                    ],
                    center: .center, startRadius: 0, endRadius: 120
                )
                .frame(width: 240, height: 280)
                .scaleEffect(pulseScale)
                .opacity(pulseOpacity)
                .allowsHitTesting(false)

                // Inner static glow  rgba(220,160,255,0.20) → transparent
                RadialGradient(
                    colors: [Color(hex: 0xDCA0FF).opacity(0.20), .clear],
                    center: .center, startRadius: 0, endRadius: 60
                )
                .frame(width: 120, height: 140)
                .allowsHitTesting(false)

                // Gradient "?" — uses foregroundStyle for gradient-filled text (iOS 16+)
                Text("?")
                    .font(.system(size: 180, weight: .black, design: .default))
                    .foregroundStyle(DS.gradientQuestionMark)
                    // drop-shadow(0 6px 20px rgba(160,60,220,0.6)) drop-shadow(0 2px 6px rgba(200,100,255,0.3))
                    .shadow(color: Color(hex: 0xA03CDC).opacity(0.60), radius: 10, x: 0, y: 6)
                    .shadow(color: Color(hex: 0xC864FF).opacity(0.30), radius: 3, x: 0, y: 2)
                    .offset(y: floatOffset)
            }
            .frame(width: 200, height: 220)
            .scaleEffect(appeared ? 1.0 : 0.5)
            .rotationEffect(.degrees(appeared ? 0 : -15))
            .opacity(appeared ? 1 : 0)
            .onAppear {
                withAnimation(.easeOut(duration: 0.7).delay(0.3)) { appeared = true }
                // float: y [-3, 3, -3]  duration 4s  infinite
                withAnimation(.easeInOut(duration: 4).repeatForever(autoreverses: true)) {
                    floatOffset = 6
                }
                // pulse: scale [1, 1.15, 1]  opacity [0.8, 1, 0.8]  duration 3s  infinite
                withAnimation(.easeInOut(duration: 3).repeatForever(autoreverses: true)) {
                    pulseScale = 1.15
                    pulseOpacity = 1.0
                }
            }
        }
    }

    // MARK: - Feature Cards Section

    // FeatureCards.tsx: flex row of 3 equal-width cards, gap-4, rounded-2xl, px-5 py-5

    private struct FeatureCardsSection: View {
        var body: some View {
            HStack(spacing: DS.gap) {
                FeatureCardView(
                    systemIcon: "sparkles",
                    iconGradient: DS.gradientAI,
                    label: "Ask anything",
                    title: "Chat with\nAI Assistant",
                    isHighlighted: true,
                    glowColor: Color(hex: 0xA855F7).opacity(0.4),
                    delay: 0.35
                )
                FeatureCardView(
                    systemIcon: "play.fill",
                    iconGradient: DS.gradientVideo,
                    label: "5 guides",
                    title: "Video\nTutorials",
                    isHighlighted: false,
                    glowColor: Color(hex: 0x22C55E).opacity(0.35),
                    delay: 0.45
                )
                FeatureCardView(
                    systemIcon: "envelope",
                    iconGradient: DS.gradientContact,
                    label: "Email or QR",
                    title: "Contact\nSupport",
                    isHighlighted: false,
                    glowColor: Color(hex: 0x818CF8).opacity(0.35),
                    delay: 0.55
                )
            }
        }
    }

    private struct FeatureCardView: View {
        let systemIcon: String
        let iconGradient: LinearGradient
        let label: String
        let title: String
        let isHighlighted: Bool
        let glowColor: Color
        let delay: Double

        @State private var appeared = false
        @State private var isPressed = false

        /// Borders and shadows extracted from FeatureCards.tsx
        private var fillColor: Color {
            isHighlighted ? DS.cardHighlightedFill : DS.cardNormalFill
        }

        private var borderColor: Color {
            isHighlighted ? DS.cardHighlightedBorder : DS.cardNormalBorder
        }

        private var borderWidth: CGFloat {
            isHighlighted ? 1.5 : 1.0
        }

        private var shadowColor: Color {
            isHighlighted ? DS.cardHighlightedGlow : .clear
        }

        var body: some View {
            Button(action: {}) {
                HStack(spacing: 24) {
                    ZStack {
                        iconGradient
                        Image(systemName: systemIcon)
                            .font(.system(size: 36, weight: .semibold))
                            .foregroundColor(.white)
                    }
                    .frame(width: 80, height: 80)
                    .clipShape(RoundedRectangle(cornerRadius: DS.rxl, style: .continuous))

                    VStack(alignment: .leading, spacing: 6) {
                        Text(label)
                            .font(.system(size: 22, weight: .regular))
                            .foregroundColor(.white.opacity(0.6))
                        Text(title)
                            .font(.system(size: 32, weight: .bold))
                            .foregroundColor(.white)
                            .lineLimit(2)
                    }

                    Spacer(minLength: 0)
                }
                .padding(.horizontal, 32)
                .padding(.vertical, 28)
                .frame(maxWidth: .infinity, minHeight: 140)
            }
            .tvCardStyle()
            .background(
                RoundedRectangle(cornerRadius: DS.r2xl, style: .continuous)
                    .fill(fillColor)
                    // border via stroke overlay
                    .overlay(
                        RoundedRectangle(cornerRadius: DS.r2xl, style: .continuous)
                            .stroke(borderColor, lineWidth: borderWidth)
                    )
                    // box-shadow: 0 0 28px glowColor
                    .shadow(color: shadowColor, radius: 14, x: 0, y: 0)
            )
            // Tap scale: whileHover scale 1.03 → pressed scale feedback
            .scaleEffect(isPressed ? 0.97 : 1.0)
            .animation(.spring(response: 0.25, dampingFraction: 0.7), value: isPressed)
            // Entrance: opacity + y offset
            .opacity(appeared ? 1 : 0)
            .offset(y: appeared ? 0 : 24)
            .onAppear {
                withAnimation(.easeOut(duration: 0.5).delay(delay)) { appeared = true }
            }
        }
    }

    // MARK: - Bottom Section

    // App.tsx: flex gap-4 — flex-[2] QuickTips + flex-[3] CommonQuestions

    private struct BottomSection: View {
        var body: some View {
            HStack(alignment: .top, spacing: DS.gap) {
                QuickTipsPanel()
                    .frame(maxWidth: .infinity)
                CommonQuestionsPanel()
                    .frame(maxWidth: .infinity)
            }
        }
    }

    // MARK: - Quick Tips Panel

    // QuickTips.tsx: rounded-2xl p-5, three amber-pin rows, rounded-xl px-4 py-3

    private let quickTips = ["Voice commands", "Remote shortcuts", "Setup guide"]

    private struct QuickTipsPanel: View {
        @State private var appeared = false

        var body: some View {
            VStack(alignment: .leading, spacing: 12) {
                Text("Quick Tips")
                    .font(.system(size: 32, weight: .bold))
                    .foregroundColor(.white)

                VStack(spacing: 8) {
                    ForEach(Array(quickTips.enumerated()), id: \.offset) { i, tip in
                        TipRow(text: tip, delay: 0.7 + Double(i) * 0.08)
                    }
                }
            }
            .padding(32)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: DS.r2xl, style: .continuous)
                    .fill(DS.panelFill)
                    .overlay(
                        RoundedRectangle(cornerRadius: DS.r2xl, style: .continuous)
                            .stroke(DS.panelBorder, lineWidth: 1)
                    )
            )
            .opacity(appeared ? 1 : 0)
            .offset(y: appeared ? 0 : 24)
            .onAppear {
                withAnimation(.easeOut(duration: 0.5).delay(0.6)) { appeared = true }
            }
        }
    }

    private struct TipRow: View {
        let text: String
        let delay: Double

        @State private var appeared = false
        @State private var isPressed = false

        var body: some View {
            Button(action: {}) {
                HStack(spacing: 12) {
                    // Amber location pin — fill: #f59e0b  (QuickTips.tsx SVG)
                    Image(systemName: "mappin.circle.fill")
                        .font(.system(size: 26))
                        .foregroundColor(Color(hex: 0xF59E0B))
                        .frame(width: 16)

                    Text(text)
                        .font(.system(size: 26, weight: .regular))
                        .foregroundColor(.white.opacity(0.9))
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)

                    Spacer(minLength: 0)
                }
                .padding(.horizontal, 24) // px-4
                .padding(.vertical, 18) // py-3
                .frame(maxWidth: .infinity)
                .background(
                    RoundedRectangle(cornerRadius: DS.rxl, style: .continuous)
                        .fill(DS.rowFill)
                )
            }
            .tvCardStyle()
            .scaleEffect(isPressed ? 0.97 : 1.0)
            .animation(.spring(response: 0.25, dampingFraction: 0.7), value: isPressed)
            // Entrance: x offset (whileHover: x 4)
            .opacity(appeared ? 1 : 0)
            .offset(x: appeared ? 0 : -16)
            .onAppear {
                withAnimation(.easeOut(duration: 0.4).delay(delay)) { appeared = true }
            }
        }
    }

    // MARK: - Common Questions Panel

    // CommonQuestions.tsx: accordion, rounded-2xl p-5, chevron-down, answer 13px/lh1.6/white50

    private struct FAQ {
        let question: String
        let answer: String
    }

    private let faqItems: [FAQ] = [
        .init(
            question: "How to reset my device?",
            answer: "Go to Settings > System > Reset. Choose 'Factory Reset' to restore your device to its original settings. Make sure to back up your data first."
        ),
        .init(
            question: "Troubleshooting network issues",
            answer: "Check your Wi-Fi connection, restart your router, and ensure your device firmware is up to date. You can also try forgetting the network and reconnecting."
        ),
        .init(
            question: "Account management & billing",
            answer: "Visit your account settings to manage subscriptions, update payment methods, or view billing history. Contact support for refund requests."
        ),
    ]

    private struct CommonQuestionsPanel: View {
        @State private var openIndex: Int? = nil
        @State private var appeared = false

        var body: some View {
            VStack(alignment: .leading, spacing: 12) {
                Text("Common Questions")
                    .font(.system(size: 32, weight: .bold))
                    .foregroundColor(.white)

                VStack(spacing: 8) {
                    ForEach(Array(faqItems.enumerated()), id: \.offset) { i, item in
                        AccordionRow(
                            question: item.question,
                            answer: item.answer,
                            isOpen: openIndex == i,
                            delay: 0.75 + Double(i) * 0.08,
                            onToggle: {
                                withAnimation(.easeInOut(duration: 0.3)) {
                                    openIndex = (openIndex == i) ? nil : i
                                }
                            }
                        )
                    }
                }
            }
            .padding(20)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: DS.r2xl, style: .continuous)
                    .fill(DS.panelFill)
                    .overlay(
                        RoundedRectangle(cornerRadius: DS.r2xl, style: .continuous)
                            .stroke(DS.panelBorder, lineWidth: 1)
                    )
            )
            .opacity(appeared ? 1 : 0)
            .offset(y: appeared ? 0 : 24)
            .onAppear {
                withAnimation(.easeOut(duration: 0.5).delay(0.65)) { appeared = true }
            }
        }
    }

    private struct AccordionRow: View {
        let question: String
        let answer: String
        let isOpen: Bool
        let delay: Double
        let onToggle: () -> Void

        @State private var appeared = false

        var body: some View {
            VStack(spacing: 0) {
                // Question button
                Button(action: onToggle) {
                    HStack(alignment: .center) {
                        Text(question)
                            .font(.system(size: 26, weight: .regular))
                            .foregroundColor(.white.opacity(0.9))
                            .multilineTextAlignment(.leading)
                            .frame(maxWidth: .infinity, alignment: .leading)

                        // chevron-down: white/35, rotates 180° when open
                        // CommonQuestions.tsx: transition duration 0.25s easeInOut
                        Image(systemName: "chevron.down")
                            .font(.system(size: 20, weight: .medium))
                            .foregroundColor(.white.opacity(0.35))
                            .rotationEffect(.degrees(isOpen ? 180 : 0))
                            .animation(.easeInOut(duration: 0.25), value: isOpen)
                            .padding(.leading, 12)
                    }
                    .padding(.horizontal, 24)
                    .padding(.vertical, 18)
                }
                .tvCardStyle()

                // Answer (animated expand/collapse)
                // CommonQuestions.tsx: height auto, opacity, duration 0.3s cubic-bezier(0.4,0,0.2,1)
                if isOpen {
                    Text(answer)
                        .font(.system(size: 22, weight: .regular))
                        .foregroundColor(.white.opacity(0.5))
                        .lineSpacing(7.8) // lineHeight 1.6 on 13pt → extra ≈ 7.8pt
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 24)
                        .padding(.vertical, 18)
                        .transition(
                            .asymmetric(
                                insertion: .opacity.combined(with: .move(edge: .top)),
                                removal: .opacity.combined(with: .move(edge: .top))
                            )
                        )
                }
            }
            .background(
                RoundedRectangle(cornerRadius: DS.rxl, style: .continuous)
                    .fill(DS.rowFill)
            )
            .clipShape(RoundedRectangle(cornerRadius: DS.rxl, style: .continuous))
            // Entrance: x offset (from right)
            .opacity(appeared ? 1 : 0)
            .offset(x: appeared ? 0 : 16)
            .onAppear {
                withAnimation(.easeOut(duration: 0.4).delay(delay)) { appeared = true }
            }
        }
    }

    // MARK: - Footer

    // App.tsx: 12px weight-400 letterSpacing 0.02em white/25

    private struct FooterLabel: View {
        @State private var appeared = false

        var body: some View {
            Text("App Version 2.1.4 (build 305) · © 2024 Bayit+")
                .font(.system(size: 20, weight: .regular))
                .kerning(0.24) // letterSpacing 0.02em × 12pt
                .foregroundColor(.white.opacity(0.25))
                .frame(maxWidth: .infinity, alignment: .center)
                .padding(.top, 4)
                .opacity(appeared ? 1 : 0)
                .onAppear {
                    withAnimation(.easeOut(duration: 0.5).delay(1.0)) { appeared = true }
                }
        }
    }

#endif
