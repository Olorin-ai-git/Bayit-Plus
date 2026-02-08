import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Modal view for entering a 4-digit parental control PIN.
///
/// Supports two modes: creating a new PIN and verifying an existing one.
/// Uses `SecureField` with a focused state for immediate keyboard presentation.
struct FamilyPinModalView: View {
    @Environment(LocalizationManager.self) private var localization

    enum Mode {
        case create
        case verify
    }

    let mode: Mode
    let isProcessing: Bool
    let error: String?
    let onSubmit: (String) -> Void
    let onCancel: () -> Void

    @State private var pin = ""
    @FocusState private var isPinFocused: Bool

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.xl) {
            Image(systemName: mode == .create ? "lock.shield" : "lock.fill")
                .font(.system(size: DesignTokens.FontSize.display))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(
                mode == .create
                    ? localization.t("familyControls.createPin")
                    : localization.t("familyControls.enterPin")
            )
            .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
            .foregroundStyle(DesignTokens.Text.primary)
            .multilineTextAlignment(.center)

            Text(
                mode == .create
                    ? localization.t("familyControls.createPinDescription")
                    : localization.t("familyControls.enterPinDescription")
            )
            .font(.system(size: DesignTokens.FontSize.sm))
            .foregroundStyle(DesignTokens.Text.secondary)
            .multilineTextAlignment(.center)

            pinInput

            if let error {
                Text(error)
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.ErrorColor.default)
            }

            HStack(spacing: DesignTokens.Spacing.md) {
                GlassButton(
                    localization.t("common.cancel"),
                    variant: .ghost,
                    size: .medium
                ) {
                    onCancel()
                }

                GlassButton(
                    localization.t("common.confirm"),
                    variant: .primary,
                    size: .medium,
                    isDisabled: pin.count < 4,
                    isLoading: isProcessing
                ) {
                    onSubmit(pin)
                }
            }
        }
        .padding(DesignTokens.Spacing.xl)
        .onAppear {
            isPinFocused = true
        }
    }

    private var pinInput: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            ForEach(0..<4, id: \.self) { index in
                ZStack {
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                        .fill(DesignTokens.Glass.bgMedium)
                        .frame(width: 48, height: 56)
                        .overlay(
                            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                                .stroke(
                                    index < pin.count
                                        ? DesignTokens.Glass.borderFocus
                                        : DesignTokens.Glass.borderLight,
                                    lineWidth: index < pin.count ? 2 : 1
                                )
                        )

                    if index < pin.count {
                        Circle()
                            .fill(DesignTokens.Primary.p400)
                            .frame(width: 14, height: 14)
                    }
                }
            }
        }
        .overlay {
            SecureField("", text: $pin)
                .focused($isPinFocused)
                .keyboardType(.numberPad)
                .textContentType(.oneTimeCode)
                .foregroundStyle(.clear)
                .tint(.clear)
                .onChange(of: pin) { _, newValue in
                    if newValue.count > 4 {
                        pin = String(newValue.prefix(4))
                    }
                    let filtered = newValue.filter(\.isNumber)
                    if filtered != newValue {
                        pin = filtered
                    }
                }
        }
    }
}
