import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Main Family Controls settings screen with PIN gate.
///
/// On first load, presents a PIN entry modal. Once verified (or newly
/// created), shows age sliders, content rating picker, and time range
/// controls. All changes are saved to the backend.
struct FamilyControlsView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: FamilyControlsViewModel?
    @State private var showPinModal = false

    var body: some View {
        ZStack {
            ScrollView(.vertical, showsIndicators: false) {
                if let vm = viewModel {
                    if vm.isLoading {
                        ProgressView()
                            .tint(.white)
                            .padding(.top, DesignTokens.Spacing.xxxxl)
                    } else if let error = vm.error, vm.preferences == nil {
                        ErrorStateView(message: error) {
                            Task { await vm.loadPreferences() }
                        }
                    } else if vm.isPinVerified {
                        settingsContent(vm)
                    }
                }
            }
            .background(DesignTokens.Background.primary)

            if let vm = viewModel, showPinModal {
                GlassModal(isPresented: $showPinModal) {
                    FamilyPinModalView(
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

    // MARK: - Settings Content

    private func settingsContent(
        _ vm: FamilyControlsViewModel
    ) -> some View {
        LazyVStack(spacing: DesignTokens.Spacing.lg) {
            ageSection(vm)
            ratingSection(vm)
            hoursSection(vm)
            saveSection(vm)
        }
        .padding(.vertical, DesignTokens.Spacing.lg)
    }

    // MARK: - Age Section

    private func ageSection(_ vm: FamilyControlsViewModel) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            sectionHeader(localization.t("familyControls.ageLimits"))

            GlassCard {
                VStack(spacing: DesignTokens.Spacing.lg) {
                    AgeSliderView(
                        label: localization.t("familyControls.kidsMaxAge"),
                        value: Bindable(vm).kidsMaxAge,
                        range: 1...17
                    )

                    Rectangle()
                        .fill(DesignTokens.Glass.border)
                        .frame(height: 1)

                    AgeSliderView(
                        label: localization.t("familyControls.youngstersMaxAge"),
                        value: Bindable(vm).youngstersMaxAge,
                        range: 1...18
                    )
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Rating Section

    private func ratingSection(_ vm: FamilyControlsViewModel) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            sectionHeader(localization.t("familyControls.contentRating"))

            GlassCard {
                ContentRatingPickerView(
                    selectedRating: Bindable(vm).selectedRating
                )
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Hours Section

    private func hoursSection(_ vm: FamilyControlsViewModel) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            sectionHeader(localization.t("familyControls.allowedHours"))

            GlassCard {
                TimeRangePickerView(
                    startTime: Bindable(vm).allowedHoursStart,
                    endTime: Bindable(vm).allowedHoursEnd
                )
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Save Section

    private func saveSection(_ vm: FamilyControlsViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            if let success = vm.successMessage {
                GlassAlert(
                    type: .success,
                    title: success
                )
                .padding(.horizontal, DesignTokens.Spacing.lg)
            }

            if let error = vm.error {
                GlassAlert(
                    type: .error,
                    title: error
                )
                .padding(.horizontal, DesignTokens.Spacing.lg)
            }

            GlassButton(
                localization.t("familyControls.saveSettings"),
                variant: .primary,
                isLoading: vm.isSaving
            ) {
                Task { await vm.savePreferences() }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
        }
    }

    // MARK: - Helpers

    private func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
            .foregroundStyle(DesignTokens.Text.muted)
            .textCase(.uppercase)
    }
}
