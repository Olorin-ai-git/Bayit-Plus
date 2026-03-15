#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - Card Carousel Extension (Layer 3)

    extension TVZehAniHubView {
        var tvZehAniCarouselLayer: some View {
            VStack {
                Spacer()
                HStack(spacing: 32) {
                    ForEach(ZehAniFeatureCard.allCases) { card in
                        Button { navigationTarget = card } label: {
                            TVZehAniFeatureCardView(
                                card: card,
                                isFocused: focusedCard == card,
                                localization: localization
                            )
                        }
                        .tvCardStyle()
                        .focused($focusedCard, equals: card)
                    }
                }
                .padding(.horizontal, 100)
                .padding(.bottom, 100)
            }
        }
    }

    // MARK: - Feature Card View

    struct TVZehAniFeatureCardView: View {
        let card: ZehAniFeatureCard
        let isFocused: Bool
        let localization: LocalizationManager

        var body: some View {
            VStack(alignment: .leading, spacing: 16) {
                TVZehAniCardThumbnail(card: card)
                    .frame(height: 200)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                Text(title)
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(.white)
                Text(description)
                    .font(.system(size: 16, weight: .regular))
                    .foregroundColor(Color.white.opacity(0.65))
                    .lineLimit(3)
                    .multilineTextAlignment(.leading)
            }
            .padding(20)
            .frame(width: 400)
            .background(
                RoundedRectangle(cornerRadius: 20)
                    .fill(Color.white.opacity(0.08))
                    .overlay(
                        RoundedRectangle(cornerRadius: 20)
                            .stroke(Color.white.opacity(0.12), lineWidth: 1)
                    )
            )
        }

        private var title: String {
            switch card {
            case .magicMirror: return localization.t("zehAni.hub.magicMirror")
            case .highlights: return localization.t("zehAni.hub.highlights")
            case .movieInteractions: return localization.t("zehAni.hub.movieInteractions")
            }
        }

        private var description: String {
            switch card {
            case .magicMirror: return localization.t("zehAni.hub.magicMirrorDesc")
            case .highlights: return localization.t("zehAni.hub.highlightsDesc")
            case .movieInteractions: return localization.t("zehAni.hub.movieInteractionsDesc")
            }
        }
    }
#endif
