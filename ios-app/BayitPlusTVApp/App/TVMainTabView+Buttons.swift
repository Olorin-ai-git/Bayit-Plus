#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import BayitMedia
    import SwiftUI

    // MARK: - TVMainTabView + Button & Sheet Helpers

    extension TVMainTabView {
        // MARK: - Proactive Suggestion Navigation

        func handleProactiveSuggestion(_ suggestion: ProactiveSuggestion) {
            guard let contentId = suggestion.action?.payload?["contentId"],
                  let contentType = suggestion.action?.payload?["contentType"]
            else {
                return
            }
            coordinator.presentPlayer(
                contentId: contentId,
                contentType: TVContentTypeMapper.map(contentType)
            )
        }

        var languageButton: some View {
            Button {
                showLanguagePicker = true
            } label: {
                HStack(spacing: TVDesignTokens.Spacing.xs) {
                    Image(systemName: "globe")
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                    Text(localization.currentLanguage.rawValue.uppercased())
                        .font(.system(
                            size: TVDesignTokens.FontSize.xs,
                            weight: .semibold
                        ))
                }
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.horizontal, TVDesignTokens.Spacing.md)
                .padding(.vertical, TVDesignTokens.Spacing.sm)
                .background(DesignTokens.Glass.bgMedium)
                .clipShape(Capsule())
                .overlay(
                    Capsule().stroke(DesignTokens.Glass.border, lineWidth: 1)
                )
            }
            .tvCardStyle()
            .accessibilityLabel(localization.t("settings.chooseLanguage"))
        }

        func widgetsButton(viewModel vm: WidgetDockViewModel) -> some View {
            Button {
                vm.isDockVisible ? vm.hideDock() : vm.showDock()
            } label: {
                HStack(spacing: TVDesignTokens.Spacing.xs) {
                    Image(systemName: "square.grid.2x2")
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                    Text("\(vm.widgets.count)")
                        .font(.system(
                            size: TVDesignTokens.FontSize.xs,
                            weight: .semibold
                        ))
                }
                .foregroundStyle(
                    vm.isDockVisible
                        ? DesignTokens.Primary.p300
                        : DesignTokens.Text.primary
                )
                .padding(.horizontal, TVDesignTokens.Spacing.md)
                .padding(.vertical, TVDesignTokens.Spacing.sm)
                .background(
                    vm.isDockVisible
                        ? DesignTokens.Primary.p400.opacity(0.15)
                        : DesignTokens.Glass.bgMedium
                )
                .clipShape(Capsule())
                .overlay(
                    Capsule().stroke(
                        vm.isDockVisible
                            ? DesignTokens.Primary.p400.opacity(0.4)
                            : DesignTokens.Glass.border,
                        lineWidth: 1
                    )
                )
            }
            .tvCardStyle()
            .accessibilityLabel(localization.t("nav.widgets"))
        }

        var profileButton: some View {
            Button {
                showProfile = true
            } label: {
                Image(systemName: "person.crop.circle")
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .frame(width: 44, height: 44)
                    .background(DesignTokens.Glass.bgMedium)
                    .clipShape(Circle())
                    .overlay(
                        Circle().stroke(DesignTokens.Glass.border, lineWidth: 1)
                    )
            }
            .tvCardStyle()
            .accessibilityLabel(localization.t("nav.profile"))
        }

        // MARK: - Widget Auto-Hide

        func handleWidgetFocusChanged(_ focused: Bool) {
            isWidgetAreaFocused = focused
            if focused {
                widgetAutoHideTask?.cancel()
                widgetAutoHideTask = nil
            } else {
                resetWidgetAutoHideTimer()
            }
        }

        func resetWidgetAutoHideTimer() {
            widgetAutoHideTask?.cancel()
            guard !isWidgetAreaFocused else { return }
            widgetAutoHideTask = Task {
                try? await Task.sleep(for: .seconds(10))
                guard !Task.isCancelled else { return }
                guard !isWidgetAreaFocused else { return }
                dockViewModel?.hideDock()
            }
        }

        // MARK: - Language Picker Sheet

        var languagePickerSheet: some View {
            VStack(spacing: 0) {
                // Close button at top-right, inside the layout flow so focus can reach it
                HStack {
                    Spacer()
                    Button {
                        showLanguagePicker = false
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: TVDesignTokens.FontSize.xl))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }
                    .tvCardStyle()
                    .accessibilityLabel(localization.t("common.dismiss"))
                }
                .padding(.top, TVDesignTokens.Spacing.md)
                .padding(.trailing, TVDesignTokens.Spacing.xl)

                TVLanguageSettingsView()
            }
            .background(DesignTokens.Background.primary)
            .onExitCommand { showLanguagePicker = false }
        }
    }
#endif
