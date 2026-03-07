import BayitBYOC
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Home shelf row showing BYOC content (Plex + YouTube) with native-matching cards.
struct BYOCShelfRow: View {
    @Environment(BYOCSourceManager.self) private var byocManager
    @Environment(LocalizationManager.self) private var localization
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(RepositoryProvider.self) private var repos

    var body: some View {
        if !byocManager.plexItems.isEmpty {
            plexSection
        }
        if !byocManager.youtubeItems.isEmpty {
            youtubeSection
        }
    }

    // MARK: - Sections

    private var plexSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            sectionHeader(title: localization.t("byoc.fromPlex"), icon: "server.rack")
            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: DesignTokens.Spacing.md) {
                    ForEach(byocManager.plexItems) { item in
                        byocCard(item: item)
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
            }
        }
    }

    private var youtubeSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            sectionHeader(title: localization.t("byoc.fromYouTube"), icon: "play.rectangle.fill")
            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: DesignTokens.Spacing.md) {
                    ForEach(byocManager.youtubeItems) { item in
                        byocCard(item: item)
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
            }
        }
    }

    // MARK: - Card

    private func byocCard(item: BYOCContentItem) -> some View {
        let enrichment = byocManager.enrichmentResult(for: item)
        let progress = watchProgress(for: item, enrichment: enrichment)
        return BYOCMovieCard(
            item: item,
            enrichmentResult: enrichment,
            watchProgress: progress,
            onTap: { coordinator.navigate(to: .byocDetail(item: item)) }
        )
        .frame(width: 140)
        .task { await byocManager.enrichIfNeeded(item) }
    }

    private func watchProgress(for item: BYOCContentItem, enrichment: BYOCEnrichmentResult?) -> Double? {
        let progressService = BYOCWatchProgressService(repository: repos.media)
        return progressService.cachedProgress(for: item, enrichmentResult: enrichment)
    }

    // MARK: - Header

    private func sectionHeader(title: String, icon: String) -> some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: icon)
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Primary.default)
            Text(title)
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }
}
