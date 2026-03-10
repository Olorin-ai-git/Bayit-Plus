import SwiftUI

public struct WalkthroughTargetPreferenceKey: PreferenceKey {
    public static var defaultValue: [String: CGRect] = [:]

    public static func reduce(value: inout [String: CGRect], nextValue: () -> [String: CGRect]) {
        value.merge(nextValue(), uniquingKeysWith: { _, new in new })
    }
}

private struct WalkthroughTargetModifier: ViewModifier {
    let id: String

    func body(content: Content) -> some View {
        content
            .background(
                GeometryReader { geometry in
                    Color.clear
                        .preference(
                            key: WalkthroughTargetPreferenceKey.self,
                            value: [id: geometry.frame(in: .global)]
                        )
                }
            )
    }
}

public extension View {
    func walkthroughTarget(id: String) -> some View {
        modifier(WalkthroughTargetModifier(id: id))
    }
}
