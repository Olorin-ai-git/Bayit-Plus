#if os(iOS)
    import BayitAuth
    import BayitCore
    import SwiftUI

    /// Handles VOD AI feature activation with credit checking and dedup.
    extension PlayerView {
        // MARK: - VOD Feature Tap Handler

        func handleVODFeatureTap(_ feature: VODAIFeature) {
            Task {
                let isPlus = authManager.user?.subscriptionTier == .plus

                // Check local cache first
                if await vodUsageCache.isUnlocked(
                    contentId: contentId, featureId: feature.id
                ) {
                    activateVODFeature(feature)
                    return
                }

                // Plus users skip confirmation
                if isPlus {
                    activateVODFeature(feature)
                    return
                }

                // Free user: show confirmation
                pendingVODFeature = feature
                do {
                    vodCreditBalance = try await repositories.betaCredits.fetchBalance()
                } catch {
                    vodCreditBalance = nil
                }
                showVODCreditConfirm = true
            }
        }

        // MARK: - Confirm Credit Deduction

        func confirmVODCreditDeduction() {
            guard let feature = pendingVODFeature else { return }
            showVODCreditConfirm = false

            Task {
                do {
                    let request = CreditDeductRequest(
                        amount: 1,
                        reason: "VOD AI Feature: \(feature.id)",
                        featureId: feature.id,
                        contentId: contentId
                    )
                    let response = try await repositories.betaCredits.deductWithDedup(request)

                    await vodUsageCache.markUnlocked(
                        contentId: contentId, featureId: feature.id
                    )

                    vodCreditToastRemaining = response.remainingCredits ?? 0
                    vodCreditToastIsLow = response.isLow ?? false
                    showVODCreditToast = true

                    activateVODFeature(feature)
                } catch {
                    let logger = BayitLogger(category: "VODCreditFlow")
                    logger.error("Credit deduction failed", context: [
                        "feature": feature.id,
                        "contentId": contentId,
                    ])
                }
                pendingVODFeature = nil
            }
        }

        // MARK: - Activate Feature

        func activateVODFeature(_ feature: VODAIFeature) {
            if mediaContentType.isYouTubeSource {
                let gatewayState = AIGatewayState()
                gatewayState.markFirstAIFeatureUsed()
            }
            withAnimation(.spring(duration: 0.3)) {
                switch feature {
                case .pauseAsk:
                    showPauseAskOverlay.toggle()
                case .interactiveSubtitles:
                    toggleVODSubtitles()
                case .vocabulary:
                    showSubtitlePicker = true
                case .vodMoments:
                    toggleVODMoments()
                case .culturalContext:
                    toggleVODCulturalContext()
                case .bilingualBridge:
                    toggleSplitSubtitles()
                case .aiCompanion:
                    showAICompanion.toggle()
                }
            }
        }

        private func toggleVODSubtitles() {
            if subtitlesVM != nil {
                handleSubtitleSelection(nil)
            } else {
                handleSubtitleSelection(selectedAILanguage)
            }
        }

        private func toggleVODMoments() {
            if interactionVM != nil {
                interactionVM = nil
            } else {
                let vm = VODInteractionViewModel(
                    repository: repositories.avatarMeshRepository
                )
                interactionVM = vm
                Task { await vm.loadMoments(contentId: contentId) }
            }
        }

        private func toggleVODCulturalContext() {
            if culturalContextVM != nil {
                culturalContextVM = nil
            } else {
                culturalContextVM = CulturalContextViewModel(
                    client: repositories.apiClient
                )
            }
        }
    }
#endif
