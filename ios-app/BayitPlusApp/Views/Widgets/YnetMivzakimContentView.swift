import BayitDesignSystem
import SwiftUI

/// Renders Ynet breaking news (mivzakim) inside a widget container.
/// Matches the web YnetMivzakimWidget: red header, scrollable news list with timestamps.
struct YnetMivzakimContentView: View {
    @Environment(RepositoryProvider.self) private var repos
    @State private var viewModel: YnetMivzakimViewModel?

    var body: some View {
        VStack(spacing: 0) {
            headerBar
            contentBody
        }
        .task {
            if viewModel == nil {
                viewModel = YnetMivzakimViewModel(repository: repos.news)
            }
            await viewModel?.loadNews()
            viewModel?.startAutoRefresh()
        }
        .onDisappear {
            viewModel?.stopAutoRefresh()
        }
    }

    // MARK: - Header

    private var headerBar: some View {
        HStack {
            Button {
                Task { await viewModel?.loadNews() }
            } label: {
                Image(systemName: "arrow.clockwise")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(.white)
                    .frame(width: 28, height: 28)
                    .background(Color.white.opacity(0.2))
                    .clipShape(Circle())
                    .opacity(viewModel?.isLoading == true ? 0.5 : 1.0)
            }
            .disabled(viewModel?.isLoading == true)

            Spacer()

            VStack(alignment: .trailing, spacing: 2) {
                Text("Ynet Breaking News")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(.white)

                if let lastUpdated = viewModel?.lastUpdated {
                    Text(lastUpdated, format: .dateTime.hour(.twoDigits(amPM: .omitted)).minute())
                        .font(.system(size: 10))
                        .foregroundStyle(.white.opacity(0.7))
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.sm)
        .padding(.vertical, DesignTokens.Spacing.xs)
        .background(Color.red.opacity(0.9))
    }

    // MARK: - Content

    @ViewBuilder
    private var contentBody: some View {
        if let vm = viewModel {
            if vm.isLoading && vm.items.isEmpty {
                loadingView
            } else if let error = vm.error, vm.items.isEmpty {
                errorView(error)
            } else {
                newsList(vm.items)
            }
        }
    }

    private func newsList(_ items: [MivzakimItem]) -> some View {
        ScrollView(.vertical, showsIndicators: false) {
            LazyVStack(spacing: 0) {
                ForEach(items) { item in
                    newsRow(item)
                }
            }
        }
    }

    private func newsRow(_ item: MivzakimItem) -> some View {
        Button {
            if let url = URL(string: item.link) {
                UIApplication.shared.open(url)
            }
        } label: {
            HStack(alignment: .top, spacing: DesignTokens.Spacing.sm) {
                Text(item.formattedTime)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Color.blue)
                    .frame(minWidth: 42, alignment: .leading)

                Text(item.title)
                    .font(.system(size: 13))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .multilineTextAlignment(.trailing)
                    .lineLimit(3)
                    .frame(maxWidth: .infinity, alignment: .trailing)

                Image(systemName: "arrow.up.right")
                    .font(.system(size: 10))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .padding(.top, 2)
            }
            .padding(.horizontal, DesignTokens.Spacing.sm)
            .padding(.vertical, DesignTokens.Spacing.xs)
        }
        .buttonStyle(.plain)
        .overlay(alignment: .bottom) {
            Divider().background(Color.white.opacity(0.1))
        }
    }

    private var loadingView: some View {
        VStack {
            Spacer()
            ProgressView()
                .tint(DesignTokens.Text.muted)
            Spacer()
        }
        .frame(maxWidth: .infinity)
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            Spacer()
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 24))
                .foregroundStyle(DesignTokens.Warning.default)
            Text(message)
                .font(.system(size: 12))
                .foregroundStyle(DesignTokens.Text.muted)
                .multilineTextAlignment(.center)
            GlassButton("Retry", variant: .secondary, size: .small) {
                Task { await viewModel?.loadNews() }
            }
            Spacer()
        }
        .padding(DesignTokens.Spacing.md)
    }
}
