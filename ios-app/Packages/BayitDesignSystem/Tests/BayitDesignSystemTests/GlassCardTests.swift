import XCTest
import SwiftUI
@testable import BayitDesignSystem

final class GlassCardTests: XCTestCase {

    // MARK: - Initialization Tests

    func testGlassCardDefaultInitialization() {
        let card = GlassCard {
            Text("Test Content")
        }

        XCTAssertEqual(card.radius, DesignTokens.Radius.lg)
        XCTAssertEqual(card.padding, DesignTokens.Spacing.base)
    }

    func testGlassCardCustomRadius() {
        let customRadius: CGFloat = 24.0
        let card = GlassCard(radius: customRadius) {
            Text("Test Content")
        }

        XCTAssertEqual(card.radius, customRadius)
        XCTAssertEqual(card.padding, DesignTokens.Spacing.base)
    }

    func testGlassCardCustomPadding() {
        let customPadding: CGFloat = 32.0
        let card = GlassCard(padding: customPadding) {
            Text("Test Content")
        }

        XCTAssertEqual(card.radius, DesignTokens.Radius.lg)
        XCTAssertEqual(card.padding, customPadding)
    }

    func testGlassCardCustomRadiusAndPadding() {
        let customRadius: CGFloat = 20.0
        let customPadding: CGFloat = 24.0
        let card = GlassCard(radius: customRadius, padding: customPadding) {
            Text("Test Content")
        }

        XCTAssertEqual(card.radius, customRadius)
        XCTAssertEqual(card.padding, customPadding)
    }

    // MARK: - Default Values Tests

    func testDefaultRadiusMatchesDesignTokens() {
        let card = GlassCard {
            Text("Test")
        }

        XCTAssertEqual(card.radius, DesignTokens.Radius.lg)
        XCTAssertEqual(DesignTokens.Radius.lg, 16.0)
    }

    func testDefaultPaddingMatchesDesignTokens() {
        let card = GlassCard {
            Text("Test")
        }

        XCTAssertEqual(card.padding, DesignTokens.Spacing.base)
        XCTAssertEqual(DesignTokens.Spacing.base, 16.0)
    }

    // MARK: - Content Builder Tests

    func testGlassCardWithSingleViewContent() {
        let card = GlassCard {
            Text("Single View")
        }

        XCTAssertNotNil(card)
    }

    func testGlassCardWithMultipleViewsContent() {
        let card = GlassCard {
            Text("Title")
            Text("Subtitle")
            Text("Body")
        }

        XCTAssertNotNil(card)
    }

    func testGlassCardWithEmptyContent() {
        let card = GlassCard {
            EmptyView()
        }

        XCTAssertNotNil(card)
    }

    // MARK: - Edge Case Tests

    func testGlassCardWithZeroRadius() {
        let card = GlassCard(radius: 0) {
            Text("No Radius")
        }

        XCTAssertEqual(card.radius, 0)
    }

    func testGlassCardWithZeroPadding() {
        let card = GlassCard(padding: 0) {
            Text("No Padding")
        }

        XCTAssertEqual(card.padding, 0)
    }

    func testGlassCardWithLargeRadius() {
        let largeRadius: CGFloat = 999.0
        let card = GlassCard(radius: largeRadius) {
            Text("Large Radius")
        }

        XCTAssertEqual(card.radius, largeRadius)
    }

    func testGlassCardWithLargePadding() {
        let largePadding: CGFloat = 999.0
        let card = GlassCard(padding: largePadding) {
            Text("Large Padding")
        }

        XCTAssertEqual(card.padding, largePadding)
    }

    // MARK: - View Hierarchy Tests

    func testGlassCardWithNestedViews() {
        let card = GlassCard {
            VStack {
                HStack {
                    Text("Nested")
                    Text("Content")
                }
            }
        }

        XCTAssertNotNil(card)
    }

    func testGlassCardWithConditionalContent() {
        let showContent = true
        let card = GlassCard {
            if showContent {
                Text("Visible")
            } else {
                Text("Hidden")
            }
        }

        XCTAssertNotNil(card)
    }
}
