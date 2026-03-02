import BayitDesignSystem
import SwiftUI

/// Horizontal scrollable autocomplete suggestions shown while typing in tvOS search.
/// Appears above content when `autocompleteSuggestions` is non-empty.
struct TVSearchAutocompleteSuggestions: View {
    let suggestions: [String]
    let onSelect: (String) -> Void

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(suggestions, id: \.self) { suggestion in
                    Button { onSelect(suggestion) } label: {
                        HStack(spacing: TVDesignTokens.Spacing.sm) {
                            Image(systemName: "magnifyingglass")
                                .font(.system(size: TVDesignTokens.FontSize.sm))
                                .foregroundStyle(DesignTokens.Text.muted)

                            Text(suggestion)
                                .font(.system(size: TVDesignTokens.FontSize.md, weight: .medium))
                                .foregroundStyle(DesignTokens.Text.primary)
                                .lineLimit(1)
                        }
                        .padding(.horizontal, TVDesignTokens.Spacing.base)
                        .padding(.vertical, TVDesignTokens.Spacing.sm)
                        .background(DesignTokens.Glass.bg)
                        .clipShape(Capsule())
                    }
                    .tvCardStyle()
                }
            }
            .padding(.vertical, TVDesignTokens.Spacing.sm)
        }
        .focusSection()
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
    }
}
