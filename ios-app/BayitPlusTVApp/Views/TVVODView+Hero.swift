import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

// MARK: - VOD Hero Section (Collection + Actor)

extension TVVODView {
    static let heroHeight: CGFloat = 400

    @ViewBuilder
    var heroSection: some View {
        if !featuredCollections.isEmpty || !actorRecommendations.isEmpty {
            HStack(alignment: .top, spacing: TVDesignTokens.Spacing.lg) {
                if let collection = featuredCollections.first {
                    collectionHeroCard(collection)
                        .frame(maxWidth: .infinity)
                        .frame(minHeight: Self.heroHeight)
                }
                if let actor = actorRecommendations.first {
                    actorSpotlightCard(actor)
                        .frame(width: 400)
                        .frame(minHeight: Self.heroHeight)
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
        }
    }

    func collectionHeroCard(_ collection: CollectionDetail) -> some View {
        let title = collection.localizedTitle(for: localization.currentLanguage.rawValue) ?? ""
        let promo = collection.localizedPromoText(for: localization.currentLanguage.rawValue) ?? ""
        return Button {
            coordinator.fullscreenRoute = .collectionDetail(collectionId: collection.id)
        } label: {
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                collectionPoster(collection.thumbnail)
                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                    HStack(spacing: TVDesignTokens.Spacing.sm) {
                        Image(systemName: "sparkles")
                            .foregroundColor(DesignTokens.Primary.default)
                            .font(.system(size: TVDesignTokens.FontSize.md))
                        Text(localization.t("vod.collection.aiRecommendation"))
                            .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
                            .foregroundColor(DesignTokens.Text.muted)
                            .textCase(.uppercase)
                    }
                    Text(title)
                        .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                        .foregroundColor(DesignTokens.Text.primary)
                        .lineLimit(2)
                    if let attributed = try? AttributedString(markdown: promo) {
                        Text(attributed)
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundColor(DesignTokens.Text.secondary)
                            .lineLimit(3).lineSpacing(3)
                    }
                    HStack(spacing: TVDesignTokens.Spacing.md) {
                        Image(systemName: "captions.bubble")
                        Image(systemName: "speaker.wave.2")
                    }
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundColor(DesignTokens.Text.muted)
                    .padding(.top, TVDesignTokens.Spacing.xs)
                    HStack(spacing: TVDesignTokens.Spacing.sm) {
                        Image(systemName: "play.fill")
                        Text(localization.t("vod.collection.watchNow"))
                            .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, TVDesignTokens.Spacing.lg)
                    .padding(.vertical, TVDesignTokens.Spacing.sm)
                    .background(DesignTokens.Primary.default)
                    .clipShape(Capsule())
                    .padding(.top, TVDesignTokens.Spacing.sm)
                }
                Spacer()
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Glass.bgMedium)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl))
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
            )
        }
        .tvCardStyle()
    }

    @ViewBuilder
    private func collectionPoster(_ thumbnail: String?) -> some View {
        if let thumb = thumbnail, let url = URL(string: thumb) {
            CachedAsyncImage(url: url) { phase in
                if case let .success(image) = phase {
                    image.resizable().aspectRatio(contentMode: .fill)
                } else {
                    Rectangle().fill(DesignTokens.Glass.bgMedium)
                }
            }
            .frame(width: 240, height: 340)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        }
    }

    func actorSpotlightCard(_ actor: ActorListItem) -> some View {
        Button { selectedActorName = actor.name } label: {
            VStack(spacing: TVDesignTokens.Spacing.md) {
                Text(localization.t("vod.actor.collection"))
                    .font(.system(size: TVDesignTokens.FontSize.xs, weight: .semibold))
                    .foregroundColor(DesignTokens.Text.muted)
                    .textCase(.uppercase)
                actorPhoto(actor.profileUrl)
                    .frame(width: 160, height: 160)
                    .clipShape(Circle())
                    .overlay(Circle().stroke(DesignTokens.Glass.border, lineWidth: 2))
                Text(actor.name)
                    .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                    .foregroundColor(DesignTokens.Text.primary)
                    .lineLimit(1)
                HStack(spacing: TVDesignTokens.Spacing.xs) {
                    Image(systemName: "star.fill")
                        .foregroundColor(DesignTokens.Primary.default)
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                    Text("\(actor.movieCount) \(localization.t("vod.actor.films"))")
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundColor(DesignTokens.Text.secondary)
                }
                Text(localization.t("vod.actor.explore"))
                    .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundColor(Color(red: 0.95, green: 0.35, blue: 0.35))
                    .padding(.top, TVDesignTokens.Spacing.xs)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, TVDesignTokens.Spacing.lg)
            .padding(.horizontal, TVDesignTokens.Spacing.md)
            .background(DesignTokens.Glass.bgMedium)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl))
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
            )
        }
        .tvCardStyle()
    }

    @ViewBuilder
    func actorPhoto(_ profileUrl: String?) -> some View {
        if let profileUrl, let url = URL(string: profileUrl) {
            CachedAsyncImage(url: url) { phase in
                if case let .success(image) = phase {
                    image.resizable().aspectRatio(contentMode: .fill)
                } else {
                    Circle().fill(DesignTokens.Glass.bgMedium)
                }
            }
        } else {
            Circle().fill(DesignTokens.Glass.bgMedium)
                .overlay(
                    Image(systemName: "person.fill")
                        .foregroundColor(DesignTokens.Text.muted)
                        .font(.system(size: 48))
                )
        }
    }
}
