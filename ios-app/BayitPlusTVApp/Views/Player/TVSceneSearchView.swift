#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// tvOS scene search within live TV content with Siri Remote text input.
    /// Reuses SceneSearchViewModel from shared ViewModels.
    struct TVSceneSearchView: View {
        @Environment(LocalizationManager.self) private var localization
        @State private var viewModel: SceneSearchViewModel
        let channelId: String
        let onSeek: (TimeInterval) -> Void
        let onDismiss: () -> Void

        init(repository: any LiveTVRepository, channelId: String,
             localization: LocalizationManager,
             onSeek: @escaping (TimeInterval) -> Void,
             onDismiss: @escaping () -> Void)
        {
            _viewModel = State(initialValue: SceneSearchViewModel(repository: repository, localization: localization))
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
                    ProgressView().tint(DesignTokens.Primary.default).scaleEffect(1.5)
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
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
                Spacer()
                GlassButton(localization.t("common.close"), variant: .secondary, size: .medium) { onDismiss() }
                    .tvFocusStyle()
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.vertical, TVDesignTokens.Spacing.lg)
        }

        private var searchBar: some View {
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 24))
                    .foregroundStyle(DesignTokens.Text.muted)

                TextField(localization.t("sceneSearch.placeholder"), text: Bindable(viewModel).query)
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .submitLabel(.search)
                    .onSubmit { Task { await viewModel.search(channelId: channelId) } }

                if !viewModel.query.isEmpty {
                    GlassButton(localization.t("common.clear"), variant: .ghost, size: .small) {
                        viewModel.clearResults()
                    }
                    .tvFocusStyle()
                }
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Glass.bgLight)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
        }

        private var resultsList: some View {
            ScrollView(.vertical, showsIndicators: false) {
                LazyVStack(spacing: TVDesignTokens.Spacing.lg) {
                    ForEach(viewModel.results) { result in
                        resultRow(result)
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
                .padding(.vertical, TVDesignTokens.Spacing.lg)
            }
        }

        private func resultRow(_ result: SceneSearchResult) -> some View {
            Button { onSeek(result.timestamp) } label: {
                HStack(spacing: TVDesignTokens.Spacing.lg) {
                    if let thumbnail = result.thumbnail, let url = URL(string: thumbnail) {
                        CachedAsyncImage(url: url) {
                            Rectangle().fill(DesignTokens.Glass.bgMedium)
                        }
                        .frame(width: 160, height: 90)
                        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))
                    }

                    VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                        Text(result.title ?? result.description ?? "")
                            .font(.system(size: TVDesignTokens.FontSize.base, weight: .medium))
                            .foregroundStyle(DesignTokens.Text.primary)
                            .lineLimit(2)

                        Text(formatTimestamp(result.timestamp))
                            .font(.system(size: TVDesignTokens.FontSize.sm, design: .monospaced))
                            .foregroundStyle(DesignTokens.Primary.p300)
                    }

                    Spacer()

                    Image(systemName: "play.circle")
                        .font(.system(size: 32))
                        .foregroundStyle(DesignTokens.Primary.p400)
                }
                .padding(TVDesignTokens.Spacing.lg)
                .frame(minHeight: TVDesignTokens.MinSize.focusableHeight)
            }
            .tvCardStyle()
        }

        private var emptyResultsView: some View {
            VStack(spacing: TVDesignTokens.Spacing.xl) {
                Spacer()
                Image(systemName: "magnifyingglass")
                    .font(.system(size: TVDesignTokens.FontSize.hero))
                    .foregroundStyle(DesignTokens.Text.muted)
                Text(localization.t("sceneSearch.noResults"))
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.secondary)
                Spacer()
            }
        }

        private func errorView(_ message: String) -> some View {
            VStack(spacing: TVDesignTokens.Spacing.xl) {
                Spacer()
                Text(message).foregroundStyle(DesignTokens.Text.secondary)
                GlassButton(localization.t("common.retry"), variant: .secondary, size: .large) {
                    Task { await viewModel.search(channelId: channelId) }
                }
                .tvFocusStyle()
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
