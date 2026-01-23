#if os(tvOS)
import UIKit

class FocusNavigationManager {
    static let shared = FocusNavigationManager()

    private init() {}

    func setupFocusGuides(for view: UIView, configuration: FocusConfiguration) {
        let focusGuide = UIFocusGuide()
        view.addLayoutGuide(focusGuide)

        NSLayoutConstraint.activate([
            focusGuide.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            focusGuide.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            focusGuide.topAnchor.constraint(equalTo: view.topAnchor),
            focusGuide.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])

        focusGuide.preferredFocusEnvironments = configuration.preferredFocusViews
    }

    func updateFocusAfterLanguageSwitch(to button: UIView) {
        if #available(tvOS 11.0, *) {
            UIFocusSystem.environment(for: button)?.setNeedsFocusUpdate()
            UIFocusSystem.environment(for: button)?.updateFocusIfNeeded()
        }
    }
}

struct FocusConfiguration {
    let preferredFocusViews: [UIFocusEnvironment]
    let allowsExit: Bool
    let direction: FocusDirection
}

enum FocusDirection {
    case horizontal
    case vertical
    case grid
}
#endif
