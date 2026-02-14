import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct AvatarWardrobeView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization

    let avatarId: String
    let profileId: String
    let shekelBalance: Int
    var onBalanceChange: (() -> Void)?

    @State private var outfits: [Outfit] = []
    @State private var ownedOutfits: Set<String> = []
    @State private var selectedOutfit: Outfit?
    @State private var isLoading = false
    @State private var error: String?
    @State private var showPurchaseConfirm = false

    private let columns = [
        GridItem(.flexible(), spacing: DesignTokens.Spacing.sm),
        GridItem(.flexible(), spacing: DesignTokens.Spacing.sm),
        GridItem(.flexible(), spacing: DesignTokens.Spacing.sm)
    ]

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: DesignTokens.Spacing.lg) {
                headerView

                if isLoading {
                    loadingView
                } else if let error = error {
                    errorView(message: error)
                } else {
                    outfitGrid
                }

                if let selected = selectedOutfit {
                    outfitDetailCard(selected)
                }
            }
            .padding(DesignTokens.Spacing.md)
        }
        .background(DesignTokens.Background.primary)
        .onAppear {
            loadOutfits()
        }
    }

    private var headerView: some View {
        GlassCard {
            HStack {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                    Text(localization.t("wardrobe.title"))
                        .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                        .foregroundColor(DesignTokens.Text.primary)

                    Text(localization.t("wardrobe.subtitle"))
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundColor(DesignTokens.Text.secondary)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: DesignTokens.Spacing.xs) {
                    Text(localization.t("wardrobe.balance"))
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundColor(DesignTokens.Text.secondary)

                    Text(String(shekelBalance))
                        .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                        .foregroundColor(DesignTokens.Warning.default)
                }
            }
            .padding(DesignTokens.Spacing.md)
        }
    }

    private var outfitGrid: some View {
        LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
            ForEach(outfits, id: \.id) { outfit in
                OutfitGridItem(
                    outfit: outfit,
                    isOwned: ownedOutfits.contains(outfit.id),
                    onTap: { selectedOutfit = outfit }
                )
            }
        }
    }

    private func outfitDetailCard(_ outfit: Outfit) -> some View {
        OutfitDetailCard(
            outfit: outfit,
            isOwned: ownedOutfits.contains(outfit.id),
            shekelBalance: shekelBalance,
            onDismiss: { selectedOutfit = nil },
            onEquip: { equipOutfit(outfit) },
            onUnequip: { unequipOutfit(outfit) },
            onPurchase: { purchaseOutfit(outfit) },
            showPurchaseConfirm: $showPurchaseConfirm
        )
    }

    private var loadingView: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
            Text(localization.t("wardrobe.loading"))
                .font(.system(size: DesignTokens.FontSize.base))
                .foregroundColor(DesignTokens.Text.secondary)
        }
        .padding(DesignTokens.Spacing.xl)
    }

    private func errorView(message: String) -> some View {
        GlassCard {
            Text(message)
                .font(.system(size: DesignTokens.FontSize.base))
                .foregroundColor(DesignTokens.ErrorColor.default)
                .padding(DesignTokens.Spacing.md)
        }
    }

    private func loadOutfits() {
        isLoading = true
        Task {
            do {
                let catalog = try await repos.avatarRepository.getWardrobe(avatarId: avatarId)
                let owned = try await repos.avatarRepository.getOwnedOutfits(profileId: profileId, avatarId: avatarId)
                await MainActor.run {
                    outfits = catalog
                    ownedOutfits = Set(owned.map { $0.id })
                    isLoading = false
                }
            } catch {
                await MainActor.run {
                    self.error = localization.t("wardrobe.load_error")
                    isLoading = false
                }
            }
        }
    }

    private func purchaseOutfit(_ outfit: Outfit) {
        Task {
            do {
                try await repos.avatarRepository.purchaseOutfit(
                    profileId: profileId,
                    avatarId: avatarId,
                    outfitId: outfit.id,
                    priceShekel: outfit.priceShekel
                )
                await MainActor.run {
                    ownedOutfits.insert(outfit.id)
                    onBalanceChange?()
                }
            } catch {
                await MainActor.run {
                    self.error = localization.t("wardrobe.purchase_error")
                }
            }
        }
    }

    private func equipOutfit(_ outfit: Outfit) {
        Task {
            do {
                try await repos.avatarRepository.equipOutfit(
                    profileId: profileId,
                    avatarId: avatarId,
                    outfitId: outfit.id
                )
            } catch {
                await MainActor.run {
                    self.error = localization.t("wardrobe.equip_error")
                }
            }
        }
    }

    private func unequipOutfit(_ outfit: Outfit) {
        Task {
            do {
                try await repos.avatarRepository.unequipOutfit(
                    profileId: profileId,
                    avatarId: avatarId,
                    outfitId: outfit.id
                )
            } catch {
                await MainActor.run {
                    self.error = localization.t("wardrobe.unequip_error")
                }
            }
        }
    }
}
