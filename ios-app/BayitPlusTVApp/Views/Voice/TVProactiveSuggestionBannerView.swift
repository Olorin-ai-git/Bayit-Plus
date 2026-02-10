import BayitDesignSystem
import SwiftUI

/// tvOS proactive suggestion banner. Visual only — no TTS on Apple TV.
struct TVProactiveSuggestionBannerView: View {

    let engine: ProactiveSuggestionEngine
    var onExecute: ((ProactiveSuggestion) -> Void)?

    var body: some View {
        if engine.currentSuggestion != nil {
            bannerContent
                .transition(.move(edge: .top).combined(with: .opacity))
                .animation(
                    .spring(response: 0.5, dampingFraction: 0.7),
                    value: engine.currentSuggestion?.id
                )
        }
    }

    // MARK: - Banner Content

    @ViewBuilder
    private var bannerContent: some View {
        if let suggestion = engine.currentSuggestion {
            VStack(spacing: TVDesignTokens.Spacing.md) {
                HStack(spacing: TVDesignTokens.Spacing.lg) {
                    priorityIcon(for: suggestion.priority)

                    VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                        typeLabel(for: suggestion.type)

                        Text(suggestion.message ?? "")
                            .font(.system(size: TVDesignTokens.FontSize.base))
                            .foregroundStyle(DesignTokens.Text.primary)
                            .lineLimit(2)
                    }

                    Spacer()
                }

                HStack(spacing: TVDesignTokens.Spacing.lg) {
                    Spacer()

                    GlassButton("Dismiss", variant: .secondary, size: .medium) {
                        engine.dismissSuggestion()
                    }
                    .tvFocusStyle()
                    .accessibilityLabel("Dismiss suggestion")

                    GlassButton("Accept", variant: .primary, size: .medium) {
                        onExecute?(suggestion)
                        engine.dismissSuggestion()
                    }
                    .tvFocusStyle()
                    .accessibilityLabel("Accept suggestion")
                }
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Glass.bgMedium)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.top, TVDesignTokens.Spacing.md)
            .accessibilityElement(children: .contain)
            .accessibilityLabel("Suggestion: \(suggestion.message ?? "")")
        }
    }

    // MARK: - Priority Icon

    private func priorityIcon(for priority: SuggestionPriority?) -> some View {
        Image(systemName: "sparkles")
            .font(.system(size: TVDesignTokens.FontSize.xl, weight: .medium))
            .foregroundStyle(priorityColor(for: priority))
            .frame(width: 56, height: 56)
            .background(priorityColor(for: priority).opacity(0.15))
            .clipShape(Circle())
    }

    private func priorityColor(for priority: SuggestionPriority?) -> Color {
        switch priority {
        case .high: return DesignTokens.ErrorColor.default
        case .medium: return DesignTokens.Warning.default
        case .low, .none: return DesignTokens.Primary.p400
        }
    }

    // MARK: - Type Label

    private func typeLabel(for type: SuggestionType?) -> some View {
        Text(typeLabelText(for: type))
            .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
            .foregroundStyle(DesignTokens.Text.muted)
            .textCase(.uppercase)
    }

    private func typeLabelText(for type: SuggestionType?) -> String {
        switch type {
        case .timeBased: return "Scheduled"
        case .contextBased: return "For You"
        case .presenceBased: return "Welcome Back"
        case .none: return "Suggestion"
        }
    }
}
