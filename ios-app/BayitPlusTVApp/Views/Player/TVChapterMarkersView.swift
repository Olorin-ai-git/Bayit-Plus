import BayitDesignSystem
import SwiftUI

/// Overlay markers on a seek bar showing chapter start positions with category-colored vertical lines.
/// Adapted from iOS ChapterMarkersView with increased marker dimensions for 10-foot viewing distance.
struct TVChapterMarkersView: View {
    let chapters: [Chapter]
    let activeChapter: Chapter?
    let totalDuration: Double

    var body: some View {
        GeometryReader { geometry in
            let width = geometry.size.width

            ForEach(chapters, id: \.stableId) { chapter in
                if let startTime = chapter.startTime, totalDuration > 0 {
                    let xPosition = (startTime / totalDuration) * width
                    let isActive = chapter.stableId == activeChapter?.stableId
                    let color = chapterCategoryColor(chapter.category)

                    Rectangle()
                        .fill(color)
                        .frame(width: 4, height: isActive ? 24 : 16)
                        .position(
                            x: min(max(xPosition, 2), width - 2),
                            y: geometry.size.height / 2
                        )
                        .opacity(isActive ? 1.0 : 0.7)
                }
            }
        }
        .frame(height: 24)
    }

    // MARK: - Category Color

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
