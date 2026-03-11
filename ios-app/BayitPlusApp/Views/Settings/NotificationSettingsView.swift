import BayitCore
import BayitDesignSystem
import BayitLocalization
import BayitNotifications
import SwiftUI

/// Notification preferences screen with FCM topic subscriptions.
struct NotificationSettingsView: View {
    @Environment(LocalizationManager.self) var localization
    @Environment(\.pushNotificationService) var pushService

    @State var subscribedTopics: Set<NotificationTopic> = []
    @State var isLoading = false
    @State var error: String?
    @State var hasPermission = false
    @State var showPermissionAlert = false

    let logger = BayitLogger(category: "NotificationSettingsView")

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: DesignTokens.Spacing.lg) {
                headerSection

                // Permission banner
                if !hasPermission {
                    permissionBanner
                } else {
                    topicToggles
                }

                // Error banner
                if let error = error {
                    errorBanner(error)
                }

                footerNote
            }
            .padding(.vertical, DesignTokens.Spacing.lg)
        }
        .background(DesignTokens.Background.primary)
        .task {
            await loadPermissionStatus()
            if hasPermission {
                await loadSubscriptions()
            }
        }
        .alert(localization.t("settings.enableNotifications"), isPresented: $showPermissionAlert) {
            Button(localization.t("settings.openSettings")) {
                pushService?.openAppSettings()
            }
            Button(localization.t("common.cancel"), role: .cancel) {}
        } message: {
            Text(localization.t("settings.notificationsGoToSettings"))
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: hasPermission ? "bell.badge" : "bell.slash")
                .font(.system(size: 48))
                .foregroundStyle(hasPermission ? DesignTokens.Primary.p400 : DesignTokens.Text.muted)

            Text(localization.t("settings.notificationPreferences"))
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(hasPermission ? localization.t("settings.notificationDescription") : localization.t("settings.enableNotificationsPrompt"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Footer

    private var footerNote: some View {
        Text(localization.t("settings.notificationFooter"))
            .font(.system(size: DesignTokens.FontSize.xs))
            .foregroundStyle(DesignTokens.Text.muted)
            .multilineTextAlignment(.center)
            .padding(.horizontal, DesignTokens.Spacing.xl)
    }

    // MARK: - Helpers

    func binding(for topic: NotificationTopic) -> Binding<Bool> {
        Binding(
            get: { subscribedTopics.contains(topic) },
            set: { isSubscribed in
                Task {
                    await toggleSubscription(for: topic, subscribe: isSubscribed)
                }
            }
        )
    }
}

// MARK: - Environment Key

private struct PushNotificationServiceKey: EnvironmentKey {
    static let defaultValue: PushNotificationService? = nil
}

extension EnvironmentValues {
    var pushNotificationService: PushNotificationService? {
        get { self[PushNotificationServiceKey.self] }
        set { self[PushNotificationServiceKey.self] = newValue }
    }
}
