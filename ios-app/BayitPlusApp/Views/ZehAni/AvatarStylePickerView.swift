import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct AvatarStylePickerView: View {
    @Environment(RepositoryProvider.self) var repos
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
        NavigationStack {
            ZStack {
                DesignTokens.Background.primary.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: DesignTokens.Spacing.xl) {
                        stylePicker
                        nameField
                        pinField

                        if let error {
                            Text(error)
                                .foregroundStyle(DesignTokens.ErrorColor.default)
                                .font(.system(size: DesignTokens.FontSize.sm))
                        }

                        GlassButton(
                            localization.t("zehAni.avatarCreation.create"),
                            variant: .primary
                        ) { createAvatar() }
                            .disabled(childName.isEmpty || pin.count < 4 || isCreating)

                        if isCreating {
                            ProgressView().tint(.white)
                        }
                    }
                    .padding(DesignTokens.Spacing.lg)
                }
            }
            .navigationTitle(localization.t("zehAni.avatarCreation.newAvatar"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(localization.t("common.cancel")) { dismiss() }
                }
            }
        }
    }

    private var stylePicker: some View {
        LazyVGrid(
            columns: [GridItem(.adaptive(minimum: 140), spacing: DesignTokens.Spacing.md)],
            spacing: DesignTokens.Spacing.md
        ) {
            ForEach(AvatarStyle.allCases, id: \.rawValue) { style in
                Button {
                    selectedStyle = style
                } label: {
                    GlassCard {
                        VStack(spacing: DesignTokens.Spacing.sm) {
                            Image(systemName: styleIcon(style))
                                .font(.system(size: 32))
                                .foregroundStyle(
                                    selectedStyle == style
                                        ? DesignTokens.Primary.p400
                                        : DesignTokens.Text.muted
                                )

                            Text(style.displayName)
                                .font(.system(
                                    size: DesignTokens.FontSize.sm,
                                    weight: selectedStyle == style ? .bold : .regular
                                ))
                                .foregroundStyle(DesignTokens.Text.primary)
                        }
                    }
                }
                .buttonStyle(.plain)
            }
        }
    }

    private var nameField: some View {
        TextField(
            localization.t("zehAni.avatarCreation.childName"),
            text: $childName
        )
        .textFieldStyle(.roundedBorder)
        .font(.system(size: DesignTokens.FontSize.md))
    }

    private var pinField: some View {
        SecureField(
            localization.t("zehAni.avatarCreation.familyPin"),
            text: $pin
        )
        .textFieldStyle(.roundedBorder)
        .font(.system(size: DesignTokens.FontSize.md))
        .keyboardType(.numberPad)
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
