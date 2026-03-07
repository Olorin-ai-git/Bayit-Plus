#if os(tvOS)
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import BayitMedia
    import SwiftUI

    /// Horizontal row of in-progress audio items (podcasts, audiobooks)
    /// pulled from the user's watch history filtered to audio content types.
    struct TVContinueListeningRow: View {
        @Environment(TVRepositoryProvider.self) private var repos
        @Environment(TVNavigationCoordinator.self) private var coordinator
        @Environment(TVAudioPlaybackManager.self) private var audioManager
        @Environment(LocalizationManager.self) private var localization

        @State private var items: [ContinueListeningItem] = []
        @State private var isLoading = true

        private let logger = BayitLogger(category: "TVContinueListening")

        var body: some View {
            if isLoading {
                EmptyView()
            } else if !items.isEmpty {
                sectionContent
            }
        }

        private var sectionContent: some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
                Text(localization.t("listen.continueListening"))
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .padding(.leading, TVDesignTokens.Spacing.xl)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                        ForEach(items) { item in
                            continueItemCard(item)
                        }
                    }
                    .padding(.horizontal, TVDesignTokens.Spacing.xl)
                }
            }
            .task { await loadContinueListening() }
        }

        private func continueItemCard(_ item: ContinueListeningItem) -> some View {
            GlassFocusPoster(
                thumbnailURL: item.thumbnailURL,
                title: item.title,
                subtitle: item.subtitle,
                badge: item.progressLabel,
                aspectRatio: 1.0,
                onSelect: {
                    audioManager.play(
                        contentId: item.contentId,
                        contentType: item.contentType
                    )
                }
            )
        }

        private func loadContinueListening() async {
            defer { isLoading = false }
            do {
                let history = try await repos.media.fetchWatchHistory(
                    page: 1, limit: 20
                )
                let audioItems = history.items.filter { entry in
                    let type = entry.type?.lowercased() ?? ""
                    return type == "podcast" || type == "audiobook"
                }
                items = audioItems.prefix(10).map { entry in
                    ContinueListeningItem(
                        contentId: entry.id,
                        title: entry.title ?? localization.t("common.untitled"),
                        subtitle: nil,
                        thumbnailURL: entry.thumbnail,
                        contentType: mapContentType(entry.type),
                        progressLabel: formatProgress(entry.progress)
                    )
                }
            } catch {
                logger.warning(
                    "Failed to load continue listening",
                    context: ["error": error.localizedDescription]
                )
            }
        }

        private func mapContentType(_ typeString: String?) -> MediaContentType {
            switch typeString?.lowercased() {
            case "podcast": return .podcast
            case "audiobook": return .audiobook
            default: return .podcast
            }
        }

        private func formatProgress(_ progress: Double?) -> String? {
            guard let progress, progress > 0, progress < 1 else { return nil }
            return "\(Int(progress * 100))%"
        }
    }

    private struct ContinueListeningItem: Identifiable {
        let contentId: String
        let title: String
        let subtitle: String?
        let thumbnailURL: String?
        let contentType: MediaContentType
        let progressLabel: String?

        var id: String {
            contentId
        }
    }
#endif
