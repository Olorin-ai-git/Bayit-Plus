import XCTest
@testable import BayitWidgetShared

final class SharedDefaultsTests: XCTestCase {

    private var defaults: SharedDefaults!
    private let testSuiteName = "tv.bayit.test.sharedDefaults.\(UUID().uuidString)"

    override func setUp() {
        super.setUp()
        defaults = SharedDefaults(suiteName: testSuiteName)
    }

    override func tearDown() {
        UserDefaults(suiteName: testSuiteName)?.removePersistentDomain(
            forName: testSuiteName
        )
        defaults = nil
        super.tearDown()
    }

    // MARK: - Initialization

    func testCreatesWithCustomSuiteName() {
        XCTAssertNotNil(defaults, "SharedDefaults should be created with a custom suite name")
    }

    // MARK: - Encode / Decode Round Trip

    func testEncodeDecodeRoundTrip() {
        let original = SampleCodable(name: "Shabbat Shalom", value: 42)

        defaults.encode(original, forKey: "test.roundTrip")
        let decoded = defaults.decode(SampleCodable.self, forKey: "test.roundTrip")

        XCTAssertEqual(decoded?.name, original.name)
        XCTAssertEqual(decoded?.value, original.value)
    }

    // MARK: - Decode Missing Key

    func testDecodeReturnsNilForMissingKey() {
        let result = defaults.decode(SampleCodable.self, forKey: "test.nonexistent")
        XCTAssertNil(result)
    }

    // MARK: - Decode Corrupted Data

    func testDecodeReturnsNilForCorruptedData() {
        let corruptedData = Data([0xFF, 0xFE, 0x00, 0x01])
        defaults.setData(corruptedData, forKey: "test.corrupted")

        let result = defaults.decode(SampleCodable.self, forKey: "test.corrupted")
        XCTAssertNil(result, "Decode should return nil for non-JSON data")
    }

    // MARK: - Remove Object

    func testRemoveObjectDeletesData() {
        defaults.encode(SampleCodable(name: "temp", value: 1), forKey: "test.toRemove")
        XCTAssertNotNil(defaults.decode(SampleCodable.self, forKey: "test.toRemove"))

        defaults.removeObject(forKey: "test.toRemove")
        XCTAssertNil(defaults.decode(SampleCodable.self, forKey: "test.toRemove"))
    }

    // MARK: - Last Sync Timestamp

    func testLastSyncTimestampIsNilInitially() {
        XCTAssertNil(defaults.lastSyncTimestamp)
    }

    func testLastSyncTimestampUpdatedAfterSetData() {
        let data = Data([0x01, 0x02])
        let beforeSet = Date()

        defaults.setData(data, forKey: "test.sync")

        guard let timestamp = defaults.lastSyncTimestamp else {
            XCTFail("lastSyncTimestamp should not be nil after setData")
            return
        }
        XCTAssertGreaterThanOrEqual(
            timestamp.timeIntervalSince1970,
            beforeSet.timeIntervalSince1970 - 1,
            "Timestamp should be recent"
        )
    }

    func testLastSyncTimestampUpdatedAfterEncode() {
        defaults.encode(SampleCodable(name: "sync", value: 99), forKey: "test.encodedSync")

        XCTAssertNotNil(
            defaults.lastSyncTimestamp,
            "lastSyncTimestamp should update after encode (which calls setData)"
        )
    }
}

// MARK: - Test Helper

private struct SampleCodable: Codable, Equatable {
    let name: String
    let value: Int
}
