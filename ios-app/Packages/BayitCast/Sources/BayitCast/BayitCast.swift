/// BayitCast - Google Cast SDK integration for Bayit+ iOS app.
///
/// This package provides a Swift-native abstraction layer for Google Cast functionality,
/// enabling users to cast video content to Chromecast devices.
///
/// Architecture:
/// - Protocol-based design for testability
/// - MainActor isolation for UI operations
/// - Combine publishers for reactive updates
/// - Comprehensive error handling and logging
///
/// Integration Requirements:
/// 1. Google Cast SDK must be linked via XCFramework or CocoaPods
/// 2. Receiver App ID must be configured
/// 3. Info.plist must include NSLocalNetworkUsageDescription
/// 4. Info.plist must include NSBonjourServices with _googlecast._tcp
///
/// Usage:
/// ```swift
/// @State private var castManager = CastSessionManager()
///
/// var body: some View {
///     VideoPlayerView()
///         .overlay(alignment: .topTrailing) {
///             CastButton(sessionManager: castManager)
///         }
///         .task {
///             try? await castManager.initialize(receiverAppId: "YOUR_APP_ID")
///         }
/// }
/// ```

import Foundation

public typealias BayitCast = CastSessionManager
