import BayitDesignSystem
import SwiftUI

/// Compact audiobook card with thumbnail, title, author, and duration badge
struct AudiobookCardView: View {
    let audiobook: Audiobook
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                coverImage
                    .aspectRatio(2 / 3, contentMode: .fill)
                    .clipped()
                    .overlay(alignment: .bottomTrailing) {
                        durationBadge
                    }

                VStack(alignment: .leading, spacing: 2) {
                    Text(audiobook.title ?? "Audiobook")
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                        .foregroundColor(DesignTokens.Text.primary)
                        .lineLimit(2)

                    if let author = audiobook.author {
                        Text(author)
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundColor(DesignTokens.Text.muted)
                            .lineLimit(1)
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.sm)
                .padding(.bottom, DesignTokens.Spacing.sm)
            }
            .glassCard()
        }
        .buttonStyle(.plain)
    }

    private var coverImage: some View {
        Group {
            if let urlStr = audiobook.thumbnail, let url = URL(string: urlStr) {
                CachedAsyncImage(url: url) { phase in
                    switch phase {
                    case let .success(img):
                        img.resizable().aspectRatio(contentMode: .fill)
                    default:
                        coverPlaceholder
                    }
                }
            } else {
                coverPlaceholder
            }
        }
    }

    private var coverPlaceholder: some View {
        ZStack {
            DesignTokens.Glass.bgMedium
            Image(systemName: "book.fill")
                .font(.system(size: 32))
                .foregroundColor(DesignTokens.Text.muted)
        }
    }

    @ViewBuilder
    private var durationBadge: some View {
        if let duration = audiobook.duration {
            Text(duration)
                .font(.system(size: DesignTokens.FontSize.xs, weight: .medium))
                .foregroundColor(.white)
                .padding(.horizontal, DesignTokens.Spacing.xs)
                .padding(.vertical, 2)
                .background(Color.black.opacity(0.7))
                .cornerRadius(DesignTokens.Radius.sm)
                .padding(DesignTokens.Spacing.xs)
        }
    }
}
