import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// iPad-optimized watch party with wider lobby layout
struct IPadWatchPartyView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        WatchPartyView(repository: repos.watchParty)
            .background(DesignTokens.Background.primary)
    }
}
