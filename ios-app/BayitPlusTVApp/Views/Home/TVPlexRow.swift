#if os(tvOS)

    import BayitBYOC
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Home screen shelf row displaying Plex library content.
    /// Hides itself when no Plex sources are connected.
    struct TVPlexRow: View {
        @Environment(BYOCSourceManager.self) private var byocManager
        @Environment(TVNavigationCoordinator.self) private var coordinator
        @Environment(LocalizationManager.self) private var localization

        var body: some View {
            if !byocManager.plexItems.isEmpty {
                TVContentSection(
                    title: localization.t("byoc.fromPlex"),
                    icon: "server.rack",
                    items: byocManager.plexItems,
                    maxItems: 20
                ) { item in
                    plexCard(item)
                }
            }
        }

        private func plexCard(_ item: BYOCContentItem) -> some View {
            TVContentCard(
                imageURL: item.thumbnailURL?.absoluteString,
                title: item.title,
                subtitle: subtitle(for: item),
                badge: "PLEX",
                aspectRatio: item.contentType == .movie ? 2.0 / 3.0 : 16.0 / 9.0,
                placeholderIcon: "server.rack"
            ) {
                guard let url = item.streamURL else { return }
                coordinator.presentPlayer(
                    contentId: item.id,
                    contentType: .vod,
                    directUrl: url.absoluteString
                )
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
