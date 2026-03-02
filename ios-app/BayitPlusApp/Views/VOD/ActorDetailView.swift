import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Actor detail screen showing photo, biography, and filmography
struct ActorDetailView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: ActorDetailViewModel?

    let actorName: String

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.actor == nil {
                    ScreenLoadingView()
                } else if let error = vm.error, vm.actor == nil {
                    ErrorStateView(message: error) {
                        Task { await vm.loadActor() }
                    }
                } else if let actor = vm.actor {
                    actorContent(actor)
                }
            } else {
                ScreenLoadingView()
            }
        }
        .background(DesignTokens.Background.primary)
        .navigationTitle(localization.t("vod.actor.collection"))
        .navigationBarTitleDisplayMode(.inline)
        .task {
            if viewModel == nil {
                viewModel = ActorDetailViewModel(
                    actorName: actorName,
                    repository: repos.actor
                )
            }
            await viewModel?.loadActor()
        }
    }

    // MARK: - Content

    private func actorContent(_ actor: ActorDetail) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
            actorHeader(actor)

            if let biography = actor.biography, !biography.isEmpty {
                biographyCard(biography)
            }

            if !actor.movies.isEmpty {
                filmographySection(actor.movies)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.vertical, DesignTokens.Spacing.md)
    }

    // MARK: - Header

    private func actorHeader(_ actor: ActorDetail) -> some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            actorPhoto(actor.profileUrl)

            Text(actor.name)
                .font(.system(size: DesignTokens.FontSize.xxl, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)
                .multilineTextAlignment(.center)

            HStack(spacing: DesignTokens.Spacing.md) {
                Text("\(actor.movieCount) \(localization.t("vod.actor.films"))")
                    .font(.system(size: DesignTokens.FontSize.md))
                    .foregroundColor(DesignTokens.Text.muted)

                if let birthday = actor.birthday {
                    Text(birthday)
                        .font(.system(size: DesignTokens.FontSize.md))
                        .foregroundColor(DesignTokens.Text.muted)
                }
            }

            if let place = actor.placeOfBirth {
                HStack(spacing: DesignTokens.Spacing.xs) {
                    Text(localization.t("vod.actor.bornIn"))
                        .foregroundColor(DesignTokens.Text.muted)
                    Text(place)
                        .foregroundColor(DesignTokens.Text.secondary)
                }
                .font(.system(size: DesignTokens.FontSize.sm))
            }
        }
        .frame(maxWidth: .infinity)
    }

    private func actorPhoto(_ profileUrl: String?) -> some View {
        Group {
            if let profileUrl, let url = URL(string: profileUrl) {
                CachedAsyncImage(url: url) { phase in
                    switch phase {
                    case let .success(image):
                        image.resizable().aspectRatio(contentMode: .fill)
                    default:
                        placeholderCircle
                    }
                }
            } else {
                placeholderCircle
            }
        }
        .frame(width: 180, height: 180)
        .clipShape(Circle())
        .overlay(Circle().stroke(DesignTokens.Glass.border, lineWidth: 2))
        .shadow(color: .black.opacity(0.3), radius: 8, y: 4)
    }

    private var placeholderCircle: some View {
        Circle()
            .fill(DesignTokens.Glass.bgMedium)
            .overlay(
                Image(systemName: "person.fill")
                    .foregroundColor(DesignTokens.Text.muted)
                    .font(.system(size: 60))
            )
    }

    // MARK: - Biography

    private func biographyCard(_ text: String) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text(localization.t("vod.actor.biography"))
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)

            Text(text)
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundColor(DesignTokens.Text.secondary)
                .lineSpacing(4)
                .lineLimit(8)
        }
        .padding(DesignTokens.Spacing.md)
        .background(DesignTokens.Glass.bgMedium)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
    }

    // MARK: - Filmography

    private func filmographySection(_ movies: [ActorMovie]) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text(localization.t("vod.actor.filmography"))
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)

            ForEach(Array(movies.enumerated()), id: \.element.id) { index, movie in
                ActorMovieRow(index: index + 1, movie: movie) {
                    coordinator.navigate(to: .movieDetail(movieId: movie.id))
                }
            }
        }
    }
}
