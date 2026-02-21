import BayitAuth
import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - Sheet Content Router

extension TVProfileView {
    @ViewBuilder
    func sheetContent(for sheet: ProfileSheet) -> some View {
        switch sheet {
        case .editProfile:
            if let vm = viewModel, let profile = vm.profile {
                TVEditProfileView(
                    profile: profile,
                    viewModel: vm,
                    onDismiss: { activeSheet = nil }
                )
            }
        case .avatarPicker:
            if let vm = viewModel, let profile = vm.profile {
                TVAvatarPickerView(
                    currentAvatar: profile.avatar,
                    viewModel: vm,
                    onDismiss: { activeSheet = nil }
                )
            }
        case .preferences:
            if let vm = viewModel, let profile = vm.profile {
                TVPreferencesView(
                    preferences: profile.preferences,
                    viewModel: vm,
                    onDismiss: { activeSheet = nil }
                )
            }
        case .accountSettings:
            if let vm = viewModel, let profile = vm.profile {
                TVAccountSettingsView(
                    profile: profile,
                    viewModel: vm,
                    onDismiss: { activeSheet = nil }
                )
            }
        case .viewingHistory:
            TVViewingHistoryView(onDismiss: { activeSheet = nil })
        case .favorites:
            TVFavoritesView()
        case .recordings:
            TVRecordingsView()
        case .watchlist:
            TVWatchlistView()
        case .downloads:
            TVDownloadsView()
        case .friends:
            TVFriendsView()
        case .messages:
            TVDirectMessagesView()
        case .settings:
            TVSettingsView()
        case .help:
            TVHelpView()
        case .connectedAccounts:
            TVConnectedAccountsView(onDismiss: { activeSheet = nil })
        case .widgets:
            // Handled via coordinator signal; dismiss immediately
            Color.clear
                .onAppear {
                    coordinator.showWidgetDock = true
                    activeSheet = nil
                }
        }
    }
}
