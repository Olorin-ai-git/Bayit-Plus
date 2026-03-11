import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS proactive suggestion banner. Visual only — no TTS on Apple TV.
///
/// Renders when the ViewModel has a visible suggestion and slides in from
/// the top with a spring animation. Accept navigates to the suggested content;
/// Dismiss suppresses that content ID for the session.
struct TVProactiveSuggestionBannerView: View {
    @Environment(LocalizationManager.self) private var localization

    let viewModel: TVProactiveSuggestionViewModel
    var onExecute: ((ProactiveSuggestion) -> Void)?

    var body: some View {
        if viewModel.isVisible, let suggestion = viewModel.suggestion {
            bannerContent(suggestion: suggestion)
                .transition(.move(edge: .top).combined(with: .opacity))
                .animation(
                    .spring(response: 0.5, dampingFraction: 0.7),
                    value: viewModel.suggestion?.id
                )
        }
    }

    // MARK: - Banner Content

    private func bannerContent(suggestion: ProactiveSuggestion) -> some View {
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

                GlassButton(localization.t("common.dismiss"), variant: .secondary, size: .medium) {
                    viewModel.dismiss()
                }
                .tvFocusStyle()
                .accessibilityLabel("Dismiss suggestion")

                GlassButton(localization.t("common.accept"), variant: .primary, size: .medium) {
                    onExecute?(suggestion)
                    viewModel.execute()
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
