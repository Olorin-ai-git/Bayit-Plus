#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Reusable audiobook card for grid layouts.
    /// Shows cover art, title, author, duration, and optional progress bar.
    struct TVAudiobookCardView: View {
        @Environment(LocalizationManager.self) private var localization

        let audiobook: Audiobook
        let progress: Double?
        let onSelect: () -> Void

        init(
            audiobook: Audiobook,
            progress: Double? = nil,
            onSelect: @escaping () -> Void
        ) {
            self.audiobook = audiobook
            self.progress = progress
            self.onSelect = onSelect
        }

        var body: some View {
            Button(action: onSelect) {
                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                    coverArt
                    textMetadata
                    if let progress, progress > 0, progress < 1 {
                        progressBar(progress)
                    }
                }
            }
            .tvCardStyle()
        }

        private var coverArt: some View {
            ZStack(alignment: .topTrailing) {
                Group {
                    if let urlStr = audiobook.thumbnail, let url = URL(string: urlStr) {
                        CachedAsyncImage(url: url) { phase in
                            if case let .success(img) = phase {
                                img.resizable().aspectRatio(contentMode: .fill)
                            } else {
                                coverPlaceholder
                            }
                        }
                    } else {
                        coverPlaceholder
                    }
                }
                .aspectRatio(2 / 3, contentMode: .fit)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.poster))
                .overlay(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.poster)
                        .stroke(DesignTokens.Glass.border, lineWidth: 1)
                )

                if let duration = audiobook.duration {
                    Text(duration)
                        .font(.system(size: TVDesignTokens.FontSize.xs, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .padding(.horizontal, TVDesignTokens.Spacing.sm)
                        .padding(.vertical, TVDesignTokens.Spacing.xxs)
                        .background(DesignTokens.Glass.bg)
                        .clipShape(Capsule())
                        .padding(TVDesignTokens.Spacing.sm)
                }
            }
        }

        private var textMetadata: some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xxs) {
                Text(audiobook.title ?? localization.t("audiobooks.audiobook"))
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(2)

                if let author = audiobook.author {
                    Text(author)
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .lineLimit(1)
                }
            }
        }

        private func progressBar(_ value: Double) -> some View {
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm)
                        .fill(DesignTokens.Glass.bg)
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm)
                        .fill(DesignTokens.Primary.default)
                        .frame(width: geo.size.width * value)
                }
            }
            .frame(height: 4)
        }

        private var coverPlaceholder: some View {
            ZStack {
                LinearGradient(
                    colors: [DesignTokens.Glass.purpleLight, DesignTokens.Glass.purpleStrong],
                    startPoint: .topLeading, endPoint: .bottomTrailing
                )
                Image(systemName: "book.closed")
                    .font(.system(size: TVDesignTokens.FontSize.hero))
                    .foregroundStyle(DesignTokens.Text.muted.opacity(0.5))
            }
        }
    }
#endif
