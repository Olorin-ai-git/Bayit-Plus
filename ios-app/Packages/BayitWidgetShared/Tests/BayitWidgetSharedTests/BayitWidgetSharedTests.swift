import XCTest
@testable import BayitWidgetShared

/// Verifies that the BayitWidgetShared module links and basic types are accessible.
final class BayitWidgetSharedSmokeTests: XCTestCase {

    func testModuleImportsSuccessfully() {
        // Verify core types are accessible after import
        let key = WidgetConfigurationKeys.DefaultsKey.nowPlaying
        XCTAssertFalse(key.isEmpty)
    }
}
