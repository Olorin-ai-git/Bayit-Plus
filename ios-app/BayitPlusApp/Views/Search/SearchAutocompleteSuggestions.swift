import BayitDesignSystem
import SwiftUI

/// Autocomplete suggestions overlay for SearchView.
/// Extracted from SearchView.swift to keep it under 200 lines.
struct SearchAutocompleteSuggestions: View {
    let suggestions: [String]
    let onSelect: (String) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(suggestions, id: \.self) { suggestion in
                Button { onSelect(suggestion) } label: {
                    HStack(spacing: DesignTokens.Spacing.md) {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: DesignTokens.FontSize.sm))
                            .foregroundColor(DesignTokens.Text.muted)
                        Text(suggestion)
                            .font(.system(size: DesignTokens.FontSize.md))
                            .foregroundColor(DesignTokens.Text.primary).lineLimit(1)
                        Spacer()
                        Image(systemName: "arrow.up.left")
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundColor(DesignTokens.Text.muted)
                    }
                    .padding(.horizontal, DesignTokens.Spacing.lg)
                    .padding(.vertical, DesignTokens.Spacing.md)
                }
                .buttonStyle(.plain)
            }
        }
        .background(DesignTokens.Glass.bg)
    }
}
