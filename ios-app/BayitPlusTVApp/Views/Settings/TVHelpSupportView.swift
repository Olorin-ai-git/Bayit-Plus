#if os(tvOS)
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - Design Tokens

    // Extracted from Figma Make source: theme.css, App.tsx, FeatureCards.tsx, QuickTips.tsx, CommonQuestions.tsx

    private enum DS {
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
        static let cardHighlightedFill = Color(hex: 0xA855F7).opacity(0.08)
        static let cardHighlightedBorder = Color(hex: 0xA855F7).opacity(0.55)
        static let cardHighlightedGlow = Color(hex: 0xA855F7).opacity(0.20)
        static let cardNormalFill = Color.white.opacity(0.04)
        static let cardNormalBorder = Color.white.opacity(0.07)
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
        static let gradientQuestionMark = LinearGradient(
            colors: [
                Color(hex: 0xF0D0FF), Color(hex: 0xD8A0F8),
                Color(hex: 0xC080F0), Color(hex: 0xA050E0), Color(hex: 0x8030C0),
            ],
            startPoint: .top, endPoint: .bottom
        )
        static let panelFill = Color.white.opacity(0.03)
        static let panelBorder = Color.white.opacity(0.06)
        static let rowFill = Color.white.opacity(0.05)
        static let r2xl: CGFloat = 24
        static let rxl: CGFloat = 16
        static let rmd: CGFloat = 12
        static let gap: CGFloat = 24
        static let pagePad: CGFloat = 80
    }

    // MARK: - Root View

    struct HelpSupportView: View {
        @Environment(TVRepositoryProvider.self) private var repos
        @Environment(LocalizationManager.self) private var localization
        @Environment(\.appConfiguration) private var appConfig
        @Environment(TVNavigationCoordinator.self) private var coordinator
        @State private var viewModel: HelpViewModel?
        @State private var showingContact = false
        @State private var showingTutorials = false

        var body: some View {
            ZStack {
                DS.backgroundGradient.ignoresSafeArea()
                AmbientGlows().ignoresSafeArea()
                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: DS.gap) {
                        HeaderRow(title: localization.t("settings.help.title"))
                        FeatureCardsSection(
                            tutorialCount: tutorialFAQs.count,
                            onChatWithAI: { coordinator.selectedTab = .zehAni },
                            onVideoTutorials: { showingTutorials = true },
                            onContactSupport: { showingContact = true }
                        )
                        BottomSection(tips: tipFAQs, questions: commonFAQs)
                        FooterLabel(version: appVersionString)
                    }
                    .padding(DS.pagePad)
                }
            }
            .preferredColorScheme(.dark)
            .task {
                viewModel = HelpViewModel(
                    repository: repos.settings,
                    language: localization.currentLanguage.rawValue
                )
                await viewModel?.load()
            }
            .fullScreenCover(isPresented: $showingContact) {
                ContactSupportSheet(
                    email: appConfig.supportEmail,
                    onDismiss: { showingContact = false }
                )
            }
            .fullScreenCover(isPresented: $showingTutorials) {
                TutorialsSheet(
                    faqs: tutorialFAQs,
                    onDismiss: { showingTutorials = false }
                )
            }
        }

        private var tipFAQs: [FAQItem] {
            guard let vm = viewModel else { return [] }
            let tips = vm.faqs.filter { $0.category == "tip" }
            let source = tips.isEmpty ? vm.faqs.filter { $0.isFeatured == true } : tips
            return Array(source.prefix(3))
        }

        private var tutorialFAQs: [FAQItem] {
            viewModel?.faqs.filter { $0.category == "tutorial" } ?? []
        }

        private var commonFAQs: [FAQItem] {
            guard let vm = viewModel else { return [] }
            let excluded: Set<String> = ["tip", "tutorial"]
            let filtered = vm.faqs.filter { !excluded.contains($0.category ?? "") }
            return filtered.isEmpty ? vm.faqs : filtered
        }

        private var appVersionString: String {
            let v = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0.0"
            let b = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "1"
            let year = Calendar.current.component(.year, from: Date())
            return "App Version \(v) (build \(b)) · © \(year) Bayit+"
        }
    }

    // MARK: - Ambient Glow Layers

    private struct AmbientGlows: View {
        var body: some View {
            GeometryReader { geo in
                ZStack {
                    RadialGradient(
                        colors: [Color(hex: 0x6428A0).opacity(0.14), .clear],
                        center: .center, startRadius: 0, endRadius: geo.size.width * 0.4
                    )
                    .frame(width: geo.size.width * 0.8, height: geo.size.height * 0.55)
                    .position(x: geo.size.width * 0.55, y: -geo.size.height * 0.05)

                    RadialGradient(
                        colors: [Color(hex: 0x3C1478).opacity(0.08), .clear],
                        center: .center, startRadius: 0, endRadius: geo.size.width * 0.25
                    )
                    .frame(width: geo.size.width * 0.5, height: geo.size.height * 0.45)
                    .position(x: geo.size.width * 0.975, y: geo.size.height * 1.025)

                    RadialGradient(
                        colors: [Color(hex: 0xB450FF).opacity(0.10), .clear],
                        center: .center, startRadius: 0, endRadius: geo.size.width * 0.15
                    )
                    .frame(width: geo.size.width * 0.30, height: geo.size.height * 0.30)
                    .position(x: geo.size.width * 0.96, y: geo.size.height * 0.17)
                }
                .allowsHitTesting(false)
            }
        }
    }

    // MARK: - Header Row

    private struct HeaderRow: View {
        let title: String
        @State private var titleVisible = false

        var body: some View {
            HStack(alignment: .top) {
                Text(title)
                    .font(.system(size: 72, weight: .bold))
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

    private struct QuestionMarkView: View {
        @State private var appeared = false
        @State private var floatOffset: CGFloat = 0
        @State private var pulseScale: CGFloat = 1.0
        @State private var pulseOpacity: Double = 0.8

        var body: some View {
            ZStack {
                RadialGradient(
                    colors: [Color(hex: 0xC878FF).opacity(0.35), Color(hex: 0xA050DC).opacity(0.15), .clear],
                    center: .center, startRadius: 0, endRadius: 120
                )
                .frame(width: 240, height: 280)
                .scaleEffect(pulseScale)
                .opacity(pulseOpacity)
                .allowsHitTesting(false)

                RadialGradient(
                    colors: [Color(hex: 0xDCA0FF).opacity(0.20), .clear],
                    center: .center, startRadius: 0, endRadius: 60
                )
                .frame(width: 120, height: 140)
                .allowsHitTesting(false)

                Text("?")
                    .font(.system(size: 180, weight: .black))
                    .foregroundStyle(DS.gradientQuestionMark)
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
                withAnimation(.easeInOut(duration: 4).repeatForever(autoreverses: true)) { floatOffset = 6 }
                withAnimation(.easeInOut(duration: 3).repeatForever(autoreverses: true)) {
                    pulseScale = 1.15
                    pulseOpacity = 1.0
                }
            }
        }
    }

    // MARK: - Feature Cards Section

    private struct FeatureCardsSection: View {
        let tutorialCount: Int
        let onChatWithAI: () -> Void
        let onVideoTutorials: () -> Void
        let onContactSupport: () -> Void

        @Environment(LocalizationManager.self) private var localization

        var body: some View {
            HStack(spacing: DS.gap) {
                FeatureCardView(
                    systemIcon: "sparkles",
                    iconGradient: DS.gradientAI,
                    label: localization.t("settings.help.askAnything"),
                    title: localization.t("settings.help.chatWithAI"),
                    isHighlighted: true,
                    glowColor: Color(hex: 0xA855F7).opacity(0.4),
                    delay: 0.35,
                    action: onChatWithAI
                )
                FeatureCardView(
                    systemIcon: "play.fill",
                    iconGradient: DS.gradientVideo,
                    label: tutorialCount > 0
                        ? localization.t("settings.help.guidesCount", ["count": "\(tutorialCount)"])
                        : localization.t("settings.help.videoTutorials"),
                    title: localization.t("settings.help.videoTutorials"),
                    isHighlighted: false,
                    glowColor: Color(hex: 0x22C55E).opacity(0.35),
                    delay: 0.45,
                    action: onVideoTutorials
                )
                FeatureCardView(
                    systemIcon: "envelope",
                    iconGradient: DS.gradientContact,
                    label: localization.t("settings.help.emailOrQR"),
                    title: localization.t("settings.help.contactSupport"),
                    isHighlighted: false,
                    glowColor: Color(hex: 0x818CF8).opacity(0.35),
                    delay: 0.55,
                    action: onContactSupport
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
        let action: () -> Void

        @State private var appeared = false

        var body: some View {
            Button(action: action) {
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
                    .fill(isHighlighted ? DS.cardHighlightedFill : DS.cardNormalFill)
                    .overlay(
                        RoundedRectangle(cornerRadius: DS.r2xl, style: .continuous)
                            .stroke(
                                isHighlighted ? DS.cardHighlightedBorder : DS.cardNormalBorder,
                                lineWidth: isHighlighted ? 1.5 : 1.0
                            )
                    )
                    .shadow(color: isHighlighted ? DS.cardHighlightedGlow : .clear, radius: 14)
            )
            .opacity(appeared ? 1 : 0)
            .offset(y: appeared ? 0 : 24)
            .onAppear {
                withAnimation(.easeOut(duration: 0.5).delay(delay)) { appeared = true }
            }
        }
    }

    // MARK: - Bottom Section

    private struct BottomSection: View {
        let tips: [FAQItem]
        let questions: [FAQItem]

        var body: some View {
            HStack(alignment: .top, spacing: DS.gap) {
                QuickTipsPanel(tips: tips).frame(maxWidth: .infinity)
                CommonQuestionsPanel(faqs: questions).frame(maxWidth: .infinity)
            }
        }
    }

    // MARK: - Quick Tips Panel

    private struct QuickTipsPanel: View {
        let tips: [FAQItem]
        @Environment(LocalizationManager.self) private var localization
        @State private var appeared = false
        @State private var expandedId: String?

        var body: some View {
            VStack(alignment: .leading, spacing: 12) {
                Text(localization.t("settings.help.quickTips"))
                    .font(.system(size: 32, weight: .bold))
                    .foregroundColor(.white)

                if tips.isEmpty {
                    Text(localization.t("settings.help.noTipsAvailable"))
                        .font(.system(size: 22))
                        .foregroundColor(.white.opacity(0.4))
                        .padding(.top, 8)
                } else {
                    VStack(spacing: 8) {
                        ForEach(Array(tips.enumerated()), id: \.element.id) { i, tip in
                            TipRow(
                                faq: tip,
                                isExpanded: expandedId == tip.id,
                                delay: 0.7 + Double(i) * 0.08,
                                onToggle: {
                                    withAnimation(.easeInOut(duration: 0.25)) {
                                        expandedId = expandedId == tip.id ? nil : tip.id
                                    }
                                }
                            )
                        }
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
        let faq: FAQItem
        let isExpanded: Bool
        let delay: Double
        let onToggle: () -> Void

        @State private var appeared = false

        var body: some View {
            Button(action: faq.answer != nil ? onToggle : {}) {
                VStack(alignment: .leading, spacing: 0) {
                    HStack(spacing: 12) {
                        Image(systemName: "mappin.circle.fill")
                            .font(.system(size: 26))
                            .foregroundColor(Color(hex: 0xF59E0B))
                            .frame(width: 16)
                        Text(faq.question ?? "")
                            .font(.system(size: 26, weight: .regular))
                            .foregroundColor(.white.opacity(0.9))
                            .lineLimit(isExpanded ? nil : 1)
                            .minimumScaleFactor(0.8)
                        Spacer(minLength: 0)
                        if faq.answer != nil {
                            Image(systemName: "chevron.down")
                                .font(.system(size: 18, weight: .medium))
                                .foregroundColor(.white.opacity(0.35))
                                .rotationEffect(.degrees(isExpanded ? 180 : 0))
                                .animation(.easeInOut(duration: 0.25), value: isExpanded)
                        }
                    }
                    .padding(.horizontal, 24)
                    .padding(.vertical, 18)

                    if isExpanded, let answer = faq.answer {
                        Text(answer)
                            .font(.system(size: 22, weight: .regular))
                            .foregroundColor(.white.opacity(0.5))
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, 24)
                            .padding(.bottom, 18)
                            .transition(.opacity.combined(with: .move(edge: .top)))
                    }
                }
                .frame(maxWidth: .infinity)
                .background(
                    RoundedRectangle(cornerRadius: DS.rxl, style: .continuous)
                        .fill(DS.rowFill)
                )
            }
            .tvCardStyle()
            .opacity(appeared ? 1 : 0)
            .offset(x: appeared ? 0 : -16)
            .onAppear {
                withAnimation(.easeOut(duration: 0.4).delay(delay)) { appeared = true }
            }
        }
    }

    // MARK: - Common Questions Panel

    private struct CommonQuestionsPanel: View {
        let faqs: [FAQItem]
        @Environment(LocalizationManager.self) private var localization
        @State private var openId: String?
        @State private var appeared = false

        var body: some View {
            VStack(alignment: .leading, spacing: 12) {
                Text(localization.t("settings.help.commonQuestions"))
                    .font(.system(size: 32, weight: .bold))
                    .foregroundColor(.white)

                if faqs.isEmpty {
                    Text(localization.t("settings.help.noFaqs"))
                        .font(.system(size: 22))
                        .foregroundColor(.white.opacity(0.4))
                        .padding(.top, 8)
                } else {
                    VStack(spacing: 8) {
                        ForEach(Array(faqs.enumerated()), id: \.element.id) { i, faq in
                            AccordionRow(
                                question: faq.question ?? "",
                                answer: faq.answer ?? "",
                                isOpen: openId == faq.id,
                                delay: 0.75 + Double(i) * 0.08,
                                onToggle: {
                                    withAnimation(.easeInOut(duration: 0.3)) {
                                        openId = openId == faq.id ? nil : faq.id
                                    }
                                }
                            )
                        }
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
                Button(action: onToggle) {
                    HStack(alignment: .center) {
                        Text(question)
                            .font(.system(size: 26, weight: .regular))
                            .foregroundColor(.white.opacity(0.9))
                            .multilineTextAlignment(.leading)
                            .frame(maxWidth: .infinity, alignment: .leading)
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

                if isOpen {
                    Text(answer)
                        .font(.system(size: 22, weight: .regular))
                        .foregroundColor(.white.opacity(0.5))
                        .lineSpacing(7.8)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 24)
                        .padding(.vertical, 18)
                        .transition(.asymmetric(
                            insertion: .opacity.combined(with: .move(edge: .top)),
                            removal: .opacity.combined(with: .move(edge: .top))
                        ))
                }
            }
            .background(
                RoundedRectangle(cornerRadius: DS.rxl, style: .continuous).fill(DS.rowFill)
            )
            .clipShape(RoundedRectangle(cornerRadius: DS.rxl, style: .continuous))
            .opacity(appeared ? 1 : 0)
            .offset(x: appeared ? 0 : 16)
            .onAppear {
                withAnimation(.easeOut(duration: 0.4).delay(delay)) { appeared = true }
            }
        }
    }

    // MARK: - Footer

    private struct FooterLabel: View {
        let version: String
        @State private var appeared = false

        var body: some View {
            Text(version)
                .font(.system(size: 20, weight: .regular))
                .kerning(0.24)
                .foregroundColor(.white.opacity(0.25))
                .frame(maxWidth: .infinity, alignment: .center)
                .padding(.top, 4)
                .opacity(appeared ? 1 : 0)
                .onAppear {
                    withAnimation(.easeOut(duration: 0.5).delay(1.0)) { appeared = true }
                }
        }
    }

    // MARK: - Contact Support Sheet

    private struct ContactSupportSheet: View {
        let email: String
        let onDismiss: () -> Void
        @Environment(LocalizationManager.self) private var localization

        var body: some View {
            ZStack {
                DS.backgroundGradient.ignoresSafeArea()
                VStack(spacing: DS.gap) {
                    TVProfileSheetHeader(
                        title: localization.t("settings.help.contactSupport"),
                        onDismiss: onDismiss
                    )
                    Spacer()
                    VStack(spacing: 32) {
                        ZStack {
                            DS.gradientContact
                            Image(systemName: "envelope.fill")
                                .font(.system(size: 60, weight: .semibold))
                                .foregroundColor(.white)
                        }
                        .frame(width: 120, height: 120)
                        .clipShape(RoundedRectangle(cornerRadius: DS.rxl, style: .continuous))

                        Text(localization.t("settings.help.scanEmailQR"))
                            .font(.system(size: 28, weight: .regular))
                            .foregroundColor(.white.opacity(0.6))

                        Text(email)
                            .font(.system(size: 40, weight: .bold))
                            .foregroundColor(.white)
                            .multilineTextAlignment(.center)
                    }
                    Spacer()
                }
            }
            .preferredColorScheme(.dark)
            .onExitCommand { onDismiss() }
        }
    }

    // MARK: - Tutorials Sheet

    private struct TutorialsSheet: View {
        let faqs: [FAQItem]
        let onDismiss: () -> Void
        @Environment(LocalizationManager.self) private var localization
        @State private var openId: String?

        var body: some View {
            ZStack {
                DS.backgroundGradient.ignoresSafeArea()
                VStack(spacing: 0) {
                    TVProfileSheetHeader(
                        title: localization.t("settings.help.videoTutorials"),
                        onDismiss: onDismiss
                    )
                    if faqs.isEmpty {
                        Spacer()
                        Text(localization.t("settings.help.noTutorialsAvailable"))
                            .font(.system(size: 28))
                            .foregroundColor(.white.opacity(0.4))
                        Spacer()
                    } else {
                        ScrollView(.vertical, showsIndicators: false) {
                            VStack(spacing: 8) {
                                ForEach(Array(faqs.enumerated()), id: \.element.id) { i, faq in
                                    AccordionRow(
                                        question: faq.question ?? "",
                                        answer: faq.answer ?? "",
                                        isOpen: openId == faq.id,
                                        delay: Double(i) * 0.06,
                                        onToggle: {
                                            withAnimation(.easeInOut(duration: 0.3)) {
                                                openId = openId == faq.id ? nil : faq.id
                                            }
                                        }
                                    )
                                }
                            }
                            .padding(DS.pagePad)
                        }
                    }
                }
            }
            .preferredColorScheme(.dark)
            .onExitCommand { onDismiss() }
        }
    }

#endif
