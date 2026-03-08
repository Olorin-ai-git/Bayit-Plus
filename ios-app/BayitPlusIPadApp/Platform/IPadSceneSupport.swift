import SwiftUI

/// Multi-window and Stage Manager support for iPad.
/// Configures scene activities for opening content in new windows.
struct IPadSceneSupport: ViewModifier {
    @Environment(NavigationCoordinator.self) private var coordinator

    func body(content: Content) -> some View {
        content
            .onOpenURL { url in
                handleDeepLink(url)
            }
            .userActivity("tv.bayit.plus.viewing") { activity in
                if let tab = coordinator.selectedTab.rawValue as String? {
                    activity.title = "Bayit+ - \(coordinator.selectedTab.title)"
                    activity.userInfo = ["tab": tab]
                    activity.isEligibleForHandoff = true
                }
            }
            .onContinueUserActivity("tv.bayit.plus.viewing") { activity in
                if let tab = activity.userInfo?["tab"] as? String,
                   let appTab = AppTab(rawValue: tab)
                {
                    coordinator.selectedTab = appTab
                    coordinator.popToRoot()
                }
            }
    }

    private func handleDeepLink(_ url: URL) {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
              let host = components.host
        else { return }

        switch host {
        case "player":
            if let contentId = components.queryItems?.first(where: { $0.name == "id" })?.value {
                coordinator.presentFullscreen(.player(contentId: contentId, contentType: .movie))
            }
        case "search":
            coordinator.selectedTab = .search
            coordinator.popToRoot()
        case "live":
            coordinator.selectedTab = .liveTV
            coordinator.popToRoot()
        default:
            break
        }
    }
}

/// Drag item representation for content cards
struct ContentDragItem: Transferable, Codable {
    let contentId: String
    let title: String
    let contentType: String

    static var transferRepresentation: some TransferRepresentation {
        CodableRepresentation(contentType: .json)
    }
}

extension View {
    func iPadSceneSupport() -> some View {
        modifier(IPadSceneSupport())
    }
}
