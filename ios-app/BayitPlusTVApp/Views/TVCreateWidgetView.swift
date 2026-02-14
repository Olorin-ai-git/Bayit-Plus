#if os(tvOS)
import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS full-screen widget creation form.
/// Supports 4 content types (channels, podcasts, radio, audiobooks) via a content picker.
/// No iframe support on tvOS.
struct TVCreateWidgetView: View {
    @Environment(LocalizationManager.self) private var localization

    let widgetsViewModel: WidgetsViewModel
    @Bindable var pickerViewModel: ContentPickerViewModel
    let onDismiss: () -> Void

    @State private var title = ""
    @State private var description = ""
    @State private var selectedContentType: WidgetContentType = .liveChannel
    @State private var selectedContent: ContentPickerItem?
    @State private var showContentPicker = false
    @State private var isSaving = false
    @State private var error: String?

    private let logger = BayitLogger(category: "TVCreateWidget")

    private let contentTypes: [WidgetContentType] = [
        .liveChannel, .podcast, .radio, .audiobook
    ]

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xl) {
                header
                titleFields
                contentTypeSection
                contentSection
                if let error { errorBanner(error) }
                actionButtons
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.vertical, TVDesignTokens.Spacing.lg)
        }
        .background(DesignTokens.Background.primary)
        .fullScreenCover(isPresented: $showContentPicker) {
            TVContentPickerView(viewModel: pickerViewModel, onSelect: { item in
                selectedContent = item
                showContentPicker = false
            }, onDismiss: {
                showContentPicker = false
            })
        }
    }

    // MARK: - Header

    private var header: some View {
        Text(localization.t("widgets.createWidget"))
            .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
            .foregroundStyle(DesignTokens.Text.primary)
    }

    // MARK: - Title Fields

    private var titleFields: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("widgets.widgetTitle"))
                .font(.system(size: TVDesignTokens.FontSize.md, weight: .medium))
                .foregroundStyle(DesignTokens.Text.secondary)

            GlassTextField(localization.t("widgets.enterTitle"), text: $title)

            GlassTextField(localization.t("widgets.descriptionOptional"), text: $description)
        }
    }

    // MARK: - Content Type

    private var contentTypeSection: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("widgets.contentType"))
                .font(.system(size: TVDesignTokens.FontSize.md, weight: .medium))
                .foregroundStyle(DesignTokens.Text.secondary)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: TVDesignTokens.Spacing.md) {
                    ForEach(contentTypes, id: \.self) { type in
                        GlassChip(
                            title: type.displayLabel,
                            isSelected: selectedContentType == type
                        ) {
                            selectedContentType = type
                            selectedContent = nil
                            syncPickerTab(for: type)
                        }
                    }
                }
            }
            .focusSection()
        }
    }

    // MARK: - Content Selection

    private var contentSection: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("widgets.content"))
                .font(.system(size: TVDesignTokens.FontSize.md, weight: .medium))
                .foregroundStyle(DesignTokens.Text.secondary)

            if let selected = selectedContent {
                selectedContentCard(selected)
            } else {
                GlassButton("Browse Content", variant: .secondary, size: .large,
                             icon: Image(systemName: "square.grid.2x2")) {
                    syncPickerTab(for: selectedContentType)
                    showContentPicker = true
                }
            }
        }
    }

    private func selectedContentCard(_ item: ContentPickerItem) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            if let url = item.thumbnailURL {
                AsyncImage(url: url) { phase in
                    if case .success(let img) = phase {
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

    private func contentPlaceholder(_ iconName: String) -> some View {
        ZStack {
            DesignTokens.Glass.purpleLight
            Image(systemName: iconName)
                .font(.system(size: TVDesignTokens.FontSize.xl))
                .foregroundStyle(DesignTokens.Text.muted)
        }
    }

    // MARK: - Actions

    private var actionButtons: some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            GlassButton("Cancel", variant: .secondary, size: .large) {
                onDismiss()
            }

            GlassButton("Save", variant: .primary, size: .large) {
                Task { await save() }
            }
            .disabled(!isFormValid || isSaving)
        }
        .padding(.top, TVDesignTokens.Spacing.lg)
    }

    // MARK: - Validation

    private var isFormValid: Bool {
        let trimmedTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        return !trimmedTitle.isEmpty && selectedContent != nil
    }

    // MARK: - Save

    private func save() async {
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

    private func syncPickerTab(for contentType: WidgetContentType) {
        switch contentType {
        case .liveChannel, .live: pickerViewModel.selectedTab = .channels
        case .podcast: pickerViewModel.selectedTab = .podcasts
        case .radio: pickerViewModel.selectedTab = .radio
        case .audiobook: pickerViewModel.selectedTab = .audiobooks
        default: break
        }
    }

    private func errorBanner(_ message: String) -> some View {
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
