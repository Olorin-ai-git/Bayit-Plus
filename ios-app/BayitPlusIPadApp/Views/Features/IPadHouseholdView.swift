import BayitDesignSystem
import SwiftUI

/// iPad-optimized household management - uses wider layout naturally
struct IPadHouseholdView: View {
    var body: some View {
        HouseholdView()
            .background(DesignTokens.Background.primary)
    }
}
