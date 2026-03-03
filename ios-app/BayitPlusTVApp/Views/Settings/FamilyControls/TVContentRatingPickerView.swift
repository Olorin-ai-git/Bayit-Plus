import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS content rating picker with focusable rows for Siri Remote.
///
/// Port of the iOS `ContentRatingPickerView` with tvOS focus styling
/// and scaled fonts/padding for 10-foot UI.
struct TVContentRatingPickerView: View {
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
        } label: {
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                Text(rating.rawValue)
                    .font(.system(
                        size: TVDesignTokens.FontSize.lg,
                        weight: .semibold
                    ))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(ratingDescription(rating))
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.muted)

                Spacer()

                if selectedRating == rating {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: TVDesignTokens.FontSize.xxl))
                        .foregroundStyle(DesignTokens.Primary.p400)
                } else {
                    Image(systemName: "circle")
                        .font(.system(size: TVDesignTokens.FontSize.xxl))
                        .foregroundStyle(DesignTokens.Text.disabled)
                }
            }
            .padding(.vertical, TVDesignTokens.Spacing.lg)
            .padding(.horizontal, TVDesignTokens.Spacing.sm)
            .contentShape(Rectangle())
        }
        .tvCardStyle()
    }

    private func ratingDescription(_ rating: ContentRating) -> String {
        switch rating {
        case .g:
            return localization.t("familyControls.ratingG")
        case .pg:
            return localization.t("familyControls.ratingPG")
        case .pg13:
            return localization.t("familyControls.ratingPG13")
        }
    }
}
