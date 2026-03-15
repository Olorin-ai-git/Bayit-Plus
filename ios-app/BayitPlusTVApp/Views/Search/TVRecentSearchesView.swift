#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Horizontal row of recent search pills displayed above search results.
    /// Hidden when no recent searches exist. Each pill re-executes the search
    /// on select. A trailing clear-all button removes the history.
    struct TVRecentSearchesView: View {
        @Environment(LocalizationManager.self) var localization

        let recentSearches: [String]
        let onSelect: (String) -> Void
        let onClear: () -> Void

        var body: some View {
            if !recentSearches.isEmpty {
                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                    sectionHeader
                    chipsRow
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
                .accessibilityElement(children: .contain)
                .accessibilityLabel(localization.t("search.recentSearches"))
            }
        }

        // MARK: - Header

        private var sectionHeader: some View {
            HStack {
                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    Image(systemName: "clock.arrow.circlepath")
                        .font(.system(size: TVDesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .accessibilityHidden(true)

                    Text(localization.t("search.recentSearches"))
                        .font(.system(
                            size: TVDesignTokens.FontSize.md,
                            weight: .semibold
                        ))
                        .foregroundStyle(DesignTokens.Text.primary)
                }

                Spacer()

                GlassButton(
                    localization.t("search.clear"),
                    variant: .ghost,
                    size: .small
                ) {
                    onClear()
                }
                .tvCardStyle()
                .accessibilityLabel(localization.t("search.clear"))
            }
        }

        // MARK: - Chips Row

        private var chipsRow: some View {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                    ForEach(recentSearches, id: \.self) { query in
                        GlassChip(title: query, isSelected: false) {
                            onSelect(query)
                        }
                        .accessibilityLabel(query)
                        .accessibilityAddTraits(.isButton)
                    }
                }
                .padding(.vertical, TVDesignTokens.Spacing.sm)
            }
            .focusSection()
        }
    }
#endif
