import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Vertical chapter list for tvOS with focus-based navigation and active chapter auto-scroll.
/// Adapted from iOS ChapterListView: replaces tap gestures with focusable Button wrappers,
/// uses TVDesignTokens for 10-foot spacing/typography, and removes haptic feedback.
struct TVChapterListView: View {
    @Environment(LocalizationManager.self) private var localization
    let chapters: [Chapter]
    let activeChapter: Chapter?
    let onChapterSelected: (Chapter) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("chapters.title"))
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)
                .padding(.horizontal, TVDesignTokens.Spacing.lg)
                .padding(.top, TVDesignTokens.Spacing.lg)

            ScrollViewReader { proxy in
                ScrollView(.vertical, showsIndicators: false) {
                    LazyVStack(spacing: TVDesignTokens.Spacing.sm) {
                        ForEach(chapters, id: \.stableId) { chapter in
                            Button {
                                onChapterSelected(chapter)
                            } label: {
                                chapterRow(chapter)
                            }
                            .buttonStyle(TVChapterButtonStyle())
                            .id(chapter.stableId)
                        }
                    }
                    .padding(.horizontal, TVDesignTokens.Spacing.lg)
                    .padding(.bottom, TVDesignTokens.Spacing.xl)
                }
                .onChange(of: activeChapter?.stableId) { _, activeId in
                    if let activeId {
                        withAnimation(.easeInOut) {
                            proxy.scrollTo(activeId, anchor: .center)
                        }
                    }
                }
            }
        }
        .background(DesignTokens.Background.primary)
    }

    // MARK: - Chapter Row

    private func chapterRow(_ chapter: Chapter) -> some View {
        let isActive = chapter.stableId == activeChapter?.stableId
        let color = chapterCategoryColor(chapter.category)

        return HStack(spacing: TVDesignTokens.Spacing.md) {
            RoundedRectangle(cornerRadius: 4)
                .fill(color)
                .frame(width: 8)
                .frame(maxHeight: .infinity)

            VStack(alignment: .leading, spacing: 4) {
                Text(chapter.title ?? "Chapter")
                    .font(.system(
                        size: TVDesignTokens.FontSize.md,
                        weight: isActive ? .bold : .regular
                    ))
                    .foregroundColor(
                        isActive ? DesignTokens.Primary.default : DesignTokens.Text.primary
                    )

                if let summary = chapter.summary {
                    Text(summary)
                        .font(.system(size: TVDesignTokens.FontSize.xs))
                        .foregroundColor(DesignTokens.Text.secondary)
                        .lineLimit(2)
                }
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                if let startTime = chapter.startTime {
                    Text(formatTime(startTime))
                        .font(.system(size: TVDesignTokens.FontSize.sm, weight: .medium))
                        .foregroundColor(DesignTokens.Text.muted)
                }

                if let category = chapter.category {
                    GlassBadge(
                        text: category.rawValue.capitalized,
                        variant: badgeVariant(for: category)
                    )
                }
            }
        }
        .padding(TVDesignTokens.Spacing.md)
        .background(isActive ? DesignTokens.Glass.bgMedium : Color.clear)
        .cornerRadius(TVDesignTokens.Radius.md)
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                .stroke(
                    isActive ? DesignTokens.Primary.default.opacity(0.5) : Color.clear,
                    lineWidth: 1
                )
        )
    }

    // MARK: - Helpers

    private func formatTime(_ seconds: Double) -> String {
        let totalSeconds = Int(seconds)
        let hours = totalSeconds / 3600
        let minutes = (totalSeconds % 3600) / 60
        let secs = totalSeconds % 60

        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, secs)
        }
        return String(format: "%d:%02d", minutes, secs)
    }

    private func badgeVariant(for category: ChapterCategory) -> GlassBadge.Variant {
        switch category {
        case .news, .action, .climax: return .warning
        case .security: return .warning
        case .sports: return .primary
        case .interview, .intro: return .info
        case .music: return .success
        case .weather, .economy: return .info
        }
    }

    private func chapterCategoryColor(_ category: ChapterCategory?) -> Color {
        guard let category else { return DesignTokens.Glass.bg }
        switch category {
        case .intro: return .purple
        case .news: return .red
        case .action: return .red
        case .climax: return .red
        case .security: return .orange
        case .economy: return .green
        case .sports: return .yellow
        case .interview: return .blue
        case .music: return .pink
        case .weather: return .cyan
        }
    }
}

// MARK: - tvOS Focus Button Style

/// Custom button style for chapter rows. Delegates to TVChapterButtonContent
/// (a View) so @Environment(\.isFocused) resolves correctly on tvOS.
private struct TVChapterButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        TVChapterButtonContent(
            configuration: configuration,
            isPressed: configuration.isPressed
        )
    }
}

private struct TVChapterButtonContent: View {
    let configuration: ButtonStyleConfiguration
    let isPressed: Bool
    @Environment(\.isFocused) private var isFocused

    var body: some View {
        configuration.label
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                    .stroke(
                        isFocused ? DesignTokens.Glass.borderFocus : Color.clear,
                        lineWidth: TVDesignTokens.Focus.ringWidth
                    )
            )
            .scaleEffect(isFocused ? TVDesignTokens.Focus.scaleAmount : 1.0)
            .scaleEffect(isPressed ? 0.97 : 1.0)
            .shadow(
                color: isFocused
                    ? DesignTokens.Primary.default.opacity(0.3)
                    : .clear,
                radius: isFocused ? TVDesignTokens.Focus.shadowRadius : 0
            )
            .animation(
                .spring(duration: TVDesignTokens.Focus.animationDuration, bounce: 0.2),
                value: isFocused
            )
            .animation(.easeInOut(duration: 0.1), value: isPressed)
    }
}
