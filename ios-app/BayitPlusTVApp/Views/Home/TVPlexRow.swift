#if os(tvOS)

    import BayitBYOC
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Home screen shelf row displaying Plex library content.
    /// Uses compact landscape cards to avoid dominating the home screen.
    struct TVPlexRow: View {
        @Environment(BYOCSourceManager.self) private var byocManager
        @Environment(TVNavigationCoordinator.self) private var coordinator
        @Environment(LocalizationManager.self) private var localization

        @State private var showAll = false

        var body: some View {
            if !byocManager.plexItems.isEmpty {
                TVContentSection(
                    title: localization.t("byoc.fromPlex"),
                    icon: "server.rack",
                    items: byocManager.plexItems,
                    maxItems: 10,
                    seeAllAction: byocManager.plexItems.count > 1 ? { showAll = true } : nil,
                    supplementaryAction: byocManager.plexItems.count == 1 ? { showAll = true } : nil,
                    supplementaryLabel: byocManager.plexItems.count == 1 ? localization.t("byoc.browsePlexLibrary") : nil
                ) { item in
                    plexCard(item)
                }
                .fullScreenCover(isPresented: $showAll) {
                    TVBYOCBrowseGrid(
                        title: localization.t("byoc.fromPlex"),
                        icon: "server.rack",
                        items: byocManager.plexItems,
                        onDismiss: { showAll = false }
                    ) { item in
                        plexCard(item)
                    }
                }
            }
        }

        private func plexCard(_ item: BYOCContentItem) -> some View {
            TVContentCard(
                imageURL: (item.backdropURL ?? item.thumbnailURL)?.absoluteString,
                title: item.title,
                subtitle: subtitle(for: item),
                badge: "PLEX",
                aspectRatio: 16.0 / 9.0,
                placeholderIcon: "server.rack"
            ) {
                coordinator.fullscreenRoute = .byocDetail(item: item)
            }
        }

        private func subtitle(for item: BYOCContentItem) -> String? {
            var parts: [String] = []
            if let year = item.year { parts.append("\(year)") }
            if let genre = item.genre { parts.append(genre) }
            if let dur = item.duration {
                let mins = dur / 60
                if mins > 0 { parts.append("\(mins)m") }
            }
            return parts.isEmpty ? nil : parts.joined(separator: " | ")
        }
    }

#endif
