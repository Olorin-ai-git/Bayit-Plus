import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Tel Aviv culture content row with panoramic background and horizontal card scroll
struct TelAvivRowView: View {
    @Environment(LocalizationManager.self) private var localization
    let items: [CultureItem]
    let onTap: (CultureItem) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header with panoramic background image
            ZStack(alignment: .bottomLeading) {
                Image("TelAviv")
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(height: 120)
                    .clipped()

                LinearGradient(
                    colors: [.clear, .black.opacity(0.8)],
                    startPoint: .top,
                    endPoint: .bottom
                )

                Text(localization.t("telAviv.title"))
                    .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                    .foregroundColor(DesignTokens.Text.primary)
                    .padding(DesignTokens.Spacing.lg)
            }
            .frame(height: 120)

            // Horizontal card scroll
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: DesignTokens.Spacing.md) {
                    ForEach(items) { item in
                        CultureCardView(
                            item: item,
                            categoryColor: categoryColor(for: item.category)
                        )
                        .frame(width: 200)
                        .onTapGesture {
                            onTap(item)
                        }
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
                .padding(.vertical, DesignTokens.Spacing.md)
            }
        }
    }

    private func categoryColor(for category: String?) -> Color {
        switch category?.lowercased() {
        case "beaches": return .orange
        case "nightlife": return .purple
        case "culture": return .blue
        case "music": return .pink
        default: return DesignTokens.Primary.p400
        }
    }
}
