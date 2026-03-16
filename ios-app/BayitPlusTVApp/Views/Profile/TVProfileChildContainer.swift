#if os(tvOS)

    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Uniform wrapper for all Profile child screens.
    /// Provides consistent background, breadcrumb bar with back button,
    /// and exit handling.
    struct TVProfileChildContainer<Content: View>: View {
        @Binding var navigationPath: [TVProfileDestination]
        @Environment(LocalizationManager.self) private var localization
        let destination: TVProfileDestination
        @ViewBuilder let content: () -> Content

        var body: some View {
            content()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(DesignTokens.Background.primary)
                .tvBreadcrumb(destination.breadcrumbLabel(localization))
                .onExitCommand {
                    if !navigationPath.isEmpty {
                        navigationPath.removeLast()
                    }
                }
        }
    }

#endif
