import Foundation

extension AppConfiguration {
    public init() {
        let env = AppEnvironment.current
        let info = Bundle.main.infoDictionary ?? [:]
        let processEnv = ProcessInfo.processInfo.environment

        let apiURLString = info["API_BASE_URL"] as? String
            ?? processEnv["API_BASE_URL"]
            ?? Self.defaultAPIBaseURL(for: env)
        guard let apiURL = URL(string: apiURLString) else {
            fatalError("Invalid API_BASE_URL configuration: \(apiURLString)")
        }

        let wsURLString = info["WEBSOCKET_BASE_URL"] as? String
            ?? processEnv["WEBSOCKET_BASE_URL"]
            ?? Self.defaultWebSocketURL(for: env)
        guard let wsURL = URL(string: wsURLString) else {
            fatalError("Invalid WEBSOCKET_BASE_URL configuration: \(wsURLString)")
        }

        let timeoutValue = info["API_TIMEOUT"] as? String ?? processEnv["API_TIMEOUT"]
        let maxRetriesValue = info["API_MAX_RETRIES"] as? String ?? processEnv["API_MAX_RETRIES"]
        let retryDelayValue = info["API_RETRY_BASE_DELAY"] as? String ?? processEnv["API_RETRY_BASE_DELAY"]
        let wsMaxConnValue = info["WS_MAX_CONCURRENT_CONNECTIONS"] as? String ?? processEnv["WS_MAX_CONCURRENT_CONNECTIONS"]
        let wsPingValue = info["WS_PING_INTERVAL"] as? String ?? processEnv["WS_PING_INTERVAL"]
        let wsMaxReconnect = info["WS_MAX_RECONNECT_ATTEMPTS"] as? String ?? processEnv["WS_MAX_RECONNECT_ATTEMPTS"]
        let wsReconnectDelay = info["WS_RECONNECT_BASE_DELAY"] as? String ?? processEnv["WS_RECONNECT_BASE_DELAY"]
        let wsGracePeriod = info["WS_INACTIVE_GRACE_PERIOD"] as? String ?? processEnv["WS_INACTIVE_GRACE_PERIOD"]
        let catchUpCreditCost = info["CATCHUP_CREDIT_COST"] as? String ?? processEnv["CATCHUP_CREDIT_COST"]
        let catchUpPrompt = info["CATCHUP_AUTO_PROMPT_SECONDS"] as? String ?? processEnv["CATCHUP_AUTO_PROMPT_SECONDS"]
        let catchUpWindow = info["CATCHUP_DEFAULT_WINDOW_MINUTES"] as? String ?? processEnv["CATCHUP_DEFAULT_WINDOW_MINUTES"]
        let castAppId = info["GOOGLE_CAST_RECEIVER_APP_ID"] as? String ?? processEnv["GOOGLE_CAST_RECEIVER_APP_ID"]
        let supportEmailValue = info["SUPPORT_EMAIL"] as? String ?? processEnv["SUPPORT_EMAIL"]

        guard let resolvedSupportEmail = supportEmailValue, !resolvedSupportEmail.isEmpty else {
            fatalError("SUPPORT_EMAIL must be set in Info.plist or SUPPORT_EMAIL env var")
        }

        let retryableCodesStr = info["API_RETRYABLE_STATUS_CODES"] as? String ?? processEnv["API_RETRYABLE_STATUS_CODES"]
        guard let retryableCodesStr else {
            fatalError("API_RETRYABLE_STATUS_CODES must be set in Info.plist or env var")
        }

        let progressIntervalStr = info["PROGRESS_TRACKING_INTERVAL_SECONDS"] as? String ?? processEnv["PROGRESS_TRACKING_INTERVAL_SECONDS"]
        guard let progressIntervalStr, let progressInterval = TimeInterval(progressIntervalStr) else {
            fatalError("PROGRESS_TRACKING_INTERVAL_SECONDS must be set in Info.plist or env var")
        }

        let rowLimitStr = info["HOME_CONTENT_ROW_LIMIT"] as? String ?? processEnv["HOME_CONTENT_ROW_LIMIT"]
        guard let rowLimitStr, let rowLimit = Int(rowLimitStr) else {
            fatalError("HOME_CONTENT_ROW_LIMIT must be set in Info.plist or env var")
        }

        let cultureIdStr = info["DEFAULT_CULTURE_ID"] as? String ?? processEnv["DEFAULT_CULTURE_ID"]
        guard let cultureIdStr, !cultureIdStr.isEmpty else {
            fatalError("DEFAULT_CULTURE_ID must be set in Info.plist or env var")
        }

        let hiddenKeywordsStr = info["HIDDEN_CHANNEL_KEYWORDS"] as? String ?? processEnv["HIDDEN_CHANNEL_KEYWORDS"]
        guard let hiddenKeywordsStr else {
            fatalError("HIDDEN_CHANNEL_KEYWORDS must be set in Info.plist or env var")
        }

        environment = env
        supportEmail = resolvedSupportEmail
        apiBaseURL = apiURL
        apiTimeout = TimeInterval(timeoutValue ?? "") ?? 30.0
        apiMaxRetries = Int(maxRetriesValue ?? "") ?? 3
        apiRetryBaseDelay = TimeInterval(retryDelayValue ?? "") ?? 1.0
        apiRetryableStatusCodes = Set(retryableCodesStr.split(separator: ",")
            .compactMap { Int($0.trimmingCharacters(in: .whitespaces)) })
        webSocketBaseURL = wsURL
        webSocketMaxConcurrentConnections = Int(wsMaxConnValue ?? "") ?? 5
        webSocketPingInterval = TimeInterval(wsPingValue ?? "") ?? 30.0
        webSocketMaxReconnectAttempts = Int(wsMaxReconnect ?? "") ?? 5
        webSocketReconnectBaseDelay = TimeInterval(wsReconnectDelay ?? "") ?? 1.0
        webSocketInactiveGracePeriod = TimeInterval(wsGracePeriod ?? "") ?? 10.0
        self.catchUpCreditCost = Int(catchUpCreditCost ?? "") ?? 1
        catchUpAutoPromptSeconds = Int(catchUpPrompt ?? "") ?? 15
        catchUpDefaultWindowMinutes = Int(catchUpWindow ?? "") ?? 15
        googleCastReceiverAppId = castAppId ?? ""
        progressTrackingIntervalSeconds = progressInterval
        homeContentRowLimit = rowLimit
        defaultCultureId = cultureIdStr
        hiddenChannelKeywords = hiddenKeywordsStr.split(separator: ",")
            .map { String($0.trimmingCharacters(in: .whitespaces)) }

        let ownerModeStr = info["OWNER_MODE"] as? String ?? processEnv["OWNER_MODE"]
        ownerMode = ownerModeStr?.uppercased() == "YES"
    }

    private static func defaultAPIBaseURL(for _: AppEnvironment) -> String {
        fatalError("API_BASE_URL must be set in Info.plist or API_BASE_URL env var")
    }

    private static func defaultWebSocketURL(for _: AppEnvironment) -> String {
        fatalError("WEBSOCKET_BASE_URL must be set in Info.plist or WEBSOCKET_BASE_URL env var")
    }
}
