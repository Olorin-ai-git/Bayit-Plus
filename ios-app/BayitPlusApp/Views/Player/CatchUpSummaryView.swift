#if os(iOS)
import BayitDesignSystem
import SwiftUI

/// AI-generated summary card of missed live content.
struct CatchUpSummaryView: View {
    let summary: String

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: "sparkles")
                    .foregroundStyle(DesignTokens.Primary.p300)
                Text("AI Summary")
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundStyle(DesignTokens.Primary.p300)
            }

            Text(summary)
                .font(.system(size: DesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.primary)
                .lineSpacing(4)
        }
        .padding(DesignTokens.Spacing.base)
        .background(DesignTokens.Glass.purpleLight)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
    }
}
#endif
