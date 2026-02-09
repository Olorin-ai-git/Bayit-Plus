import XCTest
@testable import BayitPlusApp

final class ShoreshParserTests: XCTestCase {

    private let parser = DefaultShoreshParser()

    // MARK: - Valid JSON Parsing

    func testParsesSingleSegmentWithShoresh() {
        let json = """
        {"segments":[{"word":"כתבתי","shoresh":"כתב"}]}
        """

        let result = parser.parseForDisplay(json)

        XCTAssertEqual(result.count, 1)
        XCTAssertEqual(result[0].originalWord, "כתבתי")
        XCTAssertEqual(result[0].characters.count, 6)
    }

    func testParsesMultipleSegments() {
        let json = """
        {"segments":[{"word":"הלכתי","shoresh":"הלך"},{"word":"לבית","shoresh":null}]}
        """

        let result = parser.parseForDisplay(json)

        XCTAssertEqual(result.count, 2)
        XCTAssertEqual(result[0].originalWord, "הלכתי")
        XCTAssertEqual(result[1].originalWord, "לבית")
    }

    func testSegmentWithoutShoreshHasNoHighlighting() {
        let json = """
        {"segments":[{"word":"את","shoresh":null}]}
        """

        let result = parser.parseForDisplay(json)

        XCTAssertEqual(result.count, 1)
        let allNotRoot = result[0].characters.allSatisfy { !$0.isRoot }
        XCTAssertTrue(allNotRoot, "Word without shoresh should have no highlighted characters")
    }

    func testRootLettersAreHighlighted() {
        // "כתבתי" with root "כתב" - first 3 chars should be root
        let json = """
        {"segments":[{"word":"כתבתי","shoresh":"כתב"}]}
        """

        let result = parser.parseForDisplay(json)
        let chars = result[0].characters

        // כ(0), ת(1), ב(2) are root letters; ת(3), י(4) are not
        XCTAssertTrue(chars[0].isRoot, "כ should be root")
        XCTAssertTrue(chars[1].isRoot, "ת should be root")
        XCTAssertTrue(chars[2].isRoot, "ב should be root")
        XCTAssertFalse(chars[3].isRoot, "ת (suffix) should not be root")
        XCTAssertFalse(chars[4].isRoot, "י should not be root")
    }

    // MARK: - Sofit (Final Form) Matching

    func testSofitKafMatching() {
        // Word ends with ך (kaf sofit), root has כ (regular kaf)
        let json = """
        {"segments":[{"word":"דרך","shoresh":"דרכ"}]}
        """

        let result = parser.parseForDisplay(json)
        let chars = result[0].characters

        // All 3 characters should be root (ך matches כ)
        XCTAssertTrue(chars[0].isRoot, "ד should be root")
        XCTAssertTrue(chars[1].isRoot, "ר should be root")
        XCTAssertTrue(chars[2].isRoot, "ך should match כ and be root")
    }

    func testSofitMemMatching() {
        // Word ends with ם (mem sofit), root has מ (regular mem)
        let json = """
        {"segments":[{"word":"שלם","shoresh":"שלמ"}]}
        """

        let result = parser.parseForDisplay(json)
        let chars = result[0].characters

        XCTAssertTrue(chars[0].isRoot)
        XCTAssertTrue(chars[1].isRoot)
        XCTAssertTrue(chars[2].isRoot, "ם should match מ and be root")
    }

    func testSofitNunMatching() {
        // Word ends with ן (nun sofit), root has נ (regular nun)
        let json = """
        {"segments":[{"word":"גן","shoresh":"גנ"}]}
        """

        let result = parser.parseForDisplay(json)
        let chars = result[0].characters

        XCTAssertTrue(chars[0].isRoot)
        XCTAssertTrue(chars[1].isRoot, "ן should match נ and be root")
    }

    // MARK: - Empty / Invalid Input

    func testEmptyJsonStringReturnsEmpty() {
        let result = parser.parseForDisplay("")
        XCTAssertTrue(result.isEmpty)
    }

    func testInvalidJsonReturnsEmpty() {
        let result = parser.parseForDisplay("{not valid json")
        XCTAssertTrue(result.isEmpty)
    }

    func testEmptySegmentsArrayReturnsEmpty() {
        let json = """
        {"segments":[]}
        """

        let result = parser.parseForDisplay(json)
        XCTAssertTrue(result.isEmpty)
    }

    func testMissingSegmentsKeyReturnsEmpty() {
        let json = """
        {"words":[{"word":"test","shoresh":"tst"}]}
        """

        let result = parser.parseForDisplay(json)
        XCTAssertTrue(result.isEmpty)
    }

    // MARK: - Character Identity

    func testCharactersPreserveOriginalOrder() {
        let json = """
        {"segments":[{"word":"אבגד","shoresh":null}]}
        """

        let result = parser.parseForDisplay(json)
        let word = result[0]

        XCTAssertEqual(word.characters[0].character, "א")
        XCTAssertEqual(word.characters[1].character, "ב")
        XCTAssertEqual(word.characters[2].character, "ג")
        XCTAssertEqual(word.characters[3].character, "ד")
    }

    func testEachHighlightedWordHasUniqueID() {
        let json = """
        {"segments":[{"word":"אחד","shoresh":null},{"word":"שניים","shoresh":null}]}
        """

        let result = parser.parseForDisplay(json)
        XCTAssertNotEqual(result[0].id, result[1].id)
    }
}
