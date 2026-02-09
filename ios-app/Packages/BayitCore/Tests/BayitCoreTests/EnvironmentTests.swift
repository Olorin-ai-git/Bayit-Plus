import XCTest
@testable import BayitCore

final class EnvironmentTests: XCTestCase {

    // MARK: - AppEnvironment Computed Properties

    func testDevelopmentIsDevelopment() {
        let env = AppEnvironment.development
        XCTAssertTrue(env.isDevelopment)
        XCTAssertFalse(env.isStaging)
        XCTAssertFalse(env.isProduction)
    }

    func testStagingIsStaging() {
        let env = AppEnvironment.staging
        XCTAssertFalse(env.isDevelopment)
        XCTAssertTrue(env.isStaging)
        XCTAssertFalse(env.isProduction)
    }

    func testProductionIsProduction() {
        let env = AppEnvironment.production
        XCTAssertFalse(env.isDevelopment)
        XCTAssertFalse(env.isStaging)
        XCTAssertTrue(env.isProduction)
    }

    // MARK: - Raw Value Initialization

    func testRawValueDevelopment() {
        let env = AppEnvironment(rawValue: "development")
        XCTAssertEqual(env, .development)
    }

    func testRawValueStaging() {
        let env = AppEnvironment(rawValue: "staging")
        XCTAssertEqual(env, .staging)
    }

    func testRawValueProduction() {
        let env = AppEnvironment(rawValue: "production")
        XCTAssertEqual(env, .production)
    }

    func testInvalidRawValueReturnsNil() {
        let env = AppEnvironment(rawValue: "invalid")
        XCTAssertNil(env)
    }

    func testEmptyRawValueReturnsNil() {
        let env = AppEnvironment(rawValue: "")
        XCTAssertNil(env)
    }

    // MARK: - All Cases Coverage

    func testAllCasesAreMutuallyExclusive() {
        let cases: [AppEnvironment] = [.development, .staging, .production]

        for env in cases {
            let trueCount = [env.isDevelopment, env.isStaging, env.isProduction]
                .filter { $0 }
                .count
            XCTAssertEqual(trueCount, 1, "\(env) should have exactly one true computed property")
        }
    }
}
