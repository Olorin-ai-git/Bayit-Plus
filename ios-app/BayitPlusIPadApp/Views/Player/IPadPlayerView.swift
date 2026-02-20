import BayitDesignSystem
import BayitMedia
import SwiftUI

/// iPad split-screen player with video on left (70%) and details panel on right (30%).
///
/// Wraps `PlayerView` in an `HStack` alongside a scrollable details sidebar that
/// displays title, metadata, description, and quick-action buttons for the loaded
/// content. Content detail is fetched via `ContentRepository` using `contentId`.
struct IPadPlayerView: View {
    let contentId: String
    let contentType: ContentType
    let resume: Bool

    @Environment(MediaPlayer.self) private var mediaPlayer
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(WidgetDataSyncService.self) private var widgetSync

    @State private var contentDetail: ContentDetail?

    var body: some View {
        GeometryReader { geometry in
            HStack(spacing: 0) {
                PlayerView(
                    contentId: contentId,
                    contentType: contentType,
                    resume: resume,
                    player: mediaPlayer,
                    repository: repos.media,
                    contentRepository: repos.content,
                    liveTVRepository: repos.liveTV,
                    radioRepository: repos.radio,
                    podcastRepository: repos.podcasts,
                    audiobookRepository: repos.audiobook,
                    widgetSync: widgetSync
                )
                .frame(width: geometry.size.width * 0.7)

                detailsPanel
                    .frame(width: geometry.size.width * 0.3)
                    .background(DesignTokens.Background.primary)
            }
        }
        .background(Color.black)
        .ignoresSafeArea()
        .task { await loadContentDetail() }
    }

    // MARK: - Details Panel

    private var detailsPanel: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
                if let detail = contentDetail {
                    contentHeader(detail)
                    metadataRow(detail)
                    descriptionText(detail)

                    Divider()
                        .background(DesignTokens.Glass.border)

                    actionButtons(detail)
                } else {
                    ProgressView()
                        .tint(DesignTokens.Primary.default)
                        .frame(maxWidth: .infinity)
                        .padding(.top, DesignTokens.Spacing.xxxxl)
                }
            }
            .padding(DesignTokens.Spacing.lg)
        }
    }

    @ViewBuilder
    private func contentHeader(_ detail: ContentDetail) -> some View {
        Text(detail.title ?? "")
            .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
            .foregroundColor(DesignTokens.Text.primary)
    }

    @ViewBuilder
    private func metadataRow(_ detail: ContentDetail) -> some View {
        if detail.year != nil || detail.duration != nil {
            HStack(spacing: DesignTokens.Spacing.md) {
                if let year = detail.year {
                    Text(String(year))
                }
                if detail.year != nil && detail.duration != nil {
                    Text("|")
                }
                if let duration = detail.duration {
                    Text(duration)
                }
            }
            .font(.system(size: DesignTokens.FontSize.sm))
            .foregroundColor(DesignTokens.Text.muted)
        }
    }

    @ViewBuilder
    private func descriptionText(_ detail: ContentDetail) -> some View {
        if let description = detail.description {
            Text(description)
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundColor(DesignTokens.Text.secondary)
                .lineLimit(nil)
        }
    }

    // MARK: - Action Buttons

    private func actionButtons(_ detail: ContentDetail) -> some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            actionButton(icon: "heart", title: "Favorites") {
                coordinator.navigate(to: .favorites)
            }
            actionButton(icon: "text.bubble", title: "Subtitles") {
                coordinator.navigate(to: .interactiveSubtitles(contentId: detail.id))
            }
            actionButton(icon: "list.bullet", title: "Chapters") {
                coordinator.navigate(to: .chapters(contentId: detail.id))
            }
        }
    }

    private func actionButton(
        icon: String,
        title: String,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: icon)
                    .font(.system(size: DesignTokens.FontSize.lg))
                    .foregroundColor(DesignTokens.Primary.default)
                    .frame(width: 28)
                Text(title)
                    .font(.system(size: DesignTokens.FontSize.md))
                    .foregroundColor(DesignTokens.Text.primary)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundColor(DesignTokens.Text.muted)
            }
            .padding(DesignTokens.Spacing.md)
            .background(DesignTokens.Glass.bg)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        }
    }

    // MARK: - Data Loading

    private func loadContentDetail() async {
        guard let detail = try? await repos.content.fetchContentDetail(id: contentId) else { return }
        contentDetail = detail
    }
}
