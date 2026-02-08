import BayitDesignSystem
import SwiftUI

/// Animated banner that displays proactive AI suggestions.
///
/// Slides in from the top with a spring animation. Shows the suggestion
/// message with a type label and priority-coded icon, plus execute and
/// dismiss action buttons. Auto-dismisses after a configurable timeout.
struct ProactiveSuggestionBannerView: View {

    let viewModel: ProactiveVoiceViewModel

    var body: some View {
        if viewModel.isVisible, let suggestion = viewModel.suggestion {
            bannerContent(suggestion: suggestion)
                .transition(.move(edge: .top).combined(with: .opacity))
                .animation(
                    .spring(response: 0.5, dampingFraction: 0.7),
                    value: viewModel.isVisible
                )
        }
    }

    // MARK: - Banner Content

    private func bannerContent(suggestion: ProactiveSuggestion) -> some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            HStack(spacing: DesignTokens.Spacing.md) {
                priorityIcon(for: suggestion.priority)

                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                    typeLabel(for: suggestion.type)

                    Text(suggestion.message ?? "")
                        .font(.system(size: DesignTokens.FontSize.base))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .lineLimit(2)
                }

                Spacer()
            }

            HStack(spacing: DesignTokens.Spacing.md) {
                Spacer()

                GlassButton(
                    "",
                    variant: .secondary,
                    size: .small,
                    icon: Image(systemName: "xmark")
                ) {
                    viewModel.dismiss()
                }
                .accessibilityLabel("Dismiss suggestion")

                GlassButton(
                    "",
                    variant: .primary,
                    size: .small,
                    icon: Image(systemName: "checkmark")
                ) {
                    viewModel.execute()
                }
                .accessibilityLabel("Accept suggestion")
            }
        }
        .glassCard(radius: DesignTokens.Radius.lg, padding: DesignTokens.Spacing.base)
        .padding(.horizontal, DesignTokens.Spacing.base)
        .padding(.top, DesignTokens.Spacing.sm)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Proactive suggestion: \(suggestion.message ?? "")")
    }

    // MARK: - Priority Icon

    private func priorityIcon(for priority: SuggestionPriority?) -> some View {
        Image(systemName: "sparkles")
            .font(.system(size: 24, weight: .medium))
            .foregroundStyle(priorityColor(for: priority))
            .frame(width: 40, height: 40)
            .background(priorityColor(for: priority).opacity(0.15))
            .clipShape(Circle())
    }

    private func priorityColor(for priority: SuggestionPriority?) -> Color {
        switch priority {
        case .high:
            return DesignTokens.ErrorColor.default
        case .medium:
            return DesignTokens.Warning.default
        case .low, .none:
            return DesignTokens.Primary.p400
        }
    }

    // MARK: - Type Label

    private func typeLabel(for type: SuggestionType?) -> some View {
        Text(typeLabelText(for: type))
            .font(.system(size: DesignTokens.FontSize.xs, weight: .semibold))
            .foregroundStyle(DesignTokens.Text.muted)
            .textCase(.uppercase)
    }

    private func typeLabelText(for type: SuggestionType?) -> String {
        switch type {
        case .timeBased:
            return "Scheduled"
        case .contextBased:
            return "For You"
        case .presenceBased:
            return "Welcome Back"
        case .none:
            return "Suggestion"
        }
    }
}
