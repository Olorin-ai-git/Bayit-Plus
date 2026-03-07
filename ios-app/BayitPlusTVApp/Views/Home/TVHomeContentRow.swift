import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Generic reusable horizontal content row for the tvOS home screen.
/// Loads data independently via an async closure, handles loading/empty/error states,
/// and hides itself when no data is available.
struct TVHomeContentRow<Item: Identifiable, CardContent: View>: View {
    @Environment(LocalizationManager.self) private var localization

    let title: String
    let icon: String
    let seeAllAction: (() -> Void)?
    let loader: () async throws -> [Item]
    let cardBuilder: (Item) -> CardContent

    @State private var items: [Item] = []
    @State private var hasLoaded = false

    init(
        title: String,
        icon: String,
        seeAllAction: (() -> Void)? = nil,
        loader: @escaping () async throws -> [Item],
        @ViewBuilder cardBuilder: @escaping (Item) -> CardContent
    ) {
        self.title = title
        self.icon = icon
        self.seeAllAction = seeAllAction
        self.loader = loader
        self.cardBuilder = cardBuilder
    }

    var body: some View {
        Group {
            if hasLoaded && !items.isEmpty {
                TVContentSection(
                    title: title,
                    icon: icon,
                    items: items,
                    seeAllAction: seeAllAction,
                    cardBuilder: cardBuilder
                )
            }
        }
        .task {
            await loadData()
        }
    }

    private func loadData() async {
        do {
            items = try await loader()
        } catch {
            items = []
        }
        hasLoaded = true
    }
}
