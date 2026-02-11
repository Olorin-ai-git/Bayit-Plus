#if os(tvOS)
import BayitDesignSystem
import SwiftUI

/// tvOS-adapted Ynet breaking news (mivzakim) widget for the sidebar.
/// Matches iOS YnetMivzakimContentView: red header, scrollable news list with timestamps.
/// Sized for 10-foot UI with tvOS focus navigation.
struct TVYnetMivzakimContentView: View {
    @Environment(TVRepositoryProvider.self) private var repos
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
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(.white)
                    .frame(width: 40, height: 40)
                    .background(Color.white.opacity(0.2))
                    .clipShape(Circle())
                    .opacity(viewModel?.isLoading == true ? 0.5 : 1.0)
            }
            .buttonStyle(.card)
            .tvFocusStyle()
            .disabled(viewModel?.isLoading == true)

            Spacer()

            VStack(alignment: .trailing, spacing: 3) {
                Text("Ynet Breaking News")
                    .font(.system(size: TVDesignTokens.FontSize.sm, weight: .bold))
                    .foregroundStyle(.white)
                    .lineLimit(1)

                if let lastUpdated = viewModel?.lastUpdated {
                    Text(lastUpdated, format: .dateTime.hour(.twoDigits(amPM: .omitted)).minute())
                        .font(.system(size: TVDesignTokens.FontSize.xs))
                        .foregroundStyle(.white.opacity(0.7))
                }
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.md)
        .padding(.vertical, TVDesignTokens.Spacing.sm)
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
        HStack(alignment: .top, spacing: TVDesignTokens.Spacing.sm) {
            Text(item.formattedTime)
                .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
                .foregroundStyle(Color.blue)
                .frame(minWidth: 60, alignment: .leading)

            Text(item.title)
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.primary)
                .multilineTextAlignment(.trailing)
                .lineLimit(3)
                .frame(maxWidth: .infinity, alignment: .trailing)
        }
        .padding(.horizontal, TVDesignTokens.Spacing.md)
        .padding(.vertical, TVDesignTokens.Spacing.sm)
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
        .frame(maxWidth: .infinity, minHeight: 120)
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.sm) {
            Spacer()
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 32))
                .foregroundStyle(DesignTokens.Warning.default)
            Text(message)
                .font(.system(size: TVDesignTokens.FontSize.xs))
                .foregroundStyle(DesignTokens.Text.muted)
                .multilineTextAlignment(.center)
            GlassButton("Retry", variant: .secondary, size: .medium) {
                Task { await viewModel?.loadNews() }
            }
            Spacer()
        }
        .padding(TVDesignTokens.Spacing.md)
    }
}
#endif
