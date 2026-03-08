#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    struct TVAvatarStylePickerView: View {
        @Environment(TVRepositoryProvider.self) var repos
        @Environment(LocalizationManager.self) var localization
        @Environment(\.dismiss) private var dismiss

        let profileId: String
        let onCreated: () -> Void

        @State private var selectedStyle: AvatarStyle = .cartoon2d
        @State private var childName = ""
        @State private var pin = ""
        @State private var isCreating = false
        @State private var error: String?

        var body: some View {
            ZStack {
                DesignTokens.Background.primary.ignoresSafeArea()

                VStack(spacing: TVDesignTokens.Spacing.xl) {
                    Text(localization.t("zehAni.avatarCreation.newAvatar"))
                        .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    stylePicker

                    nameField

                    pinField

                    if let error {
                        Text(error)
                            .foregroundStyle(DesignTokens.ErrorColor.default)
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                    }

                    HStack(spacing: TVDesignTokens.Spacing.lg) {
                        Button(localization.t("common.cancel")) { dismiss() }
                            .tvCardStyle()

                        Button(localization.t("zehAni.avatarCreation.create")) {
                            createAvatar()
                        }
                        .tvCardStyle()
                        .disabled(childName.isEmpty || pin.count < 4 || isCreating)
                    }

                    if isCreating {
                        ProgressView().tint(.white)
                    }
                }
                .padding(TVDesignTokens.Spacing.xxl)
            }
        }

        private var stylePicker: some View {
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                ForEach(AvatarStyle.allCases, id: \.rawValue) { style in
                    Button {
                        selectedStyle = style
                    } label: {
                        VStack(spacing: TVDesignTokens.Spacing.sm) {
                            Image(systemName: styleIcon(style))
                                .font(.system(size: 36))
                                .foregroundStyle(
                                    selectedStyle == style
                                        ? DesignTokens.Primary.p400
                                        : DesignTokens.Text.muted
                                )

                            Text(style.displayName)
                                .font(.system(
                                    size: TVDesignTokens.FontSize.base,
                                    weight: selectedStyle == style ? .bold : .regular
                                ))
                                .foregroundStyle(DesignTokens.Text.primary)
                        }
                        .padding(TVDesignTokens.Spacing.md)
                    }
                    .tvCardStyle()
                }
            }
        }

        private var nameField: some View {
            TextField(
                localization.t("zehAni.avatarCreation.childName"),
                text: $childName
            )
            .textFieldStyle(.plain)
            .font(.system(size: TVDesignTokens.FontSize.lg))
            .foregroundStyle(DesignTokens.Text.primary)
            .padding(TVDesignTokens.Spacing.md)
            .background(DesignTokens.Glass.bgMedium.opacity(0.3))
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
            .frame(maxWidth: 500)
        }

        private var pinField: some View {
            SecureField(
                localization.t("zehAni.avatarCreation.familyPin"),
                text: $pin
            )
            .textFieldStyle(.plain)
            .font(.system(size: TVDesignTokens.FontSize.lg))
            .foregroundStyle(DesignTokens.Text.primary)
            .padding(TVDesignTokens.Spacing.md)
            .background(DesignTokens.Glass.bgMedium.opacity(0.3))
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
            .frame(maxWidth: 500)
        }

        private func styleIcon(_ style: AvatarStyle) -> String {
            switch style {
            case .cartoon2d: return "paintbrush.pointed"
            case .pixar3d: return "cube"
            case .disney3d: return "sparkles"
            case .anime3d: return "star"
            }
        }

        private func createAvatar() {
            isCreating = true
            error = nil
            Task {
                do {
                    _ = try await repos.starStory.createAvatar(
                        profileId: profileId,
                        name: childName,
                        style: selectedStyle.rawValue,
                        pin: pin
                    )
                    await MainActor.run {
                        onCreated()
                        dismiss()
                    }
                } catch {
                    await MainActor.run {
                        self.error = error.localizedDescription
                        isCreating = false
                    }
                }
            }
        }
    }
#endif
