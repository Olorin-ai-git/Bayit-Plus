import XCTest
import SwiftUI
@testable import BayitDesignSystem

final class DesignTokensTests: XCTestCase {

    // MARK: - Primary Color Tests

    func testPrimaryColorScale() {
        XCTAssertNotNil(DesignTokens.Primary.p50)
        XCTAssertNotNil(DesignTokens.Primary.p100)
        XCTAssertNotNil(DesignTokens.Primary.p200)
        XCTAssertNotNil(DesignTokens.Primary.p300)
        XCTAssertNotNil(DesignTokens.Primary.p400)
        XCTAssertNotNil(DesignTokens.Primary.p500)
        XCTAssertNotNil(DesignTokens.Primary.p600)
        XCTAssertNotNil(DesignTokens.Primary.p700)
        XCTAssertNotNil(DesignTokens.Primary.p800)
        XCTAssertNotNil(DesignTokens.Primary.p900)
        XCTAssertNotNil(DesignTokens.Primary.p950)
    }

    func testPrimaryDefaultColor() {
        XCTAssertEqual(DesignTokens.Primary.default, DesignTokens.Primary.p700)
    }

    // MARK: - Secondary Color Tests

    func testSecondaryColorScale() {
        XCTAssertNotNil(DesignTokens.Secondary.s400)
        XCTAssertNotNil(DesignTokens.Secondary.s500)
        XCTAssertNotNil(DesignTokens.Secondary.s600)
        XCTAssertNotNil(DesignTokens.Secondary.s700)
        XCTAssertNotNil(DesignTokens.Secondary.s800)
    }

    func testSecondaryDefaultColor() {
        XCTAssertEqual(DesignTokens.Secondary.default, DesignTokens.Secondary.s800)
    }

    // MARK: - Semantic Color Tests

    func testSuccessColorScale() {
        XCTAssertNotNil(DesignTokens.Success.s400)
        XCTAssertNotNil(DesignTokens.Success.s500)
        XCTAssertNotNil(DesignTokens.Success.s600)
        XCTAssertEqual(DesignTokens.Success.default, DesignTokens.Success.s500)
    }

    func testWarningColorScale() {
        XCTAssertNotNil(DesignTokens.Warning.w400)
        XCTAssertNotNil(DesignTokens.Warning.w500)
        XCTAssertNotNil(DesignTokens.Warning.w600)
        XCTAssertEqual(DesignTokens.Warning.default, DesignTokens.Warning.w500)
    }

    func testErrorColorScale() {
        XCTAssertNotNil(DesignTokens.ErrorColor.e400)
        XCTAssertNotNil(DesignTokens.ErrorColor.e500)
        XCTAssertNotNil(DesignTokens.ErrorColor.e600)
        XCTAssertEqual(DesignTokens.ErrorColor.default, DesignTokens.ErrorColor.e500)
    }

    func testInfoColorScale() {
        XCTAssertNotNil(DesignTokens.Info.i400)
        XCTAssertNotNil(DesignTokens.Info.i500)
        XCTAssertNotNil(DesignTokens.Info.i600)
        XCTAssertEqual(DesignTokens.Info.default, DesignTokens.Info.i500)
    }

    // MARK: - Special Color Tests

    func testSpecialColors() {
        XCTAssertNotNil(DesignTokens.live)
        XCTAssertNotNil(DesignTokens.gold)
    }

    // MARK: - Glass Color Tests

    func testGlassColors() {
        XCTAssertNotNil(DesignTokens.Glass.bg)
        XCTAssertNotNil(DesignTokens.Glass.bgLight)
        XCTAssertNotNil(DesignTokens.Glass.bgMedium)
        XCTAssertNotNil(DesignTokens.Glass.bgStrong)
        XCTAssertNotNil(DesignTokens.Glass.border)
        XCTAssertNotNil(DesignTokens.Glass.borderLight)
        XCTAssertNotNil(DesignTokens.Glass.borderFocus)
        XCTAssertNotNil(DesignTokens.Glass.purpleLight)
        XCTAssertNotNil(DesignTokens.Glass.purpleStrong)
        XCTAssertNotNil(DesignTokens.Glass.purpleGlow)
    }

    // MARK: - Text Color Tests

    func testTextColors() {
        XCTAssertNotNil(DesignTokens.Text.primary)
        XCTAssertNotNil(DesignTokens.Text.secondary)
        XCTAssertNotNil(DesignTokens.Text.muted)
        XCTAssertNotNil(DesignTokens.Text.disabled)
    }

    // MARK: - Background Color Tests

    func testBackgroundColors() {
        XCTAssertNotNil(DesignTokens.Background.primary)
        XCTAssertNotNil(DesignTokens.Background.elevated)
    }

    // MARK: - Spacing Tests

    func testSpacingScale() {
        XCTAssertEqual(DesignTokens.Spacing.xxs, 2)
        XCTAssertEqual(DesignTokens.Spacing.xs, 4)
        XCTAssertEqual(DesignTokens.Spacing.sm, 8)
        XCTAssertEqual(DesignTokens.Spacing.md, 12)
        XCTAssertEqual(DesignTokens.Spacing.base, 16)
        XCTAssertEqual(DesignTokens.Spacing.lg, 20)
        XCTAssertEqual(DesignTokens.Spacing.xl, 24)
        XCTAssertEqual(DesignTokens.Spacing.xxl, 32)
        XCTAssertEqual(DesignTokens.Spacing.xxxl, 40)
        XCTAssertEqual(DesignTokens.Spacing.xxxxl, 48)
    }

    func testSpacingFollowsFourPointGrid() {
        let spacingValues: [CGFloat] = [
            DesignTokens.Spacing.xxs,
            DesignTokens.Spacing.xs,
            DesignTokens.Spacing.sm,
            DesignTokens.Spacing.md,
            DesignTokens.Spacing.base,
            DesignTokens.Spacing.lg,
            DesignTokens.Spacing.xl,
            DesignTokens.Spacing.xxl,
            DesignTokens.Spacing.xxxl,
            DesignTokens.Spacing.xxxxl
        ]

        for value in spacingValues {
            // All spacing should be divisible by 2 (4-point grid base)
            XCTAssertEqual(value.truncatingRemainder(dividingBy: 2), 0)
        }
    }

    // MARK: - Border Radius Tests

    func testBorderRadiusScale() {
        XCTAssertEqual(DesignTokens.Radius.sm, 4)
        XCTAssertEqual(DesignTokens.Radius.default, 8)
        XCTAssertEqual(DesignTokens.Radius.md, 12)
        XCTAssertEqual(DesignTokens.Radius.lg, 16)
        XCTAssertEqual(DesignTokens.Radius.xl, 24)
        XCTAssertEqual(DesignTokens.Radius.xxl, 32)
        XCTAssertEqual(DesignTokens.Radius.full, 9999)
    }

    // MARK: - Font Size Tests

    func testFontSizeScale() {
        XCTAssertEqual(DesignTokens.FontSize.xs, 10)
        XCTAssertEqual(DesignTokens.FontSize.sm, 12)
        XCTAssertEqual(DesignTokens.FontSize.base, 14)
        XCTAssertEqual(DesignTokens.FontSize.md, 16)
        XCTAssertEqual(DesignTokens.FontSize.lg, 18)
        XCTAssertEqual(DesignTokens.FontSize.xl, 20)
        XCTAssertEqual(DesignTokens.FontSize.xxl, 24)
        XCTAssertEqual(DesignTokens.FontSize.xxxl, 30)
        XCTAssertEqual(DesignTokens.FontSize.display, 36)
        XCTAssertEqual(DesignTokens.FontSize.hero, 48)
    }

    func testFontSizeProgression() {
        // Font sizes should increase progressively
        XCTAssertLessThan(DesignTokens.FontSize.xs, DesignTokens.FontSize.sm)
        XCTAssertLessThan(DesignTokens.FontSize.sm, DesignTokens.FontSize.base)
        XCTAssertLessThan(DesignTokens.FontSize.base, DesignTokens.FontSize.md)
        XCTAssertLessThan(DesignTokens.FontSize.md, DesignTokens.FontSize.lg)
        XCTAssertLessThan(DesignTokens.FontSize.lg, DesignTokens.FontSize.xl)
        XCTAssertLessThan(DesignTokens.FontSize.xl, DesignTokens.FontSize.xxl)
        XCTAssertLessThan(DesignTokens.FontSize.xxl, DesignTokens.FontSize.xxxl)
        XCTAssertLessThan(DesignTokens.FontSize.xxxl, DesignTokens.FontSize.display)
        XCTAssertLessThan(DesignTokens.FontSize.display, DesignTokens.FontSize.hero)
    }

    // MARK: - Color Hex Extension Tests

    func testColorHexInitialization() {
        let purpleColor = Color(hex: 0x7E22CE)
        XCTAssertNotNil(purpleColor)

        let redColor = Color(hex: 0xFF0000)
        XCTAssertNotNil(redColor)

        let greenColor = Color(hex: 0x00FF00)
        XCTAssertNotNil(greenColor)

        let blueColor = Color(hex: 0x0000FF)
        XCTAssertNotNil(blueColor)
    }

    func testColorHexWithAlpha() {
        let semiTransparent = Color(hex: 0x7E22CE, alpha: 0.5)
        XCTAssertNotNil(semiTransparent)

        let fullyOpaque = Color(hex: 0x7E22CE, alpha: 1.0)
        XCTAssertNotNil(fullyOpaque)

        let fullyTransparent = Color(hex: 0x7E22CE, alpha: 0.0)
        XCTAssertNotNil(fullyTransparent)
    }

    // MARK: - Consistency Tests

    func testColorsNamespaceConsistency() {
        // Colors.Primary should match Primary
        XCTAssertNotNil(DesignTokens.Colors.Primary.base)
        XCTAssertNotNil(DesignTokens.Primary.default)
    }

    func testColorsNamespaceTextColors() {
        XCTAssertNotNil(DesignTokens.Colors.Text.primary)
        XCTAssertNotNil(DesignTokens.Colors.Text.secondary)
        XCTAssertNotNil(DesignTokens.Colors.Text.muted)
        XCTAssertNotNil(DesignTokens.Colors.Text.disabled)
    }

    func testColorsNamespaceGlassColors() {
        XCTAssertNotNil(DesignTokens.Colors.Glass.background)
        XCTAssertNotNil(DesignTokens.Colors.Glass.backgroundLight)
        XCTAssertNotNil(DesignTokens.Colors.Glass.border)
        XCTAssertNotNil(DesignTokens.Colors.Glass.borderFocus)
    }
}
