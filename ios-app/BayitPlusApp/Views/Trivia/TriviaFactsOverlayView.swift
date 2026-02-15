import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// AI-powered trivia banner overlay - compact glassmorphic design in upper screen area.
/// Slides in/out from trailing edge. Supports AI-detected topics, follow-up chains,
/// related persons, and auto-dismiss progress from the live trivia pipeline.
struct TriviaFactsOverlayView: View {
    @Bindable var viewModel: TriviaFactsViewModel
    let contentId: String
    let currentTime: Double
    let isSubtitlesActive: Bool
    let currentLanguage: String

    @Environment(LocalizationManager.self) private var localization
    @State private var progressValue: CGFloat = 0
    @State private var progressTask: Task<Void, Never>?

    var body: some View {
        VStack {
            Spacer()
                .frame(height: bannerTopOffset)

            HStack {
                Spacer()

                if let fact = viewModel.activeFact {
                    factBanner(fact)
                        .frame(maxWidth: bannerMaxWidth)
                        .padding(.trailing, DesignTokens.Spacing.base)
                        .transition(
                            .asymmetric(
                                insertion: .move(edge: .trailing)
                                    .combined(with: .opacity),
                                removal: .move(edge: .trailing)
                                    .combined(with: .opacity)
                            )
                        )
                }
            }

            Spacer()
        }
        .animation(.spring(duration: 0.4, bounce: 0.15), value: viewModel.activeFact?.id)
        .allowsHitTesting(viewModel.activeFact != nil)
        .onChange(of: currentTime) { _, newTime in
            viewModel.updateActiveFact(currentTime: newTime)
        }
        .onChange(of: viewModel.activeFact?.id) { _, newFactId in
            if newFactId != nil {
                startProgressAnimation()
            } else {
                progressTask?.cancel()
                progressValue = 0
            }
        }
        .task {
            await viewModel.loadFacts(contentId: contentId, language: currentLanguage)
        }
        .onDisappear {
            viewModel.cleanup()
            progressTask?.cancel()
        }
    }

    // MARK: - Banner Layout

    private func factBanner(_ fact: TriviaFact) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            // Header row: sparkle icon + "AI Trivia" + detected topic + dismiss
            headerRow(fact)

            // Category badge (compact pill)
            if let category = fact.category {
                categoryBadge(category: category)
            }

            // Fact text
            Text(factText(fact))
                .font(.system(size: DesignTokens.FontSize.xs))
                .foregroundStyle(DesignTokens.Text.primary)
                .lineLimit(3)

            // Related person + follow-up row
            bottomRow(fact)

            // Auto-dismiss progress bar
            progressBar
        }
        .padding(DesignTokens.Spacing.sm)
        .background {
            ZStack {
                Color.black.opacity(0.45)
                VisualEffectBlur()
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                .stroke(
                    LinearGradient(
                        colors: [
                            DesignTokens.Primary.p400.opacity(0.6),
                            DesignTokens.Glass.border,
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 0.5
                )
        )
        .shadow(
            color: DesignTokens.Glass.purpleGlow.opacity(0.3),
            radius: 8,
            x: 0,
            y: 2
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel(bannerAccessibilityLabel(fact))
    }

    // MARK: - Header

    private func headerRow(_ fact: TriviaFact) -> some View {
        HStack(spacing: DesignTokens.Spacing.xs) {
            Image(systemName: "sparkles")
                .font(.system(size: 12))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(localization.t("trivia.aiTrivia"))
                .font(.system(size: DesignTokens.FontSize.xs, weight: .bold))
                .foregroundStyle(DesignTokens.Primary.p400)

            if let topic = fact.detectedTopic {
                Text("  \(topic)")
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .lineLimit(1)
            }

            Spacer()

            dismissButton
        }
    }

    // MARK: - Category Badge

    private func categoryBadge(category: String) -> some View {
        let (icon, color) = iconAndColor(for: category)

        return HStack(spacing: 3) {
            Image(systemName: icon)
                .font(.system(size: 10))
                .foregroundStyle(color)

            Text(category.uppercased())
                .font(.system(size: 9, weight: .bold))
                .foregroundStyle(color)
        }
        .padding(.horizontal, DesignTokens.Spacing.sm)
        .padding(.vertical, 2)
        .background(
            Capsule().fill(color.opacity(0.15))
        )
        .overlay(
            Capsule().stroke(color.opacity(0.3), lineWidth: 0.5)
        )
    }

    // MARK: - Bottom Row (Related Person + Follow-Up)

    private func bottomRow(_ fact: TriviaFact) -> some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            if let person = fact.relatedPerson {
                HStack(spacing: 3) {
                    Image(systemName: "person.fill")
                        .font(.system(size: 10))
                        .foregroundStyle(DesignTokens.Info.default)

                    Text(person)
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Info.default)
                        .lineLimit(1)
                }
            }

            Spacer()

            if fact.hasFollowUp == true {
                followUpButton
            }
        }
    }

    private var followUpButton: some View {
        Button {
            viewModel.requestFollowUp()
        } label: {
            HStack(spacing: 3) {
                Image(systemName: "sparkles")
                    .font(.system(size: 10))
                    .foregroundStyle(DesignTokens.Secondary.s400)

                Text(localization.t("trivia.more"))
                    .font(.system(size: DesignTokens.FontSize.xs, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.primary)

                Image(systemName: "chevron.right")
                    .font(.system(size: 8))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            .padding(.horizontal, DesignTokens.Spacing.sm)
            .padding(.vertical, 3)
            .background(
                Capsule().fill(Color.white.opacity(0.1))
            )
        }
        .buttonStyle(.plain)
        .accessibilityLabel(localization.t("trivia.wantToKnowMore"))
    }

    // MARK: - Progress Bar

    private var progressBar: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: 1.5)
                    .fill(Color.white.opacity(0.15))
                    .frame(height: 3)

                RoundedRectangle(cornerRadius: 1.5)
                    .fill(DesignTokens.Primary.p400)
                    .frame(width: geometry.size.width * progressValue, height: 3)
            }
        }
        .frame(height: 3)
    }

    // MARK: - Dismiss Button

    private var dismissButton: some View {
        Button {
            withAnimation(.spring(duration: 0.3, bounce: 0.1)) {
                viewModel.dismissFact()
            }
        } label: {
            Image(systemName: "xmark.circle.fill")
                .font(.system(size: 14))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(localization.t("common.dismiss"))
    }

    // MARK: - Category Styling

    private func iconAndColor(for category: String) -> (String, Color) {
        switch category.lowercased() {
        case "cast":
            return ("person.fill", DesignTokens.Info.default)
        case "production":
            return ("film", DesignTokens.Primary.p400)
        case "historical":
            return ("clock.fill", DesignTokens.Warning.default)
        case "cultural":
            return ("globe", DesignTokens.Success.default)
        case "fun", "trivia":
            return ("lightbulb.fill", DesignTokens.Secondary.s400)
        default:
            return ("info.circle.fill", DesignTokens.Primary.p400)
        }
    }

    // MARK: - Helpers

    private func factText(_ fact: TriviaFact) -> String {
        if let translations = fact.translations, let text = translations[currentLanguage] {
            return text
        }
        switch currentLanguage {
        case "he": if let he = fact.textHe { return he }
        case "en": if let en = fact.textEn { return en }
        case "es": if let es = fact.textEs { return es }
        default: break
        }
        return fact.text ?? ""
    }

    private func bannerAccessibilityLabel(_ fact: TriviaFact) -> String {
        var label = "AI Trivia"
        if let topic = fact.detectedTopic {
            label += " about \(topic)"
        }
        label += ": \(factText(fact))"
        return label
    }

    private var bannerTopOffset: CGFloat {
        UIScreen.main.bounds.height * 0.08
    }

    private var bannerMaxWidth: CGFloat {
        let screenWidth = UIScreen.main.bounds.width
        let isIPad = UIDevice.current.userInterfaceIdiom == .pad
        return isIPad ? screenWidth * 0.4 : screenWidth * 0.6
    }

    private func startProgressAnimation() {
        progressValue = 0
        progressTask?.cancel()

        guard let fact = viewModel.activeFact else { return }
        let duration = TimeInterval(fact.displayDuration ?? 15)
        let steps = 60

        progressTask = Task {
            let stepDuration = duration / Double(steps)

            for i in 0...steps {
                if Task.isCancelled { break }
                await MainActor.run {
                    withAnimation(.linear(duration: stepDuration)) {
                        progressValue = CGFloat(i) / CGFloat(steps)
                    }
                }
                try? await Task.sleep(for: .seconds(stepDuration))
            }
        }
    }
}
