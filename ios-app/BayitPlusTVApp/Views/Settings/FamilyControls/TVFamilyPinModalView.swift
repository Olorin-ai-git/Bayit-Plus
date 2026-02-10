import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS PIN entry modal using four focusable digit columns.
///
/// iOS uses a hidden SecureField with number pad keyboard, which doesn't
/// work on tvOS. Instead, each digit is a focusable column that cycles
/// 0-9 via Siri Remote swipe up/down gestures. Left/right moves focus
/// between columns.
struct TVFamilyPinModalView: View {
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

    @State private var digits: [Int] = [0, 0, 0, 0]
    @FocusState private var focusedDigit: Int?

    private var pinString: String {
        digits.map(String.init).joined()
    }

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            headerSection
            digitColumns
            if let error {
                errorLabel(error)
            }
            actionButtons
        }
        .padding(TVDesignTokens.Spacing.xxl)
        .focusSection()
        .onAppear {
            focusedDigit = 0
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            Image(systemName: mode == .create ? "lock.shield" : "lock.fill")
                .font(.system(size: TVDesignTokens.FontSize.xxxl))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(
                mode == .create
                    ? localization.t("familyControls.createPin")
                    : localization.t("familyControls.enterPin")
            )
            .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
            .foregroundStyle(DesignTokens.Text.primary)
            .multilineTextAlignment(.center)

            Text(
                mode == .create
                    ? localization.t("familyControls.createPinDescription")
                    : localization.t("familyControls.enterPinDescription")
            )
            .font(.system(size: TVDesignTokens.FontSize.base))
            .foregroundStyle(DesignTokens.Text.secondary)
            .multilineTextAlignment(.center)
        }
    }

    // MARK: - Digit Columns

    private var digitColumns: some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            ForEach(0..<4, id: \.self) { index in
                digitColumn(at: index)
            }
        }
    }

    private func digitColumn(at index: Int) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.sm) {
            Button {
                digits[index] = (digits[index] + 1) % 10
            } label: {
                Image(systemName: "chevron.up")
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                    .foregroundStyle(DesignTokens.Primary.p400)
                    .frame(width: 64, height: 36)
            }
            .buttonStyle(.plain)
            .tvFocusStyle()

            Text(String(digits[index]))
                .font(.system(
                    size: TVDesignTokens.FontSize.xxxl,
                    weight: .bold,
                    design: .monospaced
                ))
                .foregroundStyle(DesignTokens.Text.primary)
                .frame(width: 64, height: 72)
                .background(DesignTokens.Glass.bgMedium)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
                .overlay(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                        .stroke(
                            focusedDigit == index
                                ? DesignTokens.Glass.borderFocus
                                : DesignTokens.Glass.borderLight,
                            lineWidth: focusedDigit == index ? 2 : 1
                        )
                )

            Button {
                digits[index] = (digits[index] + 9) % 10
            } label: {
                Image(systemName: "chevron.down")
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                    .foregroundStyle(DesignTokens.Primary.p400)
                    .frame(width: 64, height: 36)
            }
            .buttonStyle(.plain)
            .tvFocusStyle()
            .focused($focusedDigit, equals: index)

            Circle()
                .fill(DesignTokens.Primary.p400)
                .frame(width: 10, height: 10)
        }
    }

    // MARK: - Error

    private func errorLabel(_ message: String) -> some View {
        Text(message)
            .font(.system(size: TVDesignTokens.FontSize.base))
            .foregroundStyle(DesignTokens.ErrorColor.default)
            .multilineTextAlignment(.center)
    }

    // MARK: - Actions

    private var actionButtons: some View {
        HStack(spacing: TVDesignTokens.Spacing.xl) {
            GlassButton(
                localization.t("common.cancel"),
                variant: .ghost,
                size: .large
            ) {
                onCancel()
            }

            GlassButton(
                localization.t("common.confirm"),
                variant: .primary,
                size: .large,
                isLoading: isProcessing
            ) {
                onSubmit(pinString)
            }
        }
    }
}
