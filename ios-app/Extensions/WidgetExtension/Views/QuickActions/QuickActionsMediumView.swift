import SwiftUI
import WidgetKit
import BayitDesignSystem
import BayitWidgetShared

/// Medium (5-button row) Quick Actions widget: Live TV, Radio, Podcasts, Audiobooks, Search.
struct QuickActionsMediumView: View {

    private let actions: [(icon: String, label: String, url: URL)] = [
        ("tv", "Live TV", WidgetDeepLinks.liveTV),
        ("radio", "Radio", WidgetDeepLinks.radio),
        ("headphones", "Podcasts", WidgetDeepLinks.podcasts),
        ("book.fill", "Books", WidgetDeepLinks.audiobooks),
        ("magnifyingglass", "Search", WidgetDeepLinks.search),
    ]

    var body: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            ForEach(Array(actions.enumerated()), id: \.offset) { _, action in
                actionButton(icon: action.icon, label: action.label, url: action.url)
            }
        }
        .padding(DesignTokens.Spacing.md)
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
                    .font(.system(size: DesignTokens.FontSize.xxl, weight: .medium))
                    .foregroundStyle(DesignTokens.Primary.p400)
                    .frame(height: DesignTokens.Spacing.xxl)

                Text(label)
                    .font(.system(size: DesignTokens.FontSize.xs, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .fill(DesignTokens.Glass.bg)
                    .overlay(
                        RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                            .stroke(DesignTokens.Glass.borderLight, lineWidth: 1)
                    )
            )
        }
    }
}

#Preview(as: .systemMedium) {
    QuickActionsWidget()
} timeline: {
    QuickActionsEntry(date: .now)
}
