import SwiftUI

/// Glass-styled navigation bar component
public struct GlassNavigationBar<LeadingContent: View, TrailingContent: View>: View {
    let title: String
    let leading: () -> LeadingContent
    let trailing: () -> TrailingContent

    public init(
        title: String,
        @ViewBuilder leading: @escaping () -> LeadingContent = { EmptyView() },
        @ViewBuilder trailing: @escaping () -> TrailingContent = { EmptyView() }
    ) {
        self.title = title
        self.leading = leading
        self.trailing = trailing
    }

    public var body: some View {
        HStack {
            leading()
                .frame(width: 44, alignment: .leading)

            Spacer()

            Text(title)
                .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)

            Spacer()

            trailing()
                .frame(width: 44, alignment: .trailing)
        }
        .padding(.horizontal, DesignTokens.Spacing.base)
        .padding(.vertical, DesignTokens.Spacing.md)
        .background {
            ZStack {
                Color.black.opacity(0.8)
                VisualEffectBlur()
            }
            .ignoresSafeArea(edges: .top)
        }
    }
}
