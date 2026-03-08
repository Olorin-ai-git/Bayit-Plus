#if os(tvOS)

    import BayitBYOC
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import BayitMedia
    import SwiftUI

    /// tvOS detail view for BYOC content, matching TVMovieDetailView backdrop-hero layout.
    struct TVBYOCDetailView: View {
        let item: BYOCContentItem

        @Environment(BYOCSourceManager.self) var byocManager
        @Environment(LocalizationManager.self) var localization
        @State var enrichmentResult: BYOCEnrichmentResult?
        @State var isEnriching = false
        @State var showPlayer = false

        let logger = BayitLogger(category: "TVBYOCDetail")

        var body: some View {
            ScrollView(.vertical, showsIndicators: false) {
                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xxl) {
                    backdropSection
                    actionButtons
                    descriptionSection
                }
            }
            .background(DesignTokens.Background.primary)
            .ignoresSafeArea()
            .task { await loadEnrichment() }
            .fullScreenCover(isPresented: $showPlayer) {
                TVPlayerView(
                    contentId: enrichmentResult?.contentId ?? item.id,
                    contentType: .vod,
                    channelId: nil,
                    directUrl: item.streamURL?.absoluteString,
                    byocSubtitleLanguages: enrichmentResult?.availableSubtitleLanguages ?? []
                )
            }
        }

        private func loadEnrichment() async {
            enrichmentResult = byocManager.enrichmentResult(for: item)
            if enrichmentResult == nil {
                isEnriching = true
                await byocManager.enrichIfNeeded(item)
                enrichmentResult = byocManager.enrichmentResult(for: item)
                isEnriching = false
            }
        }
    }

#endif
