import BayitDesignSystem
import SwiftUI

/// iPad-optimized family controls - leverages wider screen for settings layout
struct IPadFamilyControlsView: View {
    var body: some View {
        FamilyControlsView()
            .background(DesignTokens.Background.primary)
    }
}
