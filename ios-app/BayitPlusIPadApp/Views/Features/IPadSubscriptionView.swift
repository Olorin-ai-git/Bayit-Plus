import BayitDesignSystem
import SwiftUI

/// iPad-optimized subscription view - plan cards render wider naturally
struct IPadSubscriptionView: View {
    var body: some View {
        SubscriptionView()
            .background(DesignTokens.Background.primary)
    }
}
