#if os(tvOS)
import SwiftUI

/// Design tokens adapted for tvOS 10-foot UI viewing distance.
/// Font sizes are 1.5-2x larger, spacing is more generous,
/// and focus targets meet Apple TV minimum requirements.
public enum TVDesignTokens {

    // MARK: - Focus Configuration

    public enum Focus {
        /// Scale factor when an element has focus (1.0 = no scale)
        public static let scaleAmount: CGFloat = 1.05
        /// Focus ring stroke width
        public static let ringWidth: CGFloat = 3
        /// Shadow radius for focused elements
        public static let shadowRadius: CGFloat = 12
        /// Animation duration for focus transitions
        public static let animationDuration: Double = 0.25
    }

    // MARK: - Typography (10-foot scale, 1.5-2x base)

    public enum FontSize {
        public static let xs: CGFloat = 18
        public static let sm: CGFloat = 22
        public static let base: CGFloat = 26
        public static let md: CGFloat = 30
        public static let lg: CGFloat = 34
        public static let xl: CGFloat = 38
        public static let xxl: CGFloat = 44
        public static let xxxl: CGFloat = 52
        public static let display: CGFloat = 64
        public static let hero: CGFloat = 80
    }

    // MARK: - Spacing (generous for remote navigation)

    public enum Spacing {
        public static let xxs: CGFloat = 4
        public static let xs: CGFloat = 8
        public static let sm: CGFloat = 12
        public static let md: CGFloat = 20
        public static let base: CGFloat = 28
        public static let lg: CGFloat = 36
        public static let xl: CGFloat = 44
        public static let xxl: CGFloat = 56
        public static let xxxl: CGFloat = 72
        public static let xxxxl: CGFloat = 96
        /// Minimum gap between focusable items
        public static let focusGap: CGFloat = 40
    }

    // MARK: - Minimum Sizes (Apple TV HIG requirements)

    public enum MinSize {
        /// Minimum focusable element width
        public static let focusableWidth: CGFloat = 60
        /// Minimum focusable element height
        public static let focusableHeight: CGFloat = 60
        /// Content poster width
        public static let posterWidth: CGFloat = 300
        /// Content poster height (2:3 aspect)
        public static let posterHeight: CGFloat = 450
        /// Hero banner height
        public static let heroHeight: CGFloat = 620
        /// Content shelf row height
        public static let shelfRowHeight: CGFloat = 320
    }

    // MARK: - Logo

    public enum Logo {
        public static let width: CGFloat = 160
        public static let height: CGFloat = 80
    }

    // MARK: - QR Code

    public enum QRCode {
        public static let size: CGFloat = 280
    }

    // MARK: - Form

    public enum Form {
        public static let maxWidth: CGFloat = 500
    }

    // MARK: - Border Radius (larger for TV)

    public enum Radius {
        public static let sm: CGFloat = 8
        public static let `default`: CGFloat = 12
        public static let md: CGFloat = 16
        public static let lg: CGFloat = 20
        public static let xl: CGFloat = 28
        public static let card: CGFloat = 16
        public static let poster: CGFloat = 12
    }
}
#endif
