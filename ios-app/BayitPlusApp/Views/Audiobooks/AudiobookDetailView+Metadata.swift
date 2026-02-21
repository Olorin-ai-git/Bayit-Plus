import BayitDesignSystem
import SwiftUI

// MARK: - Cover & Metadata

extension AudiobookDetailView {
    func coverSection(_ audiobook: Audiobook) -> some View {
        Group {
            if let urlStr = audiobook.thumbnail, let url = URL(string: urlStr) {
                CachedAsyncImage(url: url) { phase in
                    switch phase {
                    case let .success(img):
                        img.resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(maxWidth: 200)
                            .cornerRadius(DesignTokens.Radius.lg)
                            .shadow(radius: 10)
                    default:
                        coverPlaceholder
                    }
                }
            } else {
                coverPlaceholder
            }
        }
        .frame(maxWidth: .infinity)
    }

    var coverPlaceholder: some View {
        RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
            .fill(DesignTokens.Glass.bgMedium)
            .frame(width: 200, height: 280)
            .overlay {
                Image(systemName: "book.fill")
                    .font(.system(size: 48))
                    .foregroundColor(DesignTokens.Text.muted)
            }
    }

    func metadataSection(_ audiobook: Audiobook) -> some View {
        GlassCard {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                Text(audiobook.title ?? "")
                    .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                    .foregroundColor(DesignTokens.Text.primary)

                if let author = audiobook.author {
                    metadataRow(label: "Author", value: author)
                }

                if let narrator = audiobook.narrator {
                    metadataRow(label: "Narrator", value: narrator)
                }

                if let duration = audiobook.duration {
                    metadataRow(label: "Duration", value: duration)
                }

                if let genreIds = audiobook.genreIds, !genreIds.isEmpty {
                    metadataRow(label: "Genre", value: genreIds.joined(separator: ", "))
                }

                if let description = audiobook.description {
                    Text(description)
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundColor(DesignTokens.Text.secondary)
                        .padding(.top, DesignTokens.Spacing.xs)
                }
            }
            .padding(DesignTokens.Spacing.lg)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    func metadataRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundColor(DesignTokens.Text.muted)
            Spacer()
            Text(value)
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundColor(DesignTokens.Text.secondary)
        }
    }
}
