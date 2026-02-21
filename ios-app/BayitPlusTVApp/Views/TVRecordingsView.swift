import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS Recordings screen showing DVR recorded content with status badges.
/// Reuses RecordingsViewModel from shared ViewModels.
struct TVRecordingsView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: RecordingsViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.items.isEmpty {
                    loadingState
                } else if let error = vm.error, vm.items.isEmpty {
                    tvErrorState(error) {
                        Task { await viewModel?.load() }
                    }
                } else if vm.items.isEmpty {
                    emptyState
                } else {
                    recordingsList(vm)
                }
            }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = RecordingsViewModel(repository: repos.user)
            }
            await viewModel?.load()
        }
    }

    private func recordingsList(_ vm: RecordingsViewModel) -> some View {
        LazyVStack(spacing: TVDesignTokens.Spacing.md) {
            ForEach(vm.items) { item in
                recordingRow(item)
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
        .padding(.vertical, TVDesignTokens.Spacing.lg)
    }

    private func recordingRow(_ item: RecordingItem) -> some View {
        Button {} label: {
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                thumbnailView(item.thumbnail)

                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                    Text(item.programTitle ?? item.channelName ?? "Recording")
                        .font(.system(size: TVDesignTokens.FontSize.lg, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .lineLimit(1)

                    if let channel = item.channelName {
                        Text(channel)
                            .font(.system(size: TVDesignTokens.FontSize.base))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }

                    HStack(spacing: TVDesignTokens.Spacing.md) {
                        if let duration = item.duration {
                            Text(duration)
                                .font(.system(size: TVDesignTokens.FontSize.sm))
                                .foregroundStyle(DesignTokens.Text.muted)
                        }

                        if let status = item.status {
                            statusBadge(status)
                        }
                    }
                }

                Spacer()

                if item.status == "recording" {
                    recordingIndicator
                }
            }
            .padding(TVDesignTokens.Spacing.lg)
            .frame(maxWidth: .infinity)
            .background(DesignTokens.Glass.bg)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        }
        .buttonStyle(.card)
        .tvFocusStyle()
    }

    private func thumbnailView(_ url: String?) -> some View {
        Group {
            if let urlStr = url, let imageURL = URL(string: urlStr) {
                CachedAsyncImage(url: imageURL) { phase in
                    if case let .success(image) = phase {
                        image.resizable().aspectRatio(contentMode: .fill)
                    } else {
                        DesignTokens.Glass.bg
                    }
                }
            } else {
                DesignTokens.Glass.bg
            }
        }
        .frame(width: 160, height: 90)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))
    }

    private func statusBadge(_ status: String) -> some View {
        Text(status.capitalized)
            .font(.system(size: TVDesignTokens.FontSize.sm, weight: .bold))
            .foregroundStyle(statusColor(status))
            .padding(.horizontal, TVDesignTokens.Spacing.sm)
            .padding(.vertical, TVDesignTokens.Spacing.xxs)
            .background(DesignTokens.Glass.bgMedium)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))
    }

    private func statusColor(_ status: String) -> Color {
        switch status {
        case "recording": return DesignTokens.live
        case "completed": return DesignTokens.Success.default
        case "failed": return DesignTokens.ErrorColor.default
        default: return DesignTokens.Text.secondary
        }
    }

    private var recordingIndicator: some View {
        Circle()
            .fill(DesignTokens.live)
            .frame(width: 20, height: 20)
    }

    private var emptyState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "record.circle")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Text.muted)

            Text(localization.t("recordings.empty"))
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
            Text(localization.t("recordings.loading"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }
}
