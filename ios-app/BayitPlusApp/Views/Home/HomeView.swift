import BayitBYOC
import BayitDesignSystem
import BayitLocalization
import BayitWidgetShared
import SwiftUI

/// Home screen with hero, spotlight carousel, and category rows.
///
/// Content section builders, loading state, and error state are in
/// `HomeView+Sections.swift`.
struct HomeView: View {
    @Environment(RepositoryProvider.self) var repos
    @Environment(NavigationCoordinator.self) var coordinator
    @Environment(AppLocationProvider.self) private var locationProvider
    @Environment(FeatureFlags.self) var featureFlags
    @Environment(LocalizationManager.self) var localization
    @Environment(WidgetDataSyncService.self) private var widgetSync
    @Environment(BYOCSourceManager.self) var byocManager
    @Environment(\.appConfiguration) var appConfiguration
    @State var viewModel: HomeViewModel?
    @State var cardActions: CardActionsViewModel?
    @State var aiGatewayState = AIGatewayState()
    @State var showYouTubeAuth = false

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                VStack(spacing: DesignTokens.Spacing.xl) {
                    if vm.isLoading && vm.categories.isEmpty {
                        loadingState
                    } else if let error = vm.error, vm.categories.isEmpty {
                        errorState(error)
                    } else {
                        contentSections(vm)
                    }
                }
                .padding(.top, DesignTokens.Spacing.md)
            } else {
                ScreenLoadingView()
            }
        }
        .scrollContentBackground(.hidden)
        .background(DesignTokens.Background.primary)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .refreshable {
            await viewModel?.refresh()
        }
        .task {
            if cardActions == nil {
                cardActions = CardActionsViewModel(
                    userRepository: repos.user,
                    widgetRepository: repos.widget
                )
            }
            if viewModel == nil {
                locationProvider.requestLocationIfNeeded()
                viewModel = HomeViewModel(
                    repository: repos.content,
                    mediaRepository: repos.media,
                    liveTVRepository: repos.liveTV,
                    radioRepository: repos.radio,
                    locationProvider: locationProvider,
                    featureFlags: featureFlags,
                    categoryRepository: repos.category,
                    widgetSync: widgetSync,
                    contentRowLimit: appConfiguration.homeContentRowLimit,
                    defaultCultureId: appConfiguration.defaultCultureId,
                    hiddenChannelKeywords: appConfiguration.ownerMode
                        ? [] : appConfiguration.hiddenChannelKeywords
                )
            }
            await viewModel?.loadFeatured()
        }
        .onChange(of: coordinator.fullscreenRoute == nil) { _, isDismissed in
            if isDismissed {
                Task { await viewModel?.refreshContinueWatching() }
            }
        }
        .sheet(isPresented: $showYouTubeAuth) {
            BYOCYouTubeAuthSheet()
        }
        .onAppear { aiGatewayState.incrementSession() }
    }
}
