import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Netflix-style "Who's watching?" profile selection screen.
/// Shown after authentication but before the main tab view.
struct TVProfileSelectionView: View {
    @Environment(LocalizationManager.self) private var localization
    @Environment(TVRepositoryProvider.self) private var repos

    let onProfileSelected: (HouseholdMember) -> Void

    @State private var viewModel: TVProfileSelectionViewModel?
    @State private var showAddProfile = false

    private let columns = [
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
    ]

    var body: some View {
        ZStack {
            backgroundGradient

            if let vm = viewModel {
                if vm.isLoading && vm.profiles.isEmpty {
                    loadingState
                } else if let error = vm.error, vm.profiles.isEmpty {
                    errorState(error, viewModel: vm)
                } else {
                    profileGrid(viewModel: vm)
                }
            } else {
                loadingState
            }
        }
        .task {
            if viewModel == nil {
                viewModel = TVProfileSelectionViewModel(
                    householdRepository: repos.household,
                    userRepository: repos.user
                )
            }
            await viewModel?.loadProfiles()
            handleAutoSelect()
        }
        .fullScreenCover(isPresented: $showAddProfile) {
            if let vm = viewModel {
                TVAddProfileSheet(
                    viewModel: vm,
                    onDismiss: { showAddProfile = false }
                )
            }
        }
    }

    // MARK: - Profile Grid

    private func profileGrid(viewModel: TVProfileSelectionViewModel) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.xxxl) {
            Spacer()

            Text(localization.t("profile.whosWatching"))
                .font(.system(size: TVDesignTokens.FontSize.display, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(viewModel.profiles, id: \.stableId) { member in
                    TVProfileCard(member: member) {
                        viewModel.selectProfile(member)
                        onProfileSelected(member)
                    }
                }

                TVAddProfileCard {
                    showAddProfile = true
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xxxxl)

            Spacer()
        }
    }

    // MARK: - States

    private var loadingState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            GlassSpinner(size: .large)
            Text(localization.t("profile.loadingProfiles"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
    }

    private func errorState(_ message: String, viewModel: TVProfileSelectionViewModel) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 72))
                .foregroundStyle(DesignTokens.Warning.default)
            Text(message)
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 600)
            GlassButton(
                localization.t("common.retry"),
                variant: .primary,
                size: .medium
            ) {
                Task { await viewModel.loadProfiles() }
            }
        }
    }

    // MARK: - Helpers

    private var backgroundGradient: some View {
        LinearGradient(
            colors: [
                DesignTokens.Colors.Background.primary,
                Color.black,
            ],
            startPoint: .top,
            endPoint: .bottom
        )
        .ignoresSafeArea()
    }

    private func handleAutoSelect() {
        guard let vm = viewModel else { return }
        if vm.shouldSkipSelection, let single = vm.singleProfile {
            vm.selectProfile(single)
            onProfileSelected(single)
        }
    }
}
