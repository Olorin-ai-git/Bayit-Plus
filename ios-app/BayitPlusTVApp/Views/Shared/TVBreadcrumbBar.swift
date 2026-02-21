#if os(tvOS)
    import BayitDesignSystem
    import SwiftUI

    /// Always-visible breadcrumb bar for tvOS navigation.
    /// Purely visual indicator showing the current navigation trail.
    /// Does not participate in the focus engine to avoid trapping focus.
    /// Users navigate back via the Siri Remote Menu button.
    struct TVBreadcrumbBar: View {
        @Environment(TVNavigationCoordinator.self) private var coordinator

        var body: some View {
            let trail = coordinator.currentBreadcrumbs
            let tabTitle = coordinator.selectedTab.title
            let tabIcon = coordinator.selectedTab.iconName

            HStack(spacing: TVDesignTokens.Spacing.sm) {
                tabRootLabel(title: tabTitle, icon: tabIcon)

                ForEach(Array(trail.enumerated()), id: \.element.id) { index, entry in
                    let isLast = index == trail.count - 1

                    chevronSeparator

                    if isLast {
                        currentItem(entry)
                    } else {
                        ancestorLabel(entry)
                    }
                }

                Spacer()
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            .padding(.vertical, TVDesignTokens.Spacing.md)
            .background(DesignTokens.Glass.bg)
            .focusable(false)
        }

        private func tabRootLabel(title: String, icon: String) -> some View {
            HStack(spacing: TVDesignTokens.Spacing.xs) {
                Image(systemName: icon)
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                Text(title)
                    .font(.system(
                        size: TVDesignTokens.FontSize.sm,
                        weight: .medium
                    ))
            }
            .foregroundStyle(DesignTokens.Primary.p400)
            .padding(.horizontal, TVDesignTokens.Spacing.md)
            .padding(.vertical, TVDesignTokens.Spacing.xs)
            .background(DesignTokens.Glass.bgLight)
            .clipShape(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm)
            )
        }

        private func ancestorLabel(_ entry: TVBreadcrumbEntry) -> some View {
            HStack(spacing: TVDesignTokens.Spacing.xs) {
                if let icon = entry.icon {
                    Image(systemName: icon)
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                }
                Text(entry.label)
                    .font(.system(
                        size: TVDesignTokens.FontSize.sm,
                        weight: .medium
                    ))
                    .lineLimit(1)
            }
            .foregroundStyle(DesignTokens.Primary.p400)
            .padding(.horizontal, TVDesignTokens.Spacing.md)
            .padding(.vertical, TVDesignTokens.Spacing.xs)
            .background(DesignTokens.Glass.bgLight)
            .clipShape(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm)
            )
        }

        private func currentItem(_ entry: TVBreadcrumbEntry) -> some View {
            HStack(spacing: TVDesignTokens.Spacing.xs) {
                if let icon = entry.icon {
                    Image(systemName: icon)
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                }
                Text(entry.label)
                    .font(.system(
                        size: TVDesignTokens.FontSize.sm,
                        weight: .semibold
                    ))
                    .lineLimit(1)
            }
            .foregroundStyle(DesignTokens.Text.primary)
            .padding(.horizontal, TVDesignTokens.Spacing.md)
            .padding(.vertical, TVDesignTokens.Spacing.xs)
            .background(DesignTokens.Glass.purpleLight.opacity(0.3))
            .clipShape(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm)
            )
        }

        private var chevronSeparator: some View {
            Image(systemName: "chevron.right")
                .font(.system(size: TVDesignTokens.FontSize.xs, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.muted)
        }
    }

    // MARK: - Breadcrumb View Modifier

    /// Modifier that registers a breadcrumb entry when the view appears
    /// and removes it when the view disappears. Also displays the breadcrumb
    /// bar at the top of the view.
    struct TVBreadcrumbModifier: ViewModifier {
        @Environment(TVNavigationCoordinator.self) private var coordinator

        let label: String
        let icon: String?

        func body(content: Content) -> some View {
            VStack(spacing: 0) {
                TVBreadcrumbBar()
                content
            }
            .toolbar(.visible, for: .tabBar)
            .onAppear {
                coordinator.pushBreadcrumb(label: label, icon: icon)
            }
            .onDisappear {
                coordinator.popBreadcrumb()
            }
        }
    }

    extension View {
        /// Adds breadcrumb tracking and displays the breadcrumb bar at the top.
        /// Apply this to destination views inside NavigationLink.
        func tvBreadcrumb(_ label: String, icon: String? = nil) -> some View {
            modifier(TVBreadcrumbModifier(label: label, icon: icon))
        }
    }
#endif
