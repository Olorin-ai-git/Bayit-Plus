import BayitDesignSystem
import SwiftUI
import UIKit

/// Vertical chapter list presented as a sheet with active chapter tracking and auto-scroll
struct ChapterListView: View {
    let chapters: [Chapter]
    let activeChapter: Chapter?
    let onChapterSelected: (Chapter) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text("Chapters")
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)
                .padding(.horizontal, DesignTokens.Spacing.lg)
                .padding(.top, DesignTokens.Spacing.lg)

            ScrollViewReader { proxy in
                ScrollView(.vertical, showsIndicators: false) {
                    LazyVStack(spacing: DesignTokens.Spacing.sm) {
                        ForEach(chapters, id: \.stableId) { chapter in
                            chapterRow(chapter)
                                .id(chapter.stableId)
                                .onTapGesture {
                                    let generator = UIImpactFeedbackGenerator(style: .medium)
                                    generator.impactOccurred()
                                    onChapterSelected(chapter)
                                }
                        }
                    }
                    .padding(.horizontal, DesignTokens.Spacing.lg)
                    .padding(.bottom, DesignTokens.Spacing.xl)
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

    private func chapterRow(_ chapter: Chapter) -> some View {
        let isActive = chapter.stableId == activeChapter?.stableId
        let color = chapterCategoryColor(chapter.category)

        return HStack(spacing: DesignTokens.Spacing.md) {
            // Category color bar
            RoundedRectangle(cornerRadius: 2)
                .fill(color)
                .frame(width: 4)
                .frame(maxHeight: .infinity)

            VStack(alignment: .leading, spacing: 2) {
                Text(chapter.title ?? "Chapter")
                    .font(.system(
                        size: DesignTokens.FontSize.md,
                        weight: isActive ? .bold : .regular
                    ))
                    .foregroundColor(
                        isActive ? DesignTokens.Primary.default : DesignTokens.Text.primary
                    )

                if let summary = chapter.summary {
                    Text(summary)
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundColor(DesignTokens.Text.secondary)
                        .lineLimit(2)
                }
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 2) {
                if let startTime = chapter.startTime {
                    Text(formatTime(startTime))
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
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
        .padding(DesignTokens.Spacing.md)
        .background(isActive ? DesignTokens.Glass.bgMedium : Color.clear)
        .cornerRadius(DesignTokens.Radius.md)
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                .stroke(
                    isActive ? DesignTokens.Primary.default.opacity(0.5) : Color.clear,
                    lineWidth: 1
                )
        )
    }

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
