import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Episode generation configuration: theme selection, vocabulary preview, credit cost.
struct EpisodeGeneratorView: View {
    @Environment(LocalizationManager.self) private var localization
    @Environment(\.dismiss) private var dismiss

    let profileId: String
    let avatarId: String
    let viewModel: StarStoryViewModel?

    @State private var selectedTheme: String?
    @State private var isGenerating = false

    private let themes = [
        ThemeOption(key: "adventure", icon: "map.fill"),
        ThemeOption(key: "friendship", icon: "heart.fill"),
        ThemeOption(key: "nature", icon: "leaf.fill"),
        ThemeOption(key: "holiday", icon: "star.fill"),
        ThemeOption(key: "family", icon: "house.fill"),
        ThemeOption(key: "school", icon: "book.fill"),
    ]

    var body: some View {
        NavigationStack {
            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: DesignTokens.Spacing.lg) {
                    headerSection
                    themeSection
                    vocabularyPreview
                    creditSection
                    generateButton
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
                .padding(.vertical, DesignTokens.Spacing.xl)
            }
            .background(DesignTokens.Background.primary)
            .navigationTitle(localization.t("starStory.newEpisode"))
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(localization.t("common.cancel")) { dismiss() }
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
            }
        }
    }

    private var headerSection: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: "wand.and.stars")
                .font(.system(size: DesignTokens.FontSize.xxxl))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(localization.t("starStory.createEpisode"))
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("starStory.createEpisodeSubtitle"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
    }

    private var themeSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text(localization.t("starStory.selectTheme"))
                .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)

            LazyVGrid(
                columns: [
                    GridItem(.flexible(), spacing: DesignTokens.Spacing.sm),
                    GridItem(.flexible(), spacing: DesignTokens.Spacing.sm),
                    GridItem(.flexible(), spacing: DesignTokens.Spacing.sm),
                ],
                spacing: DesignTokens.Spacing.sm
            ) {
                ForEach(themes, id: \.key) { theme in
                    themeCard(theme)
                }
            }
        }
    }

    private func themeCard(_ theme: ThemeOption) -> some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: theme.icon)
                    .font(.system(size: DesignTokens.FontSize.xl))
                    .foregroundStyle(
                        selectedTheme == theme.key
                            ? DesignTokens.Primary.p400
                            : DesignTokens.Text.muted
                    )

                Text(localization.t("starStory.theme.\(theme.key)"))
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity)
        }
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .strokeBorder(
                    selectedTheme == theme.key ? DesignTokens.Primary.p400 : Color.clear,
                    lineWidth: 2
                )
        )
        .onTapGesture { selectedTheme = theme.key }
    }

    private var vocabularyPreview: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                HStack {
                    Image(systemName: "text.book.closed")
                        .foregroundStyle(DesignTokens.Primary.p400)
                    Text(localization.t("starStory.vocabulary"))
                        .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)
                }

                Text(localization.t("starStory.vocabularyHint"))
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
        }
    }

    private var creditSection: some View {
        GlassCard {
            HStack {
                Image(systemName: "creditcard")
                    .foregroundStyle(DesignTokens.Warning.default)

                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                    Text(localization.t("starStory.creditCost"))
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Text(localization.t("starStory.creditInfo"))
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Text.muted)
                }

                Spacer()
            }
        }
    }

    private var generateButton: some View {
        GlassButton(
            localization.t("starStory.generate"),
            variant: .primary,
            size: .large
        ) {
            guard let theme = selectedTheme else { return }
            isGenerating = true
            Task {
                await viewModel?.startGeneration(
                    profileId: profileId,
                    avatarId: avatarId,
                    theme: theme,
                    targetVocabulary: []
                )
                dismiss()
            }
        }
        .disabled(selectedTheme == nil || isGenerating)
    }
}

private struct ThemeOption {
    let key: String
    let icon: String
}
