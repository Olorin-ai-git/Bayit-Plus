#if os(iOS)
import BayitCore
import BayitDesignSystem
import SwiftUI

/// Form for creating a personal widget with content type selection.
/// Non-iframe types use a content picker with browsable thumbnails;
/// iframe type retains the URL text field.
struct CreateWidgetView: View {

    let viewModel: WidgetsViewModel
    let onDismiss: () -> Void

    @Environment(RepositoryProvider.self) private var repos

    @State private var title = ""
    @State private var description = ""
    @State private var selectedContentType: WidgetContentType = .liveChannel
    @State private var selectedContent: ContentPickerItem?
    @State private var showContentPicker = false
    @State private var iframeUrl = ""
    @State private var iframeTitle = ""
    @State private var isSaving = false
    @State private var error: String?
    @State private var pickerViewModel: ContentPickerViewModel?

    private let logger = BayitLogger(category: "CreateWidget")

    private let contentTypes: [WidgetContentType] = [
        .liveChannel, .vod, .podcast, .radio, .audiobook, .iframe
    ]

    /// Content types that support the content picker (not iframe/vod/custom).
    private let pickerContentTypes: Set<WidgetContentType> = [
        .liveChannel, .podcast, .radio, .audiobook
    ]

    var body: some View {
        NavigationStack {
            ScrollView(.vertical, showsIndicators: false) {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
                    titleSection
                    contentTypeSection
                    contentIdSection
                    if let error { errorBanner(error) }
                }
                .padding(DesignTokens.Spacing.lg)
            }
            .background(DesignTokens.Background.primary)
            .navigationTitle("Create Widget")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { onDismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    GlassButton("Save", variant: .primary, size: .small) {
                        Task { await save() }
                    }
                    .disabled(!isFormValid || isSaving)
                }
            }
            .task {
                if pickerViewModel == nil {
                    let vm = ContentPickerViewModel(
                        liveTV: repos.liveTV,
                        podcasts: repos.podcasts,
                        radio: repos.radio,
                        audiobook: repos.audiobook
                    )
                    pickerViewModel = vm
                    await vm.loadAll()
                }
            }
            .sheet(isPresented: $showContentPicker) {
                if let pickerVM = pickerViewModel {
                    ContentPickerView(viewModel: pickerVM, onSelect: { item in
                        selectedContent = item
                        showContentPicker = false
                    }, onDismiss: {
                        showContentPicker = false
                    })
                    .presentationDetents([.large])
                    .presentationDragIndicator(.visible)
                }
            }
        }
    }

    // MARK: - Title Section

    private var titleSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text("Widget Title")
                .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                .foregroundStyle(DesignTokens.Text.secondary)

            TextField("Enter widget title", text: $title)
                .font(.system(size: DesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(DesignTokens.Spacing.md)
                .background(DesignTokens.Glass.bgLight)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))

            TextField("Description (optional)", text: $description)
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(DesignTokens.Spacing.md)
                .background(DesignTokens.Glass.bgLight)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        }
    }

    // MARK: - Content Type

    private var contentTypeSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text("Content Type")
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

    // MARK: - Content ID / URL / Picker

    @ViewBuilder
    private var contentIdSection: some View {
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

    private var iframeFields: some View {
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
    private var pickerSection: some View {
        Text("Content")
            .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
            .foregroundStyle(DesignTokens.Text.secondary)

        if let selected = selectedContent {
            selectedContentCard(selected)
        } else {
            GlassButton("Browse Content", variant: .secondary, size: .medium,
                         icon: Image(systemName: "square.grid.2x2")) {
                syncPickerTab(for: selectedContentType)
                showContentPicker = true
            }
        }
    }

    @State private var vodContentId = ""

    private var vodContentIdField: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text("Content ID")
                .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                .foregroundStyle(DesignTokens.Text.secondary)

            TextField("Content ID", text: $vodContentId)
                .font(.system(size: DesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(DesignTokens.Spacing.md)
                .background(DesignTokens.Glass.bgLight)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        }
    }

    private func selectedContentCard(_ item: ContentPickerItem) -> some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            if let url = item.thumbnailURL {
                AsyncImage(url: url) { phase in
                    if case .success(let img) = phase {
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
                Text("Change")
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                    .foregroundStyle(DesignTokens.Primary.default)
            }
        }
        .padding(DesignTokens.Spacing.md)
        .background(DesignTokens.Glass.bgLight)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
    }

    private func contentPlaceholder(_ iconName: String) -> some View {
        ZStack {
            DesignTokens.Glass.bg
            Image(systemName: iconName)
                .font(.system(size: 20))
                .foregroundStyle(DesignTokens.Text.muted)
        }
    }

    // MARK: - Validation

    private var isFormValid: Bool {
        let trimmedTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedTitle.isEmpty else { return false }

        if selectedContentType == .iframe {
            let trimmedUrl = iframeUrl.trimmingCharacters(in: .whitespacesAndNewlines)
            return trimmedUrl.hasPrefix("http://") || trimmedUrl.hasPrefix("https://")
        } else if pickerContentTypes.contains(selectedContentType) {
            return selectedContent != nil
        } else {
            return !vodContentId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }
    }

    // MARK: - Save

    private func save() async {
        guard isFormValid else { return }
        isSaving = true
        error = nil

        let content: WidgetContentPayload

        if selectedContentType == .iframe {
            content = WidgetContentPayload(
                contentType: selectedContentType.rawValue,
                liveChannelId: nil,
                podcastId: nil,
                contentId: nil,
                stationId: nil,
                audiobookId: nil,
                iframeUrl: iframeUrl.trimmingCharacters(in: .whitespacesAndNewlines),
                iframeTitle: iframeTitle.trimmingCharacters(in: .whitespacesAndNewlines)
            )
        } else if let selected = selectedContent {
            content = WidgetContentPayload(
                contentType: selected.tab.widgetContentType.rawValue,
                liveChannelId: selected.tab == .channels ? selected.id : nil,
                podcastId: selected.tab == .podcasts ? selected.id : nil,
                contentId: nil,
                stationId: selected.tab == .radio ? selected.id : nil,
                audiobookId: selected.tab == .audiobooks ? selected.id : nil,
                iframeUrl: nil,
                iframeTitle: nil
            )
        } else {
            let trimmedId = vodContentId.trimmingCharacters(in: .whitespacesAndNewlines)
            content = WidgetContentPayload(
                contentType: selectedContentType.rawValue,
                liveChannelId: nil,
                podcastId: nil,
                contentId: trimmedId,
                stationId: nil,
                audiobookId: nil,
                iframeUrl: nil,
                iframeTitle: nil
            )
        }

        let request = CreateWidgetRequest(
            title: title.trimmingCharacters(in: .whitespacesAndNewlines),
            description: description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                ? nil
                : description.trimmingCharacters(in: .whitespacesAndNewlines),
            icon: nil,
            content: content
        )

        let success = await viewModel.createPersonalWidget(request)
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
        case .liveChannel, .live: pickerViewModel?.selectedTab = .channels
        case .podcast: pickerViewModel?.selectedTab = .podcasts
        case .radio: pickerViewModel?.selectedTab = .radio
        case .audiobook: pickerViewModel?.selectedTab = .audiobooks
        default: break
        }
    }

    private func errorBanner(_ message: String) -> some View {
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
