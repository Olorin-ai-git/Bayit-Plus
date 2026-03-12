import BayitBYOC
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Detail view for BYOC content, matching native MovieDetailView layout.
struct BYOCDetailView: View {
    let item: BYOCContentItem
    @Environment(BYOCSourceManager.self) var byocManager
    @Environment(LocalizationManager.self) var localization
    @Environment(NavigationCoordinator.self) var coordinator
    @State var enrichmentResult: BYOCEnrichmentResult?
    @State var isEnriching = false
    @State var showAIFeaturesSheet = false

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            LazyVStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
                backdropSection
                metadataSection
                actionButtons

                if let genre = item.genre, !genre.isEmpty {
                    genreChips(genre)
                }

                if isEnriching {
                    enrichmentProgressView
                }

                relatedSection
            }
        }
        .background(DesignTokens.Background.primary)
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadEnrichment() }
    }
}
