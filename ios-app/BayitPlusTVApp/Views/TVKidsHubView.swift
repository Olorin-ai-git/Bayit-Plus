#if os(tvOS)
import BayitDesignSystem
import SwiftUI

/// Kids hub for tvOS - consolidates Children and Youngsters content.
/// Provides age-appropriate content sections with visual separation.
struct TVKidsHubView: View {
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @State private var selectedSection: KidsSection = .children

    enum KidsSection: String, CaseIterable {
        case children
        case youngsters

        var title: String {
            switch self {
            case .children: return "Kids"
            case .youngsters: return "Youngsters"
            }
        }

        var icon: String {
            switch self {
            case .children: return "figure.and.child.holdinghands"
            case .youngsters: return "figure.wave"
            }
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            sectionPicker

            Group {
                switch selectedSection {
                case .children:
                    TVChildrenView()
                case .youngsters:
                    TVYoungstersView()
                }
            }
        }
        .background(DesignTokens.Background.primary)
    }

    private var sectionPicker: some View {
        HStack(spacing: TVDesignTokens.Spacing.xl) {
            ForEach(KidsSection.allCases, id: \.rawValue) { section in
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        selectedSection = section
                    }
                } label: {
                    HStack(spacing: TVDesignTokens.Spacing.sm) {
                        Image(systemName: section.icon)
                            .font(.system(size: TVDesignTokens.FontSize.lg))
                        Text(section.title)
                            .font(.system(size: TVDesignTokens.FontSize.xl, weight: .semibold))
                    }
                    .padding(.horizontal, TVDesignTokens.Spacing.xl)
                    .padding(.vertical, TVDesignTokens.Spacing.md)
                    .background(
                        selectedSection == section
                            ? DesignTokens.Primary.p400.opacity(0.2)
                            : DesignTokens.Glass.bgLight
                    )
                    .cornerRadius(TVDesignTokens.Radius.lg)
                    .overlay(
                        RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                            .stroke(
                                selectedSection == section
                                    ? DesignTokens.Primary.p400
                                    : DesignTokens.Glass.border,
                                lineWidth: selectedSection == section ? 2 : 1
                            )
                    )
                }
                .buttonStyle(.plain)
            }

            Spacer()
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
        .padding(.vertical, TVDesignTokens.Spacing.lg)
    }
}
#endif
