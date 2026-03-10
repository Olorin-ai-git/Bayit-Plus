import SwiftUI

/// Shape that fills its bounds with an opaque overlay while cutting out
/// a rounded rectangle around the target frame, creating a spotlight effect.
/// Conforms to Animatable so the cutout smoothly transitions between targets.
public struct CoachMarkSpotlight: Shape {
    var targetFrame: CGRect
    var cornerRadius: CGFloat

    public var animatableData: AnimatablePair<
        AnimatablePair<CGFloat, CGFloat>,
        AnimatablePair<CGFloat, CGFloat>
    > {
        get {
            AnimatablePair(
                AnimatablePair(targetFrame.origin.x, targetFrame.origin.y),
                AnimatablePair(targetFrame.size.width, targetFrame.size.height)
            )
        }
        set {
            targetFrame = CGRect(
                x: newValue.first.first,
                y: newValue.first.second,
                width: newValue.second.first,
                height: newValue.second.second
            )
        }
    }

    public init(targetFrame: CGRect, cornerRadius: CGFloat) {
        self.targetFrame = targetFrame
        self.cornerRadius = cornerRadius
    }

    public func path(in rect: CGRect) -> Path {
        var path = Path()
        path.addRect(rect)
        let paddedFrame = targetFrame.insetBy(
            dx: -DesignTokens.Spacing.xs,
            dy: -DesignTokens.Spacing.xs
        )
        path.addRoundedRect(
            in: paddedFrame,
            cornerSize: CGSize(width: cornerRadius, height: cornerRadius)
        )
        return path
    }
}
