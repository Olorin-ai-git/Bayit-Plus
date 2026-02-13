import BayitDesignSystem
import SwiftUI

/// Enhanced trivia facts overlay for tvOS with AI-based features.
/// Matches iOS and web app implementations with glass design, categories, and multilingual support.
struct TVTriviaFactsOverlayView: View {
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

            if let fact = viewModel.activeFact {
                HStack {
                    factCard(fact)
                        .padding(.leading, TVDesignTokens.Spacing.xxl)
                    Spacer()
                }
                .padding(.bottom, bottomPadding)
                .transition(.move(edge: .bottom).combined(with: .opacity))
                .animation(.easeInOut(duration: 0.3), value: fact.id)
            }
        }
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

    // MARK: - Fact Card

    private func factCard(_ fact: TriviaFact) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            // Header
            HStack(spacing: TVDesignTokens.Spacing.sm) {
                Image(systemName: "lightbulb.fill")
                    .font(.system(size: 22))
                    .foregroundStyle(Color.yellow)

                Text("Did You Know?")
                    .font(.system(size: TVDesignTokens.FontSize.sm, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Spacer()

                Button {
                    viewModel.dismissFact()
                    onDismiss()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 24))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
                .buttonStyle(.plain)
            }

            // Category Badge
            if let category = fact.category {
                categoryBadge(category: category)
            }

            // Fact Text with Flag
            HStack(alignment: .top, spacing: TVDesignTokens.Spacing.sm) {
                Text(languageFlag(for: currentLanguage))
                    .font(.system(size: 24))

                Text(factText(fact))
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(3)
                    .fixedSize(horizontal: false, vertical: true)
            }

            // Follow-Up Button
            if fact.hasFollowUp == true {
                Button {
                    // Handle follow-up action
                } label: {
                    HStack(spacing: TVDesignTokens.Spacing.sm) {
                        Image(systemName: "sparkles")
                            .font(.system(size: 18))
                            .foregroundStyle(Color.yellow)

                        Text("Want to know more?")
                            .font(.system(size: TVDesignTokens.FontSize.sm, weight: .medium))
                            .foregroundStyle(DesignTokens.Text.primary)

                        Image(systemName: "chevron.right")
                            .font(.system(size: 14))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }
                    .padding(.horizontal, TVDesignTokens.Spacing.md)
                    .padding(.vertical, TVDesignTokens.Spacing.sm)
                    .background(
                        Capsule()
                            .fill(Color.white.opacity(0.1))
                    )
                }
                .buttonStyle(.plain)
            }

            // Related Person
            if let relatedPerson = fact.relatedPerson {
                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 16))
                        .foregroundStyle(DesignTokens.Info.default)

                    Text(relatedPerson)
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Info.default)
                }
            }

            // Progress Bar
            progressBar
        }
        .padding(TVDesignTokens.Spacing.lg)
        .frame(maxWidth: 600, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                .fill(Color.black.opacity(0.85))
                .background(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                        .fill(.ultraThinMaterial.opacity(0.3))
                )
        )
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                .stroke(Color.white.opacity(0.15), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.3), radius: 8, x: 0, y: 4)
    }

    // MARK: - Category Badge

    private func categoryBadge(category: String) -> some View {
        let (icon, color) = categoryIconAndColor(for: category)

        return HStack(spacing: TVDesignTokens.Spacing.xs) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundStyle(color)

            Text(category.uppercased())
                .font(.system(size: TVDesignTokens.FontSize.xs, weight: .bold))
                .foregroundStyle(color)
        }
        .padding(.horizontal, TVDesignTokens.Spacing.md)
        .padding(.vertical, TVDesignTokens.Spacing.xs)
        .background(
            Capsule()
                .fill(color.opacity(0.2))
        )
        .overlay(
            Capsule()
                .stroke(color.opacity(0.4), lineWidth: 1)
        )
    }

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

    // MARK: - Progress Bar

    private var progressBar: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                // Track
                RoundedRectangle(cornerRadius: 2)
                    .fill(Color.white.opacity(0.2))
                    .frame(height: 4)

                // Fill
                RoundedRectangle(cornerRadius: 2)
                    .fill(DesignTokens.Primary.p400)
                    .frame(width: geometry.size.width * progressValue, height: 4)
            }
        }
        .frame(height: 4)
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

    private func languageFlag(for language: String) -> String {
        switch language {
        case "he": return "🇮🇱"
        case "en": return "🇺🇸"
        case "es": return "🇪🇸"
        case "fr": return "🇫🇷"
        case "de": return "🇩🇪"
        case "ru": return "🇷🇺"
        case "ar": return "🇸🇦"
        case "pt": return "🇧🇷"
        case "it": return "🇮🇹"
        case "ja": return "🇯🇵"
        default: return "🌐"
        }
    }

    private var bottomPadding: CGFloat {
        if isSubtitlesActive {
            return TVDesignTokens.Spacing.xxxxl + TVDesignTokens.Spacing.xxl
        } else {
            return TVDesignTokens.Spacing.xxxxl
        }
    }

    private func startProgressAnimation() {
        progressValue = 0
        progressTask?.cancel()

        guard let fact = viewModel.activeFact else { return }
        let duration = TimeInterval(fact.displayDuration ?? 15)

        progressTask = Task {
            let steps = 60  // 60 steps for smooth animation
            let stepDuration = duration / Double(steps)

            for i in 0...steps {
                if Task.isCancelled { break }

                await MainActor.run {
                    progressValue = CGFloat(i) / CGFloat(steps)
                }

                try? await Task.sleep(for: .seconds(stepDuration))
            }
        }
    }
}
