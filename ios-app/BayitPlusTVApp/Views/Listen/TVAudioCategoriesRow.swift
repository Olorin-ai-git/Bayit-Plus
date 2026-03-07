#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Horizontal row of genre/category filter pills for audio content.
    /// Tapping a category navigates to a filtered podcast browse view.
    struct TVAudioCategoriesRow: View {
        @Environment(TVNavigationCoordinator.self) private var coordinator
        @Environment(LocalizationManager.self) private var localization

        let podcastCategories: [PodcastCategory]

        /// Combined categories from podcasts and audiobooks
        private var allCategories: [AudioCategoryItem] {
            var items: [AudioCategoryItem] = []

            // Podcast categories
            for cat in podcastCategories {
                items.append(AudioCategoryItem(
                    id: "podcast-\(cat.id)",
                    name: cat.name,
                    icon: iconForCategory(cat.name),
                    type: .podcast
                ))
            }

            // Static audiobook genres
            let audiobookGenres = [
                ("fiction", "book", "audiobooks.categories.fiction"),
                ("nonfiction", "text.book.closed", "audiobooks.categories.nonfiction"),
                ("biography", "person.text.rectangle", "audiobooks.categories.biography"),
                ("history", "clock.arrow.circlepath", "audiobooks.categories.history"),
                ("selfhelp", "lightbulb", "audiobooks.categories.selfhelp"),
            ]

            for (id, icon, key) in audiobookGenres {
                items.append(AudioCategoryItem(
                    id: "audiobook-\(id)",
                    name: localization.t(key),
                    icon: icon,
                    type: .audiobook
                ))
            }

            return items
        }

        var body: some View {
            if allCategories.isEmpty {
                EmptyView()
            } else {
                sectionContent
            }
        }

        private var sectionContent: some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
                Text(localization.t("listen.categories"))
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .padding(.leading, TVDesignTokens.Spacing.xl)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: TVDesignTokens.Spacing.md) {
                        ForEach(allCategories) { item in
                            categoryPill(item)
                        }
                    }
                    .padding(.horizontal, TVDesignTokens.Spacing.xl)
                }
                .frame(height: TVDesignTokens.MinSize.focusableHeight + 20)
            }
        }

        private func categoryPill(_ item: AudioCategoryItem) -> some View {
            Button {
                // Categories link to browse views (future navigation)
            } label: {
                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    Image(systemName: item.icon)
                        .font(.system(size: TVDesignTokens.FontSize.base, weight: .medium))
                    Text(item.name)
                        .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                }
                .foregroundStyle(DesignTokens.Text.secondary)
                .padding(.horizontal, TVDesignTokens.Spacing.lg)
                .padding(.vertical, TVDesignTokens.Spacing.md)
                .background(DesignTokens.Glass.bg)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.default))
            }
            .tvCardStyle()
        }

        private func iconForCategory(_ name: String) -> String {
            switch name.lowercased() {
            case "news": return "newspaper"
            case "politics": return "building.columns"
            case "tech", "technology": return "desktopcomputer"
            case "business": return "briefcase"
            case "jewish": return "star.of.david"
            case "entertainment": return "sparkles.tv"
            case "sports": return "figure.run"
            case "history": return "clock.arrow.circlepath"
            case "educational", "education": return "graduationcap"
            case "culture": return "theatermasks"
            case "comedy": return "face.smiling"
            default: return "waveform"
            }
        }
    }

    private struct AudioCategoryItem: Identifiable {
        let id: String
        let name: String
        let icon: String
        let type: AudioCategoryType
    }

    private enum AudioCategoryType {
        case podcast
        case audiobook
    }
#endif
