import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// AI-powered trivia banner overlay for tvOS - compact glassmorphic design in upper screen area.
/// Slides in/out from trailing edge. Supports AI-detected topics, follow-up chains,
/// related persons, and auto-dismiss progress from the live trivia pipeline.
/// Scaled for 10-foot UI with focus-based navigation on Siri Remote.
struct TVTriviaFactsOverlayView: View {
    @Environment(LocalizationManager.self) private var localization
    @Bindable var viewModel: TriviaFactsViewModel
    let contentId: String
    let currentTime: Double
    let isSubtitlesActive: Bool
    let currentLanguage: String
    let onDismiss: () -> Void

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
                        .padding(.trailing, TVDesignTokens.Spacing.md)
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
        .animation(.spring(duration: 0.5, bounce: 0.12), value: viewModel.activeFact?.id)
        .focusable(false)
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
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            // Header row: sparkle icon + "AI Trivia" + detected topic + dismiss
            headerRow(fact)

            // Category badge
            if let category = fact.category {
                categoryBadge(category: category)
            }

            // Fact text
            Text(factText(fact))
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.primary)
                .lineLimit(3)
                .fixedSize(horizontal: false, vertical: true)

            // Related person + follow-up row
            bottomRow(fact)

            // Auto-dismiss progress bar
            progressBar
        }
        .padding(TVDesignTokens.Spacing.md)
        .background(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                .fill(Color.black.opacity(0.75))
                .background(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                        .fill(.ultraThinMaterial.opacity(0.3))
                )
        )
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                .stroke(DesignTokens.Glass.border, lineWidth: 1)
        )
        .shadow(color: DesignTokens.Glass.purpleGlow, radius: 6, x: 0, y: 3)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(bannerAccessibilityLabel(fact))
    }

    // MARK: - Header

    private func headerRow(_ fact: TriviaFact) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.xs) {
            Image(systemName: "sparkles")
                .font(.system(size: 20))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(localization.t("trivia.aiTrivia"))
                .font(.system(size: TVDesignTokens.FontSize.xs, weight: .bold))
                .foregroundStyle(DesignTokens.Primary.p400)

            if let topic = fact.detectedTopic {
                Text("  \(topic)")
                    .font(.system(size: TVDesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .lineLimit(1)
            }

            Spacer()
        }
    }

    // MARK: - Category Badge

    private func categoryBadge(category: String) -> some View {
        let (icon, color) = categoryIconAndColor(for: category)

        return HStack(spacing: TVDesignTokens.Spacing.xxs) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundStyle(color)

            Text(category.uppercased())
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(color)
        }
        .padding(.horizontal, TVDesignTokens.Spacing.sm)
        .padding(.vertical, TVDesignTokens.Spacing.xxs)
        .background(
            Capsule().fill(color.opacity(0.15))
        )
        .overlay(
            Capsule().stroke(color.opacity(0.3), lineWidth: 0.5)
        )
    }

    // MARK: - Bottom Row (Related Person)

    private func bottomRow(_ fact: TriviaFact) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            if let person = fact.relatedPerson {
                HStack(spacing: TVDesignTokens.Spacing.xxs) {
                    Image(systemName: "person.fill")
                        .font(.system(size: 16))
                        .foregroundStyle(DesignTokens.Info.default)

                    Text(person)
                        .font(.system(size: TVDesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Info.default)
                        .lineLimit(1)
                }
            }

            Spacer()
        }
    }

    // MARK: - Progress Bar

    private var progressBar: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: 2)
                    .fill(Color.white.opacity(0.15))
                    .frame(height: 4)

                RoundedRectangle(cornerRadius: 2)
                    .fill(DesignTokens.Primary.p400)
                    .frame(width: geometry.size.width * progressValue, height: 4)
            }
        }
        .frame(height: 4)
    }

    // MARK: - Category Styling

    private func categoryIconAndColor(for category: String) -> (String, Color) {
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

    /// Position banner near top-right of TV screen.
    private var bannerTopOffset: CGFloat {
        60
    }

    /// Compact width for tvOS - roughly 40% of 1920px screen.
    private var bannerMaxWidth: CGFloat {
        750
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
