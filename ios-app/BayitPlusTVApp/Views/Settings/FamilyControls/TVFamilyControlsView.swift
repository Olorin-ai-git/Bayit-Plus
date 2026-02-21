import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS Family Controls main screen with PIN gate.
///
/// On first load, presents a PIN entry modal using wheel pickers.
/// Once verified (or newly created), shows age steppers, content
/// rating picker, time range controls, and a save button.
/// Follows the TVSecurityView pattern for layout and state management.
struct TVFamilyControlsView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) var localization
    @State private var viewModel: FamilyControlsViewModel?
    @State private var showPinModal = false

    var body: some View {
        ZStack {
            ScrollView(.vertical, showsIndicators: false) {
                if let vm = viewModel {
                    if vm.isLoading {
                        loadingState
                    } else if let error = vm.error, vm.preferences == nil {
                        errorState(error, vm: vm)
                    } else if vm.isPinVerified {
                        settingsContent(vm)
                    }
                }
            }
            .background(DesignTokens.Background.primary)

            if let vm = viewModel, showPinModal {
                GlassModal(isPresented: $showPinModal) {
                    TVFamilyPinModalView(
                        mode: vm.isPinSet ? .verify : .create,
                        isProcessing: vm.isSaving,
                        error: vm.error
                    ) { pin in
                        Task {
                            if vm.isPinSet {
                                await vm.verifyPin(pin)
                            } else {
                                await vm.setPin(pin)
                            }
                            if vm.isPinVerified {
                                showPinModal = false
                            }
                        }
                    } onCancel: {
                        showPinModal = false
                    }
                }
            }
        }
        .task {
            if viewModel == nil {
                viewModel = FamilyControlsViewModel(
                    repository: repos.familyControls
                )
            }
            await viewModel?.loadPreferences()
            if let vm = viewModel, !vm.isPinVerified {
                showPinModal = true
            }
        }
    }

    // MARK: - Loading

    private var loadingState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(1.5)
            Text(localization.t("common.loading"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }

    // MARK: - Error

    private func errorState(
        _ message: String, vm: FamilyControlsViewModel
    ) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Warning.default)

            Text(message)
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 600)

            GlassButton(
                localization.t("common.retry"),
                variant: .secondary,
                size: .large
            ) {
                Task { await vm.loadPreferences() }
            }
            .frame(maxWidth: 300)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, TVDesignTokens.Spacing.xxxxl)
    }

    // MARK: - Settings Content

    private func settingsContent(
        _ vm: FamilyControlsViewModel
    ) -> some View {
        LazyVStack(spacing: TVDesignTokens.Spacing.xl) {
            ageSection(vm)
            ratingSection(vm)
            hoursSection(vm)
            saveSection(vm)
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
        .padding(.vertical, TVDesignTokens.Spacing.lg)
    }
}
