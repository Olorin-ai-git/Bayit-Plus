import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Jerusalem culture content row with panoramic background and horizontal card scroll
struct JerusalemRowView: View {
    @Environment(LocalizationManager.self) private var localization
    let items: [CultureItem]
    let onTap: (CultureItem) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header with panoramic background image
            ZStack(alignment: .bottomLeading) {
                Image("Jerusalem")
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(height: 120)
                    .clipped()

                LinearGradient(
                    colors: [.clear, .black.opacity(0.8)],
                    startPoint: .top,
                    endPoint: .bottom
                )

                Text(localization.t("jerusalem.title"))
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
        case "kotel": return .blue
        case "idf": return .orange
        case "diaspora": return .green
        default: return DesignTokens.Primary.p400
        }
    }
}
