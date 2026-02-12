import BayitDesignSystem
import SwiftUI

struct GlossaryDetailView: View {
    let entry: GlossaryEntry
    @State private var isExpanded: Bool = false

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            headerRow
            tagRow

            if isExpanded {
                detailsSection
            }
        }
        .padding(DesignTokens.Spacing.md)
        .background(DesignTokens.Colors.surface.opacity(0.8))
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.xl))
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.xl)
                .stroke(DesignTokens.Colors.border.opacity(0.25), lineWidth: 1)
        )
        .onTapGesture { withAnimation(.easeInOut(duration: 0.2)) { isExpanded.toggle() } }
    }

    private var headerRow: some View {
        HStack {
            VStack(alignment: .trailing, spacing: 2) {
                Text(entry.phrase)
                    .font(.headline)
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                    .environment(\.layoutDirection, .rightToLeft)
                Text(entry.transliteration)
                    .font(.caption)
                    .foregroundStyle(DesignTokens.Colors.primaryAccent)
                    .italic()
                Text(entry.translation)
                    .font(.subheadline)
                    .foregroundStyle(DesignTokens.Colors.textSecondary)
            }
            Spacer()
            Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                .foregroundStyle(DesignTokens.Colors.textSecondary)
                .font(.caption)
        }
    }

    private var tagRow: some View {
        Group {
            if !entry.tags.isEmpty {
                HStack(spacing: DesignTokens.Spacing.xs) {
                    ForEach(entry.tags, id: \.self) { tag in
                        Text(tag)
                            .font(.caption2)
                            .foregroundStyle(DesignTokens.Colors.primaryAccent)
                            .padding(.horizontal, DesignTokens.Spacing.sm)
                            .padding(.vertical, 2)
                            .background(DesignTokens.Colors.primaryAccent.opacity(0.15))
                            .clipShape(Capsule())
                    }
                }
            }
        }
    }

    private var detailsSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Divider().background(DesignTokens.Colors.border.opacity(0.3))

            if !entry.origin.isEmpty {
                detailRow(label: "Origin", text: entry.origin)
            }
            if !entry.usageExample.isEmpty {
                detailRow(label: "Example", text: entry.usageExample)
            }
            if !entry.funFact.isEmpty {
                HStack(spacing: DesignTokens.Spacing.xs) {
                    Image(systemName: "sparkles")
                        .foregroundStyle(.yellow)
                        .font(.caption2)
                    Text("Fun Fact")
                        .font(.caption2)
                        .fontWeight(.semibold)
                        .foregroundStyle(DesignTokens.Colors.primaryAccent)
                }
                Text(entry.funFact)
                    .font(.caption)
                    .foregroundStyle(DesignTokens.Colors.textSecondary)
            }
        }
    }

    private func detailRow(label: String, text: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.caption2)
                .fontWeight(.semibold)
                .foregroundStyle(DesignTokens.Colors.primaryAccent)
            Text(text)
                .font(.caption)
                .foregroundStyle(DesignTokens.Colors.textSecondary)
        }
    }
}
