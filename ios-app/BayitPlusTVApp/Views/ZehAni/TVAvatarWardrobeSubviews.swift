#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    struct TVOutfitGridItem: View {
        @Environment(LocalizationManager.self) var localization

        let outfit: Outfit
        let isOwned: Bool
        let isEquipped: Bool
        let onSelect: () -> Void

        var body: some View {
            Button(action: onSelect) {
                VStack(spacing: TVDesignTokens.Spacing.sm) {
                    ZStack(alignment: .topTrailing) {
                        CachedAsyncImage(url: URL(string: outfit.thumbnailUrl)) { phase in
                            if case let .success(image) = phase {
                                image.resizable().scaledToFill()
                            } else {
                                Rectangle()
                                    .fill(DesignTokens.Glass.bgMedium.opacity(0.3))
                                    .overlay {
                                        Image(systemName: "tshirt")
                                            .font(.system(size: 40))
                                            .foregroundStyle(DesignTokens.Text.muted)
                                    }
                            }
                        }
                        .frame(height: 160)
                        .clipped()
                        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))

                        TVRarityBadge(rarity: outfit.rarity)
                            .padding(TVDesignTokens.Spacing.xs)
                    }

                    Text(localization.t(outfit.nameKey))
                        .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .lineLimit(2)
                        .multilineTextAlignment(.center)

                    if isEquipped {
                        Text(localization.t("wardrobe.equipped"))
                            .font(.system(size: TVDesignTokens.FontSize.sm, weight: .bold))
                            .foregroundStyle(DesignTokens.Primary.p400)
                    } else if isOwned {
                        Text(localization.t("wardrobe.owned"))
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Success.default)
                    } else {
                        HStack(spacing: TVDesignTokens.Spacing.xs) {
                            Image(systemName: "shekel.sign.circle.fill")
                                .foregroundStyle(DesignTokens.Warning.default)
                            Text("\(outfit.priceShekel)")
                                .font(.system(size: TVDesignTokens.FontSize.base, weight: .bold))
                                .foregroundStyle(DesignTokens.Warning.default)
                        }
                    }
                }
                .padding(TVDesignTokens.Spacing.sm)
            }
            .tvCardStyle()
        }
    }

    struct TVRarityBadge: View {
        @Environment(LocalizationManager.self) var localization
        let rarity: String

        var body: some View {
            Text(localization.t("wardrobe.rarity.\(rarity)"))
                .font(.system(size: TVDesignTokens.FontSize.xs, weight: .bold))
                .foregroundStyle(.white)
                .padding(.horizontal, TVDesignTokens.Spacing.xs)
                .padding(.vertical, 4)
                .background(rarityColor)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))
        }

        private var rarityColor: Color {
            switch rarity {
            case "common": return Color(hex: "ABB2BF")
            case "uncommon": return Color(hex: "98C379")
            case "rare": return Color(hex: "61AFEF")
            case "epic": return Color(hex: "C678DD")
            case "legendary": return Color(hex: "E5C07B")
            default: return DesignTokens.Text.muted
            }
        }
    }

    struct TVOutfitDetailCard: View {
        @Environment(LocalizationManager.self) var localization

        let outfit: Outfit
        let isOwned: Bool
        let isEquipped: Bool
        let shekelBalance: Int
        let onEquip: () -> Void
        let onUnequip: () -> Void
        let onPurchase: () -> Void
        let onDismiss: () -> Void

        var body: some View {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                CachedAsyncImage(url: URL(string: outfit.thumbnailUrl)) { phase in
                    if case let .success(image) = phase {
                        image.resizable().scaledToFit()
                    } else {
                        Rectangle().fill(DesignTokens.Glass.bgMedium.opacity(0.3))
                    }
                }
                .frame(height: 280)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))

                Text(localization.t(outfit.nameKey))
                    .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                TVRarityBadge(rarity: outfit.rarity)

                actionButtons
            }
            .padding(TVDesignTokens.Spacing.xl)
        }

        @ViewBuilder
        private var actionButtons: some View {
            if isOwned {
                HStack(spacing: TVDesignTokens.Spacing.lg) {
                    if isEquipped {
                        Button(localization.t("wardrobe.unequip")) { onUnequip() }
                            .tvCardStyle()
                    } else {
                        Button(localization.t("wardrobe.equip")) { onEquip() }
                            .tvCardStyle()
                    }
                    Button(localization.t("common.back")) { onDismiss() }
                        .tvCardStyle()
                }
            } else {
                VStack(spacing: TVDesignTokens.Spacing.md) {
                    HStack(spacing: TVDesignTokens.Spacing.xs) {
                        Image(systemName: "shekel.sign.circle.fill")
                            .foregroundStyle(DesignTokens.Warning.default)
                        Text("\(outfit.priceShekel)")
                            .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                            .foregroundStyle(DesignTokens.Warning.default)
                    }

                    HStack(spacing: TVDesignTokens.Spacing.lg) {
                        Button(localization.t("wardrobe.purchase")) { onPurchase() }
                            .tvCardStyle()
                            .disabled(shekelBalance < outfit.priceShekel)

                        Button(localization.t("common.back")) { onDismiss() }
                            .tvCardStyle()
                    }

                    if shekelBalance < outfit.priceShekel {
                        Text(localization.t("wardrobe.insufficient_balance"))
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.ErrorColor.default)
                    }
                }
            }
        }
    }
#endif
