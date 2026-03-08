import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// iPad-optimized recordings view with 3-column grid layout
struct IPadRecordingsView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: RecordingsViewModel?

    private let columns = [
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
    ]

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            PageHeader(icon: "record.circle", title: localization.t("recordings.title"))

            if let vm = viewModel {
                if vm.isLoading && vm.items.isEmpty {
                    loadingGrid
                } else if let error = vm.error, vm.items.isEmpty {
                    ErrorStateView(message: error) { Task { await viewModel?.load() } }
                } else if vm.items.isEmpty {
                    emptyState
                } else {
                    recordingsGrid(vm)
                }
            } else {
                ScreenLoadingView()
            }
        }
        .background(DesignTokens.Background.primary)
        .refreshable { await viewModel?.load() }
        .task {
            if viewModel == nil {
                viewModel = RecordingsViewModel(repository: repos.user)
            }
            await viewModel?.load()
        }
    }

    private func recordingsGrid(_ vm: RecordingsViewModel) -> some View {
        LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
            ForEach(vm.items) { item in
                IPadRecordingCard(item: item, localization: localization) {
                    coordinator.presentFullscreen(.player(
                        contentId: item.id,
                        contentType: .liveTV
                    ))
                }
                .contextMenu {
                    if item.status == "recording" {
                        Button {
                            Task { await vm.stopRecording(recordingId: item.id) }
                        } label: {
                            Label(localization.t("recordings.stop"), systemImage: "stop.circle")
                        }
                    }
                    Button(role: .destructive) {
                        Task { await vm.deleteRecording(recordingId: item.id) }
                    } label: {
                        Label(localization.t("recordings.delete"), systemImage: "trash")
                    }
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.xl)
        .padding(.vertical, DesignTokens.Spacing.md)
    }

    private var emptyState: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Image(systemName: "record.circle")
                .font(.system(size: 48))
                .foregroundColor(DesignTokens.Text.muted)
            Text(localization.t("recordings.empty"))
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundColor(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 120)
    }

    private var loadingGrid: some View {
        LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
            ForEach(0 ..< 6, id: \.self) { _ in
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .fill(DesignTokens.Glass.bg)
                    .frame(height: 120)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.xl)
        .padding(.vertical, DesignTokens.Spacing.md)
    }
}

/// Recording card for iPad grid layout
private struct IPadRecordingCard: View {
    let item: RecordingItem
    let localization: LocalizationManager
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                thumbnailView
                Text(item.programTitle ?? item.channelName ?? "")
                    .font(.system(size: DesignTokens.FontSize.md, weight: .medium))
                    .foregroundColor(DesignTokens.Text.primary)
                    .lineLimit(2)
                HStack(spacing: DesignTokens.Spacing.sm) {
                    if let channel = item.channelName {
                        Text(channel)
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundColor(DesignTokens.Text.secondary)
                    }
                    Spacer()
                    if let status = item.status {
                        GlassBadge(text: status.capitalized, variant: statusVariant(status))
                    }
                }
            }
            .padding(DesignTokens.Spacing.md)
        }
        .buttonStyle(.plain)
        .glassCard()
    }

    private var thumbnailView: some View {
        ZStack(alignment: .topTrailing) {
            Group {
                if let urlStr = item.thumbnail, let url = URL(string: urlStr) {
                    CachedAsyncImage(url: url) {
                        RoundedRectangle(cornerRadius: DesignTokens.Radius.sm).fill(DesignTokens.Glass.bg)
                    }
                    .aspectRatio(contentMode: .fill)
                } else {
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.sm).fill(DesignTokens.Glass.bg)
                }
            }
            .frame(height: 100)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))

            if item.status == "recording" {
                Circle().fill(DesignTokens.live).frame(width: 12, height: 12)
                    .padding(DesignTokens.Spacing.sm)
            }
        }
    }

    private func statusVariant(_ status: String) -> GlassBadge.Variant {
        switch status {
        case "recording": return .live
        case "completed": return .success
        case "failed": return .error
        default: return .info
        }
    }
}
