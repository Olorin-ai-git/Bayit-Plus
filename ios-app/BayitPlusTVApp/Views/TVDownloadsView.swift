import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

/// tvOS Downloads screen showing offline-available content in a 5-column grid.
/// Uses DownloadsViewModel (shared with iOS) backed by DownloadManager + DownloadStore.
struct TVDownloadsView: View {
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @Environment(DownloadManager.self) private var downloadManager
    @State private var viewModel: DownloadsViewModel?
    @State private var itemToDelete: LocalDownload?

    private let columns = Array(
        repeating: GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        count: 5
    )

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            LazyVStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
                if let vm = viewModel {
                    let all = vm.downloads
                    if all.isEmpty {
                        emptyState
                    } else {
                        storageSummaryRow(vm)
                        if !vm.activeDownloads.isEmpty {
                            downloadsGrid(vm.activeDownloads, title: localization.t("downloads.active"))
                        }
                        if !vm.completedDownloads.isEmpty {
                            downloadsGrid(vm.completedDownloads, title: localization.t("downloads.completed"))
                        }
                        if !vm.failedDownloads.isEmpty {
                            downloadsGrid(vm.failedDownloads, title: localization.t("downloads.failed"))
                        }
                    }
                }
            }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = DownloadsViewModel(downloadManager: downloadManager)
            }
        }
        .confirmationDialog(
            localization.t("common.confirmDelete"),
            isPresented: Binding(
                get: { itemToDelete != nil },
                set: { if !$0 { itemToDelete = nil } }
            ),
            titleVisibility: .visible
        ) {
            Button(localization.t("common.delete"), role: .destructive) {
                guard let download = itemToDelete else { return }
                itemToDelete = nil
                Task { await viewModel?.deleteDownload(download) }
            }
        }
    }

    // MARK: - Storage Summary

    private func storageSummaryRow(_ vm: DownloadsViewModel) -> some View {
        let totalBytes = vm.completedDownloads.compactMap(\.fileSize).reduce(0, +)
        return HStack(spacing: TVDesignTokens.Spacing.md) {
            Image(systemName: "internaldrive")
                .font(.system(size: TVDesignTokens.FontSize.xl))
                .foregroundStyle(DesignTokens.Success.default)
            Text(
                "\(vm.completedDownloads.count) \(localization.t("downloads.items")) · \(formattedBytes(Int(totalBytes)))"
            )
            .font(.system(size: TVDesignTokens.FontSize.lg))
            .foregroundStyle(DesignTokens.Text.secondary)
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
    }

    // MARK: - Grid

    private func downloadsGrid(_ items: [LocalDownload], title: String) -> some View {
        let header = Text(title)
            .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
            .foregroundStyle(DesignTokens.Text.secondary)
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
        return VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            header
            LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(items) { item in
                    downloadPoster(item)
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.bottom, TVDesignTokens.Spacing.xl)
        }
    }

    private func downloadPoster(_ item: LocalDownload) -> some View {
        let contentType = TVContentTypeMapper.map(item.contentType.rawValue)
        let subtitle = item.fileSize.map { formattedBytes(Int($0)) }
        let badge: String? = item.status == .downloading ? "↓" : nil
        return GlassFocusPoster(
            thumbnailURL: item.thumbnail,
            title: item.title,
            subtitle: subtitle,
            badge: badge,
            aspectRatio: 2 / 3,
            onSelect: {
                guard item.status == .completed else { return }
                if contentType == .vod {
                    coordinator.fullscreenRoute = .movieDetail(movieId: item.contentId)
                } else {
                    coordinator.presentPlayer(contentId: item.contentId, contentType: contentType)
                }
            }
        )
        .contextMenu {
            Button(role: .destructive) {
                itemToDelete = item
            } label: {
                Label(localization.t("common.delete"), systemImage: "trash")
            }
            if item.status == .failed {
                Button {
                    Task { await viewModel?.retryDownload(item) }
                } label: {
                    Label(localization.t("common.retry"), systemImage: "arrow.clockwise")
                }
            }
        }
    }

    // MARK: - Helpers

    private func formattedBytes(_ bytes: Int) -> String {
        let gb = Double(bytes) / 1_073_741_824
        if gb >= 1.0 { return String(format: "%.1f GB", gb) }
        let mb = Double(bytes) / 1_048_576
        return String(format: "%.0f MB", mb)
    }

    // MARK: - States

    private var emptyState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "arrow.down.circle")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Text.muted)
            VStack(spacing: TVDesignTokens.Spacing.md) {
                Text(localization.t("downloads.empty"))
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
                Text(localization.t("downloads.emptyHint"))
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 600)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.top, TVDesignTokens.Spacing.xxxxl)
    }
}
