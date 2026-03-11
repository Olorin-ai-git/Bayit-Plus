import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Toast overlay showing credit deduction feedback after AI feature usage.
/// Auto-dismisses after a configurable duration.
struct CreditToastView: View {
    let remainingCredits: Int
    let isLow: Bool

    @Environment(LocalizationManager.self) private var localization
    @State private var isVisible = true

    private static let autoDismissSeconds: Double = 3

    var body: some View {
        if isVisible {
            VStack {
                GlassAlert(
                    type: isLow ? .warning : .info,
                    title: localization.t("plus.toast.creditUsed"),
                    message: localization.t(
                        "plus.toast.remaining",
                        ["count": "\(remainingCredits)"]
                    )
                )
                .padding(.horizontal, DesignTokens.Spacing.lg)
                .padding(.top, DesignTokens.Spacing.md)

                Spacer()
            }
            .transition(.move(edge: .top).combined(with: .opacity))
            .onAppear {
                DispatchQueue.main.asyncAfter(
                    deadline: .now() + Self.autoDismissSeconds
                ) {
                    withAnimation(.easeOut(duration: 0.3)) {
                        isVisible = false
                    }
                }
            }
        }
    }
}
