#if os(iOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Search input and timeline results with thumbnails for scene search.
    struct SceneSearchView: View {
        @Environment(LocalizationManager.self) private var localization
        @State private var viewModel: SceneSearchViewModel
        let channelId: String
        let onSeek: (TimeInterval) -> Void
        let onDismiss: () -> Void

        init(repository: any LiveTVRepository, channelId: String,
             onSeek: @escaping (TimeInterval) -> Void,
             onDismiss: @escaping () -> Void)
        {
            _viewModel = State(initialValue: SceneSearchViewModel(repository: repository))
            self.channelId = channelId
            self.onSeek = onSeek
            self.onDismiss = onDismiss
        }

        var body: some View {
            VStack(spacing: 0) {
                header
                searchBar

                if viewModel.isSearching {
                    Spacer()
                    ProgressView()
                        .tint(DesignTokens.Primary.default)
                    Spacer()
                } else if let error = viewModel.error {
                    errorView(error)
                } else if viewModel.results.isEmpty && !viewModel.query.isEmpty {
                    emptyResultsView
                } else {
                    resultsList
                }
            }
            .background(DesignTokens.Background.primary)
        }

        private var header: some View {
            HStack {
                Text(localization.t("sceneSearch.title"))
                    .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
                Spacer()
                Button { onDismiss() } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 24))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
                .accessibilityLabel("Close scene search")
            }
            .padding(.horizontal, DesignTokens.Spacing.base)
            .padding(.vertical, DesignTokens.Spacing.md)
        }

        private var searchBar: some View {
            HStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(DesignTokens.Text.muted)

                TextField(localization.t("sceneSearch.placeholder"), text: Bindable(viewModel).query)
                    .font(.system(size: DesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .submitLabel(.search)
                    .onSubmit { Task { await viewModel.search(channelId: channelId) } }

                if !viewModel.query.isEmpty {
                    Button { viewModel.clearResults() } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(DesignTokens.Text.muted)
                    }
                }
            }
            .padding(DesignTokens.Spacing.md)
            .background(DesignTokens.Glass.bgLight)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
            .padding(.horizontal, DesignTokens.Spacing.base)
        }

        private var resultsList: some View {
            ScrollView(.vertical, showsIndicators: true) {
                LazyVStack(spacing: DesignTokens.Spacing.md) {
                    ForEach(viewModel.results) { result in
                        resultRow(result)
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.base)
                .padding(.vertical, DesignTokens.Spacing.md)
            }
        }

        private func resultRow(_ result: SceneSearchResult) -> some View {
            Button { onSeek(result.timestamp) } label: {
                HStack(spacing: DesignTokens.Spacing.md) {
                    if let thumbnail = result.thumbnail, let url = URL(string: thumbnail) {
                        CachedAsyncImage(url: url) { phase in
                            if case let .success(image) = phase {
                                image.resizable().aspectRatio(contentMode: .fill)
                            } else {
                                Rectangle().fill(DesignTokens.Glass.bgMedium)
                            }
                        }
                        .frame(width: 80, height: 45)
                        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
                    }

                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                        Text(result.title ?? result.description ?? "")
                            .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                            .foregroundStyle(DesignTokens.Text.primary)
                            .lineLimit(2)

                        Text(formatTimestamp(result.timestamp))
                            .font(.system(size: DesignTokens.FontSize.xs, design: .monospaced))
                            .foregroundStyle(DesignTokens.Primary.p300)
                    }

                    Spacer()

                    Image(systemName: "play.circle")
                        .font(.system(size: 20))
                        .foregroundStyle(DesignTokens.Primary.p400)
                }
                .padding(DesignTokens.Spacing.md)
                .background(DesignTokens.Glass.bgLight)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
            }
            .buttonStyle(.plain)
        }

        private var emptyResultsView: some View {
            VStack(spacing: DesignTokens.Spacing.md) {
                Spacer()
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 36))
                    .foregroundStyle(DesignTokens.Text.muted)
                Text(localization.t("sceneSearch.noResults"))
                    .font(.system(size: DesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.secondary)
                Spacer()
            }
        }

        private func errorView(_ message: String) -> some View {
            VStack(spacing: DesignTokens.Spacing.md) {
                Spacer()
                Text(message)
                    .foregroundStyle(DesignTokens.Text.secondary)
                GlassButton("Retry", variant: .secondary) {
                    Task { await viewModel.search(channelId: channelId) }
                }
                Spacer()
            }
        }

        private func formatTimestamp(_ seconds: TimeInterval) -> String {
            let mins = Int(seconds) / 60
            let secs = Int(seconds) % 60
            return String(format: "%d:%02d", mins, secs)
        }
    }
#endif
