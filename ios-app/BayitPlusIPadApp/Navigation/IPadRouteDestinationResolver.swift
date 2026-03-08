import BayitBYOC
import BayitVoice
import SwiftUI

/// iPad-specific route resolver that overrides select routes with
/// iPad-optimized views. Falls through to the base resolver for all others.
struct IPadRouteDestinationResolver {
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(RepositoryProvider.self) private var repos

    private let baseResolver = RouteDestinationResolver()

    @ViewBuilder
    func view(for route: Route) -> some View {
        switch route {
        case .favorites:
            IPadFavoritesView()
        case .playlist:
            IPadPlaylistView()
        case .downloads:
            IPadDownloadsView()
        case .recordings:
            IPadRecordingsView()
        case .widgets:
            IPadWidgetsView()
        case .friends:
            IPadFriendsView()
        case .directMessages:
            IPadDirectMessagesView()
        case .watchParty, .watchPartyDetail:
            IPadWatchPartyView()
        case let .chess(gameId):
            IPadChessView(gameId: gameId)
        case .familyControls:
            IPadFamilyControlsView()
        case .household:
            IPadHouseholdView()
        case .subscription:
            IPadSubscriptionView()
        case .byocSources:
            IPadBYOCView()
        default:
            baseResolver.view(for: route)
        }
    }
}
