import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Avatar picker for tvOS - allows selecting from predefined avatars or colors.
struct TVAvatarPickerView: View {
    @Environment(LocalizationManager.self) private var localization

    let currentAvatar: String?
    let viewModel: ProfileViewModel
    let onDismiss: () -> Void

    @State private var selectedAvatarType: AvatarType = .gradient
    @State private var selectedGradient: GradientOption?
    @State private var isSaving = false

    private let gradientOptions: [GradientOption] = [
        .init(id: "purple-pink", colors: [.purple, .pink]),
        .init(id: "blue-cyan", colors: [.blue, .cyan]),
        .init(id: "green-teal", colors: [.green, .teal]),
        .init(id: "orange-red", colors: [.orange, .red]),
        .init(id: "indigo-purple", colors: [.indigo, .purple]),
        .init(id: "yellow-orange", colors: [.yellow, .orange]),
    ]

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.xxxl) {
            // Header
            Text(localization.t("avatar.choose"))
                .font(.system(size: TVDesignTokens.FontSize.display, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            // Type selector
            Picker(localization.t("avatar.type"), selection: $selectedAvatarType) {
                Text(localization.t("avatar.gradient")).tag(AvatarType.gradient)
                Text(localization.t("avatar.photo")).tag(AvatarType.photo)
            }
            .pickerStyle(.segmented)
            .frame(maxWidth: 500)

            // Content based on type
            if selectedAvatarType == .gradient {
                gradientPicker
            } else {
                photoPlaceholder
            }

            // Actions
            HStack(spacing: TVDesignTokens.Spacing.xl) {
                Button {
                    onDismiss()
                } label: {
                    Text(localization.t("common.cancel"))
                        .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .frame(width: 220, height: 70)
                        .background(DesignTokens.Glass.bgLight)
                        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
                }
                .tvCardStyle()

                Button {
                    Task { await save() }
                } label: {
                    Group {
                        if isSaving {
                            ProgressView().tint(.white)
                        } else {
                            Text(localization.t("avatar.save"))
                                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                                .foregroundStyle(.white)
                        }
                    }
                    .frame(width: 220, height: 70)
                    .background(
                        LinearGradient(
                            colors: [DesignTokens.Primary.p400, DesignTokens.Secondary.s400],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
                }
                .tvCardStyle()
                .disabled(isSaving)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var gradientPicker: some View {
        LazyVGrid(
            columns: [
                GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
                GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
                GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
            ],
            spacing: TVDesignTokens.Spacing.focusGap
        ) {
            ForEach(gradientOptions) { option in
                gradientOption(option)
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxxxl)
    }

    private func gradientOption(_ option: GradientOption) -> some View {
        TVGradientOptionButton(
            option: option,
            isSelected: selectedGradient?.id == option.id
        ) {
            selectedGradient = option
        }
    }

    private var photoPlaceholder: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: "photo.on.rectangle")
                .font(.system(size: 72))
                .foregroundStyle(DesignTokens.Text.muted)

            Text(localization.t("avatar.photoUploadSoon"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)

            Text(localization.t("avatar.useIosOrWeb"))
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 500)
        }
    }

    private func save() async {
        guard let selected = selectedGradient else { return }

        isSaving = true
        // Save avatar ID to profile
        await viewModel.updateProfile(
            displayName: nil,
            avatar: selected.id,
            language: nil
        )
        isSaving = false

        if viewModel.error == nil {
            onDismiss()
        }
    }
}

private struct TVGradientOptionButton: View {
    let option: GradientOption
    let isSelected: Bool
    let onSelect: () -> Void

    var body: some View {
        Button { onSelect() } label: {
            Circle()
                .fill(
                    LinearGradient(
                        colors: option.colors,
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: 180, height: 180)
                .overlay(
                    Circle().strokeBorder(
                        isSelected
                            ? DesignTokens.Glass.borderFocus
                            : Color.clear,
                        lineWidth: TVDesignTokens.Focus.ringWidth
                    )
                )
        }
        .tvCardStyle()
    }
}

private enum AvatarType {
    case gradient
    case photo
}

private struct GradientOption: Identifiable {
    let id: String
    let colors: [Color]
}
