#if os(tvOS)
import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct TVCompanionContextTab: View {
    @Environment(LocalizationManager.self) private var localization

    let viewModel: AICompanionViewModel

    @FocusState private var focusedTopicIndex: Int?

    var body: some View {
        ScrollView(.vertical, showsIndicators: true) {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
                if let context = viewModel.contextText {
                    contextTextSection(context)
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
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            .padding(.vertical, TVDesignTokens.Spacing.xl)
        }
    }

    private func contextTextSection(_ text: String) -> some View {
        Text(text)
            .font(.system(size: TVDesignTokens.FontSize.lg))
            .foregroundStyle(DesignTokens.Text.primary)
            .lineSpacing(8)
            .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var topicsSection: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("culturalContext.related"))
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)

            LazyVGrid(
                columns: [
                    GridItem(.flexible(), spacing: TVDesignTokens.Spacing.lg),
                    GridItem(.flexible(), spacing: TVDesignTokens.Spacing.lg)
                ],
                spacing: TVDesignTokens.Spacing.lg
            ) {
                ForEach(Array(viewModel.topics.enumerated()), id: \.element.id) { index, topic in
                    topicCard(topic)
                        .focused($focusedTopicIndex, equals: index)
                }
            }
        }
    }

    private func topicCard(_ topic: CompanionTopic) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            Text(topic.title)
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
                .lineLimit(2)

            if let desc = topic.description {
                Text(desc)
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .lineLimit(3)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bgLight)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
    }

    private var linksSection: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("common.learnMore"))
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)

            ForEach(viewModel.relatedLinks) { link in
                HStack(spacing: TVDesignTokens.Spacing.md) {
                    Image(systemName: "link")
                        .font(.system(size: TVDesignTokens.FontSize.lg))
                        .foregroundStyle(DesignTokens.Primary.p300)

                    Text(link.title)
                        .font(.system(size: TVDesignTokens.FontSize.lg))
                        .foregroundStyle(DesignTokens.Primary.p400)
                }
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Spacer()

            Image(systemName: "text.book.closed")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Text.muted)

            Text(localization.t("aiCompanion.noContext"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
#endif
