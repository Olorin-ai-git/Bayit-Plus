import BayitAuth
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Sheet view for creating a new user profile.
///
/// Presents a form with name, avatar color selection, and kids profile toggle.
/// Calls `AuthManager.createProfile()` to persist the profile via the backend.
struct AddProfileSheetView: View {
    @Environment(AuthManager.self) var authManager
    @Environment(LocalizationManager.self) var localization
    @Environment(\.dismiss) var dismiss

    @State var profileName = ""
    @State var selectedColorIndex = 0
    @State var isKidsProfile = false
    @State var isCreating = false
    @State var errorMessage: String?

    var body: some View {
        NavigationStack {
            ZStack {
                DesignTokens.Colors.Background.primary
                    .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: DesignTokens.Spacing.xl) {
                        avatarPreview
                        nameField
                        colorPicker
                        kidsToggle
                        errorLabel
                    }
                    .padding(DesignTokens.Spacing.xl)
                }
            }
            .navigationTitle("Add Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") { createProfile() }
                        .foregroundStyle(
                            canCreate
                                ? DesignTokens.Primary.default
                                : DesignTokens.Text.muted
                        )
                        .disabled(!canCreate || isCreating)
                }
            }
        }
        .presentationDetents([.medium])
        .presentationDragIndicator(.visible)
    }

    // MARK: - Avatar Preview

    private var avatarPreview: some View {
        ZStack {
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .fill(addProfileAvatarColors[selectedColorIndex])
                .frame(width: 100, height: 100)

            if profileName.isEmpty {
                Image(systemName: "person.fill")
                    .font(.system(size: 36))
                    .foregroundStyle(.white.opacity(0.6))
            } else {
                Text(initials)
                    .font(.system(size: 36, weight: .bold))
                    .foregroundStyle(.white)
            }
        }
    }

    // MARK: - Name Field

    private var nameField: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            Text(localization.t("profiles.profileName"))
                .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                .foregroundStyle(DesignTokens.Text.secondary)

            TextField(localization.t("profiles.enterName"), text: $profileName)
                .textFieldStyle(.plain)
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(DesignTokens.Spacing.md)
                .background(
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                        .fill(Color.white.opacity(0.08))
                )
                .overlay(
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                        .stroke(Color.white.opacity(0.12), lineWidth: 1)
                )
                .autocorrectionDisabled()
                .textInputAutocapitalization(.words)
        }
    }
}
