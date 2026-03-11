import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Electronic Program Guide displaying channel schedules in a timeline grid
struct EPGView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @Environment(TooltipManager.self) private var tooltipManager
    @State private var viewModel: EPGViewModel?
    @State private var searchQuery = ""

    var body: some View {
        VStack(spacing: 0) {
            searchHeader
            dateSelector
            epgContent
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = EPGViewModel(repository: repos.epg)
            }
            await viewModel?.load()
        }
    }

    private var searchHeader: some View {
        GlassSearchBar(
            text: $searchQuery,
            placeholder: localization.t("epg.searchPlaceholder")
        ) {
            Task { await viewModel?.search(query: searchQuery) }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.vertical, DesignTokens.Spacing.sm)
    }

    private var dateSelector: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                ForEach(dateOptions, id: \.value) { option in
                    GlassChip(
                        title: option.label,
                        isSelected: viewModel?.selectedDate == option.value
                    ) {
                        Task { await viewModel?.load(date: option.value) }
                    }
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
        }
        .padding(.bottom, DesignTokens.Spacing.sm)
        .featureTooltip(
            featureKey: "epg_catchup",
            titleKey: "tooltip.catchup.title",
            descriptionKey: "tooltip.catchup.description",
            arrowDirection: .bottom
        )
    }

    private var epgContent: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if !searchQuery.isEmpty && !vm.searchResults.isEmpty {
                    searchResultsList(vm)
                } else if vm.isLoading && vm.channels.isEmpty {
                    loadingState
                } else if let error = vm.error, vm.channels.isEmpty {
                    ErrorStateView(message: error) {
                        Task { await viewModel?.load() }
                    }
                } else if vm.channels.isEmpty {
                    emptyState
                } else {
                    channelList(vm)
                }
            }
        }
    }

    private func channelList(_ vm: EPGViewModel) -> some View {
        LazyVStack(spacing: DesignTokens.Spacing.md) {
            ForEach(vm.channels) { channel in
                channelRow(channel)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.vertical, DesignTokens.Spacing.md)
    }

    private func channelRow(_ channel: EPGChannelSchedule) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                if let logo = channel.channelLogo, let url = URL(string: logo) {
                    CachedAsyncImage(url: url) { phase in
                        if case let .success(image) = phase {
                            image.resizable().aspectRatio(contentMode: .fit)
                        } else {
                            DesignTokens.Glass.bg
                        }
                    }
                    .frame(width: 32, height: 32)
                    .clipShape(Circle())
                }

                Text(channel.channelName ?? "")
                    .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                    .foregroundColor(DesignTokens.Text.primary)

                Spacer()
            }

            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: DesignTokens.Spacing.sm) {
                    ForEach(channel.programs) { program in
                        programCard(program)
                    }
                }
            }
        }
    }

    private func programCard(_ program: EPGProgram) -> some View {
        GlassCard {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                HStack {
                    Text(program.title ?? "")
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                        .foregroundColor(DesignTokens.Text.primary)
                        .lineLimit(1)

                    Spacer()

                    if program.isLive == true {
                        GlassBadge(text: "LIVE", variant: .live)
                    }
                }

                if let start = program.startTime, let end = program.endTime {
                    Text("\(start) - \(end)")
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundColor(DesignTokens.Text.secondary)
                }

                if let genre = program.genre {
                    Text(genre)
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundColor(DesignTokens.Text.muted)
                }
            }
            .padding(DesignTokens.Spacing.sm)
            .frame(width: 180)
        }
    }

    private func searchResultsList(_ vm: EPGViewModel) -> some View {
        LazyVStack(spacing: DesignTokens.Spacing.sm) {
            ForEach(vm.searchResults) { program in
                programCard(program)
                    .frame(maxWidth: .infinity)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.vertical, DesignTokens.Spacing.md)
    }

    private var emptyState: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Image(systemName: "tv")
                .font(.system(size: 48))
                .foregroundColor(DesignTokens.Text.muted)

            Text(localization.t("epg.empty"))
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundColor(DesignTokens.Text.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 120)
    }

    private var loadingState: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            ForEach(0 ..< 4, id: \.self) { _ in
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .fill(DesignTokens.Glass.bg)
                    .frame(height: 100)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.vertical, DesignTokens.Spacing.md)
    }
}
