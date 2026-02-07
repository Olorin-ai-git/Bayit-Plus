import SwiftUI

/// Main tab view with glass tab bar at the bottom
struct MainTabView: View {
    @Environment(NavigationCoordinator.self) private var coordinator

    var body: some View {
        @Bindable var coord = coordinator

        ZStack(alignment: .bottom) {
            TabView(selection: $coord.selectedTab) {
                ForEach(AppTab.allCases) { tab in
                    tabContent(for: tab)
                        .tag(tab)
                }
            }
            .toolbar(.hidden, for: .tabBar)

            glassTabBar
        }
    }

    @ViewBuilder
    private func tabContent(for tab: AppTab) -> some View {
        NavigationStack(path: binding(for: tab)) {
            tabRootView(for: tab)
                .navigationDestination(for: Route.self) { route in
                    destinationView(for: route)
                }
        }
    }

    @ViewBuilder
    private func tabRootView(for tab: AppTab) -> some View {
        switch tab {
        case .home:
            HomeView()
        case .liveTV:
            LiveTVView()
        case .vod:
            VODView()
        case .radio:
            RadioView()
        case .podcasts:
            PodcastsView()
        }
    }

    @ViewBuilder
    private func destinationView(for route: Route) -> some View {
        switch route {
        case .movieDetail(let movieId):
            MovieDetailView(movieId: movieId)
        case .seriesDetail(let seriesId):
            SeriesDetailView(seriesId: seriesId)
        case .podcastDetail:
            ScreenPlaceholder(title: "Podcast Detail", subtitle: "Episodes")
        case .epg:
            ScreenPlaceholder(title: "EPG", subtitle: "Program Guide")
        case .profile:
            ScreenPlaceholder(title: "Profile", subtitle: "User Profile")
        case .favorites:
            ScreenPlaceholder(title: "Favorites", subtitle: "My Favorites")
        case .playlist:
            ScreenPlaceholder(title: "Playlist", subtitle: "My Playlist")
        case .downloads:
            ScreenPlaceholder(title: "Downloads", subtitle: "Offline Content")
        case .recordings:
            ScreenPlaceholder(title: "Recordings", subtitle: "DVR")
        case .settings:
            ScreenPlaceholder(title: "Settings", subtitle: "App Settings")
        case .languageSettings:
            ScreenPlaceholder(title: "Language", subtitle: "Language Settings")
        case .notificationSettings:
            ScreenPlaceholder(title: "Notifications", subtitle: "Notification Settings")
        case .billing:
            ScreenPlaceholder(title: "Billing", subtitle: "Payment & Billing")
        case .subscription:
            ScreenPlaceholder(title: "Subscription", subtitle: "Manage Plan")
        case .security:
            ScreenPlaceholder(title: "Security", subtitle: "Account Security")
        case .children:
            ScreenPlaceholder(title: "Children", subtitle: "Kids Content")
        case .youngsters:
            ScreenPlaceholder(title: "Youngsters", subtitle: "Teen Content")
        case .judaism:
            ScreenPlaceholder(title: "Judaism", subtitle: "Religious Content")
        case .flows:
            ScreenPlaceholder(title: "Flows", subtitle: "Content Flows")
        case .morningRitual:
            ScreenPlaceholder(title: "Morning Ritual", subtitle: "Daily Ritual")
        case .voiceOnboarding:
            ScreenPlaceholder(title: "Voice Setup", subtitle: "Voice Commands")
        case .support:
            ScreenPlaceholder(title: "Support", subtitle: "Help & Support")
        default:
            ScreenPlaceholder(title: "Screen", subtitle: "")
        }
    }

    private func binding(for tab: AppTab) -> Binding<NavigationPath> {
        Binding(
            get: { coordinator.paths[tab, default: NavigationPath()] },
            set: { coordinator.paths[tab] = $0 }
        )
    }

    private var glassTabBar: some View {
        HStack(spacing: 0) {
            ForEach(AppTab.allCases) { tab in
                tabBarButton(for: tab)
            }
        }
        .padding(.horizontal, 4)
        .padding(.vertical, 8)
        .background {
            ZStack {
                Color.black.opacity(0.85)
                Rectangle()
                    .fill(.ultraThinMaterial)
                    .environment(\.colorScheme, .dark)
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: 24))
        .overlay(
            RoundedRectangle(cornerRadius: 24)
                .stroke(Color.purple.opacity(0.25), lineWidth: 1)
        )
        .padding(.horizontal, 16)
        .padding(.bottom, 8)
        .shadow(color: Color.purple.opacity(0.2), radius: 8, y: 4)
    }

    private func tabBarButton(for tab: AppTab) -> some View {
        let isSelected = coordinator.selectedTab == tab

        return Button {
            withAnimation(.spring(duration: 0.3, bounce: 0.15)) {
                coordinator.selectedTab = tab
            }
        } label: {
            VStack(spacing: 2) {
                Image(systemName: isSelected ? tab.selectedIconName : tab.iconName)
                    .font(.system(size: 18))
                    .symbolVariant(isSelected ? .fill : .none)

                Text(tab.title)
                    .font(.system(size: 10, weight: .medium))
            }
            .foregroundStyle(isSelected
                ? Color(red: 0.75, green: 0.32, blue: 0.99)
                : Color.white.opacity(0.5))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
            .background(
                isSelected
                    ? Color.purple.opacity(0.15)
                    : Color.clear
            )
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }
}

/// Generic placeholder for screens not yet implemented (Phase 3+)
struct ScreenPlaceholder: View {
    let title: String
    let subtitle: String

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 12) {
                Text(title)
                    .font(.system(size: 28, weight: .bold))
                    .foregroundStyle(.white)

                Text(subtitle)
                    .font(.system(size: 16))
                    .foregroundStyle(.white.opacity(0.5))

                Text("Phase 3+")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(.purple.opacity(0.7))
                    .padding(.horizontal, 12)
                    .padding(.vertical, 4)
                    .background(Color.purple.opacity(0.1))
                    .clipShape(Capsule())
            }
        }
    }
}
