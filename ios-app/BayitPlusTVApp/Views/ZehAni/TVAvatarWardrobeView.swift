#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    struct TVAvatarWardrobeView: View {
        @Environment(TVRepositoryProvider.self) var repos
        @Environment(LocalizationManager.self) var localization
        @Environment(\.dismiss) private var dismiss

        let avatarId: String
        let profileId: String

        @State var outfits: [Outfit] = []
        @State var ownedOutfitIds: Set<String> = []
        @State var activeOutfitId: String?
        @State var shekelBalance: Int = 0
        @State var isLoading = true
        @State var errorMessage: String?
        @State var selectedOutfit: Outfit?

        var body: some View {
            ZStack {
                DesignTokens.Background.primary.ignoresSafeArea()

                if isLoading {
                    ProgressView().tint(.white).scaleEffect(1.5)
                } else if let errorMessage {
                    errorView(errorMessage)
                } else {
                    catalogContent
                }
            }
            .onAppear { loadCatalog() }
        }

        private var catalogContent: some View {
            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: TVDesignTokens.Spacing.xl) {
                    balanceHeader

                    if outfits.isEmpty {
                        emptyState
                    } else {
                        outfitGrid
                    }

                    if let outfit = selectedOutfit {
                        TVOutfitDetailCard(
                            outfit: outfit,
                            isOwned: ownedOutfitIds.contains(outfit.id),
                            isEquipped: activeOutfitId == outfit.id,
                            shekelBalance: shekelBalance,
                            onEquip: { equipOutfit(outfit) },
                            onUnequip: { unequipOutfit() },
                            onPurchase: { purchaseOutfit(outfit) },
                            onDismiss: { selectedOutfit = nil }
                        )
                    }

                    Button(localization.t("common.back")) { dismiss() }
                        .tvCardStyle()
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)
                .padding(.vertical, TVDesignTokens.Spacing.xl)
            }
        }

        private var balanceHeader: some View {
            HStack {
                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                    Text(localization.t("wardrobe.title"))
                        .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Text(localization.t("wardrobe.subtitle"))
                        .font(.system(size: TVDesignTokens.FontSize.base))
                        .foregroundStyle(DesignTokens.Text.muted)
                }

                Spacer()

                HStack(spacing: TVDesignTokens.Spacing.xs) {
                    Image(systemName: "shekel.sign.circle.fill")
                        .foregroundStyle(DesignTokens.Warning.default)
                    Text("\(shekelBalance)")
                        .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                        .foregroundStyle(DesignTokens.Warning.default)
                }
            }
        }

        private var outfitGrid: some View {
            LazyVGrid(
                columns: [GridItem(.adaptive(minimum: 240), spacing: TVDesignTokens.Spacing.lg)],
                spacing: TVDesignTokens.Spacing.lg
            ) {
                ForEach(outfits, id: \.id) { outfit in
                    TVOutfitGridItem(
                        outfit: outfit,
                        isOwned: ownedOutfitIds.contains(outfit.id),
                        isEquipped: activeOutfitId == outfit.id
                    ) {
                        selectedOutfit = outfit
                    }
                }
            }
        }

        private var emptyState: some View {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                Image(systemName: "tshirt")
                    .font(.system(size: 60))
                    .foregroundStyle(DesignTokens.Text.muted)
                Text(localization.t("wardrobe.empty"))
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, TVDesignTokens.Spacing.xxxl)
        }

        private func errorView(_ message: String) -> some View {
            VStack(spacing: TVDesignTokens.Spacing.xl) {
                Text(message)
                    .foregroundStyle(DesignTokens.ErrorColor.default)
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                Button(localization.t("common.retry")) { loadCatalog() }
                    .tvCardStyle()
            }
        }
    }
#endif
