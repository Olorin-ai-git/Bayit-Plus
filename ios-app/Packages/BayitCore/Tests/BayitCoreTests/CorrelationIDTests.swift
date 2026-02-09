import XCTest
@testable import BayitCore

final class CorrelationIDTests: XCTestCase {

    func testGenerateReturnsLowercaseUUIDFormat() {
        let correlationID = CorrelationID.generate()

        // UUID format: 8-4-4-4-12 hex chars (36 total including hyphens)
        XCTAssertEqual(correlationID.count, 36)

        // Must be lowercase (no uppercase hex digits)
        XCTAssertEqual(correlationID, correlationID.lowercased())

        // Must match UUID regex pattern
        let uuidPattern = "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
        let regex = try? NSRegularExpression(pattern: uuidPattern)
        let range = NSRange(correlationID.startIndex..., in: correlationID)
        let match = regex?.firstMatch(in: correlationID, range: range)
        XCTAssertNotNil(match, "Correlation ID should match UUID pattern: \(correlationID)")
    }

    func testGenerateProducesUniqueValues() {
        let iterations = 100
        var ids = Set<String>()

        for _ in 0..<iterations {
            ids.insert(CorrelationID.generate())
        }

        XCTAssertEqual(ids.count, iterations, "All generated IDs should be unique")
    }

    func testGenerateIsNonEmpty() {
        let correlationID = CorrelationID.generate()
        XCTAssertFalse(correlationID.isEmpty)
    }
}
