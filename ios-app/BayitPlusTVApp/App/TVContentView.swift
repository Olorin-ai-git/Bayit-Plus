#if os(tvOS)
    import BayitAuth
    import BayitBYOC
    import BayitCore
    import BayitDesignSystem
    import BayitMedia
    import BayitNetworking
    import GameController
    import SwiftUI

    /// Root content view for the tvOS app.
    /// Shows splash on first launch, then auth flow or main tab view.
    /// Long-press Play/Pause on Siri Remote triggers the Bayit+ voice assistant.
    struct TVContentView: View {
        @Environment(TVNavigationCoordinator.self) var coordinator
        @Environment(TVRepositoryProvider.self) var repos
        @Environment(AuthManager.self) var authManager
        @Environment(TVAudioPlaybackManager.self) var audioPlaybackManager

        @State var showVoiceAssistant = false
        @State private var showPlusIntro = false
        @State private var isHandlingUnauthorized = false
        @State private var networkMonitor = NetworkMonitor()
        @State private var multiUserService = TVMultiUserService()
        @State private var onboardingPrefs = TVOnboardingPreferences(profileId: "")
        @State private var byocManager = BYOCSourceManager()
        @State private var didRestoreLastVisit = false
        @Environment(\.appConfiguration) private var appConfig
        @Environment(\.scenePhase) private var scenePhase

        var body: some View {
            ZStack {
                DesignTokens.Colors.Background.primary
                    .ignoresSafeArea()

                if coordinator.showingSplash {
                    TVSplashView(
                        onFinished: {
                            withAnimation(.easeInOut(duration: 0.5)) {
                                coordinator.showingSplash = false
                            }
                        }
                    )
                    .transition(.opacity)
                } else if (coordinator.showingAuth || !authManager.isAuthenticated) && !coordinator.isAutoLoginInProgress {
                    TVSignInView(
                        onAuthSuccess: {
                            withAnimation {
                                coordinator.showingAuth = false
                            }
                        },
                        logger: TVAppAPILogger()
                    )
                    .transition(.opacity)
                } else if !coordinator.profileSelected {
                    TVProfileSelectionView { member in
                        withAnimation {
                            coordinator.selectedProfileId = member.stableId
                            coordinator.selectedProfileName = member.displayName
                            onboardingPrefs.switchProfile(member.stableId)
                            // Use onboarding name if profile has none
                            if coordinator.selectedProfileName == nil {
                                coordinator.selectedProfileName = onboardingPrefs.userName.isEmpty
                                    ? nil : onboardingPrefs.userName
                            }
                            coordinator.profileSelected = true
                            checkOnboardingNeeded(profileId: member.stableId)
                        }
                    }
                    .transition(.opacity)
                } else if coordinator.showingOnboarding {
                    TVOnboardingView(
                        profileId: coordinator.selectedProfileId ?? ""
                    ) {
                        withAnimation {
                            // Reload preferences after onboarding saves them
                            if let pid = coordinator.selectedProfileId {
                                onboardingPrefs.switchProfile(pid)
                            }
                            if !onboardingPrefs.userName.isEmpty {
                                coordinator.selectedProfileName = onboardingPrefs.userName
                            }
                            coordinator.showingOnboarding = false
                        }
                    }
                    .transition(.opacity)
                } else {
                    TVMainTabView()
                        .transition(.opacity)
                }
            }
            .overlay { TVNetworkBannerView(isConnected: networkMonitor.isConnected) }
            .overlay {
                if showPlusIntro {
                    TVPlusIntroOverlayView(
                        onSeePlans: {
                            showPlusIntro = false
                            coordinator.fullscreenRoute = .subscriptionGate
                        },
                        onDismiss: { showPlusIntro = false }
                    )
                    .transition(.opacity)
                }
            }
            .environment(networkMonitor)
            .environment(onboardingPrefs)
            .environment(byocManager)
            .animation(.easeInOut, value: coordinator.showingSplash)
            .animation(.easeInOut, value: coordinator.showingAuth)
            .animation(.easeInOut, value: coordinator.profileSelected)
            .animation(.easeInOut, value: coordinator.showingOnboarding)
            .onChange(of: scenePhase) { _, newPhase in
                if newPhase == .active {
                    multiUserService.checkForUserChange()
                    if multiUserService.didUserChange {
                        handleSystemUserChange()
                        multiUserService.acknowledgeUserChange()
                    }
                } else if newPhase == .background {
                    // Stop inline audio when the app goes to background so the mini
                    // player bar does not appear as a ghost on the next cold launch.
                    if audioPlaybackManager.isActive {
                        audioPlaybackManager.stop()
                    }
                }
            }
            .fullScreenCover(item: fullscreenBinding) { route in
                fullscreenView(for: route)
                    .environment(networkMonitor)
                    .environment(onboardingPrefs)
                    .environment(byocManager)
            }
            .fullScreenCover(isPresented: $showVoiceAssistant) {
                TVVoiceAssistantSheet(
                    chatRepository: repos.chat,
                    onDismiss: { showVoiceAssistant = false }
                )
            }
            .onOpenURL { coordinator.handleDeepLink($0) }
            .onContinueUserActivity("tv.bayit.plus.playContent") { coordinator.handleUserActivity($0) }
            .onContinueUserActivity("tv.bayit.plus.searchContent") { coordinator.handleUserActivity($0) }
            .onContinueUserActivity("tv.bayit.plus.resumeWatching") { coordinator.handleUserActivity($0) }
            .onChange(of: TVPendingIntentManager.shared.pendingRoute) { coordinator.handlePendingIntent() }
            .onChange(of: TVPendingIntentManager.shared.pendingTab) { coordinator.handlePendingIntent() }
            .onAppear {
                byocManager.configureEnrichment(baseURL: appConfig.apiBaseURL)
                registerRemoteVoiceTrigger()
            }
            .onDisappear { unregisterRemoteVoiceTrigger() }
            .onChange(of: authManager.isAuthenticated) { _, isAuthenticated in
                if isAuthenticated {
                    withAnimation {
                        coordinator.showingAuth = false
                    }
                    if !TVPlusIntroOverlayView.hasBeenSeen {
                        showPlusIntro = true
                    }
                } else if !coordinator.showingSplash {
                    withAnimation {
                        coordinator.showingAuth = true
                        coordinator.profileSelected = false
                        coordinator.selectedProfileId = nil
                        didRestoreLastVisit = false
                    }
                }
            }
            .onChange(of: coordinator.profileSelected) { _, isSelected in
                guard isSelected, !didRestoreLastVisit, let userId = authManager.user?.id else { return }
                didRestoreLastVisit = true
                if let saved = coordinator.lastVisitedRouteManager.restore(userId: userId) {
                    withAnimation {
                        coordinator.selectedTab = saved.tab
                        if let route = saved.route {
                            coordinator.fullscreenRoute = route
                        }
                    }
                }
            }
            .onReceive(
                NotificationCenter.default.publisher(for: APIClient.unauthorizedNotification)
            ) { _ in
                guard !isHandlingUnauthorized else { return }
                isHandlingUnauthorized = true
                Task {
                    defer { isHandlingUnauthorized = false }
                    do {
                        try await authManager.refreshToken()
                    } catch {
                        await authManager.signOut()
                    }
                }
            }
        }
    }
#endif
