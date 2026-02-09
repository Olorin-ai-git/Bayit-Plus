import SwiftUI
import WidgetKit
import BayitDesignSystem

/// Applies the Bayit+ glass background to widget views.
///
/// Uses `.containerBackground(for: .widget)` with a gradient from
/// `DesignTokens.Background.primary` to `DesignTokens.Background.elevated`
/// and an optional purple accent border.
struct WidgetGlassBackgroundModifier: ViewModifier {

    let showBorder: Bool

    func body(content: Content) -> some View {
        content
            .containerBackground(for: .widget) {
                ZStack {
                    LinearGradient(
                        colors: [
                            DesignTokens.Background.primary,
                            DesignTokens.Background.elevated,
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )

                    if showBorder {
                        ContainerRelativeShape()
                            .stroke(
                                DesignTokens.Glass.border,
                                lineWidth: 1
                            )
                    }
                }
            }
    }
}

// MARK: - View Extension

extension View {

    /// Applies the glass background to a widget view.
    ///
    /// - Parameter showBorder: Whether to display the purple accent border.
    ///   Defaults to `true`.
    func widgetGlassBackground(showBorder: Bool = true) -> some View {
        modifier(WidgetGlassBackgroundModifier(showBorder: showBorder))
    }
}
