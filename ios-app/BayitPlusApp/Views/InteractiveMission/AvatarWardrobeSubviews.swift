import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct OutfitGridItem: View {
    @Environment(LocalizationManager.self) private var localization

    let outfit: Outfit
    let isOwned: Bool
    let onTap: () -> Void

    var body: some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.sm) {
                ZStack(alignment: .topTrailing) {
                    CachedAsyncImage(url: URL(string: outfit.thumbnailUrl)) { phase in
                        if case let .success(image) = phase {
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        } else {
                            Rectangle()
                                .fill(DesignTokens.Glass.bgStrong)
                        }
                    }
                    .frame(height: 120)
                    .clipped()
                    .cornerRadius(DesignTokens.Radius.sm)

                    RarityBadge(rarity: outfit.rarity)
                        .padding(DesignTokens.Spacing.xs)
                }

                Text(localization.t(outfit.nameKey))
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundColor(DesignTokens.Text.primary)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)

                if isOwned {
                    Text(localization.t("wardrobe.owned"))
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundColor(DesignTokens.Success.default)
                } else {
                    Text(String(outfit.priceShekel))
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .bold))
                        .foregroundColor(DesignTokens.Warning.default)
                }
            }
            .padding(DesignTokens.Spacing.sm)
        }
        .onTapGesture(perform: onTap)
    }
}

struct RarityBadge: View {
    @Environment(LocalizationManager.self) private var localization

    let rarity: String

    var body: some View {
        Text(localization.t("wardrobe.rarity.\(rarity)"))
            .font(.system(size: DesignTokens.FontSize.xs, weight: .bold))
            .foregroundColor(.white)
            .padding(.horizontal, DesignTokens.Spacing.xs)
            .padding(.vertical, 4)
            .background(rarityColor)
            .cornerRadius(DesignTokens.Radius.sm)
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

struct OutfitDetailCard: View {
    @Environment(LocalizationManager.self) private var localization

    let outfit: Outfit
    let isOwned: Bool
    let shekelBalance: Int
    let onDismiss: () -> Void
    let onEquip: () -> Void
    let onUnequip: () -> Void
    let onPurchase: () -> Void

    @Binding var showPurchaseConfirm: Bool

    var body: some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.md) {
                HStack {
                    Text(localization.t(outfit.nameKey))
                        .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                        .foregroundColor(DesignTokens.Text.primary)

                    Spacer()

                    Button(action: onDismiss) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(DesignTokens.Text.secondary)
                    }
                }

                CachedAsyncImage(url: URL(string: outfit.thumbnailUrl)) { phase in
                    if case let .success(image) = phase {
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                    } else {
                        Rectangle()
                            .fill(DesignTokens.Glass.bgStrong)
                    }
                }
                .frame(height: 200)
                .cornerRadius(DesignTokens.Radius.lg)

                if isOwned {
                    HStack(spacing: DesignTokens.Spacing.sm) {
                        GlassButton(localization.t("wardrobe.equip"), variant: .primary, size: .large, action: onEquip)
                        GlassButton(localization.t("wardrobe.unequip"), variant: .secondary, size: .large, action: onUnequip)
                    }
                } else {
                    VStack(spacing: DesignTokens.Spacing.sm) {
                        Text(localization.t("wardrobe.price", ["amount": String(outfit.priceShekel)]))
                            .font(.system(size: DesignTokens.FontSize.base))
                            .foregroundColor(DesignTokens.Text.secondary)

                        GlassButton(localization.t("wardrobe.purchase"), variant: .primary, size: .large) {
                            showPurchaseConfirm = true
                        }
                        .disabled(shekelBalance < outfit.priceShekel)

                        if shekelBalance < outfit.priceShekel {
                            Text(localization.t("wardrobe.insufficient_balance"))
                                .font(.system(size: DesignTokens.FontSize.sm))
                                .foregroundColor(DesignTokens.ErrorColor.default)
                        }
                    }
                }
            }
            .padding(DesignTokens.Spacing.md)
        }
        .confirmationDialog(
            localization.t("wardrobe.confirm_purchase"),
            isPresented: $showPurchaseConfirm,
            titleVisibility: .visible
        ) {
            Button(localization.t("wardrobe.confirm"), action: onPurchase)
            Button(localization.t("wardrobe.cancel"), role: .cancel) {}
        }
    }
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r, g, b: UInt64
        r = (int >> 16) & 0xFF
        g = (int >> 8) & 0xFF
        b = int & 0xFF
        self.init(.sRGB, red: Double(r) / 255, green: Double(g) / 255, blue: Double(b) / 255, opacity: 1)
    }
}
