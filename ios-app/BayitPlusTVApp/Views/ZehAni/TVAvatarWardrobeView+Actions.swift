#if os(tvOS)
    import Foundation

    extension TVAvatarWardrobeView {
        func loadCatalog() {
            isLoading = true
            errorMessage = nil

            Task {
                do {
                    let catalog = try await repos.avatarOutfitRepository.getWardrobe(
                        avatarId: avatarId
                    )
                    let owned = try await repos.avatarOutfitRepository.getOwnedOutfits(
                        profileId: profileId, avatarId: avatarId
                    )
                    let walletResponse = try await repos.missions.fetchWalletBalance()

                    await MainActor.run {
                        outfits = catalog
                        ownedOutfitIds = Set(owned.map { $0.id })
                        shekelBalance = walletResponse.balance.balance
                        isLoading = false
                    }
                } catch {
                    await MainActor.run {
                        errorMessage = error.localizedDescription
                        isLoading = false
                    }
                }
            }
        }

        func purchaseOutfit(_ outfit: Outfit) {
            Task {
                do {
                    try await repos.avatarOutfitRepository.purchaseOutfit(
                        profileId: profileId,
                        avatarId: avatarId,
                        outfitId: outfit.id,
                        priceShekel: outfit.priceShekel
                    )
                    await MainActor.run {
                        ownedOutfitIds.insert(outfit.id)
                        shekelBalance -= outfit.priceShekel
                        selectedOutfit = nil
                    }
                } catch {
                    await MainActor.run {
                        errorMessage = error.localizedDescription
                    }
                }
            }
        }

        func equipOutfit(_ outfit: Outfit) {
            Task {
                do {
                    try await repos.avatarOutfitRepository.equipOutfit(
                        profileId: profileId,
                        avatarId: avatarId,
                        outfitId: outfit.id
                    )
                    await MainActor.run {
                        activeOutfitId = outfit.id
                        selectedOutfit = nil
                    }
                } catch {
                    await MainActor.run {
                        errorMessage = error.localizedDescription
                    }
                }
            }
        }

        func unequipOutfit() {
            Task {
                do {
                    try await repos.avatarOutfitRepository.unequipOutfit(
                        profileId: profileId,
                        avatarId: avatarId,
                        outfitId: ""
                    )
                    await MainActor.run {
                        activeOutfitId = nil
                        selectedOutfit = nil
                    }
                } catch {
                    await MainActor.run {
                        errorMessage = error.localizedDescription
                    }
                }
            }
        }
    }
#endif
