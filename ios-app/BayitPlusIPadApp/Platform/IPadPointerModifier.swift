import SwiftUI

/// Adds pointer/trackpad hover effects for iPad cursor interaction.
/// Apply to interactive cards and buttons for visual feedback.
struct IPadPointerEffect: ViewModifier {
    let shape: AnyShape

    init<S: Shape>(_ shape: S = RoundedRectangle(cornerRadius: 12)) {
        self.shape = AnyShape(shape)
    }

    func body(content: Content) -> some View {
        content
            .hoverEffect(.highlight)
            .contentShape(.hoverEffect, shape)
    }
}

/// Lift hover effect for cards that should elevate on hover
struct IPadPointerLiftEffect: ViewModifier {
    func body(content: Content) -> some View {
        content
            .hoverEffect(.lift)
    }
}

extension View {
    /// Standard highlight hover for buttons and interactive elements
    func iPadPointerHighlight<S: Shape>(_ shape: S = RoundedRectangle(cornerRadius: 12)) -> some View {
        modifier(IPadPointerEffect(shape))
    }

    /// Lift hover for content cards that should appear elevated
    func iPadPointerLift() -> some View {
        modifier(IPadPointerLiftEffect())
    }
}
