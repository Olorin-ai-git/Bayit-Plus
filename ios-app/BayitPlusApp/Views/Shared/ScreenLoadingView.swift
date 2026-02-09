import BayitDesignSystem
import SwiftUI

/// Full-screen loading placeholder shown during initial screen navigation.
///
/// Displayed when a view's ViewModel has not yet been initialized,
/// providing immediate visual feedback while `.task` fires and data loads.
struct ScreenLoadingView: View {

    var body: some View {
        VStack {
            Spacer()
            GlassSpinner(size: .large)
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(DesignTokens.Background.primary)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Loading screen")
    }
}
