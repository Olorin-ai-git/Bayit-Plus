import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Recordings screen showing DVR recorded content
struct RecordingsView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: RecordingsViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.items.isEmpty {
                    loadingList
                } else if let error = vm.error, vm.items.isEmpty {
                    ErrorStateView(message: error) {
                        Task { await viewModel?.load() }
                    }
                } else if vm.items.isEmpty {
                    emptyState
                } else {
                    contentList(vm)
                }
            }
        }
        .background(DesignTokens.Background.primary)
        .refreshable {
            await viewModel?.load()
        }
        .task {
            if viewModel == nil {
                viewModel = RecordingsViewModel(repository: repos.user)
            }
            await viewModel?.load()
        }
    }

    private func contentList(_ vm: RecordingsViewModel) -> some View {
        LazyVStack(spacing: DesignTokens.Spacing.sm) {
            ForEach(vm.items) { item in
                recordingRow(item, vm: vm)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.vertical, DesignTokens.Spacing.md)
    }

    private func recordingRow(_ item: RecordingItem, vm: RecordingsViewModel) -> some View {
        GlassCard {
            HStack(spacing: DesignTokens.Spacing.md) {
                thumbnailView(item.thumbnail)

                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                    Text(item.programTitle ?? item.channelName ?? "")
                        .font(.system(size: DesignTokens.FontSize.md, weight: .medium))
                        .foregroundColor(DesignTokens.Text.primary)
                        .lineLimit(1)

                    if let channel = item.channelName {
                        Text(channel)
                            .font(.system(size: DesignTokens.FontSize.sm))
                            .foregroundColor(DesignTokens.Text.secondary)
                    }

                    HStack(spacing: DesignTokens.Spacing.sm) {
                        if let duration = item.duration {
                            Text(duration)
                                .font(.system(size: DesignTokens.FontSize.xs))
                                .foregroundColor(DesignTokens.Text.muted)
                        }

                        if let status = item.status {
                            GlassBadge(
                                text: status.capitalized,
                                variant: statusVariant(status)
                            )
                        }
                    }
                }

                Spacer()

                if item.status == "recording" {
                    recordingIndicator
                }
            }
            .padding(DesignTokens.Spacing.md)
        }
        .contextMenu {
            if item.status == "recording" {
                Button {
                    Task { await vm.stopRecording(recordingId: item.id) }
                } label: {
                    Label(
                        localization.t("recordings.stop"),
                        systemImage: "stop.circle"
                    )
                }
            }

            Button(role: .destructive) {
                Task { await vm.deleteRecording(recordingId: item.id) }
            } label: {
                Label(
                    localization.t("recordings.delete"),
                    systemImage: "trash"
                )
            }
        }
    }

    private var recordingIndicator: some View {
        Circle()
            .fill(DesignTokens.live)
            .frame(width: 12, height: 12)
    }

    private func statusVariant(_ status: String) -> GlassBadge.Variant {
        switch status {
        case "recording": return .live
        case "completed": return .success
        case "failed": return .error
        default: return .info
        }
    }

    private func thumbnailView(_ url: String?) -> some View {
        Group {
            if let urlStr = url, let imageURL = URL(string: urlStr) {
                AsyncImage(url: imageURL) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().aspectRatio(contentMode: .fill)
                    default:
                        RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                            .fill(DesignTokens.Glass.bg)
                    }
                }
            } else {
                RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                    .fill(DesignTokens.Glass.bg)
            }
        }
        .frame(width: 80, height: 45)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
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

    private var loadingList: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            ForEach(0..<5, id: \.self) { _ in
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .fill(DesignTokens.Glass.bg)
                    .frame(height: 72)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.vertical, DesignTokens.Spacing.md)
    }
}
