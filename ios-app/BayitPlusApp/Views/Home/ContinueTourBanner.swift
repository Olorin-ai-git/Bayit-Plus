import BayitAuth
import BayitDesignSystem
import BayitLocalization
import BayitNetworking
import SwiftUI

/// Unobtrusive banner prompting users to continue an incomplete tour.
/// Shows max 3 times, then auto-dismisses permanently.
struct ContinueTourBanner: View {
    @Environment(LocalizationManager.self) var localization
    @Environment(RepositoryProvider.self) var repos
    @Environment(AuthManager.self) var authManager
    @State private var showBanner = false
    @State private var showTour = false
    @State private var tourViewModel: FeatureTourViewModel?

    private let maxPromptCount = 3

    var body: some View {
        Group {
            if showBanner {
                bannerContent
                    .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .fullScreenCover(isPresented: $showTour) {
            if let tourVM = tourViewModel {
                FeatureTourView(viewModel: tourVM) {
                    showTour = false
                    showBanner = false
                }
                .environment(localization)
            }
        }
        .onAppear { checkTourState() }
    }

    private var bannerContent: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                Text(localization.t("onboarding.tour.continueTour"))
                    .font(DesignTokens.Typography.headline)
                    .foregroundStyle(DesignTokens.Colors.textPrimary)

                Text(localization.t("onboarding.tour.continuePrompt"))
                    .font(DesignTokens.Typography.caption)
                    .foregroundStyle(DesignTokens.Colors.textSecondary)
            }

            Spacer()

            GlassButton(
                localization.t("onboarding.tour.continueTour"),
                variant: .primary,
                size: .small
            ) {
                showTour = true
            }

            Button {
                withAnimation { dismissBanner() }
            } label: {
                Image(systemName: "xmark")
                    .foregroundStyle(DesignTokens.Colors.textTertiary)
            }
        }
        .padding(DesignTokens.Spacing.lg)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func checkTourState() {
        let userId = authManager.user?.id ?? "anonymous"
        let storageKey = "bayit.onboarding.tour.\(userId)"
        let promptKey = "bayit.onboarding.tour.promptCount.\(userId)"

        guard let state = UserDefaults.standard.dictionary(forKey: storageKey),
              let status = state["completion_status"] as? String,
              status == "in_progress"
        else { return }

        let promptCount = UserDefaults.standard.integer(forKey: promptKey)
        guard promptCount < maxPromptCount else { return }

        let tourVM = FeatureTourViewModel(
            apiClient: repos.apiClient,
            userId: userId
        )
        tourViewModel = tourVM

        UserDefaults.standard.set(promptCount + 1, forKey: promptKey)
        withAnimation(.spring(response: 0.5)) {
            showBanner = true
        }
    }

    private func dismissBanner() {
        showBanner = false
    }
}
