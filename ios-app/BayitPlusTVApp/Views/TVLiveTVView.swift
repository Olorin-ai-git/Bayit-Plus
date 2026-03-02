import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

/// tvOS Live TV screen with a grid of channel cards.
/// Reuses LiveTVViewModel from shared ViewModels.
struct TVLiveTVView: View {
    @Environment(LocalizationManager.self) private var localization
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @Environment(\.appConfiguration) private var appConfiguration
    @State private var viewModel: LiveTVViewModel?

    private let columns = [
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
    ]

    var body: some View {
        NavigationStack {
            ScrollView(.vertical, showsIndicators: false) {
                if let vm = viewModel {
                    if vm.isLoading && vm.channels.isEmpty {
                        loadingGrid
                    } else if let error = vm.error, vm.channels.isEmpty {
                        tvErrorState(error) {
                            Task { await vm.refresh() }
                        }
                    } else {
                        channelGrid(vm.channels)
                    }
                }
            }
            .background(DesignTokens.Background.primary)
            .task {
                if viewModel == nil {
                    viewModel = LiveTVViewModel(
                        repository: repos.liveTV,
                        featureFlags: FeatureFlags(),
                        hiddenChannelKeywords: appConfiguration.hiddenChannelKeywords
                    )
                }
                await viewModel?.loadChannels()
            }
        }
    }

    private func channelGrid(_ channels: [LiveChannelItem]) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text(localization.t("liveTV.title"))
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.leading, TVDesignTokens.Spacing.xl)

            LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(channels) { channel in
                    TVChannelCard(channel: channel) {
                        coordinator.presentPlayer(
                            contentId: channel.id,
                            contentType: .liveTV,
                            channelId: channel.id
                        )
                    }
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
        }
        .padding(.top, TVDesignTokens.Spacing.lg)
    }

    private var loadingGrid: some View {
        LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
            ForEach(0 ..< 6, id: \.self) { _ in
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card)
                    .fill(DesignTokens.Glass.bg)
                    .aspectRatio(16 / 9, contentMode: .fit)
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
        .padding(.top, TVDesignTokens.Spacing.lg)
    }
}

// MARK: - TV Channel Card

private struct TVChannelCard: View {
    let channel: LiveChannelItem
    let onSelect: () -> Void
    @Environment(\.isFocused) private var isFocused

    var body: some View {
        Button(action: onSelect) {
            VStack(alignment: .leading, spacing: 0) {
                channelLogo
                    .aspectRatio(16 / 9, contentMode: .fit)
                    .clipped()

                channelInfo
            }
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card))
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card)
                    .stroke(
                        isFocused
                            ? DesignTokens.Glass.borderFocus
                            : DesignTokens.Glass.border,
                        lineWidth: isFocused ? TVDesignTokens.Focus.ringWidth : 1
                    )
            )
        }
        .buttonStyle(TVChannelButtonStyle())
        .focusEffectDisabled()
    }

    private var channelLogo: some View {
        ZStack(alignment: .topTrailing) {
            if let urlStr = channel.logo ?? channel.thumbnail,
               let url = URL(string: urlStr)
            {
                CachedAsyncImage(url: url) { phase in
                    if case let .success(img) = phase {
                        img.resizable().aspectRatio(contentMode: .fit)
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                            .padding(TVDesignTokens.Spacing.md)
                    } else {
                        channelPlaceholder
                    }
                }
            } else {
                channelPlaceholder
            }

            GlassBadge(text: "LIVE", variant: .live)
                .padding(TVDesignTokens.Spacing.sm)
        }
        .background(DesignTokens.Glass.bgMedium)
    }

    private var channelPlaceholder: some View {
        ZStack {
            DesignTokens.Glass.bgMedium
            Image(systemName: "tv")
                .font(.system(size: TVDesignTokens.FontSize.xxl))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var channelInfo: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xxs) {
            Text(channel.name ?? "Channel")
                .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
                .lineLimit(1)

            if let show = channel.currentShow {
                Text(show)
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .lineLimit(1)
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.md)
        .padding(.vertical, TVDesignTokens.Spacing.sm)
        .background(DesignTokens.Glass.bgStrong)
    }
}

private struct TVChannelButtonStyle: ButtonStyle {
    @Environment(\.isFocused) private var isFocused

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .focusEffectDisabled()
            .scaleEffect(isFocused ? TVDesignTokens.Focus.scaleAmount : 1.0)
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card)
                    .stroke(
                        isFocused ? DesignTokens.Glass.borderFocus : Color.clear,
                        lineWidth: TVDesignTokens.Focus.ringWidth
                    )
            )
            .shadow(
                color: isFocused ? DesignTokens.Glass.purpleGlow : .clear,
                radius: TVDesignTokens.Focus.shadowRadius,
                x: 0, y: isFocused ? 8 : 0
            )
            .animation(
                .spring(duration: TVDesignTokens.Focus.animationDuration, bounce: 0.2),
                value: isFocused
            )
    }
}
