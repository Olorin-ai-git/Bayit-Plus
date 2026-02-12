import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Trivia facts overlay during playback - positioned above subtitles with category-aware styling.
/// Displays TMDB-sourced trivia with auto-dismiss and multilingual support.
struct TriviaFactsOverlayView: View {
    @Bindable var viewModel: TriviaFactsViewModel
    let contentId: String
    let currentTime: Double
    let isSubtitlesActive: Bool
    let currentLanguage: String

    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        VStack {
            Spacer()

            if let fact = viewModel.activeFact {
                factCard(fact)
                    .padding(.horizontal, DesignTokens.Spacing.lg)
                    .padding(.bottom, bottomPadding)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                    .animation(.easeInOut(duration: 0.3), value: fact.id)
            }
        }
        .onChange(of: currentTime) { _, newTime in
            viewModel.updateActiveFact(currentTime: newTime)
        }
        .task {
            await viewModel.loadFacts(contentId: contentId, language: currentLanguage)
        }
        .onDisappear {
            viewModel.cleanup()
        }
    }

    // MARK: - Fact Card

    private func factCard(_ fact: TriviaFact) -> some View {
        GlassCard {
            HStack(alignment: .top, spacing: DesignTokens.Spacing.md) {
                categoryIcon(for: fact.category ?? "trivia")

                VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                    Text(factText(fact))
                        .font(.system(size: DesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .fixedSize(horizontal: false, vertical: true)

                    if let category = fact.category {
                        Text(category.uppercased())
                            .font(.system(size: DesignTokens.FontSize.xs, weight: .medium))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }
                }

                Spacer()

                dismissButton
            }
            .padding(DesignTokens.Spacing.md)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Trivia fact about \(fact.category ?? "trivia"): \(factText(fact))")
    }

    // MARK: - Category Icon

    private func categoryIcon(for category: String) -> some View {
        let (iconName, accentColor) = iconAndColor(for: category)

        return Image(systemName: iconName)
            .font(.system(size: 24))
            .foregroundStyle(accentColor)
            .frame(width: 32, height: 32)
            .accessibilityHidden(true)
    }

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

    // MARK: - Dismiss Button

    private var dismissButton: some View {
        Button {
            viewModel.dismissFact()
        } label: {
            Image(systemName: "xmark.circle.fill")
                .font(.system(size: 20))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Dismiss trivia fact")
    }

    // MARK: - Helpers

    private func factText(_ fact: TriviaFact) -> String {
        // New schema: check translations dict
        if let translations = fact.translations, let text = translations[currentLanguage] {
            return text
        }
        // Legacy fields fallback
        switch currentLanguage {
        case "he": if let he = fact.textHe { return he }
        case "en": if let en = fact.textEn { return en }
        case "es": if let es = fact.textEs { return es }
        default: break
        }
        return fact.text ?? ""
    }

    private var bottomPadding: CGFloat {
        if isSubtitlesActive {
            return DesignTokens.Spacing.xxxxl + DesignTokens.Spacing.xl
        } else {
            return DesignTokens.Spacing.xxxxl
        }
    }
}
