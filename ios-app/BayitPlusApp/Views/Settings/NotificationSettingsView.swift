import BayitCore
import BayitDesignSystem
import BayitLocalization
import BayitNotifications
import SwiftUI

/// Notification preferences screen with FCM topic subscriptions.
struct NotificationSettingsView: View {
    @Environment(LocalizationManager.self) private var localization
    @Environment(\.pushNotificationService) private var pushService

    @State private var subscribedTopics: Set<NotificationTopic> = []
    @State private var isLoading = false
    @State private var error: String?
    @State private var hasPermission = false
    @State private var showPermissionAlert = false

    private let logger = BayitLogger(category: "NotificationSettingsView")

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
        .alert("Enable Notifications", isPresented: $showPermissionAlert) {
            Button("Open Settings") {
                pushService?.openAppSettings()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("To receive notifications, please enable them in Settings.")
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

            Text(hasPermission ? localization.t("settings.notificationDescription") : "Enable notifications to stay updated")
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Permission Banner

    private var permissionBanner: some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: "bell.slash.circle")
                    .font(.system(size: 40))
                    .foregroundStyle(DesignTokens.Text.muted)

                Text("Notifications Disabled")
                    .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text("Enable notifications to receive updates about new content, live events, and more.")
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)

                GlassButton(title: "Enable Notifications") {
                    showPermissionAlert = true
                }
            }
            .padding(DesignTokens.Spacing.lg)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Topic Toggles

    private var topicToggles: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            ForEach(NotificationTopic.allCases, id: \.self) { topic in
                topicToggle(for: topic)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func topicToggle(for topic: NotificationTopic) -> some View {
        GlassCard {
            HStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: topic.iconName)
                    .font(.system(size: 20))
                    .foregroundStyle(DesignTokens.Primary.p400)
                    .frame(width: 32, height: 32)

                VStack(alignment: .leading, spacing: 2) {
                    Text(topic.displayName)
                        .font(.system(size: DesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Text(topic.description)
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Text.muted)
                        .lineLimit(2)
                }

                Spacer()

                Toggle("", isOn: binding(for: topic))
                    .tint(DesignTokens.Primary.default)
                    .labelsHidden()
                    .disabled(isLoading)
            }
            .padding(DesignTokens.Spacing.md)
        }
    }

    // MARK: - Error Banner

    private func errorBanner(_ message: String) -> some View {
        GlassCard {
            HStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: "exclamationmark.triangle")
                    .foregroundStyle(.red)

                Text(message)
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)

                Spacer()

                Button("Dismiss") {
                    error = nil
                }
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Primary.default)
            }
            .padding(DesignTokens.Spacing.md)
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

    private func binding(for topic: NotificationTopic) -> Binding<Bool> {
        Binding(
            get: { subscribedTopics.contains(topic) },
            set: { isSubscribed in
                Task {
                    await toggleSubscription(for: topic, subscribe: isSubscribed)
                }
            }
        )
    }

    // MARK: - Data Loading

    private func loadPermissionStatus() async {
        guard let pushService = pushService else {
            hasPermission = false
            return
        }

        let status = await pushService.checkPermissionStatus()
        hasPermission = status == .authorized || status == .provisional

        logger.info("Loaded permission status", context: [
            "hasPermission": "\(hasPermission)",
            "status": "\(status.rawValue)"
        ])
    }

    private func loadSubscriptions() async {
        // Load user's topic subscriptions
        // For now, default to all default topics
        let defaults = NotificationTopic.allCases.filter { $0.isDefaultSubscription }
        subscribedTopics = Set(defaults)

        logger.info("Loaded subscriptions", context: [
            "count": "\(subscribedTopics.count)"
        ])
    }

    private func toggleSubscription(for topic: NotificationTopic, subscribe: Bool) async {
        guard let pushService = pushService else { return }

        isLoading = true
        error = nil

        do {
            if subscribe {
                try await pushService.subscribe(to: topic)
                subscribedTopics.insert(topic)
                logger.info("Subscribed to topic", context: ["topic": topic.rawValue])
            } else {
                try await pushService.unsubscribe(from: topic)
                subscribedTopics.remove(topic)
                logger.info("Unsubscribed from topic", context: ["topic": topic.rawValue])
            }
        } catch {
            self.error = "Failed to update subscription. Please try again."
            logger.error("Failed to toggle subscription", error: error, context: [
                "topic": topic.rawValue,
                "action": subscribe ? "subscribe" : "unsubscribe"
            ])
        }

        isLoading = false
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
