import BayitDesignSystem
import SwiftUI

/// tvOS Electronic Program Guide with channel schedules in horizontal timeline.
/// Reuses EPGViewModel from shared ViewModels.
struct TVEPGView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @State private var viewModel: EPGViewModel?

    var body: some View {
        VStack(spacing: 0) {
            dateSelectorBar
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

    private var dateSelectorBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                ForEach(dateOptions, id: \.value) { option in
                    dateChip(option.label, isSelected: viewModel?.selectedDate == option.value) {
                        Task { await viewModel?.load(date: option.value) }
                    }
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.vertical, TVDesignTokens.Spacing.md)
        }
        .frame(height: TVDesignTokens.MinSize.focusableHeight + 40)
        .background(DesignTokens.Glass.bg)
    }

    private func dateChip(
        _ label: String,
        isSelected: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Text(label)
                .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                .foregroundStyle(isSelected ? DesignTokens.Text.primary : DesignTokens.Text.secondary)
                .padding(.horizontal, TVDesignTokens.Spacing.lg)
                .padding(.vertical, TVDesignTokens.Spacing.md)
                .background(isSelected ? DesignTokens.Glass.bgStrong : DesignTokens.Glass.bgMedium)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.default))
        }
        .buttonStyle(.card)
        .tvFocusStyle()
    }

    private var epgContent: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.channels.isEmpty {
                    loadingState
                } else if let error = vm.error, vm.channels.isEmpty {
                    tvErrorState(error) {
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
        LazyVStack(spacing: TVDesignTokens.Spacing.xl) {
            ForEach(vm.channels) { channel in
                channelRow(channel)
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
        .padding(.vertical, TVDesignTokens.Spacing.lg)
    }

    private func channelRow(_ channel: EPGChannelSchedule) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                if let logo = channel.channelLogo, let url = URL(string: logo) {
                    AsyncImage(url: url) { phase in
                        if case .success(let image) = phase {
                            image.resizable().aspectRatio(contentMode: .fit)
                        } else {
                            DesignTokens.Glass.bg
                        }
                    }
                    .frame(width: 60, height: 60)
                    .clipShape(Circle())
                }

                Text(channel.channelName ?? "")
                    .font(.system(size: TVDesignTokens.FontSize.xl, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
            }

            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: TVDesignTokens.Spacing.md) {
                    ForEach(channel.programs) { program in
                        programCard(program)
                    }
                }
            }
        }
    }

    private func programCard(_ program: EPGProgram) -> some View {
        Button {} label: {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                HStack {
                    Text(program.title ?? "")
                        .font(.system(size: TVDesignTokens.FontSize.base, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .lineLimit(1)

                    Spacer()

                    if program.isLive == true {
                        Text("LIVE")
                            .font(.system(size: TVDesignTokens.FontSize.sm, weight: .bold))
                            .foregroundStyle(DesignTokens.live)
                            .padding(.horizontal, TVDesignTokens.Spacing.sm)
                            .padding(.vertical, TVDesignTokens.Spacing.xxs)
                            .background(DesignTokens.Glass.bgMedium)
                            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))
                    }
                }

                if let start = program.startTime, let end = program.endTime {
                    Text("\(start) - \(end)")
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }

                if let genre = program.genre {
                    Text(genre)
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
            }
            .padding(TVDesignTokens.Spacing.lg)
            .frame(width: 320)
            .background(DesignTokens.Glass.bg)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        }
        .buttonStyle(.card)
        .tvFocusStyle()
    }

    private var emptyState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "tv")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Text.muted)

            Text("No schedule available")
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, TVDesignTokens.Spacing.xxxxl)
    }

    private var loadingState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(1.5)
            Text("Loading Guide...")
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }

    private var dateOptions: [(label: String, value: String?)] {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let dayFormatter = DateFormatter()
        dayFormatter.dateFormat = "EEE d"
        let today = Date()
        return (0..<7).map { offset in
            let date = Calendar.current.date(byAdding: .day, value: offset, to: today) ?? today
            let label = offset == 0 ? "Today" : dayFormatter.string(from: date)
            return (label: label, value: offset == 0 ? nil : formatter.string(from: date))
        }
    }
}
