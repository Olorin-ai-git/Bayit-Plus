#if os(tvOS)
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import BayitMedia
    import SwiftUI

    struct TVWidgetsView: View {
        @Environment(TVRepositoryProvider.self) private var repos
        @Environment(TVNavigationCoordinator.self) var coordinator
        @Environment(LocalizationManager.self) private var localization
        @State private var viewModel: WidgetsViewModel?
        @State private var showCreateWidget = false
        @State private var pickerViewModel: ContentPickerViewModel?
        @State private var currentTime = Date()

        private let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

        private let columns = [
            GridItem(.flexible(), spacing: 20),
            GridItem(.flexible(), spacing: 20),
            GridItem(.flexible(), spacing: 20),
        ]

        var body: some View {
            ZStack {
                DesignTokens.Background.primary.ignoresSafeArea()

                VStack(spacing: 0) {
                    Spacer()
                    LazyVGrid(columns: columns, spacing: 20) {
                        liveTVCard
                        radioCard
                        podcastCard
                        weatherCard
                        clockCard
                        nowPlayingCard
                    }
                    .padding(.horizontal, 60)
                    Spacer()
                }
            }
            .task {
                if viewModel == nil { viewModel = WidgetsViewModel(repository: repos.widget) }
                if pickerViewModel == nil {
                    pickerViewModel = ContentPickerViewModel(
                        liveTV: repos.liveTV, podcasts: repos.podcasts,
                        radio: repos.radio, audiobook: repos.audiobook
                    )
                }
                async let w: () = viewModel?.loadAll() ?? ()
                async let p: () = pickerViewModel?.loadAll() ?? ()
                _ = await (w, p)
            }
            .onReceive(timer) { currentTime = $0 }
            .fullScreenCover(isPresented: $showCreateWidget) {
                if let vm = viewModel, let pickerVM = pickerViewModel {
                    TVCreateWidgetView(widgetsViewModel: vm, pickerViewModel: pickerVM,
                                       onDismiss: { showCreateWidget = false })
                }
            }
        }

        // MARK: - Live TV Card

        private var liveTVCard: some View {
            widgetCard {
                VStack(alignment: .leading, spacing: 14) {
                    Text(localization.t("widgets.liveTV"))
                        .font(.system(size: 26, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    if let picker = pickerViewModel {
                        // Row 1: Live thumbnails
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 10) {
                                ForEach(picker.channelItems.prefix(4)) { ch in
                                    Button {
                                        coordinator.presentPlayer(
                                            contentId: ch.id, contentType: .liveTV
                                        )
                                    } label: {
                                        CachedAsyncImage(url: ch.thumbnailURL) {
                                            RoundedRectangle(cornerRadius: 8)
                                                .fill(Color.white.opacity(0.08))
                                        }
                                        .frame(width: 120, height: 72)
                                        .clipShape(RoundedRectangle(cornerRadius: 8))
                                        .overlay(alignment: .bottomLeading) {
                                            Text(ch.title)
                                                .font(.system(size: 11, weight: .medium))
                                                .foregroundStyle(.white)
                                                .padding(4)
                                                .background(.black.opacity(0.6))
                                                .clipShape(RoundedRectangle(cornerRadius: 4))
                                                .padding(4)
                                        }
                                    }
                                    .tvCardStyle()
                                }
                            }
                        }

                        // Row 2: Channel logos
                        HStack(spacing: 16) {
                            ForEach(picker.channelItems.prefix(4)) { ch in
                                CachedAsyncImage(url: ch.thumbnailURL) {
                                    RoundedRectangle(cornerRadius: 6)
                                        .fill(Color.white.opacity(0.08))
                                }
                                .frame(width: 50, height: 30)
                                .clipShape(RoundedRectangle(cornerRadius: 6))
                            }
                        }
                    }
                }
            }
        }

        // MARK: - Radio Card

        private var radioCard: some View {
            widgetCard {
                VStack(alignment: .leading, spacing: 14) {
                    Text(localization.t("widgets.radio"))
                        .font(.system(size: 26, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    if let picker = pickerViewModel {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 14) {
                                ForEach(picker.radioItems.prefix(4)) { station in
                                    Button {
                                        coordinator.presentPlayer(
                                            contentId: station.id, contentType: .radio
                                        )
                                    } label: {
                                        VStack(spacing: 6) {
                                            CachedAsyncImage(url: station.thumbnailURL) {
                                                RoundedRectangle(cornerRadius: 10)
                                                    .fill(Color.white.opacity(0.08))
                                            }
                                            .frame(width: 80, height: 80)
                                            .clipShape(RoundedRectangle(cornerRadius: 10))

                                            Text(station.title)
                                                .font(.system(size: 14, weight: .medium))
                                                .foregroundStyle(DesignTokens.Text.primary)
                                                .lineLimit(1)
                                                .frame(width: 80)
                                            Text("Now Playing...")
                                                .font(.system(size: 12))
                                                .foregroundStyle(DesignTokens.Text.muted)
                                                .lineLimit(1)
                                                .frame(width: 80)
                                        }
                                    }
                                    .tvCardStyle()
                                }
                            }
                        }
                    }
                }
            }
        }

        // MARK: - Podcast Card

        private var podcastCard: some View {
            widgetCard {
                VStack(alignment: .leading, spacing: 14) {
                    Text(localization.t("widgets.podcast"))
                        .font(.system(size: 26, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    if let picker = pickerViewModel, let first = picker.podcastItems.first {
                        HStack(spacing: 16) {
                            CachedAsyncImage(url: first.thumbnailURL) {
                                RoundedRectangle(cornerRadius: 10)
                                    .fill(Color.white.opacity(0.08))
                            }
                            .frame(width: 90, height: 90)
                            .clipShape(RoundedRectangle(cornerRadius: 10))

                            VStack(alignment: .leading, spacing: 6) {
                                Text(first.title)
                                    .font(.system(size: 24, weight: .bold))
                                    .foregroundStyle(DesignTokens.Text.primary)
                                    .lineLimit(1)
                                if let subtitle = first.subtitle {
                                    Text(subtitle)
                                        .font(.system(size: 16))
                                        .foregroundStyle(DesignTokens.Text.secondary)
                                        .lineLimit(2)
                                }
                            }
                        }
                    }
                }
            }
        }

        // MARK: - Weather Card

        private var weatherCard: some View {
            widgetCard {
                VStack(alignment: .leading, spacing: 14) {
                    Text(localization.t("widgets.weather"))
                        .font(.system(size: 26, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    HStack {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("72\u{00B0}F")
                                .font(.system(size: 60, weight: .bold))
                                .foregroundStyle(DesignTokens.Text.primary)
                            Text("Sunny, Tel Aviv")
                                .font(.system(size: 20))
                                .foregroundStyle(DesignTokens.Text.secondary)
                        }
                        Spacer()
                        Image(systemName: "sun.max.fill")
                            .font(.system(size: 56))
                            .foregroundStyle(Color(hex: 0xF59E0B))
                    }
                }
            }
        }

        // MARK: - Clock Card

        private var clockCard: some View {
            let formatter = DateFormatter()
            let _ = formatter.dateFormat = "h:mm"
            let timeString = formatter.string(from: currentTime)
            let _ = formatter.dateFormat = "a"
            let amPm = formatter.string(from: currentTime)
            let _ = formatter.dateFormat = "EEEE"
            let dayString = formatter.string(from: currentTime)

            return widgetCard {
                VStack(alignment: .leading, spacing: 14) {
                    Text(localization.t("widgets.clock"))
                        .font(.system(size: 26, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Spacer()
                    VStack(spacing: 6) {
                        HStack(alignment: .firstTextBaseline, spacing: 6) {
                            Text(timeString)
                                .font(.system(size: 64, weight: .bold, design: .rounded))
                                .foregroundStyle(DesignTokens.Text.primary)
                            Text(amPm)
                                .font(.system(size: 28, weight: .medium))
                                .foregroundStyle(DesignTokens.Text.secondary)
                        }
                        Text(dayString)
                            .font(.system(size: 22))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    Spacer()
                }
            }
        }

        // MARK: - Now Playing Card

        private var nowPlayingCard: some View {
            widgetCard {
                VStack(alignment: .leading, spacing: 14) {
                    Text(localization.t("widgets.nowPlaying"))
                        .font(.system(size: 26, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    HStack(spacing: 16) {
                        RoundedRectangle(cornerRadius: 10)
                            .fill(DesignTokens.Glass.bgMedium)
                            .frame(width: 80, height: 80)
                            .overlay(
                                Image(systemName: "music.note")
                                    .font(.system(size: 30))
                                    .foregroundStyle(DesignTokens.Text.muted)
                            )

                        VStack(alignment: .leading, spacing: 4) {
                            Text(localization.t("widgets.nothingPlaying"))
                                .font(.system(size: 22, weight: .semibold))
                                .foregroundStyle(DesignTokens.Text.primary)
                                .lineLimit(1)
                            Text(localization.t("widgets.selectContent"))
                                .font(.system(size: 16))
                                .foregroundStyle(DesignTokens.Text.secondary)
                                .lineLimit(1)
                        }
                        Spacer()
                    }

                    // Playback controls row
                    HStack(spacing: 24) {
                        Spacer()
                        ForEach(
                            ["backward.fill", "pause.fill", "forward.fill"],
                            id: \.self
                        ) { icon in
                            Image(systemName: icon)
                                .font(.system(size: 22))
                                .foregroundStyle(DesignTokens.Text.secondary)
                        }
                        Spacer()
                    }
                }
            }
        }

        // MARK: - Widget Card Shell

        private func widgetCard<Content: View>(
            @ViewBuilder content: () -> Content
        ) -> some View {
            content()
                .padding(28)
                .frame(maxWidth: .infinity, minHeight: 260, alignment: .topLeading)
                .background(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .fill(Color.white.opacity(0.06))
                        .overlay(
                            RoundedRectangle(cornerRadius: 20, style: .continuous)
                                .stroke(Color.white.opacity(0.12), lineWidth: 1.5)
                        )
                )
        }

        private var loadingState: some View {
            VStack(spacing: TVDesignTokens.Spacing.xl) {
                ProgressView().tint(DesignTokens.Primary.default).scaleEffect(1.5)
                Text(localization.t("widgets.loading"))
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            .frame(maxWidth: .infinity, minHeight: 400)
        }
    }
#endif
