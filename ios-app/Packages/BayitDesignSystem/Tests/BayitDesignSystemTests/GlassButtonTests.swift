import XCTest
import SwiftUI
@testable import BayitDesignSystem

final class GlassButtonTests: XCTestCase {

    // MARK: - Variant Tests

    func testButtonVariantPrimary() {
        var actionCalled = false
        let button = GlassButton(
            "Primary Button",
            variant: .primary,
            action: { actionCalled = true }
        )

        XCTAssertEqual(button.title, "Primary Button")
        XCTAssertEqual(button.variant, .primary)
        XCTAssertEqual(button.size, .medium)
        XCTAssertFalse(button.isDisabled)
        XCTAssertFalse(button.isLoading)
        XCTAssertNil(button.icon)
    }

    func testButtonVariantSecondary() {
        var actionCalled = false
        let button = GlassButton(
            "Secondary Button",
            variant: .secondary,
            action: { actionCalled = true }
        )

        XCTAssertEqual(button.variant, .secondary)
    }

    func testButtonVariantGhost() {
        var actionCalled = false
        let button = GlassButton(
            "Ghost Button",
            variant: .ghost,
            action: { actionCalled = true }
        )

        XCTAssertEqual(button.variant, .ghost)
    }

    func testButtonVariantDestructive() {
        var actionCalled = false
        let button = GlassButton(
            "Delete",
            variant: .destructive,
            action: { actionCalled = true }
        )

        XCTAssertEqual(button.variant, .destructive)
    }

    // MARK: - Size Tests

    func testButtonSizeSmall() {
        var actionCalled = false
        let button = GlassButton(
            "Small",
            size: .small,
            action: { actionCalled = true }
        )

        XCTAssertEqual(button.size, .small)
        XCTAssertEqual(button.size.verticalPadding, DesignTokens.Spacing.sm)
        XCTAssertEqual(button.size.horizontalPadding, DesignTokens.Spacing.md)
        XCTAssertEqual(button.size.fontSize, DesignTokens.FontSize.sm)
    }

    func testButtonSizeMedium() {
        var actionCalled = false
        let button = GlassButton(
            "Medium",
            size: .medium,
            action: { actionCalled = true }
        )

        XCTAssertEqual(button.size, .medium)
        XCTAssertEqual(button.size.verticalPadding, DesignTokens.Spacing.md)
        XCTAssertEqual(button.size.horizontalPadding, DesignTokens.Spacing.lg)
        XCTAssertEqual(button.size.fontSize, DesignTokens.FontSize.base)
    }

    func testButtonSizeLarge() {
        var actionCalled = false
        let button = GlassButton(
            "Large",
            size: .large,
            action: { actionCalled = true }
        )

        XCTAssertEqual(button.size, .large)
        XCTAssertEqual(button.size.verticalPadding, DesignTokens.Spacing.base)
        XCTAssertEqual(button.size.horizontalPadding, DesignTokens.Spacing.xl)
        XCTAssertEqual(button.size.fontSize, DesignTokens.FontSize.md)
    }

    // MARK: - State Tests

    func testButtonDisabledState() {
        var actionCalled = false
        let button = GlassButton(
            "Disabled",
            isDisabled: true,
            action: { actionCalled = true }
        )

        XCTAssertTrue(button.isDisabled)
        XCTAssertFalse(button.isLoading)
    }

    func testButtonLoadingState() {
        var actionCalled = false
        let button = GlassButton(
            "Loading",
            isLoading: true,
            action: { actionCalled = true }
        )

        XCTAssertFalse(button.isDisabled)
        XCTAssertTrue(button.isLoading)
    }

    func testButtonWithIcon() {
        var actionCalled = false
        let icon = Image(systemName: "star.fill")
        let button = GlassButton(
            "With Icon",
            icon: icon,
            action: { actionCalled = true }
        )

        XCTAssertNotNil(button.icon)
    }

    // MARK: - Initialization Tests

    func testButtonDefaultInitialization() {
        var actionCalled = false
        let button = GlassButton(
            "Default Button",
            action: { actionCalled = true }
        )

        XCTAssertEqual(button.title, "Default Button")
        XCTAssertEqual(button.variant, .primary)
        XCTAssertEqual(button.size, .medium)
        XCTAssertFalse(button.isDisabled)
        XCTAssertFalse(button.isLoading)
        XCTAssertNil(button.icon)
    }

    func testButtonCustomInitialization() {
        var actionCalled = false
        let icon = Image(systemName: "heart.fill")
        let button = GlassButton(
            "Custom Button",
            variant: .secondary,
            size: .large,
            isDisabled: true,
            isLoading: false,
            icon: icon,
            action: { actionCalled = true }
        )

        XCTAssertEqual(button.title, "Custom Button")
        XCTAssertEqual(button.variant, .secondary)
        XCTAssertEqual(button.size, .large)
        XCTAssertTrue(button.isDisabled)
        XCTAssertFalse(button.isLoading)
        XCTAssertNotNil(button.icon)
    }

    // MARK: - Variant Equality Tests

    func testVariantEquality() {
        XCTAssertEqual(GlassButton.Variant.primary, GlassButton.Variant.primary)
        XCTAssertEqual(GlassButton.Variant.secondary, GlassButton.Variant.secondary)
        XCTAssertEqual(GlassButton.Variant.ghost, GlassButton.Variant.ghost)
        XCTAssertEqual(GlassButton.Variant.destructive, GlassButton.Variant.destructive)

        XCTAssertNotEqual(GlassButton.Variant.primary, GlassButton.Variant.secondary)
    }

    // MARK: - Size Equality Tests

    func testSizeEquality() {
        XCTAssertEqual(GlassButton.Size.small, GlassButton.Size.small)
        XCTAssertEqual(GlassButton.Size.medium, GlassButton.Size.medium)
        XCTAssertEqual(GlassButton.Size.large, GlassButton.Size.large)

        XCTAssertNotEqual(GlassButton.Size.small, GlassButton.Size.medium)
    }

    // MARK: - Size Properties Tests

    func testSizeVerticalPaddingValues() {
        XCTAssertEqual(GlassButton.Size.small.verticalPadding, 8.0)
        XCTAssertEqual(GlassButton.Size.medium.verticalPadding, 12.0)
        XCTAssertEqual(GlassButton.Size.large.verticalPadding, 16.0)
    }

    func testSizeHorizontalPaddingValues() {
        XCTAssertEqual(GlassButton.Size.small.horizontalPadding, 12.0)
        XCTAssertEqual(GlassButton.Size.medium.horizontalPadding, 20.0)
        XCTAssertEqual(GlassButton.Size.large.horizontalPadding, 24.0)
    }

    func testSizeFontSizeValues() {
        XCTAssertEqual(GlassButton.Size.small.fontSize, 12.0)
        XCTAssertEqual(GlassButton.Size.medium.fontSize, 14.0)
        XCTAssertEqual(GlassButton.Size.large.fontSize, 16.0)
    }
}
