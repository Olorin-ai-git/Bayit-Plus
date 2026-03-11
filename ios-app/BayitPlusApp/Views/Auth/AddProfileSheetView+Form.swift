import BayitAuth
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Extension on AddProfileSheetView providing color picker, kids toggle,
/// error label, and create action.
extension AddProfileSheetView {
    // MARK: - Color Picker

    var colorPicker: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text(localization.t("profiles.avatarColor"))
                .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                .foregroundStyle(DesignTokens.Text.secondary)

            HStack(spacing: DesignTokens.Spacing.md) {
                ForEach(addProfileAvatarColors.indices, id: \.self) { index in
                    Button {
                        selectedColorIndex = index
                    } label: {
                        Circle()
                            .fill(addProfileAvatarColors[index])
                            .frame(width: 40, height: 40)
                            .overlay(
                                Circle()
                                    .stroke(
                                        Color.white,
                                        lineWidth: selectedColorIndex == index ? 3 : 0
                                    )
                            )
                            .scaleEffect(selectedColorIndex == index ? 1.15 : 1.0)
                            .animation(
                                .spring(response: 0.3, dampingFraction: 0.7),
                                value: selectedColorIndex
                            )
                    }
                }
            }
        }
    }

    // MARK: - Kids Toggle

    var kidsToggle: some View {
        HStack {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                Text(localization.t("profiles.kidsProfile"))
                    .font(.system(size: DesignTokens.FontSize.md, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(localization.t("profiles.kidsProfileDescription"))
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
            }

            Spacer()

            Toggle("", isOn: $isKidsProfile)
                .labelsHidden()
                .tint(DesignTokens.Primary.default)
        }
        .padding(DesignTokens.Spacing.md)
        .background(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                .fill(Color.white.opacity(0.05))
        )
    }

    // MARK: - Error Label

    @ViewBuilder
    var errorLabel: some View {
        if let errorMessage {
            Text(errorMessage)
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.ErrorColor.default)
                .multilineTextAlignment(.center)
        }
    }

    // MARK: - Helpers

    var canCreate: Bool {
        !profileName.trimmingCharacters(in: .whitespaces).isEmpty
    }

    var initials: String {
        profileName
            .split(separator: " ")
            .prefix(2)
            .compactMap { $0.first.map(String.init) }
            .joined()
            .uppercased()
    }

    func createProfile() {
        guard canCreate else { return }

        isCreating = true
        errorMessage = nil

        Task {
            do {
                try await authManager.createProfile(
                    name: profileName.trimmingCharacters(in: .whitespaces),
                    avatarColor: addProfileAvatarColorHexStrings[selectedColorIndex],
                    isKidsProfile: isKidsProfile
                )
                dismiss()
            } catch let authError as AuthError {
                errorMessage = authError.userFacingMessage
            } catch {
                errorMessage = error.localizedDescription
            }
            isCreating = false
        }
    }
}

// MARK: - Color Data

let addProfileAvatarColors: [Color] = [
    DesignTokens.Primary.p500,
    DesignTokens.ErrorColor.e400,
    DesignTokens.Success.s400,
    DesignTokens.Warning.w400,
    DesignTokens.Secondary.s500,
    Color(hex: 0x00D9FF),
]

/// Hex strings matching `addProfileAvatarColors` for the backend API.
let addProfileAvatarColorHexStrings: [String] = [
    "#A855F7",
    "#F87171",
    "#4ADE80",
    "#FBBF24",
    "#D946EF",
    "#00D9FF",
]
