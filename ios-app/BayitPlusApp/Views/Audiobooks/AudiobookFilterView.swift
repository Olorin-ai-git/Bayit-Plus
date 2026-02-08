import BayitDesignSystem
import SwiftUI

/// Horizontal scroll of filter chips for audiobook genre and author filtering
struct AudiobookFilterView: View {
    let genres: [String]
    let selectedGenre: String?
    let onGenreSelected: (String?) -> Void

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                GlassChip(
                    title: "All",
                    isSelected: selectedGenre == nil
                ) {
                    onGenreSelected(nil)
                }

                ForEach(genres, id: \.self) { genre in
                    GlassChip(
                        title: genre,
                        isSelected: selectedGenre == genre
                    ) {
                        onGenreSelected(genre)
                    }
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
        }
    }
}
