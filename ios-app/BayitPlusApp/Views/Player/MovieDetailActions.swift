import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - Action Buttons for MovieDetailView

extension MovieDetailView {
    func actionButtons(_ detail: ContentDetail) -> some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            GlassButton(localization.t("content.play"), variant: .primary, size: .large,
                        icon: Image(systemName: "play.fill"))
            {
                coordinator.presentFullscreen(.player(
                    contentId: detail.id,
                    contentType: .movie
                ))
            }

            if viewModel?.hasTrailer == true {
                GlassButton(localization.t("content.trailer"), variant: .secondary, size: .large,
                            icon: Image(systemName: "film"))
                {
                    Task { await resolveAndShowTrailer(contentId: detail.id) }
                }
            }

            favoriteButton
            downloadButton(detail)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    func downloadButton(_ detail: ContentDetail) -> some View {
        let existing = downloadManager.downloads.first(where: { $0.contentId == detail.id })
        let isDownloaded = existing?.status == .completed
        let isActive = existing != nil && existing?.status != .completed && existing?.status != .failed
        return Button {
            guard !isActive && !isDownloaded else { return }
            Task {
                await downloadManager.startDownload(DownloadRequest(
                    contentId: detail.id,
                    title: detail.title ?? "",
                    thumbnail: detail.thumbnail,
                    contentType: .movie,
                    streamUrl: detail.directUrl ?? detail.streamUrl
                ))
            }
        } label: {
            Image(systemName: isDownloaded ? "checkmark.circle.fill" : (isActive ? "arrow.down.circle.fill" : "arrow.down.circle"))
                .font(.system(size: 20))
                .foregroundColor(isDownloaded ? .green : (isActive ? DesignTokens.Primary.default : DesignTokens.Text.secondary))
                .frame(width: 44, height: 44)
                .background(DesignTokens.Glass.bg)
                .clipShape(Circle())
        }
        .buttonStyle(.plain)
        .disabled(isActive || isDownloaded)
    }

    var favoriteButton: some View {
        let isFav = viewModel?.isFavorite ?? false
        return Button {
            Task { await viewModel?.toggleFavorite() }
        } label: {
            Image(systemName: isFav ? "heart.fill" : "heart")
                .font(.system(size: 20))
                .foregroundColor(isFav ? DesignTokens.Primary.default : DesignTokens.Text.secondary)
                .frame(width: 44, height: 44)
                .background(DesignTokens.Glass.bg)
                .clipShape(Circle())
        }
        .buttonStyle(.plain)
        .disabled(viewModel?.isFavoriteLoading ?? false)
    }

    func resolveAndShowTrailer(contentId: String) async {
        if resolvedTrailerUrl != nil {
            showTrailer = true
            return
        }
        do {
            let response = try await repos.content.fetchTrailerStream(contentId: contentId)
            if let streamUrl = response.streamUrl {
                resolvedTrailerUrl = streamUrl
                showTrailer = true
            }
        } catch {
            // Trailer resolution failed silently; button tap had no effect
        }
    }

    var loadingState: some View {
        MovieDetailLoadingView()
    }
}
