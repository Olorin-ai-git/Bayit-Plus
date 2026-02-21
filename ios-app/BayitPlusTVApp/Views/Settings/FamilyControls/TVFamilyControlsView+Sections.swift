import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - Settings Sections

extension TVFamilyControlsView {
    func ageSection(
        _ vm: FamilyControlsViewModel
    ) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            sectionHeader(localization.t("familyControls.ageLimits"))

            VStack(spacing: TVDesignTokens.Spacing.lg) {
                TVAgeStepperView(
                    label: localization.t("familyControls.kidsMaxAge"),
                    value: Bindable(vm).kidsMaxAge,
                    range: 1 ... 17
                )

                Rectangle()
                    .fill(DesignTokens.Glass.border)
                    .frame(height: 1)

                TVAgeStepperView(
                    label: localization.t("familyControls.youngstersMaxAge"),
                    value: Bindable(vm).youngstersMaxAge,
                    range: 1 ... 18
                )
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Glass.bgLight)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        }
    }

    func ratingSection(
        _ vm: FamilyControlsViewModel
    ) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            sectionHeader(localization.t("familyControls.contentRating"))

            VStack {
                TVContentRatingPickerView(
                    selectedRating: Bindable(vm).selectedRating
                )
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Glass.bgLight)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        }
    }

    func hoursSection(
        _ vm: FamilyControlsViewModel
    ) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            sectionHeader(localization.t("familyControls.allowedHours"))

            VStack {
                TVTimeRangePickerView(
                    startTime: Bindable(vm).allowedHoursStart,
                    endTime: Bindable(vm).allowedHoursEnd
                )
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Glass.bgLight)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        }
    }

    func saveSection(
        _ vm: FamilyControlsViewModel
    ) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            if let success = vm.successMessage {
                GlassAlert(
                    type: .success,
                    title: success
                )
            }

            if let error = vm.error {
                GlassAlert(
                    type: .error,
                    title: error
                )
            }

            GlassButton(
                localization.t("familyControls.saveSettings"),
                variant: .primary,
                size: .large,
                isLoading: vm.isSaving
            ) {
                Task { await vm.savePreferences() }
            }
        }
    }

    func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
            .foregroundStyle(DesignTokens.Text.muted)
            .textCase(.uppercase)
    }
}
