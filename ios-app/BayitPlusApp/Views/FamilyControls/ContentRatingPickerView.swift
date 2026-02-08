import BayitDesignSystem
import BayitLocalization
import SwiftUI
import UIKit

/// Multi-option list for selecting a maximum content rating.
///
/// Displays all `ContentRating` cases in ascending order with
/// checkmarks for the selected rating. Tapping a rating updates
/// the binding and provides haptic feedback.
struct ContentRatingPickerView: View {
    @Environment(LocalizationManager.self) private var localization

    @Binding var selectedRating: ContentRating

    var body: some View {
        VStack(spacing: 0) {
            ForEach(ContentRating.allCases, id: \.self) { rating in
                ratingRow(rating)

                if rating != ContentRating.allCases.last {
                    Rectangle()
                        .fill(DesignTokens.Glass.border)
                        .frame(height: 1)
                }
            }
        }
    }

    private func ratingRow(_ rating: ContentRating) -> some View {
        Button {
            selectedRating = rating
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
        } label: {
            HStack(spacing: DesignTokens.Spacing.md) {
                Text(rating.rawValue)
                    .font(.system(
                        size: DesignTokens.FontSize.base,
                        weight: .semibold
                    ))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(ratingDescription(rating))
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)

                Spacer()

                if selectedRating == rating {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: DesignTokens.FontSize.xl))
                        .foregroundStyle(DesignTokens.Primary.p400)
                } else {
                    Image(systemName: "circle")
                        .font(.system(size: DesignTokens.FontSize.xl))
                        .foregroundStyle(DesignTokens.Text.disabled)
                }
            }
            .padding(.vertical, DesignTokens.Spacing.md)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private func ratingDescription(_ rating: ContentRating) -> String {
        switch rating {
        case .g:
            return localization.t("familyControls.ratingG")
        case .pg:
            return localization.t("familyControls.ratingPG")
        case .pg13:
            return localization.t("familyControls.ratingPG13")
        case .r:
            return localization.t("familyControls.ratingR")
        case .nc17:
            return localization.t("familyControls.ratingNC17")
        }
    }
}
