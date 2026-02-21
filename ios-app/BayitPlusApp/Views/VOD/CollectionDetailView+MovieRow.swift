import BayitDesignSystem
import SwiftUI

/// Movie row component for collection detail view.
struct CollectionMovieRow: View {
    let movie: CollectionMovie
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: DesignTokens.Spacing.md) {
                Text("\(movie.collectionOrder ?? 0).")
                    .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                    .foregroundColor(DesignTokens.Text.muted)
                    .frame(width: 30, alignment: .trailing)

                if let thumbnail = movie.thumbnail, let url = URL(string: thumbnail) {
                    CachedAsyncImage(url: url) { phase in
                        switch phase {
                        case let .success(image):
                            image.resizable().aspectRatio(contentMode: .fill)
                        default:
                            Rectangle().fill(DesignTokens.Glass.bgMedium)
                        }
                    }
                    .frame(width: 100, height: 60)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(movie.title ?? "Untitled")
                        .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                        .foregroundColor(DesignTokens.Text.primary)
                        .lineLimit(2)

                    if let year = movie.year, let duration = movie.duration {
                        Text("\(year) • \(duration)")
                            .font(.system(size: DesignTokens.FontSize.sm))
                            .foregroundColor(DesignTokens.Text.muted)
                    }
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .foregroundColor(DesignTokens.Text.muted)
            }
            .padding(DesignTokens.Spacing.sm)
            .background(DesignTokens.Glass.bg)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        }
        .buttonStyle(.plain)
    }
}
