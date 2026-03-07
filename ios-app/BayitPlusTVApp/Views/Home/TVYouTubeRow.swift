#if os(tvOS)

    import BayitBYOC
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Home shelf row displaying YouTube content from connected account.
    /// Tapping a card opens the video in the YouTube tvOS app.
    struct TVYouTubeRow: View {
        @Environment(BYOCSourceManager.self) private var byocManager
        @Environment(LocalizationManager.self) private var localization

        @State private var showAll = false

        var body: some View {
            if byocManager.hasYouTube, !byocManager.youtubeItems.isEmpty {
                TVContentSection(
                    title: localization.t("byoc.fromYouTube"),
                    icon: "play.rectangle.fill",
                    items: byocManager.youtubeItems,
                    maxItems: 10,
                    seeAllAction: { showAll = true }
                ) { item in
                    youtubeCard(item)
                }
                .fullScreenCover(isPresented: $showAll) {
                    TVBYOCBrowseGrid(
                        title: localization.t("byoc.fromYouTube"),
                        icon: "play.rectangle.fill",
                        items: byocManager.youtubeItems,
                        onDismiss: { showAll = false }
                    ) { item in
                        youtubeCard(item)
                    }
                }
            }
        }

        private func youtubeCard(_ item: BYOCContentItem) -> some View {
            TVContentCard(
                imageURL: item.thumbnailURL?.absoluteString,
                title: item.title,
                subtitle: item.genre,
                badge: "YT",
                aspectRatio: 16 / 9
            ) {
                openInYouTube(item: item)
            }
        }

        private func openInYouTube(item: BYOCContentItem) {
            guard let webURL = item.streamURL else { return }
            let urlStr = webURL.absoluteString
            let videoId = urlStr.components(separatedBy: "v=").last ?? ""
            guard !videoId.isEmpty else { return }

            if let appURL = URL(string: "youtube://watch/\(videoId)") {
                UIApplication.shared.open(appURL) { success in
                    if !success {
                        UIApplication.shared.open(webURL)
                    }
                }
            }
        }
    }

#endif
