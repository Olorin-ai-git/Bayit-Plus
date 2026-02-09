import XCTest
@testable import BayitWidgetShared

final class WidgetConfigurationKeysTests: XCTestCase {

    // MARK: - App Group ID

    func testAppGroupIDIsNonEmpty() {
        XCTAssertFalse(WidgetConfigurationKeys.appGroupID.isEmpty)
    }

    // MARK: - DefaultsKey Uniqueness

    func testDefaultsKeysAreNonEmpty() {
        let keys = allDefaultsKeys()
        for key in keys {
            XCTAssertFalse(key.isEmpty, "DefaultsKey value should not be empty")
        }
    }

    func testDefaultsKeysAreUnique() {
        let keys = allDefaultsKeys()
        let uniqueKeys = Set(keys)
        XCTAssertEqual(
            keys.count,
            uniqueKeys.count,
            "All DefaultsKey values must be unique"
        )
    }

    // MARK: - WidgetKind Uniqueness

    func testWidgetKindValuesAreNonEmpty() {
        let kinds = allWidgetKinds()
        for kind in kinds {
            XCTAssertFalse(kind.isEmpty, "WidgetKind value should not be empty")
        }
    }

    func testWidgetKindValuesAreUnique() {
        let kinds = allWidgetKinds()
        let uniqueKinds = Set(kinds)
        XCTAssertEqual(
            kinds.count,
            uniqueKinds.count,
            "All WidgetKind values must be unique"
        )
    }

    // MARK: - Keychain

    func testKeychainAuthTokenKeyIsNonEmpty() {
        XCTAssertFalse(WidgetConfigurationKeys.keychainAuthTokenKey.isEmpty)
    }

    // MARK: - Helpers

    private func allDefaultsKeys() -> [String] {
        [
            WidgetConfigurationKeys.DefaultsKey.nowPlaying,
            WidgetConfigurationKeys.DefaultsKey.continueWatching,
            WidgetConfigurationKeys.DefaultsKey.trendingSummary,
            WidgetConfigurationKeys.DefaultsKey.shabbatData,
            WidgetConfigurationKeys.DefaultsKey.playlists,
            WidgetConfigurationKeys.DefaultsKey.lastSyncTimestamp,
        ]
    }

    private func allWidgetKinds() -> [String] {
        [
            WidgetConfigurationKeys.WidgetKind.nowPlaying,
            WidgetConfigurationKeys.WidgetKind.continueWatching,
            WidgetConfigurationKeys.WidgetKind.trendingNews,
            WidgetConfigurationKeys.WidgetKind.quickActions,
            WidgetConfigurationKeys.WidgetKind.shabbatMode,
            WidgetConfigurationKeys.WidgetKind.playlist,
        ]
    }
}
