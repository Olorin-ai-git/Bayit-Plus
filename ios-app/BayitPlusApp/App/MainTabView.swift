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
            EPGView()
        case .profile:
            ProfileView()
        case .favorites:
            FavoritesView()
        case .playlist:
            PlaylistView()
        case .downloads:
            DownloadsView()
        case .recordings:
            RecordingsView()
        case .settings:
            ScreenPlaceholder(title: "Settings", subtitle: "Phase 6")
        case .languageSettings:
            ScreenPlaceholder(title: "Language", subtitle: "Phase 6")
        case .notificationSettings:
            ScreenPlaceholder(title: "Notifications", subtitle: "Phase 6")
        case .billing:
            ScreenPlaceholder(title: "Billing", subtitle: "Phase 6")
        case .subscription:
            ScreenPlaceholder(title: "Subscription", subtitle: "Phase 6")
        case .security:
            ScreenPlaceholder(title: "Security", subtitle: "Phase 6")
        case .children:
            ChildrenView()
        case .youngsters:
            YoungtersView()
        case .judaism:
            JudaismView()
        case .flows:
            FlowsView()
        case .morningRitual:
            MorningRitualView()
        case .voiceOnboarding:
            ScreenPlaceholder(title: "Voice Setup", subtitle: "Phase 5")
        case .support:
            ScreenPlaceholder(title: "Support", subtitle: "Phase 6")
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
