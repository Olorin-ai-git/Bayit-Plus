import BayitAuth
import BayitBYOC
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
                    onDismiss: { activeSheet = nil },
                    onNavigate: { activeSheet = $0 }
                )
            }
        case .viewingHistory:
            TVViewingHistoryView(onDismiss: { activeSheet = nil })
        case .favorites:
            profileSheetWrapper(title: localization.t("profile.myFavorites")) {
                TVFavoritesView()
            }
        case .recordings:
            profileSheetWrapper(title: localization.t("profile.myRecordings")) {
                TVRecordingsView()
            }
        case .watchlist:
            profileSheetWrapper(title: localization.t("profile.myPlaylists")) {
                TVWatchlistView()
            }
        case .downloads:
            profileSheetWrapper(title: localization.t("profile.myDownloads")) {
                TVDownloadsView()
            }
        case .friends:
            profileSheetWrapper(title: localization.t("nav.friends")) {
                TVFriendsView()
            }
        case .messages:
            profileSheetWrapper(title: localization.t("profile.messages")) {
                TVDirectMessagesView()
            }
        case .settings:
            profileSheetWrapper(title: localization.t("nav.settings")) {
                TVSettingsView()
            }
        case .help:
            profileSheetWrapper(title: localization.t("settings.help.title")) {
                TVHelpView()
            }
        case .connectedAccounts:
            TVConnectedAccountsView(onDismiss: { activeSheet = nil })
        case .contentSources:
            TVBYOCSourceListView(onDismiss: { activeSheet = nil })
        case .widgets:
            profileSheetWrapper(title: localization.t("nav.widgets")) {
                TVWidgetsView()
            }
        case .householdProfiles:
            TVHouseholdProfilesView(onDismiss: { activeSheet = nil })
        case .about:
            profileSheetWrapper(title: localization.t("settings.about.title")) {
                TVAboutView()
            }
        case .changePassword:
            if let profile = viewModel?.profile {
                TVChangePasswordView(
                    hasPassword: profile.hasPassword == true,
                    onDismiss: { activeSheet = nil }
                )
            }
        case .activeSessions:
            TVActiveSessionsView(onDismiss: { activeSheet = nil })
        case .passkeys:
            TVPasskeysView(onDismiss: { activeSheet = nil })
        case .linkAccount:
            if let profile = viewModel?.profile {
                TVLinkAccountView(
                    currentProvider: profile.authProvider,
                    onDismiss: { activeSheet = nil }
                )
            }
        case .phoneVerification:
            if let profile = viewModel?.profile {
                TVPhoneVerificationView(
                    existingPhone: profile.phoneNumber,
                    onDismiss: { activeSheet = nil },
                    onVerified: { Task { await viewModel?.load() } }
                )
            }
        case .deleteAccount:
            TVDeleteAccountView(onDismiss: { activeSheet = nil })
        }
    }

    /// Consistent wrapper for profile sub-views that lack their own header.
    /// Provides TVProfileSheetHeader (X close + centered title) and onExitCommand.
    private func profileSheetWrapper<Content: View>(
        title: String,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(spacing: 0) {
            TVProfileSheetHeader(
                title: title,
                onDismiss: { activeSheet = nil }
            )
            content()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .background(DesignTokens.Background.primary)
        .onExitCommand { activeSheet = nil }
    }
}
