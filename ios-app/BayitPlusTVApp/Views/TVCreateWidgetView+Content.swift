#if os(tvOS)
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - TVCreateWidgetView + Content & Save

    extension TVCreateWidgetView {
        // MARK: - Content Selection

        var contentSection: some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                Text(localization.t("widgets.content"))
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.secondary)

                if let selected = selectedContent {
                    selectedContentCard(selected)
                } else {
                    GlassButton("Browse Content", variant: .secondary, size: .large,
                                icon: Image(systemName: "square.grid.2x2"))
                    {
                        syncPickerTab(for: selectedContentType)
                        showContentPicker = true
                    }
                }
            }
        }

        func selectedContentCard(_ item: ContentPickerItem) -> some View {
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                if let url = item.thumbnailURL {
                    CachedAsyncImage(url: url) { phase in
                        if case let .success(img) = phase {
                            img.resizable().aspectRatio(contentMode: .fill)
                        } else {
                            contentPlaceholder(item.tab.iconName)
                        }
                    }
                    .frame(width: 80, height: 80)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))
                } else {
                    contentPlaceholder(item.tab.iconName)
                        .frame(width: 80, height: 80)
                        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))
                }

                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                    Text(item.title)
                        .font(.system(size: TVDesignTokens.FontSize.lg, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .lineLimit(1)

                    if let subtitle = item.subtitle {
                        Text(subtitle)
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.muted)
                            .lineLimit(1)
                    }
                }

                Spacer()

                GlassButton("Change", variant: .secondary, size: .medium) {
                    syncPickerTab(for: selectedContentType)
                    showContentPicker = true
                }
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Glass.bgMedium)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card))
        }

        func contentPlaceholder(_ iconName: String) -> some View {
            ZStack {
                DesignTokens.Glass.purpleLight
                Image(systemName: iconName)
                    .font(.system(size: TVDesignTokens.FontSize.xl))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        }

        // MARK: - Save

        func save() async {
            guard isFormValid, let selected = selectedContent else { return }
            isSaving = true
            error = nil

            let content = WidgetContentPayload(
                contentType: selected.tab.widgetContentType.rawValue,
                liveChannelId: selected.tab == .channels ? selected.id : nil,
                podcastId: selected.tab == .podcasts ? selected.id : nil,
                contentId: nil,
                stationId: selected.tab == .radio ? selected.id : nil,
                audiobookId: selected.tab == .audiobooks ? selected.id : nil,
                iframeUrl: nil,
                iframeTitle: nil
            )

            let request = CreateWidgetRequest(
                title: title.trimmingCharacters(in: .whitespacesAndNewlines),
                description: description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                    ? nil
                    : description.trimmingCharacters(in: .whitespacesAndNewlines),
                icon: nil,
                content: content
            )

            let success = await widgetsViewModel.createPersonalWidget(request)
            if success {
                onDismiss()
            } else {
                error = "Failed to create widget"
            }
            isSaving = false
        }

        // MARK: - Helpers

        func syncPickerTab(for contentType: WidgetContentType) {
            switch contentType {
            case .liveChannel, .live: pickerViewModel.selectedTab = .channels
            case .podcast: pickerViewModel.selectedTab = .podcasts
            case .radio: pickerViewModel.selectedTab = .radio
            case .audiobook: pickerViewModel.selectedTab = .audiobooks
            default: break
            }
        }

        func errorBanner(_ message: String) -> some View {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "exclamationmark.triangle")
                    .foregroundStyle(DesignTokens.ErrorColor.default)
                Text(message)
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.ErrorColor.default)
            }
            .padding(TVDesignTokens.Spacing.lg)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(DesignTokens.ErrorColor.default.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        }
    }
#endif
