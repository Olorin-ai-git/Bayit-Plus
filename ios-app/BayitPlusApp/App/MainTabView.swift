import BayitVoice
import SwiftUI

/// Main tab view with glass tab bar at the bottom
struct MainTabView: View {
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(RepositoryProvider.self) private var repos
    @State private var isVoiceModalPresented = false
    @State private var dockViewModel: WidgetDockViewModel?

    var body: some View {
        ZStack(alignment: .bottom) {
            tabContent(for: coordinator.selectedTab)

            glassTabBar

            // Floating widget dock (left edge, vertically centered) - hidden on widgets tab
            if let vm = dockViewModel, coordinator.selectedTab != .widgets {
                PiPWidgetManagerView(
                    widgets: vm.widgets,
                    isDockVisible: vm.isDockVisible,
                    onToggleMinimize: { _ in },
                    onCloseDock: { vm.hideDock() }
                )
                .allowsHitTesting(true)
            }

            // Floating wizard hat FAB (bottom-right corner)
            VStack {
                Spacer()
                HStack {
                    Spacer()
                    VoiceAvatarFAB {
                        isVoiceModalPresented = true
                    }
                    .padding(.trailing, 20)
                    .padding(.bottom, 90)  // Above tab bar
                }
            }
        }
        .task {
            if dockViewModel == nil {
                dockViewModel = WidgetDockViewModel(repository: repos.widget)
            }
            await dockViewModel?.loadWidgets()
        }
        .sheet(isPresented: $isVoiceModalPresented) {
            VoiceAssistantSheet(
                chatRepository: repos.chat,
                onDismiss: { isVoiceModalPresented = false }
            )
            .presentationDetents([.medium, .large])
            .presentationDragIndicator(.visible)
            .presentationBackground(.ultraThinMaterial)
        }
    }

    @ViewBuilder
    private func tabContent(for tab: AppTab) -> some View {
        NavigationStack(path: binding(for: tab)) {
            tabRootView(for: tab)
                .navigationDestination(for: Route.self) { route in
                    VStack(spacing: 0) {
                        BreadcrumbBar()
                        destinationView(for: route)
                    }
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
        case .widgets:
            WidgetsView()
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
            SettingsView()
        case .languageSettings:
            LanguageSettingsView()
        case .notificationSettings:
            NotificationSettingsView()
        case .billing:
            BillingView()
        case .subscription:
            SubscriptionView()
        case .security:
            SecurityView()
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
            VoiceOnboardingView(speechService: SpeechRecognitionService())
        case .support:
            SupportView()

        // Trivia & Quiz
        case .trivia(let contentId):
            QuizOverlayView(contentId: contentId, profileId: nil, onDismiss: { coordinator.pop() })

        // LLM Search
        case .llmSearch:
            LLMSearchView()

        // Family Controls
        case .familyControls:
            FamilyControlsView()

        // Shabbat Mode
        case .shabbatMode:
            ZmanimView()

        // Culture Content
        case .jerusalemContent:
            CultureContentView()
        case .telAvivContent:
            CultureContentView()

        // Audiobooks
        case .audiobooks:
            AudiobooksView()
        case .audiobookDetail(let audiobookId):
            AudiobookDetailView(audiobookId: audiobookId)

        // Trending
        case .trending:
            ScreenPlaceholder(title: "Trending", subtitle: "Trending Content")

        // Interactive Subtitles (launched from player controls)
        case .interactiveSubtitles:
            ScreenPlaceholder(title: "Interactive Subtitles", subtitle: "Available during playback")

        // Chapter Navigation (launched from player controls)
        case .chapters:
            ScreenPlaceholder(title: "Chapters", subtitle: "Available during playback")

        // AI Chat
        case .chatbot:
            ChatbotView(repository: repos.chat)

        // Avatar Mode
        case .avatarMode:
            AvatarModeView(stateMachine: AvatarStateMachine(), repository: repos.chat)

        // Beta Credits
        case .betaCredits:
            CreditBalanceWidgetView()

        // Subscription Gate
        case .subscriptionGate(let contentId, let requiredTier):
            SubscriptionGateView(contentId: contentId, requiredTier: requiredTier)

        // Household
        case .household:
            HouseholdView()

        // Device Pairing
        case .devicePairing:
            DevicePairingView()

        // Help Center
        case .helpCenter:
            HelpView()

        // Rewards
        case .rewards:
            RewardsView()

        // Passkey Management
        case .passkeyManagement:
            PasskeyManagementView()

        // Onboarding AI
        case .onboardingAI:
            OnboardingAIView()

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
        .accessibilityIdentifier("tab_\(tab.rawValue)")
        .accessibilityLabel(tab.title)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
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
