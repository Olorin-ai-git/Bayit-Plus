import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Movie detail screen with backdrop, metadata, cast, and related content
struct MovieDetailView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @Environment(DownloadManager.self) private var downloadManager
    @State private var viewModel: MovieDetailViewModel?

    let movieId: String

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.detail == nil {
                    loadingState
                } else if let error = vm.error, vm.detail == nil {
                    ErrorStateView(message: error) {
                        Task { await vm.loadDetail() }
                    }
                } else if let detail = vm.detail {
                    detailContent(detail, vm: vm)
                }
            } else {
                ScreenLoadingView()
            }
        }
        .background(DesignTokens.Background.primary)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            if viewModel == nil {
                viewModel = MovieDetailViewModel(
                    movieId: movieId,
                    repository: repos.content,
                    userRepository: repos.user
                )
            }
            await viewModel?.loadDetail()
        }
    }

    private func detailContent(_ detail: ContentDetail, vm: MovieDetailViewModel) -> some View {
        LazyVStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
            backdropSection(detail)
            metadataSection(detail)
            actionButtons(detail)

            if let genre = detail.genre, !genre.isEmpty {
                genreChips(genre)
            }

            if let cast = detail.cast, !cast.isEmpty {
                castSection(cast)
            }

            if !vm.relatedItems.isEmpty {
                relatedSection(vm.relatedItems)
            }
        }
    }

    private func backdropSection(_ detail: ContentDetail) -> some View {
        ZStack(alignment: .bottomLeading) {
            backdropImage(detail)
                .frame(height: 280, alignment: .top)
                .clipped()

            LinearGradient(
                colors: [.clear, DesignTokens.Background.primary],
                startPoint: .center,
                endPoint: .bottom
            )

            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                Text(detail.title ?? "")
                    .font(.system(size: DesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundColor(DesignTokens.Text.primary)

                HStack(spacing: DesignTokens.Spacing.md) {
                    if let year = detail.year { metadataTag(String(year)) }
                    if let duration = detail.duration { metadataTag(duration) }
                    if let rating = detail.rating { metadataTag(rating.value) }
                    if let genre = detail.genre { metadataTag(genre) }
                }
            }
            .padding(DesignTokens.Spacing.lg)
        }
    }

    private func backdropImage(_ detail: ContentDetail) -> some View {
        Group {
            if let urlStr = detail.backdrop ?? detail.thumbnail,
               let url = URL(string: urlStr) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let img):
                        img.resizable().aspectRatio(contentMode: .fill)
                    default:
                        DesignTokens.Glass.bgMedium
                    }
                }
            } else {
                DesignTokens.Glass.bgMedium
            }
        }
        .frame(maxWidth: .infinity)
    }

    private func metadataTag(_ text: String) -> some View {
        Text(text)
            .font(.system(size: DesignTokens.FontSize.xs))
            .foregroundColor(DesignTokens.Text.secondary)
    }

    private func metadataSection(_ detail: ContentDetail) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            if let languages = detail.availableSubtitleLanguages, !languages.isEmpty {
                SubtitleFlagsPill(
                    languages: languages,
                    aiLanguages: aiLanguages(for: languages),
                    size: .medium
                )
            }

            if let description = detail.description {
                Text(description)
                    .font(.system(size: DesignTokens.FontSize.md))
                    .foregroundColor(DesignTokens.Text.secondary)
                    .lineSpacing(4)
            }

            if let director = detail.director {
                HStack {
                    Text(localization.t("content.director") + ":")
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                        .foregroundColor(DesignTokens.Text.muted)
                    Text(director)
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundColor(DesignTokens.Text.primary)
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func actionButtons(_ detail: ContentDetail) -> some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            GlassButton(localization.t("content.play"), variant: .primary, size: .large,
                         icon: Image(systemName: "play.fill")) {
                coordinator.presentFullscreen(.player(
                    contentId: detail.id,
                    contentType: .movie
                ))
            }

            if viewModel?.hasTrailer == true, let trailerUrl = detail.trailerUrl {
                GlassButton(localization.t("content.trailer"), variant: .secondary, size: .large,
                             icon: Image(systemName: "film")) {
                    coordinator.presentFullscreen(.player(
                        contentId: trailerUrl,
                        contentType: .movie
                    ))
                }
            }

            favoriteButton
            downloadButton(detail)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func downloadButton(_ detail: ContentDetail) -> some View {
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
                    contentType: .movie
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

    private var favoriteButton: some View {
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

    private func genreChips(_ genre: String) -> some View {
        let genres = genre.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }
        return ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                ForEach(genres, id: \.self) { g in
                    Text(g)
                        .font(.system(size: DesignTokens.FontSize.xs, weight: .medium))
                        .foregroundColor(DesignTokens.Text.primary)
                        .padding(.horizontal, DesignTokens.Spacing.md)
                        .padding(.vertical, DesignTokens.Spacing.xs)
                        .background(DesignTokens.Glass.bg)
                        .clipShape(Capsule())
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
        }
    }

    private func castSection(_ cast: [String]) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text(localization.t("content.cast"))
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)

            Text(cast.joined(separator: ", "))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundColor(DesignTokens.Text.secondary)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func relatedSection(_ items: [RelatedItem]) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text(localization.t("content.relatedContent"))
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)
                .padding(.horizontal, DesignTokens.Spacing.lg)

            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: DesignTokens.Spacing.md) {
                    ForEach(items) { item in
                        GlassContentCard(
                            thumbnailURL: item.thumbnail,
                            title: item.title,
                            subtitle: relatedSubtitle(item),
                            aspectRatio: 2 / 3,
                            width: 120,
                            placeholderIcon: .movie,
                            onTap: {
                                coordinator.navigate(to: .movieDetail(movieId: item.id))
                            }
                        )
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
            }
        }
    }

    private func relatedSubtitle(_ item: RelatedItem) -> String? {
        let parts = [item.year.map(String.init), item.duration].compactMap { $0 }
        return parts.isEmpty ? nil : parts.joined(separator: " | ")
    }

    private func aiLanguages(for languages: [String]) -> Set<String> {
        var aiLangs = Set<String>()
        if languages.contains("he") { aiLangs.insert("he") }
        if languages.contains("en") { aiLangs.insert("en") }
        return aiLangs
    }

    private var loadingState: some View { MovieDetailLoadingView() }
}
