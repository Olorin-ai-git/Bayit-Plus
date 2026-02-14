import SwiftUI
import WidgetKit
import BayitDesignSystem
import BayitWidgetShared

/// Small (2x2 grid) Quick Actions widget: Live TV, Radio, Podcasts, Search.
struct QuickActionsSmallView: View {

    private let actions: [(icon: String, label: String, url: URL)] = [
        ("tv", "Live TV", WidgetDeepLinks.liveTV),
        ("radio", "Radio", WidgetDeepLinks.radio),
        ("headphones", "Podcasts", WidgetDeepLinks.podcasts),
        ("magnifyingglass", "Search", WidgetDeepLinks.search),
    ]

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            ForEach(0..<2, id: \.self) { row in
                HStack(spacing: DesignTokens.Spacing.sm) {
                    ForEach(0..<2, id: \.self) { col in
                        let index = row * 2 + col
                        let action = actions[index]
                        actionButton(icon: action.icon, label: action.label, url: action.url)
                    }
                }
            }
        }
        .padding(DesignTokens.Spacing.sm)
        .containerBackground(for: .widget) {
            LinearGradient(
                colors: [DesignTokens.Background.primary, DesignTokens.Background.elevated],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
    }

    private func actionButton(icon: String, label: String, url: URL) -> some View {
        Link(destination: url) {
            VStack(spacing: DesignTokens.Spacing.xs) {
                Image(systemName: icon)
                    .font(.system(size: DesignTokens.FontSize.xl, weight: .medium))
                    .foregroundStyle(DesignTokens.Primary.p400)

                Text(label)
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .frame(minWidth: 44, minHeight: 44)
            .background(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .fill(DesignTokens.Glass.bg)
                    .overlay(
                        RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                            .stroke(DesignTokens.Glass.borderLight, lineWidth: 1)
                    )
            )
        }
        .accessibilityLabel("Open \(label)")
        .accessibilityHint("Opens the \(label) section")
    }
}

#Preview(as: .systemSmall) {
    QuickActionsWidget()
} timeline: {
    QuickActionsEntry(date: .now)
}
