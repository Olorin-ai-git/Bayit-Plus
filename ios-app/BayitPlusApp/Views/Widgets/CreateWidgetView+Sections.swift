#if os(iOS)
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - Form Sections

    extension CreateWidgetView {
        var titleSection: some View {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                Text(localization.t("widgets.widgetTitle"))
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.secondary)

                TextField(localization.t("widgets.enterWidgetTitle"), text: $title)
                    .font(.system(size: DesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .padding(DesignTokens.Spacing.md)
                    .background(DesignTokens.Glass.bgLight)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))

                TextField(localization.t("widgets.descriptionOptional"), text: $description)
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .padding(DesignTokens.Spacing.md)
                    .background(DesignTokens.Glass.bgLight)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
            }
        }

        var contentTypeSection: some View {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                Text(localization.t("widgets.contentType"))
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.secondary)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: DesignTokens.Spacing.sm) {
                        ForEach(contentTypes, id: \.self) { type in
                            GlassChip(
                                title: type.displayLabel,
                                isSelected: selectedContentType == type
                            ) {
                                selectedContentType = type
                                selectedContent = nil
                                iframeUrl = ""
                                syncPickerTab(for: type)
                            }
                        }
                    }
                }
            }
        }

        var contentIdSection: some View {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                if selectedContentType == .iframe {
                    iframeFields
                } else if pickerContentTypes.contains(selectedContentType) {
                    pickerSection
                } else {
                    vodContentIdField
                }
            }
        }

        var iframeFields: some View {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                Text("iFrame URL")
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.secondary)

                TextField("https://example.com/embed", text: $iframeUrl)
                    .font(.system(size: DesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .keyboardType(.URL)
                    .autocapitalization(.none)
                    .padding(DesignTokens.Spacing.md)
                    .background(DesignTokens.Glass.bgLight)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))

                TextField("iFrame Title (optional)", text: $iframeTitle)
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .padding(DesignTokens.Spacing.md)
                    .background(DesignTokens.Glass.bgLight)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
            }
        }

        @ViewBuilder
        var pickerSection: some View {
            Text(localization.t("widgets.content"))
                .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                .foregroundStyle(DesignTokens.Text.secondary)

            if let selected = selectedContent {
                selectedContentCard(selected)
            } else {
                GlassButton(localization.t("widgets.browseContent"), variant: .secondary, size: .medium,
                            icon: Image(systemName: "square.grid.2x2"))
                {
                    syncPickerTab(for: selectedContentType)
                    showContentPicker = true
                }
            }
        }

        var vodContentIdField: some View {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                Text(localization.t("widgets.contentId"))
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.secondary)

                TextField(localization.t("widgets.contentId"), text: $vodContentId)
                    .font(.system(size: DesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .padding(DesignTokens.Spacing.md)
                    .background(DesignTokens.Glass.bgLight)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
            }
        }

        func selectedContentCard(_ item: ContentPickerItem) -> some View {
            HStack(spacing: DesignTokens.Spacing.md) {
                if let url = item.thumbnailURL {
                    CachedAsyncImage(url: url) { phase in
                        if case let .success(img) = phase {
                            img.resizable().aspectRatio(contentMode: .fill)
                        } else {
                            contentPlaceholder(item.tab.iconName)
                        }
                    }
                    .frame(width: 56, height: 56)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
                } else {
                    contentPlaceholder(item.tab.iconName)
                        .frame(width: 56, height: 56)
                        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
                }

                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                    Text(item.title)
                        .font(.system(size: DesignTokens.FontSize.md, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .lineLimit(1)

                    if let subtitle = item.subtitle {
                        Text(subtitle)
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundStyle(DesignTokens.Text.muted)
                            .lineLimit(1)
                    }
                }

                Spacer()

                Button {
                    syncPickerTab(for: selectedContentType)
                    showContentPicker = true
                } label: {
                    Text(localization.t("common.change"))
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                        .foregroundStyle(DesignTokens.Primary.default)
                }
            }
            .padding(DesignTokens.Spacing.md)
            .background(DesignTokens.Glass.bgLight)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        }

        func contentPlaceholder(_ iconName: String) -> some View {
            ZStack {
                DesignTokens.Glass.bg
                Image(systemName: iconName)
                    .font(.system(size: 20))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        }

        func errorBanner(_ message: String) -> some View {
            HStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: "exclamationmark.triangle")
                    .foregroundStyle(DesignTokens.ErrorColor.default)
                Text(message)
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.ErrorColor.default)
            }
            .padding(DesignTokens.Spacing.md)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(DesignTokens.ErrorColor.default.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        }
    }
#endif
