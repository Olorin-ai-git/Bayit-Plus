import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct MovieInteractionsView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization

    let profileId: String

    @State private var movies: [InteractableMovieItem] = []
    @State private var isLoading = true
    @State private var error: String?

    private let columns = [
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
    ]

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            if isLoading {
                ProgressView().tint(.white)
            } else if let error {
                ErrorStateView(message: error) {
                    Task { await loadMovies() }
                }
            } else if movies.isEmpty {
                emptyState
            } else {
                movieGrid
            }
        }
        .navigationTitle(localization.t("zehAni.movieInteractions.title"))
        .navigationBarTitleDisplayMode(.large)
        .task { await loadMovies() }
    }

    private var emptyState: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Image(systemName: "film.stack")
                .font(.system(size: DesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Text.muted)
            Text(localization.t("zehAni.movieInteractions.empty"))
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
    }

    private var movieGrid: some View {
        ScrollView(.vertical, showsIndicators: false) {
            LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
                ForEach(movies) { movie in
                    movieTile(movie)
                }
            }
            .padding(DesignTokens.Spacing.lg)
            .padding(.bottom, 100)
        }
    }

    private func movieTile(_ movie: InteractableMovieItem) -> some View {
        GlassCard {
            Button {
                coordinator.pushToCurrentTab(
                    .zehAniMovieCharacters(profileId: profileId, contentId: movie.contentId)
                )
            } label: {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                    posterImage(url: movie.posterUrl)
                    movieInfo(movie)
                }
                .padding(DesignTokens.Spacing.sm)
            }
            .buttonStyle(.plain)
        }
    }

    private func posterImage(url: String?) -> some View {
        Group {
            if let urlStr = url, let imageUrl = URL(string: urlStr) {
                AsyncImage(url: imageUrl) { phase in
                    switch phase {
                    case .success(let img):
                        img.resizable().scaledToFill()
                    case .failure:
                        posterPlaceholder
                    default:
                        ProgressView().tint(.white).frame(maxWidth: .infinity)
                    }
                }
            } else {
                posterPlaceholder
            }
        }
        .frame(height: 180)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.default))
    }

    private var posterPlaceholder: some View {
        DesignTokens.Glass.bgMedium
            .overlay {
                Image(systemName: "film")
                    .font(.system(size: DesignTokens.FontSize.xxxl))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
    }

    private func movieInfo(_ movie: InteractableMovieItem) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
            Text(movie.title)
                .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
                .lineLimit(2)

            HStack(spacing: DesignTokens.Spacing.xs) {
                Image(systemName: "person.3.fill")
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Primary.default)
                Text(
                    localization.t(
                        "zehAni.movieInteractions.characterCount",
                        ["count": "\(movie.characterCount)"]
                    )
                )
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)
            }
        }
    }

    @MainActor
    private func loadMovies() async {
        isLoading = true
        error = nil
        do {
            movies = try await repos.movieInteraction.listInteractableMovies()
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}
