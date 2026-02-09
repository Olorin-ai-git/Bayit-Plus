import XCTest
@testable import BayitPlusApp

final class ContentModelDecodingTests: XCTestCase {

    // MARK: - FlexibleRating

    func testFlexibleRatingDecodesFromDouble() throws {
        let json = "7.654".data(using: .utf8)!
        let rating = try JSONDecoder().decode(FlexibleRating.self, from: json)
        XCTAssertEqual(rating.value, "7.7")
    }

    func testFlexibleRatingDecodesFromInteger() throws {
        let json = "8".data(using: .utf8)!
        let rating = try JSONDecoder().decode(FlexibleRating.self, from: json)
        XCTAssertEqual(rating.value, "8.0")
    }

    func testFlexibleRatingDecodesFromString() throws {
        let json = "\"PG-13\"".data(using: .utf8)!
        let rating = try JSONDecoder().decode(FlexibleRating.self, from: json)
        XCTAssertEqual(rating.value, "PG-13")
    }

    func testFlexibleRatingDecodesFromEmptyString() throws {
        let json = "\"\"".data(using: .utf8)!
        let rating = try JSONDecoder().decode(FlexibleRating.self, from: json)
        XCTAssertEqual(rating.value, "")
    }

    func testFlexibleRatingDecodesFromNull() throws {
        // null falls through both decode attempts, yielding ""
        let json = "null".data(using: .utf8)!
        let rating = try JSONDecoder().decode(FlexibleRating.self, from: json)
        XCTAssertEqual(rating.value, "")
    }

    func testFlexibleRatingFormatsOneDecimalPlace() throws {
        let json = "9.12345".data(using: .utf8)!
        let rating = try JSONDecoder().decode(FlexibleRating.self, from: json)
        XCTAssertEqual(rating.value, "9.1")
    }

    // MARK: - ContentItem Equality

    func testContentItemEqualityByIdOnly() throws {
        let json1 = """
        {"id":"abc","title":"Movie A","year":2024}
        """.data(using: .utf8)!

        let json2 = """
        {"id":"abc","title":"Movie B","year":2025}
        """.data(using: .utf8)!

        let item1 = try JSONDecoder().decode(ContentItem.self, from: json1)
        let item2 = try JSONDecoder().decode(ContentItem.self, from: json2)

        XCTAssertEqual(item1, item2, "Items with same ID should be equal regardless of other fields")
    }

    func testContentItemInequalityByDifferentId() throws {
        let json1 = """
        {"id":"abc","title":"Same Title"}
        """.data(using: .utf8)!

        let json2 = """
        {"id":"xyz","title":"Same Title"}
        """.data(using: .utf8)!

        let item1 = try JSONDecoder().decode(ContentItem.self, from: json1)
        let item2 = try JSONDecoder().decode(ContentItem.self, from: json2)

        XCTAssertNotEqual(item1, item2, "Items with different IDs should not be equal")
    }

    // MARK: - ContentItem Hashable

    func testContentItemHashConsistency() throws {
        let json1 = """
        {"id":"test-123","title":"Alpha","year":2024}
        """.data(using: .utf8)!

        let json2 = """
        {"id":"test-123","title":"Beta","year":2025}
        """.data(using: .utf8)!

        let item1 = try JSONDecoder().decode(ContentItem.self, from: json1)
        let item2 = try JSONDecoder().decode(ContentItem.self, from: json2)

        // Equal items must have equal hash values
        XCTAssertEqual(item1.hashValue, item2.hashValue)
    }

    func testContentItemSetDeduplication() throws {
        let json1 = """
        {"id":"dup","title":"First"}
        """.data(using: .utf8)!

        let json2 = """
        {"id":"dup","title":"Second"}
        """.data(using: .utf8)!

        let json3 = """
        {"id":"unique","title":"Third"}
        """.data(using: .utf8)!

        let item1 = try JSONDecoder().decode(ContentItem.self, from: json1)
        let item2 = try JSONDecoder().decode(ContentItem.self, from: json2)
        let item3 = try JSONDecoder().decode(ContentItem.self, from: json3)

        let set: Set<ContentItem> = [item1, item2, item3]
        XCTAssertEqual(set.count, 2, "Set should deduplicate items with same ID")
    }

    // MARK: - ContentItem Decoding

    func testContentItemDecodesAllOptionalFields() throws {
        let json = """
        {"id":"full","title":"Title","thumbnail":"url","duration":"2h","year":2024,"category":"movies","type":"movie","isSeries":false,"totalEpisodes":null,"availableSubtitleLanguages":["en","he"],"hasSubtitles":true,"author":"Author","narrator":"Narrator"}
        """.data(using: .utf8)!

        let item = try JSONDecoder().decode(ContentItem.self, from: json)

        XCTAssertEqual(item.id, "full")
        XCTAssertEqual(item.title, "Title")
        XCTAssertEqual(item.thumbnail, "url")
        XCTAssertEqual(item.duration, "2h")
        XCTAssertEqual(item.year, 2024)
        XCTAssertEqual(item.category, "movies")
        XCTAssertEqual(item.type, "movie")
        XCTAssertEqual(item.isSeries, false)
        XCTAssertNil(item.totalEpisodes)
        XCTAssertEqual(item.availableSubtitleLanguages, ["en", "he"])
        XCTAssertEqual(item.hasSubtitles, true)
        XCTAssertEqual(item.author, "Author")
        XCTAssertEqual(item.narrator, "Narrator")
    }

    func testContentItemDecodesMinimalFields() throws {
        let json = """
        {"id":"minimal"}
        """.data(using: .utf8)!

        let item = try JSONDecoder().decode(ContentItem.self, from: json)

        XCTAssertEqual(item.id, "minimal")
        XCTAssertNil(item.title)
        XCTAssertNil(item.thumbnail)
        XCTAssertNil(item.year)
    }

    // MARK: - SearchRequest Encoding

    func testSearchRequestEncoding() throws {
        let request = SearchRequest(query: "test", type: "movie", page: 1, limit: 20)

        let data = try JSONEncoder().encode(request)
        let dict = try JSONSerialization.jsonObject(with: data) as? [String: Any]

        XCTAssertEqual(dict?["query"] as? String, "test")
        XCTAssertEqual(dict?["type"] as? String, "movie")
        XCTAssertEqual(dict?["page"] as? Int, 1)
        XCTAssertEqual(dict?["limit"] as? Int, 20)
    }

    func testSearchRequestEncodingWithNilOptionals() throws {
        let request = SearchRequest(query: "test", type: nil, page: nil, limit: nil)

        let data = try JSONEncoder().encode(request)
        let dict = try JSONSerialization.jsonObject(with: data) as? [String: Any]

        XCTAssertEqual(dict?["query"] as? String, "test")
        // nil optionals should not be present in encoded output
        XCTAssertNil(dict?["type"])
    }
}
