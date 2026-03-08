import BayitBYOC
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// iPad-optimized BYOC with two-column layout: source list + content grid
struct IPadBYOCView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        BYOCSourceListView()
            .background(DesignTokens.Background.primary)
    }
}
