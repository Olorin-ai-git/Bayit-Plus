#if os(iOS)
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Context tab showing educational context about current content.
struct CompanionContextTab: View {
    @Environment(LocalizationManager.self) private var localization
    let viewModel: AICompanionViewModel

    var body: some View {
        ScrollView(.vertical, showsIndicators: true) {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                if let context = viewModel.contextText {
                    Text(context)
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .lineSpacing(4)
                }

                if !viewModel.topics.isEmpty {
                    topicsSection
                }

                if !viewModel.relatedLinks.isEmpty {
                    linksSection
                }

                if viewModel.contextText == nil && viewModel.topics.isEmpty {
                    emptyState
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.base)
            .padding(.vertical, DesignTokens.Spacing.md)
        }
    }

    private var topicsSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text(localization.t("culturalContext.related"))
                .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)

            ForEach(viewModel.topics) { topic in
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                    Text(topic.title)
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.primary)
                    if let desc = topic.description {
                        Text(desc)
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }
                }
                .padding(DesignTokens.Spacing.sm)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(DesignTokens.Glass.bgLight)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
            }
        }
    }

    private var linksSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text(localization.t("common.learnMore"))
                .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)

            ForEach(viewModel.relatedLinks) { link in
                HStack {
                    Image(systemName: "link")
                        .foregroundStyle(DesignTokens.Primary.p300)
                    Text(link.title)
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Primary.p400)
                }
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            Spacer()
            Image(systemName: "text.book.closed")
                .font(.system(size: 32))
                .foregroundStyle(DesignTokens.Text.muted)
            Text(localization.t("aiCompanion.noContext"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
            Spacer()
        }
        .frame(maxWidth: .infinity)
    }
}
#endif
