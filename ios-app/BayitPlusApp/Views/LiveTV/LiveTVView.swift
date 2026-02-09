import BayitDesignSystem
import SwiftUI

/// Live TV screen showing a grid of live channels with status badges
struct LiveTVView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @State private var viewModel: LiveTVViewModel?

    private let columns = [
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
    ]

    var body: some View {
        VStack(spacing: 0) {
            GlassNavigationBar(
                title: "Live TV",
                trailing: {
                    Button {
                        coordinator.navigate(to: .epg)
                    } label: {
                        Image(systemName: "calendar")
                            .font(.system(size: 20))
                            .foregroundColor(DesignTokens.Text.primary)
                            .frame(width: 44, height: 44)
                            .background(DesignTokens.Glass.bgMedium)
                            .clipShape(Circle())
                    }
                    .accessibilityLabel("TV Guide")
                }
            )

            ScrollView(.vertical, showsIndicators: false) {
                if let vm = viewModel {
                    if vm.isLoading && vm.channels.isEmpty {
                        loadingGrid
                    } else if let error = vm.error, vm.channels.isEmpty {
                        ErrorStateView(message: error) {
                            Task { await vm.refresh() }
                        }
                    } else {
                        channelGrid(vm.channels)
                    }
                } else {
                    ScreenLoadingView()
                }
            }
        }
        .background(DesignTokens.Background.primary)
        .refreshable {
            await viewModel?.refresh()
        }
        .task {
            if viewModel == nil {
                viewModel = LiveTVViewModel(repository: repos.liveTV)
            }
            await viewModel?.loadChannels()
        }
    }

    private func channelGrid(_ channels: [LiveChannelItem]) -> some View {
        LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
            ForEach(channels) { channel in
                ChannelCard(channel: channel) {
                    coordinator.navigate(to: .player(
                        contentId: channel.id,
                        contentType: .liveTV
                    ))
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.top, DesignTokens.Spacing.md)
        .padding(.bottom, DesignTokens.Spacing.xxxxl)
    }

    private var loadingGrid: some View {
        LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
            ForEach(0..<6, id: \.self) { _ in
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .fill(DesignTokens.Glass.bg)
                    .aspectRatio(16 / 9, contentMode: .fit)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.top, DesignTokens.Spacing.md)
    }
}

/// Individual channel card with logo, name, and live indicator
private struct ChannelCard: View {
    let channel: LiveChannelItem
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 0) {
                logoArea
                channelInfo
            }
            .glassCard()
        }
        .buttonStyle(.plain)
    }

    private var logoArea: some View {
        ZStack(alignment: .topTrailing) {
            GeometryReader { geo in
                channelLogo
                    .frame(width: geo.size.width, height: geo.size.height)
            }
            .aspectRatio(16 / 9, contentMode: .fit)
            .clipped()

            GlassBadge(text: "LIVE", variant: .live)
                .padding(DesignTokens.Spacing.sm)
        }
    }

    private var channelLogo: some View {
        Group {
            if let urlStr = channel.logo ?? channel.thumbnail,
               let url = URL(string: urlStr) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let img):
                        img.resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                            .padding(DesignTokens.Spacing.md)
                    default:
                        channelPlaceholder
                    }
                }
            } else {
                channelPlaceholder
            }
        }
        .background(DesignTokens.Glass.bgMedium)
    }

    private var channelPlaceholder: some View {
        ZStack {
            DesignTokens.Glass.bgMedium
            Image(systemName: "tv")
                .font(.system(size: 32))
                .foregroundColor(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var channelInfo: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(channel.name ?? "Channel")
                .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                .foregroundColor(DesignTokens.Text.primary)
                .lineLimit(1)

            if let show = channel.currentShow {
                Text(show)
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundColor(DesignTokens.Text.muted)
                    .lineLimit(1)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.sm)
        .padding(.vertical, DesignTokens.Spacing.sm)
    }
}
