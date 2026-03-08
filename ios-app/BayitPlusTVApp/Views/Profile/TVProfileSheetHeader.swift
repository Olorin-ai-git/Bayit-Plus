import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Reusable header bar for tvOS fullscreen sheets.
/// Replaces NavigationStack + toolbar pattern which renders
/// broken pill controls on tvOS fullScreenCover.
struct TVProfileSheetHeader: View {
    let title: String
    let onDismiss: () -> Void
    var trailing: AnyView?

    init(
        title: String,
        onDismiss: @escaping () -> Void
    ) {
        self.title = title
        self.onDismiss = onDismiss
        trailing = nil
    }

    init(
        title: String,
        onDismiss: @escaping () -> Void,
        @ViewBuilder trailing: () -> some View
    ) {
        self.title = title
        self.onDismiss = onDismiss
        self.trailing = AnyView(trailing())
    }

    var body: some View {
        HStack(alignment: .center) {
            Button(action: onDismiss) {
                Image(systemName: "xmark")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .frame(width: 50, height: 50)
                    .background(DesignTokens.Glass.bgMedium)
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)

            Spacer()

            Text(title)
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Spacer()

            if let trailing {
                trailing
            } else {
                Color.clear
                    .frame(width: 50, height: 50)
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
        .padding(.top, TVDesignTokens.Spacing.xl)
        .padding(.bottom, TVDesignTokens.Spacing.md)
    }
}
