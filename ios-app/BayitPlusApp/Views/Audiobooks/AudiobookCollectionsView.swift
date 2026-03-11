import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Two-column grid of audiobook authors for browsing by author
struct AudiobookCollectionsView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @State private var authors: [AudiobookAuthor] = []
    @State private var isLoading = true
    @State private var errorMessage: String?

    private let columns = [
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
    ]

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if isLoading && authors.isEmpty {
                loadingState
            } else if let error = errorMessage, authors.isEmpty {
                ErrorStateView(message: error) {
                    Task { await loadAuthors() }
                }
            } else {
                authorGrid
            }
        }
        .background(DesignTokens.Background.primary)
        .navigationTitle(localization.t("audiobooks.browseByAuthor"))
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadAuthors() }
    }

    private var authorGrid: some View {
        LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
            ForEach(authors) { author in
                authorCard(author)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.top, DesignTokens.Spacing.md)
    }

    private func authorCard(_ author: AudiobookAuthor) -> some View {
        Button {
            coordinator.navigate(to: .audiobookAuthorDetail(author: author.name))
        } label: {
            VStack(spacing: DesignTokens.Spacing.sm) {
                authorThumbnail(author.thumbnail)
                    .aspectRatio(2 / 3, contentMode: .fit)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
                    .overlay(alignment: .bottomTrailing) {
                        countBadge(author.audiobookCount)
                    }
                    .glassCard()

                Text(author.name)
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundColor(DesignTokens.Text.primary)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity)
            }
        }
        .buttonStyle(.plain)
    }

    private func authorThumbnail(_ urlString: String?) -> some View {
        Group {
            if let urlStr = urlString, let url = URL(string: urlStr) {
                CachedAsyncImage(url: url) { phase in
                    switch phase {
                    case let .success(img):
                        img.resizable().aspectRatio(contentMode: .fill)
                    default:
                        authorPlaceholder
                    }
                }
            } else {
                authorPlaceholder
            }
        }
    }

    private var authorPlaceholder: some View {
        ZStack {
            DesignTokens.Glass.bgMedium
            Image(systemName: "person.fill")
                .font(.system(size: 32))
                .foregroundColor(DesignTokens.Text.muted)
        }
    }

    private func countBadge(_ count: Int) -> some View {
        Text("\(count)")
            .font(.system(size: DesignTokens.FontSize.xs, weight: .bold))
            .foregroundColor(.white)
            .padding(.horizontal, DesignTokens.Spacing.sm)
            .padding(.vertical, 2)
            .background(DesignTokens.Primary.default)
            .cornerRadius(DesignTokens.Radius.sm)
            .padding(DesignTokens.Spacing.xs)
    }

    private var loadingState: some View {
        LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
            ForEach(0 ..< 6, id: \.self) { _ in
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .fill(DesignTokens.Glass.bg)
                    .aspectRatio(2 / 3, contentMode: .fit)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.top, DesignTokens.Spacing.md)
    }

    private func loadAuthors() async {
        isLoading = true
        errorMessage = nil
        do {
            let response = try await repos.audiobook.fetchAuthors()
            authors = response.authors
        } catch {
            errorMessage = error.userFriendlyMessage
        }
        isLoading = false
    }
}
