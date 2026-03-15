#if os(tvOS)
    import BayitDesignSystem
    import SwiftUI

    // MARK: - Card Thumbnail (per card type)

    struct TVZehAniCardThumbnail: View {
        let card: ZehAniFeatureCard

        var body: some View {
            switch card {
            case .magicMirror:
                cardImage("zehani-magic-mirror")
            case .highlights:
                cardImage("zehani-highlight-reels")
            case .movieInteractions:
                cardImage("zehani-movie-interactions")
            }
        }

        private func cardImage(_ name: String) -> some View {
            Image(name)
                .resizable()
                .aspectRatio(contentMode: .fill)
                .clipped()
        }
    }
#endif
