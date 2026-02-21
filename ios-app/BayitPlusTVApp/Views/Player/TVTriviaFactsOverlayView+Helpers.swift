import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - TVTriviaFactsOverlayView + Helpers & Styling

extension TVTriviaFactsOverlayView {
    // MARK: - Category Styling

    func categoryIconAndColor(for category: String) -> (String, Color) {
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

    func factText(_ fact: TriviaFact) -> String {
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

    func bannerAccessibilityLabel(_ fact: TriviaFact) -> String {
        var label = "AI Trivia"
        if let topic = fact.detectedTopic {
            label += " about \(topic)"
        }
        label += ": \(factText(fact))"
        return label
    }

    /// Position banner near top-right of TV screen.
    var bannerTopOffset: CGFloat {
        60
    }

    /// Compact width for tvOS - roughly 40% of 1920px screen.
    var bannerMaxWidth: CGFloat {
        750
    }

    func startProgressAnimation() {
        progressValue = 0
        progressTask?.cancel()

        guard let fact = viewModel.activeFact else { return }
        let duration = TimeInterval(fact.displayDuration ?? 15)
        let steps = 60

        progressTask = Task {
            let stepDuration = duration / Double(steps)

            for i in 0 ... steps {
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
