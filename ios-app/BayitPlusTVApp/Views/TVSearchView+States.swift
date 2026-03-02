import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

// MARK: - Search States & Navigation

extension TVSearchView {
    var searchingState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView().tint(DesignTokens.Primary.default).scaleEffect(1.5)
            Text(localization.t("search.searching"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }

    func errorState(_ message: String, onRetry: @escaping () -> Void) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Warning.default)
            Text(message)
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
            GlassButton(localization.t("common.retry"), variant: .secondary, size: .medium) { onRetry() }
                .tvFocusStyle()
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }

    func emptyState(_ vm: SearchViewModel) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Text.muted)
            Text(localization.t("search.noResults"))
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.secondary)
            Text(localization.t("search.tryDifferent"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
            if !vm.advancedFilters.isEmpty || vm.selectedFilter != .all {
                GlassButton(localization.t("search.clearFilters"), variant: .secondary, size: .medium) {
                    vm.clearFilters()
                }
                .tvFocusStyle()
            }
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }

    var searchPrompt: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 80))
                .foregroundStyle(DesignTokens.Text.muted.opacity(0.4))
            Text(localization.t("tvos.search.searchForContent"))
                .font(.system(size: TVDesignTokens.FontSize.xl))
                .foregroundStyle(DesignTokens.Text.muted)
            GlassButton(
                "AI Search", variant: .secondary, size: .medium,
                icon: Image(systemName: "sparkles")
            ) { showAISearch = true }
                .tvFocusStyle()
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }

    func handleResultSelection(_ result: UnifiedSearchResult) {
        let contentType = result.contentType?.lowercased() ?? ""
        switch contentType {
        case "actor":
            selectedActorName = result.id
        case "live":
            coordinator.presentPlayer(contentId: result.id, contentType: .liveTV)
        case "radio":
            coordinator.presentPlayer(contentId: result.id, contentType: .radio)
        case "podcast":
            coordinator.fullscreenRoute = .podcastDetail(showId: result.id)
        case "collection":
            coordinator.fullscreenRoute = .collectionDetail(collectionId: result.id)
        case "series":
            coordinator.fullscreenRoute = .seriesDetail(seriesId: result.id)
        case "audiobook":
            coordinator.fullscreenRoute = .audiobookDetail(audiobookId: result.id)
        default:
            coordinator.fullscreenRoute = .movieDetail(movieId: result.id)
        }
    }
}
